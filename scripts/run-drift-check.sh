#!/usr/bin/env bash
#
# run-drift-check.sh
#
# Pensado para correr en un cron nocturno o un job de CI.
# Usa Bob Shell en modo NO interactivo (bob -p) para:
#   1. Preguntar (modo ask) si hay drift.
#   2. Si hay drift, pedirle un plan de corrección (modo plan) SIN aplicar nada.
#   3. Guardar el plan en un archivo para revisión humana (nunca aplica solo).
#
# Requisitos: Bob Shell instalado y logueado (`bob` funcionando en la terminal).
# Correr desde la raíz del proyecto: ./scripts/run-drift-check.sh

set -euo pipefail

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORTS_DIR="reports"
mkdir -p "$REPORTS_DIR"

REPORT_FILE="$REPORTS_DIR/drift-report_${TIMESTAMP}.md"

echo "🔍 Consultando a Bob si hay drift de infraestructura..."

bob -p "Usa la tool diff_infra del servidor MCP drift-detector para comparar el estado declarado \
contra el estado real. Si no hay drift, responde solo 'SIN_DRIFT'. Si hay drift, resume cada \
diferencia en una lista, indicando severidad y una explicación breve en español. \
Encierra tu respuesta completa entre etiquetas <reporte></reporte>." \
  > "$REPORT_FILE"

if grep -q "SIN_DRIFT" "$REPORT_FILE"; then
  echo "✅ Sin drift detectado. No se genera plan de corrección."
  exit 0
fi

echo "⚠️  Drift detectado. Generando plan de corrección (sin aplicar cambios)..."

PLAN_FILE="$REPORTS_DIR/drift-plan_${TIMESTAMP}.md"

bob -p "Basado en el drift que detectaste en la conversación anterior sobre este proyecto, \
entra en modo plan y arma un plan de corrección paso a paso para alinear la infraestructura real \
con lo declarado en infra/main.tf. NO apliques ningún cambio ni generes commits todavía: \
solo el plan, priorizado por severidad, para que un humano lo apruebe." \
  > "$PLAN_FILE"

echo "📄 Reporte guardado en: $REPORT_FILE"
echo "📋 Plan de corrección guardado en: $PLAN_FILE"
echo ""
echo "Siguiente paso manual sugerido:"
echo "  bob   # sesión interactiva, revisar el plan y pedir el PR con --yolo si se aprueba"
