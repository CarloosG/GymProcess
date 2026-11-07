# T04 · Flujos *Gym - Entrada* (v1) y *Gym - Errores* (v1)

**TASK_ID:** T04
**OBJECTIVE:** Los dos primeros flujos n8n como JSON importables, construidos por script a partir del núcleo, verificados sin n8n. v1 = recibir, registrar usuario por invitación, anti-duplicado, responder "hola", log, y avisar errores.

## SCOPE
**Sí:**
1. `src/code/entrada/*.js` — código de cada nodo Code (sin el núcleo), testeable aparte.
2. `scripts/build_flujos.js` — toma `flujos/plantillas/*.json` (estructura de nodos y conexiones, con `jsCode` vacío o marcador) y genera `flujos/gym/gym-entrada-v1.json` y `flujos/gym/gym-errores-v1.json`, insertando en cada Code: núcleo concatenado (mismo orden/patrón que `concat.test.js`) + su `src/code/...`. Determinista (mismo resultado en cada corrida). Conserva IDs de nodos y `webhookId` de la plantilla.
3. **Gym - Entrada v1**: `Telegram Trigger` (message + callback_query) → `Config` (Set: `hojaId`, sin secretos) → `Normalizar` (Code: chat_id, from, texto, update_id, message_id, tipo, `is_bot`) → IF anti-bucle (bots y chats que no son privados: fin) → `Leer hoja` (HTTP `values:batchGet` de **todas** las pestañas de `hoja/esquema.json`, `UNFORMATTED_VALUE` + `FORMATTED_STRING`; credencial Google Sheets OAuth2 por ID; reintento 3×2 s) → `Tablas` (Code: filas como objetos con `row_number`; valida que existan todas las pestañas y encabezados; si falta una → error claro que nombre cuál) → `Plan` (Code, núcleo): 
   - `update_id` ya en *Log Bot* → fin sin responder (duplicado).
   - Usuario activo → respuesta "hola, <alias>" + "el registro de entrenamientos llega en la próxima versión" (texto de `textos.js` o nuevo `txtHola`).
   - No registrado + `/start <código>` válido (`Estado = Disponible`) → ops: append en *Usuarios* (`Activo = Sí`, `Rol = usuario`, `Invitado por` = creador del código, `Registrado` = ahora Bogotá) + actualizar `Invitaciones.Estado = Usado`, `Usado por`, `Fecha uso` (por fila ubicada en la lectura, CONTRATO E4) + bienvenida.
   - No registrado sin código / código inválido o usado → "Para usar el bot pide un código de invitación." (sin revelar si el código existe).
   - Siempre: op append en *Log Bot* (update_id, intención, resultado, duración).
   → `Escribir hoja` (HTTP `values:append` por pestaña con `INSERT_ROWS`/`RAW`, y `values:batchUpdate` para updates; textos pasados por `limpio()`; **sin** reintento ciego en append, CONTRATO §1 / PROYECTO §2) → `Responder` (Telegram, `parse_mode: HTML`, `appendAttribution: false`, texto ya escapado, partido a 4096).
4. **Gym - Errores v1**: `Error Trigger` → `Config` → `Leer admins` (HTTP `values:get` de *Usuarios*) → `Aviso` (Code: arma texto escapado con flujo, nodo, mensaje de error, id de ejecución; destinatarios = filas `Rol = admin` y `Activo = Sí`) → `Enviar` (Telegram, HTML). Si no hay admins: no falla en bucle (termina).
5. `settings`: `timezone: "America/Bogota"`, `errorWorkflow` de Entrada apuntando a Errores (marcador `PENDIENTE_ID_ERRORES` documentado), `active: false`, `pinData: {}`.
6. Credenciales con IDs marcadores (`PENDIENTE_TELEGRAM`, `PENDIENTE_SHEETS`) y nombres descriptivos: William las reasigna al importar.
7. `flujos/README.md` — tabla de flujos y pasos de importación (orden, nodos a revisar, credenciales, errorWorkflow).

**No:** registro de entrenamientos (T05), IA, voz, botones, comandos sociales. Nada en Google, n8n ni Telegram reales.

## RELEVANT_FILES
`tareas/CONTRATO.md` (todo, con E1–E4) · `PROYECTO.md` §2 y §3 · `hoja/esquema.json` · `src/nucleo/` (T01–T02 aprobadas; no cambiar comportamiento; si agregas funciones, con pruebas) · `.claude/rules/n8n-flujos.md` · `.claude/skills/n8n-workflow-check/SKILL.md` y `scripts/` · skills de consulta: `n8n-code-nodes-official`, `n8n-expressions-official`, `n8n-error-handling-official`, `n8n-workflow-patterns`.

## CONSTRAINTS
- Versiones de nodo: las de `VERSIONES` en `check_workflow.py` (no inventar nodos ni versiones). Nodos HTTP con `sendBody` no-expresión y ningún GET con cuerpo.
- Sin secretos, sin chat_id ni tokens. Datos de prueba inventados.
- El núcleo en los Code debe funcionar con `require` que no resuelve rutas relativas y `DateTime` global (ya probado en T01/T02; repetir con el código generado).

## ACCEPTANCE_CRITERIA
1. `node scripts/build_flujos.js` genera ambos JSON; correrlo dos veces da archivos idénticos (`sha256sum`).
2. `python3 .claude/skills/n8n-workflow-check/scripts/check_workflow.py flujos/gym/*.json --modo produccion` → 0 ❌ (pegar salida; avisos justificados).
3. `python3 .claude/skills/n8n-workflow-check/scripts/mapa_flujo.py <json> --rutas --code` sin ramas sueltas ni nodos muertos.
4. `node .claude/skills/n8n-workflow-check/scripts/simular_code.js` sobre `Normalizar`, `Tablas`, `Plan` y `Aviso` con casos: válido (usuario activo dice "hola"), registro con código válido, código usado, sin código, **duplicado** (update_id ya en Log Bot), mensaje de bot, pestaña faltante, texto con `<b>&` (se escapa). Pegar salida.
5. Pruebas Node de `src/code/entrada/*.js` (`node --test "src/**/*.test.js"`) pasan junto con las del núcleo.
6. Ningún append se reintenta a ciegas; ningún dato de otro usuario en respuestas.

## VALIDATION_COMMANDS
```bash
node --test "src/**/*.test.js"
node scripts/build_flujos.js && sha256sum flujos/gym/*.json && node scripts/build_flujos.js && sha256sum flujos/gym/*.json
python3 .claude/skills/n8n-workflow-check/scripts/check_workflow.py flujos/gym/*.json --modo produccion
python3 .claude/skills/n8n-workflow-check/scripts/mapa_flujo.py flujos/gym/gym-entrada-v1.json --rutas --code
git diff --stat
```
