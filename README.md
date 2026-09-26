# Drift Detector — IBM Bob 2.0 Hackathon

Drift Detector conecta IBM Bob con infraestructura declarada como código mediante
un servidor MCP. Detecta diferencias entre Terraform y el estado real, explica el
riesgo, propone una corrección y mantiene una aprobación humana antes de cualquier
cambio.

El demo no usa infraestructura AWS real. El estado declarado se genera desde
`infra/main.tf` con `terraform plan` + `terraform show -json`; el estado real se
simula en JSON para demostrar escenarios de seguridad sin credenciales ni costos.

## Características

- **Terraform real como fuente declarada:** el MCP evalúa el HCL, no un JSON escrito a mano.
- **Fallback seguro:** si Terraform no responde, usa un snapshot y lo informa explícitamente.
- **Manejo estricto de errores:** si falta el estado real, devuelve una alerta crítica en vez de un falso “sin drift”.
- **Human-in-the-loop:** Bob detecta, planifica y prepara el cambio; un humano lo revisa.
- **Bobalytics:** registra drifts, severidad y tiempo estimado ahorrado.

## Arquitectura

```text
infra/main.tf ──> terraform plan/show ──> estado declarado ─┐
                                                            ├─> MCP diff_infra ─> IBM Bob
actual-state.json ────────────────> estado real simulado ───┘          │
                                                                        ├─ Ask: explica
                                                                        ├─ Plan: propone
                                                                        └─ Agent: prepara diff
                                                                                 │
                                                                       aprobación humana
```

El servidor expone cuatro tools MCP:

- `get_declared_state`
- `get_actual_state`
- `diff_infra`
- `get_bobalytics_summary`

## Requisitos

- IBM Bob IDE.
- Node.js y npm.
- Terraform CLI.

## Instalación

Desde la raíz del repositorio, en Windows PowerShell:

```powershell
npm.cmd --prefix .\mcp-server install
terraform -chdir=.\infra init
npm.cmd --prefix .\mcp-server run generate:declared
npm.cmd --prefix .\mcp-server test
```

La generación debe mostrar:

```json
"source": "terraform_plan"
```

`terraform plan` se ejecuta con refresh desactivado. El proyecto nunca ejecuta
`terraform apply` ni necesita credenciales AWS reales.

## Conectar IBM Bob

La configuración está en `.bob/mcp.json`.

1. Abre el repositorio como workspace en Bob IDE.
2. Ve a **Settings → MCP** y activa **Use MCP Servers**.
3. Confirma que `drift-detector` aparezca como **Connected**.
4. Si aparece **Disconnected**, confirma que Node.js esté instalado, guarda
   `.bob/mcp.json` y pulsa **Restart**. La configuración usa `${workspaceFolder}`,
   por lo que ningún integrante debe escribir una ruta personal.

## Demo

Prepara el escenario principal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-demo.ps1 open-ssh
```

También están disponibles `resize` y `expose-bucket`.

En Bob, modo Ask:

> Usa `diff_infra` del servidor `drift-detector`. Confirma de dónde se obtuvo el estado declarado, detecta el drift, explica el riesgo y prioriza la corrección.

En modo Plan:

> Crea un plan para corregir el hallazgo sin downtime. No apliques cambios.

En modo Agent:

> Prepara la corrección y déjala lista para revisión humana. No ejecutes `terraform apply`.

Al terminar, restablece el estado simulado:

```powershell
node .\scripts\inject-drift.js reset
```

## Sitio y dashboard

Cada detección escribe una entrada en `logs/bobalytics-log.jsonl`.

1. Abre `dashboard/index.html` para ver la introducción bilingüe EN/ES de 3ntropy.
2. Entra a **Open Impact Dashboard** o abre `dashboard/impact.html`.
3. Selecciona `logs/bobalytics-log.jsonl` para mostrar detecciones, diferencias,
   riesgos altos y tiempo estimado ahorrado.

## Estructura principal

```text
infra/main.tf                         Terraform declarado
mcp-server/index.js                   Servidor MCP
mcp-server/terraform-declared-state.js Generador y normalizador Terraform
mcp-server/state/actual-state.json    Estado real simulado
scripts/inject-drift.js               Inyección y reset de escenarios
scripts/start-demo.ps1                Preparación del demo en Windows
dashboard/index.html                  Landing bilingüe de 3ntropy
dashboard/impact.html                 Dashboard de impacto
pasos.txt                             Guía operativa para el equipo
```

## Roadmap

- Consultar un proveedor cloud mediante su SDK con permisos de solo lectura.
- Extender el normalizador a módulos y más tipos de recursos Terraform.
- Integrar una aprobación externa sin habilitar ejecución automática ciega.

## Equipo

- Alexandra Cristal Salazar Gisbert
- Sheyla Micaela Condori Alcazar
- Mijael Daniel Yujra Apaza
