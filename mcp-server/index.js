#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, "state");
const DECLARED_PATH = path.join(STATE_DIR, "declared-state.json");
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

function diffResources(declared, actual) {
  const diffs = [];
  const declaredResources = declared.resources || {};
  const actualResources = actual.resources || {};

  const allKeys = new Set([
    ...Object.keys(declaredResources),
    ...Object.keys(actualResources),
  ]);

  for (const key of allKeys) {
    const d = declaredResources[key];
    const a = actualResources[key];

    if (!d) {
      diffs.push({
        resource: key,
        field: "(recurso completo)",
        declared: null,
        actual: a,
        severity: "media",
        explanation: "Existe en el estado real pero no esta declarado en el codigo.",
      });
      continue;
    }
    if (!a) {
      diffs.push({
        resource: key,
        field: "(recurso completo)",
        declared: d,
        actual: null,
        severity: "alta",
        explanation: "Esta declarado en el codigo pero no existe en el estado real (puede haber sido borrado manualmente).",
      });
      continue;
    }

    diffFields(key, d, a, diffs);
  }

  return diffs;
}

function diffFields(resourceKey, declaredObj, actualObj, diffs, prefix = "") {
  const keys = new Set([...Object.keys(declaredObj), ...Object.keys(actualObj)]);

  for (const field of keys) {
    const dVal = declaredObj[field];
    const aVal = actualObj[field];
    const fieldPath = prefix ? `${prefix}.${field}` : field;

    const dStr = JSON.stringify(dVal);
    const aStr = JSON.stringify(aVal);

    if (dStr === aStr) continue;

    diffs.push({
      resource: resourceKey,
      field: fieldPath,
      declared: dVal,
      actual: aVal,
      severity: classifySeverity(resourceKey, fieldPath),
      explanation: buildExplanation(resourceKey, fieldPath, dVal, aVal),
    });
  }
}

function classifySeverity(resourceKey, fieldPath) {
  const lower = `${resourceKey}.${fieldPath}`.toLowerCase();
  if (lower.includes("ingress") || lower.includes("public_access") || lower.includes("security_group")) {
    return "alta";
  }
  if (lower.includes("instance_type") || lower.includes("size")) {
    return "media";
  }
  return "baja";
}

function buildExplanation(resourceKey, fieldPath, dVal, aVal) {
  return `En "${resourceKey}", el campo "${fieldPath}" deberia ser ${JSON.stringify(dVal)} segun el codigo, pero el estado real tiene ${JSON.stringify(aVal)}.`;
}

function logDetection(diffs) {
  const highRisk = diffs.filter((d) => d.severity === "alta").length;
  const entry = {
    timestamp: new Date().toISOString(),
    total_diffs: diffs.length,
    high_risk_diffs: highRisk,
    estimated_minutes_saved: diffs.length * 25 + highRisk * 15,
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
    const declared = loadState(DECLARED_PATH);
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
    const declared = loadState(DECLARED_PATH);
    const actual = loadState(ACTUAL_PATH);
    const diffs = diffResources(declared, actual);

    if (diffs.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No se detecto drift. El estado real coincide exactamente con lo declarado en el codigo.",
          },
        ],
      };
    }

    const logEntry = logDetection(diffs);

    const summary = {
      drift_detectado: true,
      cantidad_de_diferencias: diffs.length,
      diferencias_alto_riesgo: diffs.filter((d) => d.severity === "alta").length,
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
