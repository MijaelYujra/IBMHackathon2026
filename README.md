# Drift Detector — IBM Bob 2.0 Hackathon

Drift Detector connects IBM Bob to infrastructure declared as code through an MCP server. It detects differences between Terraform and the observed state, explains the risk, proposes a correction, and keeps a human approval step before any change.

The demo does not use real AWS infrastructure. The declared state is generated from `infra/main.tf` using `terraform plan` and `terraform show -json`; the observed state is simulated in JSON to demonstrate security scenarios without credentials or cloud costs.

## Features

- **Terraform as the declared source:** the MCP server evaluates HCL rather than a hand-written JSON file.
- **Safe fallback:** if Terraform is unavailable, it uses a snapshot and reports that source explicitly.
- **Strict error handling:** if observed state is missing, it returns a critical alert instead of a false “no drift” result.
- **Human in the loop:** Bob detects, plans, and prepares a proposal; a human reviews it.
- **Bobalytics:** records drift, severity, and estimated time saved.

## Architecture

```text
infra/main.tf ──> terraform plan/show ──> declared state ──┐
                                                        ├──> MCP diff_infra ──> IBM Bob
actual-state.json ────────────────────> simulated actual ─┘         │
                                                                   ├── Ask: explain
                                                                   ├── Plan: propose
                                                                   └── Agent: prepare diff
                                                                            │
                                                                  human approval
```

The server exposes four MCP tools:

- `get_declared_state`
- `get_actual_state`
- `diff_infra`
- `get_bobalytics_summary`

## Requirements

- IBM Bob IDE.
- Node.js and npm.
- Terraform CLI.

## Installation

From the repository root in Windows PowerShell:

```powershell
npm.cmd --prefix .\mcp-server install
terraform -chdir=.\infra init
npm.cmd --prefix .\mcp-server run generate:declared
npm.cmd --prefix .\mcp-server test
```

The generated output should show:

```json
"source": "terraform_plan"
```

`terraform plan` runs with refresh disabled. The project never invokes `terraform apply` and does not require real AWS credentials.

## Connect IBM Bob

The configuration is in `.bob/mcp.json`.

1. Open the repository as a workspace in Bob IDE.
2. Go to **Settings → MCP** and enable **Use MCP Servers**.
3. Confirm that `drift-detector` appears as **Connected**.
4. If it appears as **Disconnected**, confirm Node.js is installed, save `.bob/mcp.json`, and select **Restart**. The configuration uses `${workspaceFolder}`, so no team member needs to enter a personal path.

## Demo

Prepare the main scenario:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-demo.ps1 high-ssh
```

Scenarios are created as isolated copies of a Terraform-derived baseline, so they can be repeated without accumulating changes:

| Scenario      | Risk   | Score | Simulated change                                |
| ------------- | ------ | ----: | ----------------------------------------------- |
| `healthy`     | none   |     0 | No drift                                        |
| `low`         | low    |    20 | `Environment` tag modified                      |
| `medium`      | medium |    55 | Instance changed from `t3.micro` to `t3.xlarge` |
| `high-ssh`    | high   |    95 | Port 22 open to `0.0.0.0/0`                     |
| `high-bucket` | high   |    92 | Bucket public-access protection disabled        |

The older names `reset`, `resize`, `open-ssh`, and `expose-bucket` remain available as aliases. The complete model is documented in [`docs/risk-model.md`](docs/risk-model.md).

In Bob, Ask mode:

> Use `diff_infra` from the `drift-detector` server. Confirm where the declared state came from, detect the drift, explain the risk, and prioritize the correction.

In Plan mode:

> Create a plan to correct the finding without downtime. Do not apply changes.

In Agent mode:

> Prepare a proposal to return the observed state to the Terraform-declared state. Do not modify `infra/main.tf`, do not run `terraform apply`, and leave it ready for human review.

When finished, reset the simulated state:

```powershell
node .\scripts\inject-drift.js reset
```

## Website and dashboard

Each detection writes an entry to `logs/bobalytics-log.jsonl`.

The web experience has four separate views:

- `dashboard/index.html`: bilingual 3ntropy landing page.
- `dashboard/console.html`: automated local scenario execution, MCP comparison, recommendations, real IBM Bob analysis, human approval, and report download.
- `dashboard/impact.html`: metrics dashboard using the visual style created by the team.
- `dashboard/replay.html`: static public Vercel mode that replays verified Bob runs without running Bob, Terraform, or cloud APIs.

To start the site with the local API:

```powershell
npm.cmd --prefix .\mcp-server run web
```

Open `http://127.0.0.1:4173`. From the landing page, you can open the console or the dashboard. The console needs this local server; the dashboard can also load `logs/bobalytics-log.jsonl` manually.

