#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUNS_DIR = path.join(PROJECT_ROOT, "demo-runs");
const REPLAYS_DIR = path.join(PROJECT_ROOT, "dashboard", "replays");
const MANIFEST_PATH = path.join(REPLAYS_DIR, "index.json");
const [runId, requestedSlug] = process.argv.slice(2);

function usage() {
  console.error("Uso: node scripts/export-replay.js <run-id> [slug]");
  console.error("Ejemplo: node scripts/export-replay.js 123e4567-e89b-12d3-a456-426614174000 high-ssh-bob-run");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function safeSlug(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("El slug debe incluir letras o numeros.");
  return slug;
}

function publicPhase(phase) {
  return {
    phase: phase.phase,
    status: phase.status,
    summary: phase.summary || "",
    events: (phase.events || []).map((event) => ({
      type: event.type,
      text: event.text,
      at: event.at,
    })),
  };
}

if (!runId) {
  usage();
  process.exitCode = 1;
} else {
  try {
    const runDirectory = path.join(RUNS_DIR, runId);
    const finalPath = path.join(runDirectory, "final-report.json");
    if (!existsSync(finalPath)) {
      throw new Error(`No existe final-report.json para la corrida ${runId}.`);
    }

    const finalReport = readJson(finalPath);
    if (finalReport.bob?.status !== "completed") {
      throw new Error("Solo se pueden publicar corridas con las tres fases de IBM Bob completadas.");
    }

    const slug = safeSlug(requestedSlug || `${finalReport.scenario?.scenario_id || "drift"}-${runId.slice(0, 8)}`);
    const replay = {
      schema_version: 1,
      id: slug,
      source: "recorded_local_bob_run",
      label: "Recorded IBM Bob Run",
      recorded_at: finalReport.bob.completed_at || finalReport.created_at,
      scenario: finalReport.scenario,
      report: finalReport.report,
      bob: {
        status: finalReport.bob.status,
        runtime: finalReport.bob.runtime,
        phases: (finalReport.bob.phases || []).map(publicPhase),
      },
      decision: finalReport.decision,
      verification: finalReport.verification,
      safety: finalReport.safety,
    };

    mkdirSync(REPLAYS_DIR, { recursive: true });
    writeFileSync(path.join(REPLAYS_DIR, `${slug}.json`), `${JSON.stringify(replay, null, 2)}\n`, "utf8");

    const manifest = existsSync(MANIFEST_PATH)
      ? readJson(MANIFEST_PATH)
      : { schema_version: 1, replays: [] };
    const entry = {
      id: slug,
      file: `${slug}.json`,
      label: replay.label,
      scenario_id: replay.scenario?.scenario_id,
      title: replay.scenario?.title,
      risk_score: replay.report?.risk_score,
      risk_level: replay.report?.risk_level,
      recorded_at: replay.recorded_at,
    };
    manifest.replays = (manifest.replays || []).filter((item) => item.id !== slug);
    manifest.replays.push(entry);
    manifest.replays.sort((left, right) => String(right.recorded_at).localeCompare(String(left.recorded_at)));
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    console.log(`Replay publico creado: dashboard/replays/${slug}.json`);
    console.log("Revisa el JSON, luego haz commit y push antes de desplegar en Vercel.");
  } catch (error) {
    console.error(`No se pudo exportar el replay: ${error.message}`);
    process.exitCode = 1;
  }
}
