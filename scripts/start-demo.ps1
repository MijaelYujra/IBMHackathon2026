param(
  [ValidateSet("healthy", "low", "medium", "high-ssh", "high-bucket", "open-ssh", "resize", "expose-bucket")]
  [string]$Scenario = "high-ssh"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Preparando demo con el escenario: $Scenario" -ForegroundColor Cyan
node "$ProjectRoot\scripts\inject-drift.js" $Scenario

Write-Host "Comprobando que el servidor MCP detecta el drift..." -ForegroundColor Cyan
npm.cmd --prefix "$ProjectRoot\mcp-server" run test:mcp

Write-Host ""
Write-Host "Demo lista. En Bob IDE usa este prompt:" -ForegroundColor Green
Write-Host 'Usa la herramienta diff_infra del servidor MCP drift-detector. Detecta el drift, explica el riesgo y prioriza la correccion.'
Write-Host ""
Write-Host "Al terminar, restablece el escenario con:" -ForegroundColor Yellow
Write-Host "node scripts\inject-drift.js reset"
