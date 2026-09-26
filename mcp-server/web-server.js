#!/usr/bin/env node

import http from "http";
import { randomUUID } from "crypto";
import {
  existsSync,
  readFileSync,
  statSync,
} from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { applyScenario, listScenarios } from "./scenario-engine.js";
import { loadDeclaredState } from "./terraform-declared-state.js";
import {
  bobRuntimeMetadata,
  createBobPrompts,
  initializeArtifactStore,
  runBobPhase,
  writeArtifact,
} from "./bob-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DASHBOARD_DIR = path.join(PROJECT_ROOT, "dashboard");
const ACTUAL_STATE_PATH = path.join(__dirname, "state", "actual-state.json");
const MCP_ENTRY_PATH = path.join(__dirname, "index.js");
const WEB_HOST = process.env.DRIFT_WEB_HOST || "127.0.0.1";
const WEB_PORT = Number(process.env.DRIFT_WEB_PORT || 4173);
const MAX_BODY_BYTES = 1024 * 1024;
const runs = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value, null, 2);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function bilingual(en, es) {
  return { en, es };
}

function buildTimeline(report) {
  const hasDrift = report.drift_detectado;
  return [
    {
      id: "terraform",
      status: "completed",
      title: bilingual("Terraform baseline generated", "Linea base de Terraform generada"),
      detail: bilingual(
        `Declared state source: ${report.estado_declarado_fuente}`,
        `Fuente del estado declarado: ${report.estado_declarado_fuente}`
      ),
    },
    {
      id: "scenario",
      status: "completed",
      title: bilingual("Scenario applied locally", "Escenario aplicado localmente"),
      detail: bilingual(
        `Scenario: ${report.scenario_id}`,
        `Escenario: ${report.scenario_id}`
      ),
    },
    {
      id: "mcp",
      status: "completed",
      title: bilingual("MCP comparison completed", "Comparacion MCP completada"),
      detail: bilingual(
        `${report.cantidad_de_diferencias} difference(s) found`,
        `${report.cantidad_de_diferencias} diferencia(s) encontrada(s)`
      ),
    },
    {
      id: "risk",
      status: "completed",
      title: bilingual("Risk prioritized", "Riesgo priorizado"),
      detail: bilingual(
        `Risk score: ${report.risk_score}/100`,
        `Puntaje de riesgo: ${report.risk_score}/100`
      ),
    },
    {
      id: "recommendations",
      status: "completed",
      title: bilingual("Recommendations prepared", "Recomendaciones preparadas"),
      detail: bilingual(
        `${report.recommendations?.length || 0} suggested action(s)`,
        `${report.recommendations?.length || 0} accion(es) sugerida(s)`
      ),
    },
    {
      id: "bob",
      status: "pending",
      title: bilingual("IBM Bob analysis available", "Analisis IBM Bob disponible"),
      detail: bilingual(
        "Run Ask, Plan, and Agent phases with local cost and turn limits.",
        "Ejecuta las fases Ask, Plan y Agent con limites locales de costo y turnos."
      ),
    },
    {
      id: "review",
      status: hasDrift ? "pending" : "completed",
      title: bilingual(
        hasDrift ? "Waiting for human review" : "No remediation required",
        hasDrift ? "Esperando revision humana" : "No se requiere remediacion"
      ),
      detail: bilingual(
        hasDrift ? "Approve or reject the simulated remediation." : "Infrastructure matches Terraform.",
        hasDrift ? "Aprueba o rechaza la remediacion simulada." : "La infraestructura coincide con Terraform."
      ),
    },
  ];
}

async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function callMcpTool(toolName) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [MCP_ENTRY_PATH],
    cwd: PROJECT_ROOT,
    stderr: "pipe",
  });
  const client = new Client({
    name: "drift-detector-web-console",
    version: "1.0.0",
  });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: toolName, arguments: {} });
    const text = result.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
    return JSON.parse(text);
  } finally {
    await transport.close();
  }
}

async function createRun(scenarioId) {
  const declared = loadDeclaredState();
  const scenario = applyScenario(scenarioId, declared, ACTUAL_STATE_PATH);
  const report = await callMcpTool("diff_infra");
  const run = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    status: report.drift_detectado ? "awaiting_review" : "healthy",
    scenario,
    report,
    timeline: buildTimeline(report),
    bob: null,
    decision: null,
    verification: null,
    safety: {
      cloud_changes_applied: false,
      terraform_apply_executed: false,
      scope: "local_simulation",
    },
  };
  runs.set(run.id, run);
  return run;
}

