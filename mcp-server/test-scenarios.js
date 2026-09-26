#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { diffResources, summarizeRisk } from "./drift-engine.js";
import { applyScenario } from "./scenario-engine.js";
import { loadDeclaredState } from "./terraform-declared-state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const actualPath = path.join(__dirname, "state", "actual-state.json");
const declared = loadDeclaredState();

const expectations = [
  { id: "healthy", differences: 0, level: "none", score: 0 },
  { id: "low", differences: 1, level: "low", score: 20 },
  { id: "medium", differences: 1, level: "medium", score: 55 },
  { id: "high-ssh", differences: 1, level: "high", score: 95 },
  { id: "high-bucket", differences: 1, level: "high", score: 92 },
];

try {
  for (const expectation of expectations) {
    const scenario = applyScenario(expectation.id, declared, actualPath);
    const actual = JSON.parse(readFileSync(actualPath, "utf8"));
    const differences = diffResources(declared, actual);
    const risk = summarizeRisk(differences);

    if (differences.length !== expectation.differences) {
      throw new Error(
        `${expectation.id}: se esperaban ${expectation.differences} diferencias y se obtuvieron ${differences.length}.`
      );
    }
    if (risk.risk_level !== expectation.level) {
      throw new Error(
        `${expectation.id}: se esperaba nivel ${expectation.level} y se obtuvo ${risk.risk_level}.`
      );
    }
    if (risk.risk_score !== expectation.score) {
      throw new Error(
        `${expectation.id}: se esperaba score ${expectation.score} y se obtuvo ${risk.risk_score}.`
      );
    }
    if (scenario.expected_risk_score !== risk.risk_score) {
      throw new Error(`${expectation.id}: el catalogo y el motor de riesgo no coinciden.`);
    }

    console.log(
      `PASS ${expectation.id}: diffs=${differences.length}, level=${risk.risk_level}, score=${risk.risk_score}`
    );
  }

  applyScenario("high-ssh", declared, actualPath);
  applyScenario("high-ssh", declared, actualPath);
  const repeated = JSON.parse(readFileSync(actualPath, "utf8"));
  const sshRules = repeated.resources[
    "aws_security_group.app_sg"
  ].ingress_rules.filter(
    (rule) =>
      rule.from_port === 22 &&
      rule.to_port === 22 &&
      rule.cidr_blocks?.includes("0.0.0.0/0")
  );
  if (sshRules.length !== 1) {
    throw new Error(`Idempotencia SSH invalida: se encontraron ${sshRules.length} reglas.`);
  }
  console.log("PASS idempotency: repeated scenarios always rebuild a clean baseline.");
} finally {
  applyScenario("healthy", declared, actualPath);
}
