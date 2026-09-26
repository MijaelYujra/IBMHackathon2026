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
powershell -ExecutionPolicy Bypass -File .\scripts\start-demo.ps1 high-ssh
```

Todos los escenarios comienzan desde una línea base limpia generada desde
Terraform, por lo que pueden repetirse sin acumular cambios:

| Escenario | Riesgo | Score | Cambio simulado |
|---|---|---:|---|
| `healthy` | ninguno | 0 | Sin drift |
| `low` | bajo | 20 | Etiqueta `Environment` modificada |
| `medium` | medio | 55 | Instancia `t3.micro` cambiada a `t3.xlarge` |
| `high-ssh` | alto | 95 | Puerto 22 abierto a `0.0.0.0/0` |
| `high-bucket` | alto | 92 | Protección pública del bucket desactivada |

Los nombres anteriores `reset`, `resize`, `open-ssh` y `expose-bucket` siguen
funcionando como alias. El modelo completo está documentado en
[`docs/risk-model.md`](docs/risk-model.md).

En Bob, modo Ask:

> Usa `diff_infra` del servidor `drift-detector`. Confirma de dónde se obtuvo el estado declarado, detecta el drift, explica el riesgo y prioriza la corrección.

En modo Plan:

> Crea un plan para corregir el hallazgo sin downtime. No apliques cambios.

En modo Agent:

> Prepara una propuesta para devolver el estado observado a lo declarado en Terraform. No modifiques `infra/main.tf`, no ejecutes `terraform apply` y déjala lista para revisión humana.

Al terminar, restablece el estado simulado:

```powershell
node .\scripts\inject-drift.js reset
```

## Sitio y dashboard

Cada detección escribe una entrada en `logs/bobalytics-log.jsonl`.

La experiencia web tiene tres vistas con responsabilidades separadas:

- `dashboard/index.html`: página principal bilingüe de 3ntropy.
- `dashboard/console.html`: ejecución local automática de escenarios, comparación
  MCP, recomendaciones, análisis real con IBM Bob, aprobación humana y descarga
  del reporte.
- `dashboard/impact.html`: dashboard de métricas con la estética creada por el equipo.

Para iniciar la web con la API local:

```powershell
npm.cmd --prefix .\mcp-server run web
```

Abre `http://127.0.0.1:4173`. Desde la página principal puedes entrar a la
consola o al dashboard. La consola necesita este servidor local; el dashboard
también permite cargar manualmente `logs/bobalytics-log.jsonl`.

### IBM Bob local: Ask, Plan y Agent

Después de ejecutar un escenario, usa **Run IBM Bob analysis** dentro de la
consola. El backend ejecuta `bob.cmd run --format stream-json` localmente en
tres fases: `ask`, `plan` y `agent`. Cada fase tiene un límite predeterminado
de USD 0.20, tres turnos y 90 segundos. Bob debe estar instalado, autenticado y
con el workspace confiable; este flujo no funciona en un hosting estático.

La consola captura los eventos y crea, para cada ejecución, `context.json`,
`detection.json`, `ask.json`, `plan.json`, `agent.json` y `final-report.json`
en `demo-runs/<run-id>/`. Esa carpeta está excluida de Git para no publicar
datos locales. Los prompts prohíben `terraform apply`, cambios de archivos y
cambios de infraestructura; la aprobación final solo restablece el estado
simulado local.

Puedes ajustar los límites antes de iniciar la web:

```powershell
$env:DRIFT_BOB_MAX_COST = "0.20"
$env:DRIFT_BOB_MAX_TURNS = "3"
$env:DRIFT_BOB_TIMEOUT_MS = "90000"
npm.cmd --prefix .\mcp-server run web
```

## Estructura principal

```text
infra/main.tf                         Terraform declarado
mcp-server/index.js                   Servidor MCP
mcp-server/terraform-declared-state.js Generador y normalizador Terraform
mcp-server/state/actual-state.json    Estado real simulado
scripts/inject-drift.js               Inyección y reset de escenarios
scripts/start-demo.ps1                Preparación del demo en Windows
mcp-server/scenario-engine.js         Catálogo y ejecución reproducible
mcp-server/drift-engine.js            Comparación y puntuación de riesgo
mcp-server/recommendation-engine.js   Problemas y acciones recomendadas EN/ES
mcp-server/bob-runner.js              Adaptador IBM Bob stream-json y artefactos locales
mcp-server/web-server.js              API local y servidor de la experiencia web
dashboard/index.html                  Landing bilingüe de 3ntropy
dashboard/console.html                Consola automática de respuesta
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
