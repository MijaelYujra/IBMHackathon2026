# Terraform safety boundary

This repository is a local hackathon demonstration. The AWS resources are
illustrative and must never be created, changed, or destroyed in a real cloud
account.

- Never run `terraform apply`, `terraform destroy`, or an equivalent command.
- Never add `-auto-approve` to a Terraform command.
- Only use read-only or local planning commands such as `terraform fmt`,
  `terraform validate`, `terraform plan -refresh=false`, and
  `terraform show -json`.
- Do not replace the intentionally fake AWS credentials with real credentials.
- Any remediation must be prepared as a proposal and must stop for human
  review before changing the simulated state.
- If a request conflicts with these rules, explain the safety boundary and
  produce a plan or patch for review instead of executing the change.