function updateBobTimeline(run, status, error) {
  const step = run.timeline.find((item) => item.id === "bob");
  if (!step) return;
  step.status = status;
  if (status === "running") {
    step.title = bilingual("IBM Bob analysis running", "Analisis IBM Bob en ejecucion");
    step.detail = bilingual(
      "Ask, Plan, and Agent are being captured as stream-json events.",
      "Ask, Plan y Agent se capturan como eventos stream-json."
    );
  } else if (status === "completed") {
    step.title = bilingual("IBM Bob analysis completed", "Analisis IBM Bob completado");
    step.detail = bilingual(
      "The local run has review-ready Ask, Plan, and Agent artifacts.",
      "La corrida local tiene artefactos Ask, Plan y Agent listos para revision."
    );
  } else if (status === "failed") {
    step.title = bilingual("IBM Bob analysis unavailable", "Analisis IBM Bob no disponible");
    step.detail = bilingual(
      error || "Check Bob Shell authentication and retry.",
      error || "Verifica la autenticacion de Bob Shell e intenta otra vez."
    );
  }
}

async function runBobWorkflow(run) {
  let artifactDirectory;

  try {
    artifactDirectory = initializeArtifactStore(run);
    const prompts = createBobPrompts(run.report);
    run.artifact_directory = path.relative(PROJECT_ROOT, artifactDirectory).replaceAll("\\", "/");
    run.bob = {
      status: "running",
      started_at: new Date().toISOString(),
      runtime: bobRuntimeMetadata(),
      phases: [],
    };
    updateBobTimeline(run, "running");

    for (const phase of ["ask", "plan", "agent"]) {
      const phaseState = { phase, status: "running", events: [] };
      run.bob.current_phase = phase;
      run.bob.phases.push(phaseState);
      const result = await runBobPhase({
        phase,
        prompt: prompts[phase],
        onEvent: (event) => phaseState.events.push(event),
      });
      Object.assign(phaseState, result);
      writeArtifact(artifactDirectory, `${phase}.json`, result);
      if (result.status !== "completed") {
        run.bob.status = "failed";
        run.bob.error = result.error || `IBM Bob ${phase} phase did not complete.`;
        updateBobTimeline(run, "failed", run.bob.error);
        writeArtifact(artifactDirectory, "final-report.json", run);
        return;
      }
    }

    run.bob.status = "completed";
    run.bob.completed_at = new Date().toISOString();
    delete run.bob.current_phase;
    updateBobTimeline(run, "completed");
    writeArtifact(artifactDirectory, "final-report.json", run);
  } catch (error) {
    run.bob ||= {
      status: "failed",
      started_at: new Date().toISOString(),
      runtime: bobRuntimeMetadata(),
      phases: [],
    };
    run.bob.status = "failed";
    run.bob.error = error.message;
    updateBobTimeline(run, "failed", error.message);
    if (artifactDirectory) writeArtifact(artifactDirectory, "final-report.json", run);
  }
}

function persistFinalRun(run) {
  if (run.artifact_directory) {
    writeArtifact(path.join(PROJECT_ROOT, run.artifact_directory), "final-report.json", run);
  }
}

