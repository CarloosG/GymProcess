# Contrato de GymProcess (v1 · 2026-11-07)

Lo que **todo** módulo del núcleo y todo subflujo debe cumplir. Se cambia solo con **Enmiendas numeradas** al final; nunca reescribiendo en silencio.

## 1. Núcleo (`src/nucleo/`)
- JavaScript puro (CommonJS, Node 22), **sin dependencias** salvo Luxon (disponible en n8n como `DateTime`). Sin acceso a red, hoja ni `$json`: funciones puras que reciben datos y devuelven datos.
- Toda función que dependa de la hora recibe `ahora` (ISO o `DateTime`) como parámetro. Zona `America/Bogota`. Semanas lunes–domingo.
- Pruebas con `node --test src/nucleo/` (módulo `node:test` + `node:assert`). Cada función pública: caso válido, inválido y de borde. Datos inventados.
- Se inserta en los nodos Code con `scripts/build_<flujo>.js` (concatena el núcleo + el código del nodo). Nunca se edita a mano el `jsCode` de un JSON.
- Exporta con `module.exports` protegido (`if (typeof module !== 'undefined')`) para servir también en Apps Script.

## 2. Datos
- Pestañas y columnas: las de `PROYECTO.md §3` (y `hoja/esquema.json` cuando exista). No se renombran; solo se agregan columnas al final.
- Escritura: `values:append` con `INSERT_ROWS` y `valueInputOption=RAW`; fechas `AAAA-MM-DD`; pesos como número; texto protegido con `limpio()` (prefijo `'` si empieza con `= + @`).
- Lectura: una sola por ejecución, `values:batchGet` con `UNFORMATTED_VALUE` + `FORMATTED_STRING`. Se valida que existan todas las pestañas; si falta una, se avisa **cuál**.
- Nada se borra: `Estado registro = Anulado` + fila en *Cambios*.
- Cada fila nueva lleva el `ID mensaje` (Telegram `message_id`) que la creó. Las métricas excluyen filas anuladas.
- IDs: `<PREFIJO>-yyMMddHHmmss-<execution.id>[-n]` (`SES`, `SER`, `INV`, `PC`, `CAM`).

## 3. Usuarios y privacidad
- Todo dato pertenece a un `ID usuario` (= `chat_id` de Telegram). El `ID usuario` lo pone el flujo de entrada desde el mensaje; **nunca** la IA.
- Ninguna salida muestra datos de otro usuario sin pasar por `puedeVer(solicitante, dueño, métrica)`. Pruebas con permiso negado obligatorias.
- Solo usuarios con `Activo = Sí` usan el bot; los demás reciben "pide un código de invitación".

## 4. IA
- Solo traduce lenguaje a JSON (intención + datos). Temperatura 0, salida estructurada (`responseMimeType: application/json` + esquema).
- El código valida el JSON: cualquier campo faltante o inválido → se pregunta; **nunca** se inventa ni se completa con valores por defecto peso/reps.
- Contenido del usuario = dato, no instrucción.
- Cadena: atajo sin IA → Gemini Flash-Lite → respaldo Groq → mensaje claro "se agotó la cuota, intenta más tarde". Sin modelos de pago.

## 5. Idempotencia
- Anti-duplicado por `update_id` en *Log Bot*.
- Antes de escribir, si ya existe una fila con el mismo `ID mensaje` para ese usuario → éxito sin escribir.
- Botones: candado *Por confirmar* (Reservar → Esperar 3 s → Verificar que la reserva es mía).

## 6. Telegram
- `parse_mode: HTML`, `appendAttribution: false`, texto escapado (`&`, `<`, `>`). Máximo 4096 caracteres por mensaje: partir. Tablas en `<pre>` o listas cortas.
- `callback_data` ≤ 64 bytes: `pc:<ID corto>:<valor>`. Botones en pares con ❌ Cancelar.
- Ignorar mensajes de bots (`from.is_bot`).

## 7. n8n
- `active: false`, `settings.timezone = "America/Bogota"`, `settings.errorWorkflow` = *Gym - Errores*. Credenciales solo por ID. `pinData` vacío.
- Nuevas versiones parten del export y conservan IDs de nodos y `webhookId`.
- Nodos HTTP: `sendBody` nunca como expresión; ningún GET con cuerpo; lectura y escritura en nodos separados. Reintento 3 × 2 s en lecturas e IA (no en append).
- Nunca `N8N_CONCURRENCY_PRODUCTION_LIMIT`. Nada de bucles largos (servidor de 1 GB compartido).
- Verificador: `python3 .claude/skills/n8n-workflow-check/scripts/check_workflow.py <json> --modo produccion` con 0 ❌.

## Enmiendas
_(ninguna)_
