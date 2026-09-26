#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { diffResources, summarizeRisk } from "./drift-engine.js";
import { loadDeclaredState } from "./terraform-declared-state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, "state");
const ACTUAL_PATH = path.join(STATE_DIR, "actual-state.json");
const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_PATH = path.join(LOG_DIR, "bobalytics-log.jsonl");

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

function loadState(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`¡ALERTA CRÍTICA! No se pudo acceder al estado: ${path.basename(filePath)}. Posible pérdida de conexión con el proveedor de infraestructura.`);
  }
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function logDetection(differences, risk) {
  const entry = {
    timestamp: new Date().toISOString(),
    total_diffs: differences.length,
    high_risk_diffs: risk.counts.high,
    medium_risk_diffs: risk.counts.medium,
    low_risk_diffs: risk.counts.low,
    risk_score: risk.risk_score,
    risk_level: risk.risk_level,
    estimated_minutes_saved:
      differences.length * 25 + risk.counts.high * 15,
  };
  appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
  return entry;
}

const server = new McpServer({
  name: "drift-detector",
  version: "1.0.0",
});

server.tool(
  "get_declared_state",
  "Devuelve el estado de infraestructura DECLARADO en el codigo (Terraform), es decir lo que deberia existir.",
  {},
  async () => {
    const declared = loadDeclaredState();
    return {
      content: [{ type: "text", text: JSON.stringify(declared, null, 2) }],
    };
  }
);

server.tool(
  "get_actual_state",
  "Devuelve el estado REAL de la infraestructura hoy (en este demo, simulado; en produccion vendria de la API del cloud provider).",
  {},
  async () => {
    const actual = loadState(ACTUAL_PATH);
    return {
      content: [{ type: "text", text: JSON.stringify(actual, null, 2) }],
    };
  }
);

server.tool(
  "diff_infra",
  "Compara el estado declarado contra el estado real y devuelve la lista de diferencias (drift), cada una con severidad y explicacion en lenguaje natural. Ademas registra la deteccion para el dashboard de Bobalytics.",
  {},
  async () => {
    const declared = loadDeclaredState();
    const actual = loadState(ACTUAL_PATH);
    const diffs = diffResources(declared, actual);
    const risk = summarizeRisk(diffs);

    if (diffs.length === 0) {
      const summary = {
        status: "healthy",
        drift_detectado: false,
        estado_declarado_fuente: declared.source || "snapshot_json",
        scenario_id: actual.scenario_id || "healthy",
        cantidad_de_diferencias: 0,
        risk_score: 0,
        risk_level: "none",
        detalle: [],
        message:
          "No se detecto drift. El estado real coincide exactamente con lo declarado en el codigo.",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }

    const logEntry = logDetection(diffs, risk);

    const summary = {
      status: "drift_detected",
      drift_detectado: true,
      estado_declarado_fuente: declared.source || "snapshot_json",
      scenario_id: actual.scenario_id || "custom",
      cantidad_de_diferencias: diffs.length,
      risk_score: risk.risk_score,
      risk_level: risk.risk_level,
      diferencias_alto_riesgo: risk.counts.high,
      diferencias_riesgo_medio: risk.counts.medium,
      diferencias_riesgo_bajo: risk.counts.low,
      detalle: diffs,
      registro_bobalytics: logEntry,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
    };
  }
);

server.tool(
  "get_bobalytics_summary",
  "Devuelve un resumen agregado de todas las detecciones de drift registradas hasta ahora (para mostrar impacto acumulado).",
  {},
  async () => {
    if (!existsSync(LOG_PATH)) {
      return {
        content: [{ type: "text", text: "Todavia no hay detecciones registradas." }],
      };
    }
    const lines = readFileSync(LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
    const entries = lines.map((l) => JSON.parse(l));
    const totalMinutes = entries.reduce((sum, e) => sum + e.estimated_minutes_saved, 0);
    const totalDiffs = entries.reduce((sum, e) => sum + e.total_diffs, 0);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              detecciones_totales: entries.length,
              diffs_totales_detectados: totalDiffs,
              minutos_estimados_ahorrados: totalMinutes,
              horas_estimadas_ahorradas: Math.round((totalMinutes / 60) * 10) / 10,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
