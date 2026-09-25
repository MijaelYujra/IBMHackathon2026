# Drift Detector — IBM Bob 2.0 Hackathon

Detecta automáticamente cuándo la infraestructura real se desincroniza de lo declarado
en el código (Terraform), usando IBM Bob + un servidor MCP custom. Bob nunca aplica
cambios solo: detecta, explica, propone un plan y genera el PR — un humano aprueba.

## Estructura del proyecto

```
drift-detector/
├── infra/
│   ├── main.tf                  # Infraestructura "declarada" (ilustrativa)
│   └── declared-state.json      # Snapshot legible de referencia
├── mcp-server/
│   ├── index.js                 # Servidor MCP: get_declared_state, get_actual_state, diff_infra, get_bobalytics_summary
│   ├── terraform-declared-state.js # Genera el estado declarado desde un plan Terraform
│   ├── package.json
│   └── state/
│       ├── declared-state.json  # Fallback si Terraform no está disponible
│       └── actual-state.json    # Estado "real" (simulado), lo que se compara
├── scripts/
│   ├── inject-drift.js          # Simula cambios manuales para el demo
│   └── run-drift-check.sh       # Automatización con Bob Shell (modo no-interactivo)
├── dashboard/
│   └── index.html               # Dashboard de Bobalytics (autocontenido, sin dependencias)
├── logs/
│   └── bobalytics-log.jsonl     # Se genera solo cuando diff_infra encuentra drift
└── .bob/
    └── mcp.json                 # Config para que Bob detecte el servidor MCP del proyecto
```

## 1. Setup (una sola vez)

```powershell
npm.cmd --prefix .\mcp-server install
terraform -chdir=.\infra init
npm.cmd --prefix .\mcp-server run generate:declared
```

El último comando debe mostrar `"source": "terraform_plan"`. Genera un plan
local con refresh desactivado; no consulta AWS ni crea recursos. Nunca hace
`terraform apply`. Si Terraform no está disponible durante la demo, el MCP usa
automáticamente `mcp-server/state/declared-state.json` como respaldo.

Probá el servidor MCP de forma aislada (sin Bob) para confirmar que responde:

```powershell
npm.cmd --prefix .\mcp-server test
# debe listar las cuatro tools y reportar "MCP operativo"
```

## 2. Registrar el servidor MCP en Bob

El archivo `.bob/mcp.json` ya está armado a nivel proyecto (se versiona con git y el
equipo lo comparte). Bob lo detecta automáticamente al abrir la carpeta `drift-detector`
como workspace — no hace falta tocar nada más.

Si preferís confirmarlo a mano:
1. En Bob IDE, click en el ícono de configuración → pestaña **MCP**.
2. Deberías ver `drift-detector` en la lista de servidores del proyecto.
3. Asegurate de que **Use MCP Servers** esté activado.

## 3. Simular un drift para el demo

```bash
node scripts/inject-drift.js open-ssh
# o: resize | expose-bucket
```

Esto modifica `mcp-server/state/actual-state.json` para que difiera del código, sin
tocar ninguna infraestructura real. Para volver al estado limpio: `node scripts/inject-drift.js reset`.

## 4. Probar con Bob (modo Ask)

En el chat de Bob (dentro del proyecto), preguntá:

> "¿Hay drift entre la infraestructura declarada y el estado real? Usá el servidor MCP drift-detector."

Bob debería invocar `diff_infra` automáticamente y devolver una explicación en lenguaje
natural de cada diferencia, con severidad.

## 5. Plan de corrección (modo Plan) y PR (modo Agent)

> "Armá un plan para corregir el drift que detectaste, priorizado por severidad."

Luego, con el plan aprobado:

> "Implementá la corrección en infra/main.tf para el hallazgo de más severidad y dejalo listo para PR."

Bob va a pedir tu aprobación antes de escribir el archivo — ese es el punto de control
humano que hay que remarcar en el demo.

## 6. Dashboard de Bobalytics

Cada vez que `diff_infra` encuentra diferencias, se agrega una línea a
`logs/bobalytics-log.jsonl`. Para verlo:

1. Abrí `dashboard/index.html` en el navegador (doble click alcanza, no necesita servidor).
2. Subí el archivo `logs/bobalytics-log.jsonl` con el selector de archivo.
3. Vas a ver: detecciones totales, diffs encontrados, riesgo alto, y tiempo estimado
   ahorrado — la heurística está en `mcp-server/index.js`, función `logDetection`,
   ajustala si querés otros supuestos.

## 7. Automatización nocturna (Bob Shell)

```bash
chmod +x scripts/run-drift-check.sh
./scripts/run-drift-check.sh
```

Esto corre Bob Shell en modo no-interactivo (`bob -p`), genera un reporte y — si hay
drift — un plan de corrección, ambos guardados en `reports/`. No aplica ningún cambio
solo. Ideal para un cron nocturno o un job de CI que deje todo listo para revisar a la mañana.

