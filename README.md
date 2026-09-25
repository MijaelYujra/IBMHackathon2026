## 1. Etapas y entregables (48h)

**Etapa 0 — Setup (H0–H4)**
- Registro del equipo en lablab, instalar Bob (IDE + Bob Shell), acceso a Bobcoins.
- Repo base + un mini-proyecto de infraestructura como target (Terraform con 5-8 recursos: VPC, un par de instancias, un bucket, un security group).
- *Entregable:* repo inicial + README con el problema a resolver, en GitHub.

**Etapa 1 — El "sensor" de drift (H4–H10)**
- Construir el servidor MCP que expone dos herramientas: `get_declared_state` (lee el `.tfstate` o los `.tf`) y `get_actual_state` (lee el estado real — real vía API del proveedor, o mockeado con JSON si el tiempo aprieta).
- *Entregable:* servidor MCP corriendo local, probado con un cliente MCP simple (sin Bob todavía) devolviendo ambos estados.

**Etapa 2 — Conectar Bob al MCP (H10–H16)**
- Registrar el servidor MCP en la configuración de Bob.
- Probar en modo **Ask**: "¿hay diferencias entre lo declarado y lo real?" y que Bob use las tools para responder.
- *Entregable:* captura/video corto de Bob detectando un drift real inyectado a propósito (ej. cambiás manualmente un security group).

**Etapa 3 — Remediación automática (H16–H28)**
- Modo **Plan**: Bob arma el plan de corrección (qué archivo `.tf` tocar, qué riesgo implica).
- Modo **Agent**: genera el diff/PR real que corrige el drift.
- Gate de aprobación humana antes de aplicar (importante para el jurado: "seguro", no autónomo ciego).
- *Entregable:* PR generado automáticamente por Bob, revisable en GitHub.

**Etapa 4 — Bobalytics / dashboard de impacto (H28–H36)**
- Loggear cada detección: tiempo estimado ahorrado, cantidad de drifts detectados, "Bobcoins" usados.
- Un dashboard simple (puede ser una página web liviana) mostrando esas métricas.
- *Entregable:* dashboard funcional con datos de al menos 3-5 corridas.

**Etapa 5 — Pulido + manejo de errores (H36–H42)**
- Qué pasa si el MCP no responde, si el drift es ambiguo, si Bob no tiene permiso para aplicar cambios en prod.
- README final, arquitectura documentada.
- *Entregable:* repo limpio, instrucciones de instalación reproducibles.

**Etapa 6 — Demo + submission (H42–H48)**
- Grabar video de demo (lablab normalmente pide uno), preparar slides cortas.
- Submit antes del deadline (27 sept, 15:00 UTC).
- *Entregable:* submission completa en lablab (repo + video + descripción).

## 2. Flujo de trabajo (arquitectura técnica)

```
[Infra real / mock] ---> [MCP Server]
                             │
                    tool: get_actual_state
                    tool: get_declared_state
                    tool: diff_infra
                             │
                             ▼
                        [IBM Bob]
      Ask   → "¿qué cambió y por qué importa?"
      Plan  → "¿cómo lo corrijo sin romper nada?"
      Agent → genera el commit/PR de corrección
                             │
                             ▼
                  [Aprobación humana / PR review]
                             │
                             ▼
                    [Bobalytics / Dashboard]
            (tiempo ahorrado, drifts detectados, costo)
```

Punto clave a remarcar en el demo: **Bob nunca aplica cambios solo** — detecta, explica, propone, y un humano aprueba. Eso resuelve la objeción típica de "un agente autónomo tocando infra de prod da miedo", y es justo lo que un jurado de IBM va a valorar.

## 3. Flujo de presentación (demo de ~3-5 min)

1. **Gancho (20s):** una estadística o anécdota corta — el drift entre infraestructura declarada y real es una causa común de outages y brechas de seguridad silenciosas.
2. **Problema (30s):** nadie audita esto manualmente porque es tedioso; se descubre recién cuando falla algo.
3. **Demo en vivo (2 min):**
   - Mostrás el repo con Terraform "normal".
   - Alguien (o un script) cambia algo manualmente en la infra real.
   - Preguntás a Bob en modo Ask → detecta el drift y lo explica en lenguaje natural.
   - Modo Plan → Bob arma la estrategia de corrección.
   - Modo Agent → genera el PR.
   - Mostrás el PR generado en GitHub.
4. **Dashboard de impacto (30s):** Bobalytics mostrando cuánto tiempo/riesgo se evitó.
5. **Arquitectura (20s):** un slide con el diagrama de arriba, mencionando MCP como la pieza que conecta Bob con el mundo real.
6. **Cierre / roadmap (20s):** próximos pasos (múltiples proveedores cloud, integración a Slack para aprobar PRs desde el celular, política de compliance automática).

Consejo: graba el demo en vivo real (no mockeado con slides), los jueces de estos hackathons valoran mucho ver a Bob "pensando" en tiempo real.

## 4. Guía de implementación

**Stack sugerido:** Node.js o Python para el servidor MCP (Node es más simple si Bob ya tiene ejemplos), Terraform como target de infraestructura, un proveedor real (AWS/GCP free tier) si da el tiempo, o JSON mockeado si no.

**Paso 1 — Proyecto de infraestructura de prueba**
```
mkdir drift-demo && cd drift-demo
terraform init
# main.tf con 4-6 recursos simples
```
Generá el `.tfstate` con `terraform apply` (podés usar un provider local/mock si no querés gastar cloud real, o `localstack` para simular AWS sin costo).

**Paso 2 — Servidor MCP**
Usá el SDK oficial de MCP (hay uno en TypeScript y otro en Python). Expone tools:
```ts
// pseudo-código
server.tool("get_declared_state", () => readTerraformState())
server.tool("get_actual_state", () => queryCloudProviderOrMock())
server.tool("diff_infra", () => compare(declared, actual))
```
Corré el servidor local vía stdio o SSE (revisa "Transportes de servidor" en la doc de Bob — soporta ambos).

**Paso 3 — Registrar el MCP en Bob**
En la configuración de Bob (panel de MCP servers), agregá tu servidor local. Probalo primero en modo **Ask**: "¿Hay drift entre lo declarado y el estado real de mi infraestructura?" — Bob debería invocar tus tools automáticamente.

**Paso 4 — Inyectar un drift de prueba**
Cambiá manualmente algo en el estado "real" (mock) — ej. un puerto abierto que no estaba en el `.tf`. Volvé a preguntarle a Bob.

**Paso 5 — Modo Plan y Agent**
- Plan: pedile "arma un plan para corregir este drift sin downtime".
- Agent: pedile que genere el cambio en el `.tf` correspondiente y prepare el commit. Revisá que Bob pida tu aprobación antes de tocar archivos (esto ya es comportamiento por defecto en modo Agent, pero remarcalo en el demo).

**Paso 6 — Logging para Bobalytics**
Cada vez que el MCP server detecta un drift, loggeá: timestamp, tipo de recurso, tiempo estimado que hubiera tomado detectarlo manualmente (podés estimar con una heurística simple, ej. 30 min por incidente). Estos logs alimentan tu dashboard.

**Paso 7 — Dashboard**
Una página simple (puede ser un artifact HTML o un mini Streamlit/Next) que lea el log y muestre: # de drifts detectados, tiempo estimado ahorrado, costo evitado (si lo estimás).

**Paso 8 — Manejo de errores**
Contemplá: MCP server caído, estado real inaccesible, drift ambiguo (Bob debe poder decir "no estoy seguro, revisen esto a mano" en vez de forzar una corrección).