# Plan: Remediate Rogue SSH Ingress Rule — Zero Downtime

## Overview

A manually added SSH ingress rule (port 22, `0.0.0.0/0`) was detected on `aws_security_group.app_sg`
that does not exist in the Terraform code (`infra/main.tf`). This is a high-severity security drift.

**Goal:** Remove the rogue rule and restore the security group to its declared state without
interrupting HTTPS traffic to the application.

**Scope:**
- `infra/main.tf` — no changes needed (declared state is already correct)
- `mcp-server/state/actual-state.json` — update to reflect the corrected real state (in this demo)
- No `terraform apply` or real cloud changes are executed as part of this plan

**Non-goals:**
- Adding SSH access via a restricted CIDR (not requested)
- Modifying any other resource
- Changing CI/CD or automation scripts

**Zero-downtime rationale:** Removing a security group *ingress* rule affects only new inbound
connections on port 22. Existing HTTPS connections (port 443) are on a separate rule and are
completely unaffected. The application has no SSH-dependent runtime path.

---

## Sub-Tasks

---

### Sub-Task 1 — Verify the Declared State is Correct

**Intent:**
Confirm that `infra/main.tf` already declares the security group with only the HTTPS rule.
No edits are needed here — this step is a pre-flight check to avoid accidentally introducing
a change.

**Expected Outcomes:**
- `aws_security_group.app_sg` in `infra/main.tf` contains exactly one `ingress` block (port 443).
- No port 22 rule exists anywhere in the `.tf` files.

**Todo List:**
- [ ] Read `infra/main.tf` and confirm `aws_security_group.app_sg` has only the HTTPS ingress block.
- [ ] Confirm no other `.tf` file declares a port-22 rule for this security group.

**Relevant Context:**
- [`infra/main.tf`](infra/main.tf) — the single Terraform file in this project.
- Declared state snapshot: [`infra/declared-state.json`](infra/declared-state.json)

**Status:** `[ ] pending`

---

### Sub-Task 2 — Remove the Rogue SSH Rule from the Actual State

**Intent:**
Update `mcp-server/state/actual-state.json` to remove the manually added SSH ingress rule,
making the simulated real state match the declared Terraform state. In a live environment
this corresponds to deleting the inbound rule in the AWS Console or running `terraform apply`.

**Expected Outcomes:**
- `aws_security_group.app_sg.ingress_rules` in `actual-state.json` contains only the HTTPS rule.
- The SSH rule `{ "from_port": 22, "to_port": 22, "cidr_blocks": ["0.0.0.0/0"] }` no longer exists.

**Todo List:**
- [ ] Open `mcp-server/state/actual-state.json`.
- [ ] Remove the SSH ingress rule object from the `ingress_rules` array of `aws_security_group.app_sg`.
- [ ] Verify the remaining array contains exactly one entry (the HTTPS rule).
- [ ] Save the file.

**Relevant Context:**
- [`mcp-server/state/actual-state.json`](mcp-server/state/actual-state.json) — simulated live state.
- [`mcp-server/state/declared-state.json`](mcp-server/state/declared-state.json) — target state to match.

**Status:** `[ ] pending`

---

### Sub-Task 3 — Re-run drift_infra to Confirm Zero Drift

**Intent:**
Call the `diff_infra` MCP tool again to verify that no drift remains after the correction.
This is the acceptance test for the remediation.

**Expected Outcomes:**
- `drift_detectado: false`
- `cantidad_de_diferencias: 0`
- `diferencias_alto_riesgo: 0`

**Todo List:**
- [ ] Call the `diff_infra` tool from the drift-detector MCP server.
- [ ] Confirm the result shows no differences.
- [ ] Record the Bobalytics entry for the successful remediation.

**Relevant Context:**
- MCP tool: `mcp__drift-detector__diff_infra`
- MCP tool: `mcp__drift-detector__get_bobalytics_summary` — for recording impact.

**Status:** `[ ] pending`

---

## Rollback

Because only a security group ingress rule is being removed, rollback is instant if needed:

- Re-run `node scripts/inject-drift.js open-ssh` to restore the SSH rule in the simulated state.
- In a real environment: add the rule back in the AWS Console while a proper IaC change is reviewed.

---

## Prevention (Post-Remediation Recommendations)

These are out of scope for this plan but should be tracked as follow-up work:

1. **Enable AWS Config rule `restricted-ssh`** — alerts whenever port 22 is opened to `0.0.0.0/0`.
2. **Add an SCP (Service Control Policy)** at the AWS Organization level to deny manual security group changes outside of the IaC pipeline.
3. **Schedule nightly drift detection** using `scripts/run-drift-check.sh` via cron or a CI job.
