---
paths:
  - "flujos/**/*.json"
---
# Convenciones al editar JSON de flujos n8n

- Partir del **export** actual: conservar `id` de nodos, `webhookId`, `credentials` (por ID) y `settings` (incluido `errorWorkflow`); `settings.timezone = "America/Bogota"`; entregar con `active: false`; `pinData` vacío.
- Code nodes: utilidades comunes `num()` (montos "25.000", "$ 25.000,50", "(3.797.362)"), `fecha()` (ISO, d/M/yyyy, número de serie de Sheets), `pesos()` (sin `toLocaleString`), `sello` con `$execution.id`.
- Lectura: un solo HTTP `values:batchGet` (`valueRenderOption=UNFORMATTED_VALUE`, `dateTimeRenderOption=FORMATTED_STRING`) → nodo *Tablas* (filas con `row_number` y encabezados en `_h`).
- Escritura: *Ejecutar* arma `ops` `{tabla, tipo: append|update, fila|id+cambios}` → *Solicitudes* (lote; `limpio()` protege `= + @` y textos tipo "1/2") → *Escribir hoja*.
- Telegram: `additionalFields: {appendAttribution: false, parse_mode: "HTML"}` y texto escapado `& < >`. Botones: callback `pc:<ID>:<valor>` (≤ 64 bytes), en pares, con ❌ Cancelar.
- Nodos externos (HTTP, Sheets, IA): reintento 3 veces / 2 s y salida de error que avise.
- Antes de entregar: `check_workflow.py NUEVO.json --base ANTERIOR.json` (0 ❌) + `simular_code.js` de los Code modificados (válido, inválido, duplicado).