### Local IBM Bob: Ask, Plan, and Agent

After running a scenario, select **Run IBM Bob analysis** in the console. The backend runs `bob.cmd run --format stream-json` locally in three phases: `ask`, `plan`, and `agent`. Each phase has a default limit of USD 0.20, three turns, and 90 seconds. Bob must be installed, authenticated, and trust the workspace; this workflow does not run on static hosting.

For each run, the console captures events and creates `context.json`, `detection.json`, `ask.json`, `plan.json`, `agent.json`, and `final-report.json` in `demo-runs/<run-id>/`. That folder is excluded from Git so local data is not published. Prompts prohibit `terraform apply`, file changes, and infrastructure changes; final approval only resets the local simulated state.

You can adjust limits before starting the website:

```powershell
$env:DRIFT_BOB_MAX_COST = "0.20"
$env:DRIFT_BOB_MAX_TURNS = "3"
$env:DRIFT_BOB_TIMEOUT_MS = "90000"
npm.cmd --prefix .\mcp-server run web
```

### Export a real run for Hosted Replay

After a local Bob run completes successfully, export only sanitized artifacts to the public site:

```powershell
node .\scripts\export-replay.js <run-id> high-ssh-bob-run
```

The script requires a completed Bob run, generates `dashboard/replays/<slug>.json`, and updates `dashboard/replays/index.json`. Review that JSON before committing: a published replay must be a real run, not a manually authored response. Until recordings are available, the site shows guided MCP previews that are clearly marked as such.

### Static Vercel deployment

Hosted Replay can be deployed without secrets. In Vercel, import the repository, set **Root Directory** to `dashboard`, select **Other** as the Framework Preset, and leave Build Command empty. Then deploy and test `/replay.html` in an incognito window. `console.html` remains local-only because it needs Bob Shell, Terraform, and the MCP server over STDIO.

With the Vercel CLI, after signing in, the equivalent is:

```powershell
cd .\dashboard
vercel link
vercel --prod
```

## Main structure

```text
infra/main.tf                          Declared Terraform configuration
mcp-server/index.js                    MCP server
mcp-server/terraform-declared-state.js Terraform generator and normalizer
mcp-server/state/actual-state.json     Simulated observed state
scripts/inject-drift.js                Scenario injection and reset
scripts/start-demo.ps1                 Windows demo preparation
mcp-server/scenario-engine.js          Scenario catalog and reproducible execution
mcp-server/drift-engine.js             Comparison and risk scoring
mcp-server/recommendation-engine.js    EN/ES findings and recommended actions
mcp-server/bob-runner.js               IBM Bob stream-json adapter and local artifacts
mcp-server/web-server.js               Local API and web-experience server
dashboard/index.html                   Bilingual 3ntropy landing page
dashboard/console.html                 Automated response console
dashboard/impact.html                  Impact dashboard
dashboard/replay.html                  Static public replay viewer
dashboard/replays/                     Reviewed IBM Bob runs for Vercel
scripts/export-replay.js               Sanitized local-run exporter
pasos.txt                              Team operating guide
```

## Roadmap

- Query a cloud provider through its SDK with read-only permissions.
- Extend the normalizer to Terraform modules and more resource types.
- Integrate external approval without enabling blind automatic execution.

## Team

- Alexandra Cristal Salazar Gisbert
- Sheyla Micaela Condori Alcazar
- Mijael Daniel Yujra Apaza

## Deployed project

<https://3ntropy-drift-detector.vercel.app/>

## Media

<img width="1903" height="952" alt="3ntropy Drift Detector dashboard" src="https://github.com/user-attachments/assets/fa32ceee-1f05-47a0-8e7e-529959f85345" />

## IBM Bob Evidence

As required for the hackathon, the evidence of IBM Bob's assistance, including the list of assisted files and the session summary screenshots from all team members, can be found in the [`ibm-bob-evidence/`](./ibm-bob-evidence/) directory.
