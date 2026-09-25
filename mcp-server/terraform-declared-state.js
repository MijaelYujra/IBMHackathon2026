#!/usr/bin/env node
/**
 * Generates the declared infrastructure state from a saved Terraform plan.
 * No cloud resources are read or changed.
 */
import { execFileSync } from "child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const INFRA_DIR = path.join(PROJECT_ROOT, "infra");
const MAIN_TF_PATH = path.join(INFRA_DIR, "main.tf");
const FALLBACK_PATH = path.join(__dirname, "state", "declared-state.json");

let cachedDeclaredState;
let cachedMainTfMtime;

function terraformEnvironment() {
  return {
    ...process.env,
    // Intentionally fake values. Provider validation and remote refresh are disabled.
    AWS_ACCESS_KEY_ID:
      process.env.AWS_ACCESS_KEY_ID || "drift_detector_mock_access_key",
    AWS_SECRET_ACCESS_KEY:
      process.env.AWS_SECRET_ACCESS_KEY || "drift_detector_mock_secret_key",
    AWS_EC2_METADATA_DISABLED: "true",
  };
}

function collectResources(moduleValue, destination = []) {
  if (!moduleValue) return destination;
  destination.push(...(moduleValue.resources || []));
  for (const child of moduleValue.child_modules || []) {
    collectResources(child, destination);
  }
  return destination;
}

function collectConfiguredResources(moduleValue, destination = []) {
  if (!moduleValue) return destination;
  destination.push(...(moduleValue.resources || []));
  for (const moduleCall of Object.values(moduleValue.module_calls || {})) {
    collectConfiguredResources(moduleCall.module, destination);
  }
  return destination;
}

function normalizeIngressRules(rules = []) {
  return rules.map((rule) => ({
    description: rule.description ?? null,
    from_port: rule.from_port ?? null,
    to_port: rule.to_port ?? null,
    protocol: rule.protocol ?? null,
    cidr_blocks: rule.cidr_blocks || [],
  }));
}

function referencedResourceAddress(configResource, expressionName, prefix) {
  const references =
    configResource?.expressions?.[expressionName]?.references || [];
  const reference = references.find((item) => item.startsWith(prefix));
  return reference?.replace(/\.id$/, "");
}

export function normalizePlan(plan) {
  const plannedResources = collectResources(plan.planned_values?.root_module);
  const configuredResources = collectConfiguredResources(
    plan.configuration?.root_module
  );
  const configuredByAddress = new Map(
    configuredResources.map((resource) => [resource.address, resource])
  );
  const plannedByAddress = new Map(
    plannedResources.map((resource) => [resource.address, resource])
  );
  const normalized = {};

  for (const resource of plannedResources) {
    if (resource.mode !== "managed") continue;
    const values = resource.values || {};

    if (resource.type === "aws_vpc") {
      normalized[resource.address] = {
        type: resource.type,
        cidr_block: values.cidr_block,
      };
    }

    if (resource.type === "aws_security_group") {
      normalized[resource.address] = {
        type: resource.type,
        name: values.name,
        ingress_rules: normalizeIngressRules(values.ingress),
      };
    }

    if (resource.type === "aws_s3_bucket") {
      normalized[resource.address] = {
        type: resource.type,
        bucket: values.bucket,
      };
    }

    if (resource.type === "aws_instance") {
      const configResource = configuredByAddress.get(resource.address);
      const securityGroupAddress = referencedResourceAddress(
        configResource,
        "vpc_security_group_ids",
        "aws_security_group."
      );
      const securityGroupName = securityGroupAddress
        ? plannedByAddress.get(securityGroupAddress)?.values?.name
        : undefined;

      normalized[resource.address] = {
        type: resource.type,
        instance_type: values.instance_type,
        security_groups: securityGroupName
          ? [securityGroupName]
          : values.security_groups || [],
      };
    }
  }

  for (const resource of plannedResources) {
    if (resource.type !== "aws_s3_bucket_public_access_block") continue;
    const configResource = configuredByAddress.get(resource.address);
    const bucketAddress = referencedResourceAddress(
      configResource,
      "bucket",
      "aws_s3_bucket."
    );
    const target = bucketAddress ? normalized[bucketAddress] : undefined;
    if (!target) continue;

    const values = resource.values || {};
    target.public_access_blocked = [
      values.block_public_acls,
      values.block_public_policy,
      values.ignore_public_acls,
      values.restrict_public_buckets,
    ].every(Boolean);
  }

  return {
    generated_note:
      "Generado automaticamente desde infra/main.tf mediante terraform plan y terraform show -json.",
    source: "terraform_plan",
    resources: normalized,
  };
}

export function generateDeclaredState() {
  const terraformBinary =
    process.env.TERRAFORM_BIN ||
    (process.platform === "win32" &&
    existsSync("C:\\Tools\\Terraform\\terraform.exe")
      ? "C:\\Tools\\Terraform\\terraform.exe"
      : "terraform");
  const planPath = path.join(
    os.tmpdir(),
    `drift-detector-${process.pid}-${Date.now()}.tfplan`
  );
  const options = {
    cwd: INFRA_DIR,
    encoding: "utf8",
    env: terraformEnvironment(),
    maxBuffer: 20 * 1024 * 1024,
    timeout: 90_000,
    windowsHide: true,
  };

  try {
    execFileSync(
      terraformBinary,
      [
        "plan",
        "-refresh=false",
        "-input=false",
        "-lock=false",
        `-out=${planPath}`,
      ],
      options
    );
    const planJson = execFileSync(
      terraformBinary,
      ["show", "-json", planPath],
      options
    );
    return normalizePlan(JSON.parse(planJson));
  } finally {
    if (existsSync(planPath)) unlinkSync(planPath);
  }
}

export function loadDeclaredState() {
  const currentMtime = statSync(MAIN_TF_PATH).mtimeMs;
  if (cachedDeclaredState && cachedMainTfMtime === currentMtime) {
    return cachedDeclaredState;
  }

  try {
    cachedDeclaredState = generateDeclaredState();
  } catch (error) {
    const fallback = JSON.parse(readFileSync(FALLBACK_PATH, "utf8"));
    cachedDeclaredState = {
      ...fallback,
      source: "fallback_json",
      warning:
        "Terraform no pudo generar el plan; se uso el snapshot JSON de respaldo.",
      terraform_error: error.message,
    };
    console.error(`[drift-detector] Terraform fallback: ${error.message}`);
  }
  cachedMainTfMtime = currentMtime;
  return cachedDeclaredState;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    console.log(JSON.stringify(generateDeclaredState(), null, 2));
  } catch (error) {
    console.error(`No se pudo generar el estado desde Terraform: ${error.message}`);
    process.exitCode = 1;
  }
}
