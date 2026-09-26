#!/usr/bin/env node
/**
 * Builds one reproducible local drift scenario from a clean Terraform baseline.
 * It never contacts AWS and never executes terraform apply.
 *
 * Canonical scenarios:
 *   healthy      -> no drift
 *   low          -> Environment tag changed
 *   medium       -> EC2 instance resized
 *   high-ssh     -> public SSH exposure
 *   high-bucket  -> public S3 exposure
 *
 * Backward-compatible aliases:
 *   reset -> healthy | resize -> medium
 *   open-ssh -> high-ssh | expose-bucket -> high-bucket
 */

import { fileURLToPath } from "url";
import path from "path";
import { loadDeclaredState } from "../mcp-server/terraform-declared-state.js";
import {
  applyScenario,
  listScenarios,
} from "../mcp-server/scenario-engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const actualPath = path.join(
  __dirname,
  "..",
  "mcp-server",
  "state",
  "actual-state.json"
);
const requestedScenario = process.argv[2];

if (!requestedScenario || ["--help", "-h"].includes(requestedScenario)) {
  console.log("Uso: node scripts/inject-drift.js <scenario>");
  console.log(`Escenarios: ${listScenarios().map((item) => item.id).join(" | ")}`);
  process.exit(requestedScenario ? 0 : 1);
}

try {
  const declared = loadDeclaredState();
  const summary = applyScenario(requestedScenario, declared, actualPath);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
