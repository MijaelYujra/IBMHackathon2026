import { spawn } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUNS_DIR = path.join(PROJECT_ROOT, "demo-runs");
const DEFAULT_MAX_COST = Number(process.env.DRIFT_BOB_MAX_COST || 0.2);
const DEFAULT_MAX_TURNS = Number(process.env.DRIFT_BOB_MAX_TURNS || 3);
const DEFAULT_TIMEOUT_MS = Number(process.env.DRIFT_BOB_TIMEOUT_MS || 90_000);

function now() {
  return new Date().toISOString();
}

function sanitizeText(value) {
  return String(value || "")
    .replaceAll(PROJECT_ROOT, "<workspace>")
    .replace(/C:\\Users\\[^\\\s]+/gi, "<user-home>")
    .replace(/(AKIA|ASIA)[A-Z0-9]{16}/g, "<redacted-aws-key>")
    .replace(/(api[_-]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=<redacted>");
}

function sanitize(value) {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

function extractText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  
  if (value.step_update && typeof value.step_update.text_delta === "string") return value.step_update.text_delta;
  if (value.result && typeof value.result.response === "string") return value.result.response;

  for (const key of ["text", "content", "message", "summary", "output", "error", "text_delta", "response"]) {
    if (typeof value[key] === "string") return value[key];
  }
  return "";
}

function eventFromLine(line) {
  try {
    const parsed = JSON.parse(line);
    return {
      type: parsed.type || parsed.event || parsed.kind || "event",
      text: sanitizeText(extractText(parsed)),
      data: sanitize(parsed),
      at: now(),
    };
  } catch {
    return { type: "raw", text: sanitizeText(line), at: now() };
  }
}

function commandForPlatform() {
  return process.platform === "win32" ? "agy.exe" : "agy";
}

function safeReport(report) {
  return sanitize({
    declared_state_source: report.estado_declarado_fuente,
    scenario_id: report.scenario_id,
    drift_detected: report.drift_detectado,
    risk_score: report.risk_score,
    risk_level: report.risk_level,
    differences: report.detalle,
    recommendations: report.recommendations,
  });
}

export function createBobPrompts(report) {
  const context = JSON.stringify(safeReport(report), null, 2);
  const safety = [
    "This is a local hackathon simulation.",
    "Do not create, edit, delete, or apply files or infrastructure.",
    "Never execute terraform apply, cloud CLI commands, or destructive commands.",
    "Use concise, review-ready language and clearly state assumptions.",
  ].join(" ");

  return {
    ask: `${safety}\n\nUse the drift-detector MCP tool diff_infra to independently confirm this incident. Explain the detected drift, its business/security impact, risk priority, and recommended next actions. Return a concise bilingual response (English followed by Spanish).\n\nKnown run context:\n${context}`,
    plan: `${safety}\n\nUsing the following confirmed drift report, propose a no-downtime remediation plan for a human reviewer. Include ordered steps, verification, rollback considerations, and explicit approval gate. Do not apply any change. Return English followed by Spanish.\n\nDrift report:\n${context}`,
    agent: `${safety}\n\nPrepare a human-review remediation proposal from this drift report. State the intended Terraform-aligned change, pre-checks, post-checks, and why human approval remains required. Do not modify any file or infrastructure. Return English followed by Spanish.\n\nDrift report:\n${context}`,
  };
}

export function initializeArtifactStore(run) {
  const directory = path.join(RUNS_DIR, run.id);
  mkdirSync(directory, { recursive: true });
  writeArtifact(directory, "context.json", {
    run_id: run.id,
    created_at: run.created_at,
    scenario: run.scenario,
    safety: run.safety,
  });
  writeArtifact(directory, "detection.json", run.report);
  return directory;
}

export function writeArtifact(directory, filename, value) {
  writeFileSync(
    path.join(directory, filename),
    `${JSON.stringify(sanitize(value), null, 2)}\n`,
    "utf8"
  );
}

export function runBobPhase({ phase, prompt, onEvent }) {
  const startedAt = now();
  const events = [];
  const stderr = [];
  const args = [
    "--output-format",
    "stream-json",
    "--add-dir",
    PROJECT_ROOT,
    "--dangerously-skip-permissions"
  ];
  if (phase === "plan") args.push("--mode", "plan");
  else if (phase === "agent") args.push("--mode", "accept-edits");
  args.push("--print", prompt);

  return new Promise((resolve) => {
    let child;
    let settled = false;
    let buffer = "";
    let timeout;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve({
        phase,
        started_at: startedAt,
        completed_at: now(),
        max_cost: DEFAULT_MAX_COST,
        max_turns: DEFAULT_MAX_TURNS,
        command: { executable: commandForPlatform(), args: args.slice(0, -1) },
        prompt: sanitizeText(prompt),
        events,
        stderr: stderr.join("\n"),
        ...result,
      });
    };

    try {
      child = spawn(commandForPlatform(), args, {
        cwd: PROJECT_ROOT,
        shell: false,
        windowsHide: true,
        env: { ...process.env, BOB_LOG_LEVEL: "warn" },
      });
    } catch (error) {
      finish({ status: "failed", error: sanitizeText(error.message) });
      return;
    }

    timeout = setTimeout(() => {
      child.kill();
      finish({
        status: "timed_out",
        error: `Bob phase exceeded the ${Math.round(DEFAULT_TIMEOUT_MS / 1000)} second local limit.`,
      });
    }, DEFAULT_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = eventFromLine(line);
        events.push(event);
        onEvent?.(event);
      }
    });
    child.stderr.on("data", (chunk) => stderr.push(sanitizeText(chunk)));
    child.on("error", (error) => finish({ status: "failed", error: sanitizeText(error.message) }));
    child.on("close", (code, signal) => {
      if (buffer.trim()) {
        const event = eventFromLine(buffer);
        events.push(event);
        onEvent?.(event);
      }
      const summary = [...events].reverse().map((event) => event.text).find(Boolean) || "";
      finish({
        status: code === 0 ? "completed" : "failed",
        exit_code: code,
        signal,
        summary,
        error: code === 0 ? undefined : stderr.join("\n") || `Bob exited with code ${code}.`,
      });
    });
  });
}

export function bobRuntimeMetadata() {
  return {
    command: commandForPlatform(),
    max_cost_per_phase: DEFAULT_MAX_COST,
    max_turns_per_phase: DEFAULT_MAX_TURNS,
    timeout_seconds: Math.round(DEFAULT_TIMEOUT_MS / 1000),
    mode: "live_local_only",
  };
}
