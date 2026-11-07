---
name: n8n-workflow-check
description: Verificación obligatoria antes de entregarle a William un flujo n8n (JSON). Revisa el JSON sin ejecutarlo (estructura, IDs/webhookId/credenciales conservados contra el export anterior, active:false, timezone, Telegram con parse_mode HTML y texto escapado, botones, una sola lectura de la hoja, secretos, prohibidos, sintaxis de los Code) y simula los nodos Code con casos válidos, inválidos y duplicados. Úsala siempre que se cree, edite o vaya a entregar un JSON de flujo del proyecto, y cuando William pida "revisar", "probar" o "validar" un flujo.
---

# n8n-workflow-check

Dos herramientas que corren fuera de n8n. **Ninguna ejecuta el flujo dentro de n8n**: siempre dígale a William qué quedó sin probar (llamadas reales a Telegram, Sheets, Drive, Gemini, Groq, y el comportamiento de los nodos que no son Code).

Rutas (desde la raíz del repo): `S=.claude/skills/n8n-workflow-check/scripts`

## Paso 1 — Revisión estática (siempre)

```bash
python3 $S/check_workflow.py "flujos/bot-v2.json" --base "flujos/bot-v1.json"
```

- `--base` = el export que William entregó (o la versión anterior). Sin él no se puede comprobar que se conservaron IDs, `webhookId`, credenciales y `errorWorkflow`; si no existe export anterior, dígalo.
- `--modo produccion` para revisar exports que están corriendo (no exige `active:false` ni timezone, solo los informa).
- `--json` para salida procesable. Acepta varios archivos (sin `--base`).
- Sale con código 1 si hay ❌. **Con un ❌ no se entrega**: corregir y volver a correr.

| Grupo | ❌ bloquea | ⚠️ revisar |
|---|---|---|
| Estructura | JSON inválido, nombre/ID repetido, conexión a nodo inexistente | nodo sin entrada, nodo desactivado |
| Entrega | `active` ≠ false, timezone ≠ America/Bogota | sin errorWorkflow, pinData |
| Contra export | cambió ID de nodo, webhookId de trigger, credencial, errorWorkflow | nodo eliminado, webhookId de Telegram/Wait cambiado |
| Versiones | — | versión distinta a la que usa William |
| Telegram | sin `parse_mode: HTML`, texto dinámico sin escapar `& < >`, callback_data > 64 bytes | sin `appendAttribution:false`, botones impares o sin ❌ Cancelar, caption sin HTML |
| Hoja | — | más de un batchGet, lecturas sueltas con Google Sheets (borrados físicos se informan) |
| Seguridad | token de Telegram, `AIza…`, `gsk_…`, `sk-…`, `ya29.`, Bearer literal, clave privada, cabecera Authorization literal | — |
| Prohibidos | `N8N_CONCURRENCY_PRODUCTION_LIMIT`, Gemini 3.8 Flash | — |
| Code | error de sintaxis | `sello` sin `$execution.id`, `$env`, `toLocaleString` |

Los ⚠️ no bloquean, pero cada uno se menciona en la entrega (o se justifica).

## Paso 2 — Simular los nodos Code que cambiaron

Una sola vez por sesión: `npm install --prefix .claude/skills/n8n-workflow-check` (instala Luxon).

```bash
node $S/simular_code.js "Flujo.json" "Nombre del nodo" --plantilla > casos.json   # esqueleto con los $('Nodo') que lee
node $S/simular_code.js "Flujo.json" "Nombre del nodo" casos.json [--ver]
```

- Escriba **al menos un caso válido, uno inválido y uno duplicado** por nodo modificado, con datos reales del formato de William (montos "25.000", "$ 25.000,50", "(3.797.362)", fechas d/M/yyyy y número de serie de Sheets, textos como "Gasté $50.000 en gasolina").
- Los casos corren en orden y comparten `$getWorkflowStaticData`, así se prueba un duplicado: repita la misma entrada en un caso posterior.
- `ahora` fija la hora de Bogotá (Luxon, `$now` y `new Date()`); úselo para cambios de mes, domingo 19:00, día 1, años bisiestos.
- `espera`: `error`, `cantidad`, `salida` (coincidencia parcial), `contiene`, `no_contiene` (p. ej. `"undefined"`, `"NaN"`).
- Guarde los casos que funcionen en `ejemplos/` de esta skill (con datos inventados) para reusarlos en la siguiente versión.
- Para nodos que leen la hoja, `"nodos": {"Tablas": "@tablas.json"}` carga datos de un archivo; arme `tablas.json` con filas `{..., "row_number": N}` y `_h` con los encabezados reales (ver `docs/arquitectura.md`).
- Para medir el tamaño real de un prompt que arma un Code (p. ej. `Contexto.instrucciones`), simúlelo con `--ver` y cuente caracteres (≈ caracteres/4 tokens; Gemma tiene 16K tokens por minuto).

Limitaciones: `$('Nodo').item` usa el mismo índice (no pairedItem); `this.helpers.httpRequest` falla a propósito; no hay binarios reales.

## Paso 3 — Inventario (opcional, útil en flujos grandes y auditorías)

```bash
python3 $S/mapa_flujo.py "Flujo.json" [--rutas] [--code]
```
Muestra disparadores, cada Switch/IF con sus destinos (y salidas sin conectar), modelos de IA, lecturas/escrituras, nodos externos sin reintento ni `onError`, ramas de error sin conectar y nodos sueltos.

## Si el cambio toca lógica que el tablero repite
El tablero (`apps-script/tablero/Codigo.gs`) copia partes del bot. Si cambió alguna de estas, avise en la entrega que el tablero también debe cambiar (o cámbielo y pruébelo, ver skill `auditar-entrega` §2b):
- saldos y deudas de *Contexto*/*Reporte* ↔ `calcular()`;
- `cobrar_cuota` y `/deshacer` de *Ejecutar* ↔ `registrarPago` y `deshacerCambio`;
- `limpio()` de *Solicitudes* ↔ `limpio_()`.

## Cómo reportarlo en la entrega

```
Verificación (n8n-workflow-check):
- check_workflow.py: 0 ❌, 2 ⚠️ (explicar cada uno)
- Simulación: Plan 6/6 (2 válidos, 2 inválidos, 2 duplicados), Ejecutar 5/5
- NO probado dentro de n8n: envío real a Telegram, escritura en la hoja, respuesta de Gemini.
```
Nunca escriba "probado" sin la salida del script que lo respalde.