---

# Guía: ¿IDE, Shell interactivo, o Shell no-interactivo?

Aclaración importante: **IBM Bob no publica una API de completions tradicional** (tipo
la API de Claude/OpenAI) para integrar en tu propio backend. Lo que sí tenés son tres
formas de usar el mismo "cerebro" de Bob, y elegís según el momento del hackathon:

| Superficie | Cuándo usarla | Cómo se ve |
|---|---|---|
| **Bob IDE** | Desarrollo del proyecto, debug, iterar rápido, y el **demo en vivo** | Interfaz visual, revisás diffs, aprobás cambios con un click |
| **Bob Shell interactivo** (`bob`) | Trabajar desde terminal sin abrir el IDE, útil si estás pair-programming por SSH o en un entorno headless | Conversación en terminal, igual que el IDE pero en texto |
| **Bob Shell no-interactivo** (`bob -p "..."`) | **Automatización**: scripts, cron, CI/CD — esto es lo más parecido a "usar Bob como API" | Un solo comando, devuelve texto, se puede scriptear |

## Paso a paso — Bob IDE (para el demo en vivo)

1. Instalá Bob IDE (`https://bob.ibm.com/es/download`), logueate con tu IBMid.
2. Abrí la carpeta `drift-detector` como workspace.
3. Confirmá que el servidor MCP aparece activo (paso 2 de arriba).
4. Usá el switch de modos (Ask / Plan / Agent) desde el panel de Bob:
   - **Ask** para detectar y explicar el drift.
   - **Plan** para la estrategia de corrección.
   - **Agent** para generar el diff y el commit.
5. Para el demo: dejá la ventana de diffs visible, es el momento más convincente para
   el jurado (ven a Bob "pensando" y generando el cambio en vivo).

## Paso a paso — Bob Shell interactivo

1. Instalá Bob Shell (`https://bob.ibm.com/es/download`, o vía tu package manager).
2. Primera vez: te va a pedir loguearte con IBMid y aceptar la licencia.
3. `cd drift-detector && bob`
4. Escribí directamente tu pregunta, ej: `¿hay drift en la infraestructura?`
5. Usá `@` para referenciar archivos puntuales: `Explicá @infra/main.tf`
6. Bob te va a pedir aprobación antes de leer/escribir archivos o correr comandos —
   aprobá o rechazá cada acción.

Usalo cuando quieras iterar rápido sin abrir el IDE completo, por ejemplo si estás
trabajando remoto en una VM.

## Paso a paso — Bob Shell no-interactivo (automatización real)

Esto es lo que usa `scripts/run-drift-check.sh`. La lógica paso a paso:

1. **Primera vez**, aceptá la licencia una sola vez:
   ```bash
   bob --accept-license -p "Explica este proyecto"
   ```
2. **Comando básico**:
   ```bash
   bob -p "¿Hay drift en la infraestructura?" > reporte.md
   ```
3. **Pipe de contenido** (útil para logs de error, por ejemplo):
   ```bash
   cat build-error.txt | bob -p "Explicá este error"
   ```
4. **Solo lectura por defecto**: en modo no-interactivo, Bob Shell NO escribe archivos
   a menos que agregues `--yolo`. Para el flujo de corrección automática:
   ```bash
   bob -p "Corregí el drift de seguridad en @infra/main.tf" --yolo
   ```
   Usalo con cuidado — para el hackathon, mejor dejar el `--yolo` fuera del cron
   automático y reservarlo para cuando un humano ya aprobó el plan (así lo armamos
   en `run-drift-check.sh`: genera el plan, pero la aplicación queda para una sesión
   interactiva aparte).
5. **Formatear la salida** para que sea fácil de parsear en un script:
   ```bash
   bob -p "Resumí el drift. Encerrá la respuesta en <reporte></reporte>" > out.md
   ```
6. **Programarlo** (cron, ejemplo a las 3am todos los días):
   ```
   0 3 * * * cd /ruta/a/drift-detector && ./scripts/run-drift-check.sh
   ```

### Regla simple para decidir

- ¿Estás construyendo o mostrando algo en vivo? → **IDE**.
- ¿Estás en terminal iterando rápido, todavía con supervisión humana en cada paso? → **Shell interactivo**.
- ¿Necesitás que corra solo, sin nadie mirando, y deje resultados para revisar después? → **Shell no-interactivo (`-p`)**, sin `--yolo` salvo que confíes el paso puntual.

## Próximos pasos (si sigue después del hackathon)

- Reemplazar `get_actual_state` para que llame al SDK real del cloud provider en vez
  de leer un JSON mockeado.
- Extender el normalizador de planes Terraform para módulos y más tipos de recursos.
- Conectar `run-drift-check.sh` a Slack para pedir aprobación del plan antes del `--yolo`.
