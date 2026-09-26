#!/usr/bin/env node
/**
 * inject-drift.js
 *
 * Simula que alguien entro a la consola de AWS y cambio algo a mano,
 * sin pasar por Terraform. Usalo antes del demo para que Bob tenga
 * algo real que detectar.
 *
 * Uso:
 *   node scripts/inject-drift.js open-ssh     -> abre el puerto 22 a 0.0.0.0/0 (drift de seguridad)
 *   node scripts/inject-drift.js resize       -> cambia el tamano de la instancia (drift de costo)
 *   node scripts/inject-drift.js expose-bucket -> desactiva el bloqueo de acceso publico del bucket
 *   node scripts/inject-drift.js reset        -> vuelve el estado real a igual al declarado (sin drift)
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { loadDeclaredState } from "../mcp-server/terraform-declared-state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const actualPath = path.join(__dirname, "..", "mcp-server", "state", "actual-state.json");

const scenario = process.argv[2];

if (!scenario) {
  console.error("Falta el escenario. Usa: open-ssh | resize | expose-bucket | reset");
  process.exit(1);
}

const actual = JSON.parse(readFileSync(actualPath, "utf-8"));

switch (scenario) {
  case "open-ssh": {
    const ingressRules =
      actual.resources["aws_security_group.app_sg"].ingress_rules;
    const alreadyInjected = ingressRules.some(
      (rule) =>
        rule.from_port === 22 &&
        rule.to_port === 22 &&
        rule.protocol === "tcp" &&
        rule.cidr_blocks?.includes("0.0.0.0/0")
    );

    if (alreadyInjected) {
      console.log("El escenario ya estaba activo: no se duplico la regla SSH.");
      break;
    }

    ingressRules.push({
      description: "SSH (agregado manualmente, no esta en el codigo)",
      from_port: 22,
      to_port: 22,
      protocol: "tcp",
      cidr_blocks: ["0.0.0.0/0"],
    });
    console.log("Drift inyectado: puerto 22 abierto a internet en el security group (no declarado en Terraform).");
    break;
  }
  case "resize": {
    actual.resources["aws_instance.app_server"].instance_type = "t3.xlarge";
    console.log("Drift inyectado: la instancia real es t3.xlarge pero el codigo dice t3.micro (costo/rendimiento).");
    break;
  }
  case "expose-bucket": {
    actual.resources["aws_s3_bucket.data"].public_access_blocked = false;
    console.log("Drift inyectado: el bucket S3 quedo con acceso publico habilitado, contradice el codigo.");
    break;
  }
  case "reset": {
    const declared = loadDeclaredState();
    const resetState = {
      generated_note:
        "Estado actual simulado. Restablecido desde el estado declarado generado por Terraform.",
      resources: declared.resources,
    };
    writeFileSync(actualPath, `${JSON.stringify(resetState, null, 2)}\n`);
    console.log(
      `Estado real reseteado desde ${declared.source || "snapshot_json"}: ahora coincide con lo declarado (sin drift).`
    );
    process.exit(0);
  }
  default: {
    console.error(`Escenario desconocido: ${scenario}`);
    process.exit(1);
  }
}

writeFileSync(actualPath, JSON.stringify(actual, null, 2));
