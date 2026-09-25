#!/usr/bin/env node
/** Convert `terraform show -json` output into the small state shape used by the demo. */

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "infra", "plan.json"));
const outputPath = path.resolve(process.argv[3] || path.join(rootDir, "infra", "declared-state.generated.json"));
const plan = JSON.parse(readFileSync(inputPath, "utf8").replace(/^\uFEFF/, ""));
const resources = {};
const configuredResources = new Map();

function visitConfiguration(module) {
  for (const resource of module?.resources || []) configuredResources.set(resource.address, resource);
  for (const child of module?.child_modules || []) visitConfiguration(child);
}
visitConfiguration(plan.configuration?.root_module);

function visitModule(module) {
  for (const resource of module?.resources || []) {
    if (resource.mode !== "managed") continue;
    const values = resource.values || {};
    switch (resource.type) {
      case "aws_vpc":
        resources[resource.address] = { type: resource.type, cidr_block: values.cidr_block };
        break;
      case "aws_security_group":
        resources[resource.address] = {
          type: resource.type,
          name: values.name,
          ingress_rules: (values.ingress || []).map((rule) => ({
            description: rule.description,
            from_port: rule.from_port,
            to_port: rule.to_port,
            protocol: rule.protocol,
            cidr_blocks: rule.cidr_blocks || [],
          })),
        };
        break;
      case "aws_s3_bucket":
        resources[resource.address] = { type: resource.type, bucket: values.bucket };
        break;
      case "aws_s3_bucket_public_access_block":
        break;
      case "aws_instance":
        // IDs are unknown before apply. Resolve referenced SG IDs to their
        // declared names so the demo state remains comparable/readable.
        const sgRefs = configuredResources.get(resource.address)?.expressions?.vpc_security_group_ids?.references || [];
        const sgNames = sgRefs
          .map((ref) => ref.match(/^(aws_security_group\.[^.]+)/)?.[1])
          .filter(Boolean)
          .map((address) => ({
            address,
            name: configuredResources.get(address)?.expressions?.name?.constant_value,
          }))
          .map(({ address, name }) => name || address)
          .filter((name, index, list) => list.indexOf(name) === index);
        resources[resource.address] = {
          type: resource.type,
          instance_type: values.instance_type,
          security_groups: values.vpc_security_group_ids?.length ? values.vpc_security_group_ids : sgNames,
        };
        break;
      default:
        break;
    }
  }
  for (const child of module?.child_modules || []) visitModule(child);
}

visitModule(plan.planned_values?.root_module || plan.prior_state?.values?.root_module);

// Keep the demo's friendly bucket flag on the bucket entry as well as preserving
// the explicit public access block resource from Terraform's plan.
const blockResource = (plan.planned_values?.root_module?.resources || [])
  .find((resource) => resource.type === "aws_s3_bucket_public_access_block");
if (blockResource && resources["aws_s3_bucket.data"]) {
  const block = blockResource.values || {};
  resources["aws_s3_bucket.data"].public_access_blocked = block.block_public_acls === true
    && block.block_public_policy === true
    && block.ignore_public_acls === true
    && block.restrict_public_buckets === true;
}

if (Object.keys(resources).length === 0) {
  throw new Error(`No se encontraron recursos administrados en ${inputPath}. ¿Es un JSON de terraform show -json?`);
}

writeFileSync(outputPath, `${JSON.stringify({ generated_note: `Generado desde ${path.relative(rootDir, inputPath)}`, resources }, null, 2)}\n`);
console.log(`Estado declarado generado: ${path.relative(rootDir, outputPath)} (${Object.keys(resources).length} recursos).`);
