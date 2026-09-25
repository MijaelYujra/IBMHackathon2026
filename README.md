# DRIFT DETECTOR VIA MCP + bobalytics

**Proyecto para la IBM Hackathon ( Septiembre 2026 )**

Un servidor basado en el Model Context Protocol (MCP) que conecta a **Bob** con la infraestructura real para detectar de forma automática cuándo el código (IaC) y la infraestructura desplegada se han desincronizado ("drift").

En lugar de depender de auditorías manuales tediosas, Drift Detector evalpua el estado, explica los riesgos de seguridad en el lenguaje natural, propone una solución y genera el PR de corrección, asegurando que un humano siempre tenga la última palabra antes de aplicar cambios en producción.

---

## Características Principales (Lo que nos diferencia)

1. **Human-in-the-loop (Seguridad ante todo):** Bob audita, planifica y prepara el código, pero **nunca** aplica cambios de infraestructrura de manera autónoma ciega. Todo requiere la aprobación explícita del operador.
2. **Dashboard de impacto (Bobalytics):** Cada drift detectado se registra en un log analítico que calcula automáticamente el tiempo estimado y los recursos operativos ("Bobcoins") ahorrados en la auditoría manual.
3. **Manejo Estricto de errores:** Si el proveedor de infraestructura deja de responder, el servidor MCP no asume un falso estado "limpio", sino que alerta inmediatamente de la pérdida de conexión crítica.

---

## Arquitectura Técnica

El sistema utiliza un servidor MCP local (Node.js) que expone tres herramientas principales a Bob, actuando  como puente entre el razonamiento de la IA y el estado de la infraestructura.

```text
[Infra real / Cloud] ---> [MCP Server]
                             │
                    tool: get_actual_state
                    tool: get_declared_state
                    tool: diff_infra
                             │
                             ▼
                         [IBM Bob]
      Ask   → "¿Qué cambió y por qué importa el riesgo?"
      Plan  → "¿Cómo lo corrijo sin romper nada?"
      Agent → Genera el commit/PR de corrección
                             │
                             ▼
                 [Aprobación Humana (Gate)]
                             │
                             ▼
                 [Bobalytics / Dashboard]
       (Métricas de tiempo ahorrado y drifts detectados)
```

## Instalación y configuración

Requisitos previos:

- Node.js (v18 o superior)
- Extensión de Bob instalada en VS Code.

Pasos:

1. Clonar e instalar dependencias

```bash
cd mcp-server
npm install
```

2. Registrar el servidor en Bob:

Añade el servidor a la configuracion de MCP de Bob en tu editor:

```JSON
"drift-detector": {
   "command": "node",
   "args": ["/ruta/absoluta/a/tu/proyecto/mcp-server/index.js"]
}
```

3. Iniciar panel de Bobalytics

Abre el archivo `dashboard/index.html` en tu navegador para ver las métricas en tiempo real.

## Cómo usarlo (Flujo de demostración)

El proyecto soporta los tres modos operativos de Bob:

- Modo Ask: Pregunta **"¿Hay un drift entre lo declarado y el estado real de mi infraestructura?"**. Bob invocará las herramientas, detectará discrepancias (ej. un puerto SSH abierto no declarado) y te explicará la severidad del riesgo.

- Modo Plan: Solicita **"Arma un plan para corregir este drift"**. Bob trazará la estrategia para modificar el estado sin causar downtime.

- Modo Agent: Indica **"Aplica la corrección"**. Bob preparará los cambios en los archivos correspondientes, deteniéndose para pedir tu **aprobación humana** antes de guardar.

Una vez finalizado, revisa el **Dashboard de Bobalytics** para visualizar los minutos operativos ahorrados por el equipo.

## Equipo

- Alexandra Cristal Salazar Gisbert
- Sheyla Micaela Condori Alcazar
- Mijael Daniel Yujra Apaza