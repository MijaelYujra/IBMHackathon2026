# Plan: Eliminar regla SSH no autorizada en `aws_security_group.app_sg` (sin downtime)

## Resumen

**Problema:** Se detectó drift de alta severidad en `aws_security_group.app_sg`. Una regla de ingreso SSH (puerto 22, `0.0.0.0/0`) fue agregada manualmente en la consola de AWS sin pasar por código Terraform. Esto expone la instancia a Internet completo y viola el principio de mínimo privilegio.

**Objetivo:** Reconciliar el estado real contra el declarado eliminando la regla SSH no autorizada, sin interrumpir el tráfico HTTPS de la aplicación.

**Alcance:** Solo el archivo `infra/main.tf`. No se modifica infraestructura real; la corrección queda lista para revisión humana y posterior `terraform apply`.

**No es parte del alcance:** Ejecutar `terraform apply`, modificar pipelines CI/CD, ni refactorizar otros recursos.

---

## Sub-Tarea 1 — Verificar que el código Terraform declarado NO incluye SSH

**Status:** [ ] pending

### Intent
Confirmar que `infra/main.tf` no contiene ningún bloque `ingress` para el puerto 22. Esto garantiza que la corrección es simplemente un `terraform apply` sin cambios de código, y que no hay una regla SSH "legítima" en el código que deba evaluarse.

### Expected Outcomes
- Se confirma que el bloque `resource "aws_security_group" "app_sg"` en `infra/main.tf` solo declara ingreso HTTPS (puerto 443).
- No existe ninguna referencia a `from_port = 22` ni `to_port = 22` en el archivo.

### Todo List
- [ ] Abrir `infra/main.tf` y localizar el bloque `resource "aws_security_group" "app_sg"`.
- [ ] Confirmar que el único `ingress` presente es el de HTTPS (puerto 443).
- [ ] Buscar en todo el archivo cualquier referencia al puerto 22 para descartar declaraciones ocultas.

### Relevant Context
- Archivo: [`infra/main.tf`](infra/main.tf)
- El bloque relevante es `resource "aws_security_group" "app_sg"` (aprox. líneas 22–50).

---

## Sub-Tarea 2 — Agregar comentario de seguridad en `infra/main.tf`

**Status:** [ ] pending

### Intent
Documentar explícitamente en el código Terraform que el acceso SSH desde Internet está prohibido. Esto previene que futuros ingenieros agreguen la regla nuevamente sin revisión, y deja evidencia del hallazgo de seguridad corregido.

### Expected Outcomes
- El bloque `resource "aws_security_group" "app_sg"` en `infra/main.tf` contiene un comentario que indica que SSH (`port 22`) no debe ser expuesto a `0.0.0.0/0`.
- El comentario referencia el hallazgo de drift detectado y la fecha de corrección.
- El código Terraform es funcional y válido (sin cambios estructurales).

### Todo List
- [ ] Localizar el bloque `ingress` de HTTPS en `aws_security_group.app_sg`.
- [ ] Agregar un comentario inline inmediatamente después del bloque `ingress`, indicando que SSH en `0.0.0.0/0` está explícitamente prohibido.
- [ ] Verificar que el archivo HCL sigue siendo válido (sintaxis correcta).

### Relevant Context
- Archivo: [`infra/main.tf`](infra/main.tf)
- El comentario debe ser suficientemente claro para que un revisor en un PR entienda el contexto sin leer el historial de drift.

---

## Sub-Tarea 3 — Actualizar `actual-state.json` para reflejar el estado post-corrección

**Status:** [ ] pending

### Intent
Actualizar el archivo de estado simulado (`mcp-server/state/actual-state.json`) para que refleje el estado esperado después de aplicar la corrección: sin la regla SSH. Esto permite validar con la herramienta `diff_infra` del MCP que el drift queda en cero tras la corrección.

### Expected Outcomes
- `mcp-server/state/actual-state.json` contiene solo la regla HTTPS en `ingress_rules` de `aws_security_group.app_sg`.
- Al ejecutar `diff_infra` nuevamente, el resultado es `"drift_detectado": false`.

### Todo List
- [ ] Abrir `mcp-server/state/actual-state.json`.
- [ ] Eliminar el objeto de la regla SSH (el que tiene `"description": "SSH (agregado manualmente, no esta en el codigo)"`) del array `ingress_rules` de `aws_security_group.app_sg`.
- [ ] Guardar el archivo y verificar que el JSON es válido.
- [ ] Invocar `diff_infra` para confirmar que no hay drift residual.

### Relevant Context
- Archivo de estado real simulado: [`mcp-server/state/actual-state.json`](mcp-server/state/actual-state.json)
- Archivo de estado declarado (referencia): [`mcp-server/state/declared-state.json`](mcp-server/state/declared-state.json)
- Herramienta MCP: `mcp__drift-detector__diff_infra`

---

## Consideraciones de Downtime

| Acción | Impacto en tráfico |
|---|---|
| Eliminar regla SSH de `aws_security_group` | ✅ **Cero downtime** — las conexiones HTTPS activas no se interrumpen |
| Los cambios en security groups en AWS son instantáneos y sin reinicio | ✅ La instancia `app_server` sigue sirviendo en puerto 443 |

> AWS aplica cambios de security groups en tiempo real sin reiniciar instancias ni conexiones activas existentes.

---

## Archivos Afectados

| Archivo | Cambio |
|---|---|
| [`infra/main.tf`](infra/main.tf) | Agregar comentario de seguridad (sin cambio estructural) |
| [`mcp-server/state/actual-state.json`](mcp-server/state/actual-state.json) | Eliminar regla SSH del estado simulado |