async function decideRun(run, decision) {
  if (!run.report.drift_detectado) {
    throw new Error("This run does not require remediation.");
  }
  if (run.decision) {
    throw new Error("This run already has a human decision.");
  }

  run.decision = {
    value: decision,
    decided_at: new Date().toISOString(),
  };

  const reviewStep = run.timeline.find((step) => step.id === "review");
  if (decision === "reject") {
    run.status = "rejected";
    reviewStep.status = "rejected";
    reviewStep.title = bilingual("Remediation rejected", "Remediacion rechazada");
    reviewStep.detail = bilingual(
      "The simulated drift remains available for further review.",
      "El drift simulado permanece disponible para una revision posterior."
    );
    persistFinalRun(run);
    return run;
  }

  const declared = loadDeclaredState();
  applyScenario("healthy", declared, ACTUAL_STATE_PATH);
  run.verification = await callMcpTool("diff_infra");
  run.status = run.verification.drift_detectado ? "verification_failed" : "remediated";
  reviewStep.status = run.status === "remediated" ? "completed" : "failed";
  reviewStep.title = bilingual(
    run.status === "remediated" ? "Remediation verified" : "Verification failed",
    run.status === "remediated" ? "Remediacion verificada" : "Fallo la verificacion"
  );
  reviewStep.detail = bilingual(
    run.status === "remediated"
      ? "The observed state matches Terraform after the approved local reset."
      : "Drift remains after the simulated remediation.",
    run.status === "remediated"
      ? "El estado observado coincide con Terraform despues del reset local aprobado."
      : "El drift permanece despues de la remediacion simulada."
  );
  persistFinalRun(run);
  return run;
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/scenarios") {
    sendJson(response, 200, { scenarios: listScenarios() });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/runs") {
    const body = await readJsonBody(request);
    const run = await createRun(body.scenario_id || "healthy");
    sendJson(response, 201, run);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/bob/runtime") {
    sendJson(response, 200, bobRuntimeMetadata());
    return true;
  }

  const runMatch = pathname.match(/^\/api\/runs\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && runMatch) {
    const run = runs.get(runMatch[1]);
    if (!run) {
      sendJson(response, 404, { error: "Run not found." });
      return true;
    }
    sendJson(response, 200, run);
    return true;
  }

  const bobRunMatch = pathname.match(/^\/api\/runs\/([0-9a-f-]+)\/bob$/i);
  if (request.method === "POST" && bobRunMatch) {
    const run = runs.get(bobRunMatch[1]);
    if (!run) {
      sendJson(response, 404, { error: "Run not found." });
      return true;
    }
    if (!["healthy", "awaiting_review"].includes(run.status)) {
      sendJson(response, 409, { error: "IBM Bob analysis can only start before a remediation decision." });
      return true;
    }
    if (run.bob?.status === "running") {
      sendJson(response, 409, { error: "IBM Bob analysis is already running." });
      return true;
    }
    if (run.bob?.status === "completed") {
      sendJson(response, 409, { error: "IBM Bob analysis already exists for this run." });
      return true;
    }
    runBobWorkflow(run).catch((error) => {
      console.error(`[web-console] IBM Bob workflow failed: ${error.stack || error.message}`);
    });
    sendJson(response, 202, run);
    return true;
  }

  const decisionMatch = pathname.match(/^\/api\/runs\/([0-9a-f-]+)\/decision$/i);
  if (request.method === "POST" && decisionMatch) {
    const run = runs.get(decisionMatch[1]);
    if (!run) {
      sendJson(response, 404, { error: "Run not found." });
      return true;
    }
    const body = await readJsonBody(request);
    if (!["approve", "reject"].includes(body.decision)) {
      sendJson(response, 400, { error: "Decision must be approve or reject." });
      return true;
    }
    sendJson(response, 200, await decideRun(run, body.decision));
    return true;
  }

  if (request.method === "POST" && pathname === "/api/reset") {
    const declared = loadDeclaredState();
    const scenario = applyScenario("healthy", declared, ACTUAL_STATE_PATH);
    sendJson(response, 200, { status: "healthy", scenario });
    return true;
  }

  return false;
}

function serveStatic(request, response, pathname) {
  if (!["GET", "HEAD"].includes(request.method)) {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = path.resolve(DASHBOARD_DIR, relativePath);
  const dashboardPrefix = `${path.resolve(DASHBOARD_DIR)}${path.sep}`;
  if (filePath !== path.resolve(DASHBOARD_DIR, "index.html") && !filePath.startsWith(dashboardPrefix)) {
    sendJson(response, 403, { error: "Forbidden path." });
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(response, 404, { error: "File not found." });
    return;
  }

  const content = readFileSync(filePath);
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": content.length,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : content);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${WEB_HOST}:${WEB_PORT}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, url.pathname);
      if (!handled) sendJson(response, 404, { error: "API route not found." });
      return;
    }
    serveStatic(request, response, url.pathname);
  } catch (error) {
    console.error(`[web-console] ${error.stack || error.message}`);
    sendJson(response, 500, {
      error: "The local demo could not complete the request.",
      detail: error.message,
    });
  }
});

server.listen(WEB_PORT, WEB_HOST, () => {
  console.log(`Drift Detector web console: http://${WEB_HOST}:${WEB_PORT}/console.html`);
  console.log(`3ntropy landing page:       http://${WEB_HOST}:${WEB_PORT}/`);
  console.log("Press Ctrl+C to stop the local server.");
});
