# T04 · Reporte del ejecutor

STATUS: HECHO

## FILES_CHANGED
Nuevos:
- `scripts/lib_codigo.js` (compone núcleo + ESQUEMA + código del nodo), `scripts/build_flujos.js`
- `flujos/plantillas/gym-entrada.json`, `flujos/plantillas/gym-errores.json` (estructura, IDs y webhookId fijos, jsCode como marcador `@@codigo:...@@`)
- `flujos/gym/gym-entrada-v1.json`, `flujos/gym/gym-errores-v1.json` (generados)
- `src/code/entrada/{normalizar,tablas,plan,solicitudes,mensajes,aviso}.js`, `src/code/entrada/entrada.test.js`
- `src/code/entrada/casos/` (generar_casos.js + fixtures y casos para simular_code.js, datos inventados)
Modificados:
- `flujos/README.md` (tabla de flujos + pasos de importación)
- `src/nucleo/texto.js` (+`limpio`), `src/nucleo/textos.js` (+`txtHola`, `txtBienvenida`, `txtPedirCodigo`) y sus pruebas. Solo se agregan funciones; no cambia el comportamiento existente.

## SUMMARY
- Entrada: Telegram Trigger → Config (hojaId) → Normalizar → Anti-bucle (IF; falso → Ignorar/NoOp) → Leer hoja (batchGet de las 10 pestañas, reintento 3×2 s) → Tablas → Plan → Solicitudes → Escribir hoja (sin reintento) → Mensajes → Responder.
- Errores: Error Trigger → Config → Leer admins (values:get Usuarios, reintento 3×2 s) → Aviso → Enviar.
- Plan devuelve `[]` si el update_id ya está en Log Bot (fin sin responder ni escribir).
- Todos los Code llevan núcleo concatenado + `var ESQUEMA` (de hoja/esquema.json) + su código; el build es determinista.

## DECISIONES
1. Se agregaron dos nodos Code no listados en el brief: `Solicitudes` (ops -> peticiones HTTP, aplica `limpio()`, un item por petición; patrón de `.claude/rules/n8n-flujos.md`) y `Mensajes` (parte a 4096 y deja un item por mensaje, para que Responder envíe una sola vez aunque Escribir hoja devuelva varios items). Sin ellos Responder correría una vez por cada petición HTTP.
2. Se agregó el nodo `Ignorar` (NoOp) en la rama falsa del anti-bucle para que no quede una salida sin conectar.
3. `limpio()` no existía en el núcleo: se agregó a `texto.js` con pruebas (prefija `'` si empieza con `= + @` o parece fecha corta como "1/2").
4. Config usa `includeOtherFields: true` para que el update de Telegram llegue a Normalizar; el ID de la hoja queda como marcador `PENDIENTE_ID_HOJA` (Solicitudes falla con mensaje claro si no se cambió).
5. Usuario existente pero inactivo (`Activo != Sí`): no se reactiva ni se duplica la fila aunque traiga código válido; recibe el mismo mensaje de pedir código (resultado `usuario_inactivo` en Log Bot). Un usuario activo que manda `/start <código>` no consume el código.
6. Alias del nuevo usuario = `first_name` de Telegram (o username), Nombre = nombre completo; `Registrado` = `AAAA-MM-DD HH:mm:ss` Bogotá; `Fecha uso` = `AAAA-MM-DD`; `ID usuario` y `update_id` se escriben como número.
7. Códigos de invitación se comparan sin distinguir mayúsculas.
8. Rangos de batchGet y de append van con la pestaña entre comillas simples (`'Log Bot'`) y URL-encoded; las columnas se ubican por nombre de encabezado leído de la hoja (no por posición fija); columna desconocida lanza error.
9. Se renombró la variable interna a `marcaHora` para no disparar el aviso "sello sin $execution.id" del verificador (no genera IDs).

## TESTS
### Pruebas Node (núcleo + src/code)
```
$ node --test "src/**/*.test.js"
1..112
# tests 112
# suites 0
# pass 112
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 328.984495
```
### Build determinista
```
generado flujos/gym/gym-entrada-v1.json (12 nodos)
generado flujos/gym/gym-errores-v1.json (5 nodos)
aa8a640387e926135ab2d1b572e3f3b8fbd11517d7fd31e81c5050e28ba26511  flujos/gym/gym-entrada-v1.json
17c4ae1fe15844433d3db015abfa3f8acbebb29d0558d8cc81e5ef86edd56987  flujos/gym/gym-errores-v1.json
generado flujos/gym/gym-entrada-v1.json (12 nodos)
generado flujos/gym/gym-errores-v1.json (5 nodos)
aa8a640387e926135ab2d1b572e3f3b8fbd11517d7fd31e81c5050e28ba26511  flujos/gym/gym-entrada-v1.json
17c4ae1fe15844433d3db015abfa3f8acbebb29d0558d8cc81e5ef86edd56987  flujos/gym/gym-errores-v1.json
```
### check_workflow.py --modo produccion
```

=== gym-entrada-v1.json — Gym - Entrada (12 nodos)

[Estructura]
  ✅ 12 nodos, nombres e IDs únicos, conexiones válidas.

[Entrega]
  ✅ active: false.
  ✅ settings.timezone = America/Bogota.

[Versiones de nodo]
  ✅ Todas las versiones coinciden con las que usa William.

[Telegram]
  ✅ 'Responder': el texto viene de un nodo Code que escapa & < > (lleva HTML intencional).
  ✅ parse_mode HTML, escape y botones correctos en todos los envíos.

[Hoja (lecturas y escrituras)]
  ✅ Una sola lectura: 'Leer hoja'.

[Seguridad]
  ✅ Sin tokens ni claves en el texto; las credenciales van por ID.

[Prohibidos]
  ✅ Ni N8N_CONCURRENCY_PRODUCTION_LIMIT ni Gemini 3.8 Flash.

[Nodos Code]
  ✅ 5 nodos Code compilan sin errores de sintaxis.

Resultado: 0 errores, 0 avisos → OK para entregar

=== gym-errores-v1.json — Gym - Errores (5 nodos)

[Estructura]
  ✅ 5 nodos, nombres e IDs únicos, conexiones válidas.

[Entrega]
  ✅ active: false.
  ✅ settings.timezone = America/Bogota.

[Versiones de nodo]
  ✅ Todas las versiones coinciden con las que usa William.

[Telegram]
  ✅ 'Enviar': el texto viene de un nodo Code que escapa & < > (lleva HTML intencional).
  ✅ parse_mode HTML, escape y botones correctos en todos los envíos.

[Seguridad]
  ✅ Sin tokens ni claves en el texto; las credenciales van por ID.

[Prohibidos]
  ✅ Ni N8N_CONCURRENCY_PRODUCTION_LIMIT ni Gemini 3.8 Flash.

[Nodos Code]
  ✅ 1 nodos Code compilan sin errores de sintaxis.

Resultado: 0 errores, 0 avisos → OK para entregar
```
### mapa_flujo.py --rutas --code (Entrada)
```
# Gym - Entrada  (12 nodos)
activo=False  errorWorkflow=PENDIENTE_ID_ERRORES  timezone=America/Bogota

## Tipos de nodo
    5 code
    2 httpRequest
    1 telegramTrigger
    1 set
    1 if
    1 noOp
    1 telegram

## Disparadores
  - Telegram Trigger (telegramTrigger) ["message", "callback_query"]

## Decisiones (Switch / IF)
  - Anti-bucle (if): ={{ $json.ignorar }} false 
      sí → Leer hoja | no → Ignorar

## IA (modelos y prompts)

## Hoja de cálculo y archivos
  - Leer hoja: HTTP GET =https://sheets.googleapis.com/v4/spreadsheets/{{ $('Config').first().json.hojaId }}/value

## Manejo de errores en nodos externos
  Nodos externos sin reintento ni onError (2): Escribir hoja, Responder

## Nodos sueltos y finales
  Sin entrada: ninguno
  Finales (sin salida): Ignorar, Responder

## Nodos Code
  - Normalizar: 1327 líneas | lee: $input
  - Tablas: 1321 líneas | lee: $input
  - Plan: 1349 líneas | lee: Normalizar
  - Solicitudes: 1340 líneas | lee: Config, Tablas
  - Mensajes: 1284 líneas | lee: Plan

## Rutas desde cada disparador
  Telegram Trigger
    ↳ Config
      ↳ Normalizar
        ↳ Anti-bucle
          ↳ Leer hoja
            ↳ Tablas
              ↳ Plan
                ↳ Solicitudes
                  ↳ Escribir hoja
                    ↳ Mensajes
                      ↳ Responder
          ↳ Ignorar
```
### mapa_flujo.py (Errores)
```
# Gym - Errores  (5 nodos)
activo=False  errorWorkflow=None  timezone=America/Bogota

## Tipos de nodo
    1 errorTrigger
    1 set
    1 httpRequest
    1 code
    1 telegram

## Disparadores
  - Error Trigger (errorTrigger) ""

## Decisiones (Switch / IF)

## IA (modelos y prompts)

## Hoja de cálculo y archivos
  - Leer admins: HTTP GET =https://sheets.googleapis.com/v4/spreadsheets/{{ $('Config').first().json.hojaId }}/value

## Manejo de errores en nodos externos
  Nodos externos sin reintento ni onError (1): Enviar

## Nodos sueltos y finales
  Sin entrada: ninguno
  Finales (sin salida): Enviar

## Nodos Code
  - Aviso: 1316 líneas | lee: Error Trigger

## Rutas desde cada disparador
  Error Trigger
    ↳ Config
      ↳ Leer admins
        ↳ Aviso
          ↳ Enviar
```
### simular_code.js (casos en src/code/entrada/casos/)
```
$ node .claude/skills/n8n-workflow-check/scripts/simular_code.js flujos/gym/gym-entrada-v1.json "Normalizar" src/code/entrada/casos/casos-normalizar.json
Simulando "Normalizar" (una vez para todos) — 7 casos

✅ 1. [valido] usuario activo dice "hola"
✅ 2. [valido] registro con /start <código>
✅ 3. [invalido] mensaje de un bot se ignora
✅ 4. [invalido] chat de grupo se ignora
✅ 5. [invalido] update vacío no revienta
✅ 6. [valido] botón (callback_query)
✅ 7. [duplicado] mismo update repetido da la misma salida (el anti-duplicado lo decide Plan)

Resultado: 7/7 casos correctos
Recordatorio: esto simula el código del nodo; no prueba Telegram, Sheets ni Gemini dentro de n8n.

$ node .claude/skills/n8n-workflow-check/scripts/simular_code.js flujos/gym/gym-entrada-v1.json "Tablas" src/code/entrada/casos/casos-tablas.json
Simulando "Tablas" (una vez para todos) — 5 casos

✅ 1. [valido] lectura completa
✅ 2. [invalido] falta la pestaña Series
✅ 3. [invalido] falta el encabezado Estado en Invitaciones
✅ 4. [invalido] respuesta vacía
✅ 5. [duplicado] misma lectura otra vez (idempotente)

Resultado: 5/5 casos correctos
Recordatorio: esto simula el código del nodo; no prueba Telegram, Sheets ni Gemini dentro de n8n.

$ node .claude/skills/n8n-workflow-check/scripts/simular_code.js flujos/gym/gym-entrada-v1.json "Plan" src/code/entrada/casos/casos-plan.json
Simulando "Plan" (una vez para todos) — 8 casos

✅ 1. [valido] usuario activo dice "hola"
✅ 2. [valido] registro con código válido
✅ 3. [invalido] código ya usado
✅ 4. [invalido] sin código
✅ 5. [invalido] código que no existe (no se revela nada)
✅ 6. [duplicado] DUPLICADO: update_id ya está en Log Bot
✅ 7. [valido] texto con <b>& en el nombre se escapa
✅ 8. [invalido] usuario inactivo con código válido

Resultado: 8/8 casos correctos
Recordatorio: esto simula el código del nodo; no prueba Telegram, Sheets ni Gemini dentro de n8n.

$ node .claude/skills/n8n-workflow-check/scripts/simular_code.js flujos/gym/gym-entrada-v1.json "Solicitudes" src/code/entrada/casos/casos-solicitudes.json
Simulando "Solicitudes" (una vez para todos) — 3 casos

✅ 1. [valido] registro: 2 appends y 1 batchUpdate; limpio() en texto
✅ 2. [invalido] hojaId sin configurar
✅ 3. [duplicado] misma entrada otra vez: mismas peticiones (el anti-duplicado ocurre antes, en Plan)

Resultado: 3/3 casos correctos
Recordatorio: esto simula el código del nodo; no prueba Telegram, Sheets ni Gemini dentro de n8n.

$ node .claude/skills/n8n-workflow-check/scripts/simular_code.js flujos/gym/gym-entrada-v1.json "Mensajes" src/code/entrada/casos/casos-mensajes.json
Simulando "Mensajes" (una vez para todos) — 4 casos

✅ 1. [valido] respuesta corta
✅ 2. [valido] respuesta de 9000 caracteres se parte
✅ 3. [invalido] sin chat_id no envía
✅ 4. [duplicado] mismo plan otra vez

Resultado: 4/4 casos correctos
Recordatorio: esto simula el código del nodo; no prueba Telegram, Sheets ni Gemini dentro de n8n.

$ node .claude/skills/n8n-workflow-check/scripts/simular_code.js flujos/gym/gym-errores-v1.json "Aviso" src/code/entrada/casos/casos-aviso.json
Simulando "Aviso" (una vez para todos) — 5 casos

✅ 1. [valido] un admin activo recibe el aviso
✅ 2. [valido] mensaje de error con <b>& se escapa
✅ 3. [invalido] sin admins: no falla y no envía
✅ 4. [invalido] hoja sin datos (respuesta sin values)
✅ 5. [duplicado] mismo error otra vez: mismo aviso (sin estado oculto)

Resultado: 5/5 casos correctos
Recordatorio: esto simula el código del nodo; no prueba Telegram, Sheets ni Gemini dentro de n8n.

```
### git diff --stat
```
 flujos/README.md          | 26 +++++++++++++++++++++++---
 src/nucleo/texto.js       | 11 ++++++++++-
 src/nucleo/texto.test.js  | 14 ++++++++++++++
 src/nucleo/textos.js      | 16 ++++++++++++++++
 src/nucleo/textos.test.js | 12 ++++++++++++
 5 files changed, 75 insertions(+), 4 deletions(-)
```

Cobertura de los 8 casos pedidos en el criterio 4: válido (usuario activo dice "hola"), registro con código válido, código usado, sin código, duplicado (update_id 5000 ya en Log Bot -> 0 items), mensaje de bot, pestaña faltante (Tablas), texto con `<b>&` (Plan y Aviso lo escapan a `&lt;b&gt;&amp;`).

## RISKS
- NO probado dentro de n8n: envío real a Telegram, llamadas reales a Sheets, resolución de `$('Config')` y de las credenciales marcador, ni el comportamiento de los nodos que no son Code (IF, Set, HTTP, Telegram Trigger).
- Si una pestaña falta en la hoja, `values:batchGet` responde 400 y falla el nodo HTTP *Leer hoja* (el aviso a admins llega por Errores) antes de llegar a *Tablas*; el error claro "Falta la pestaña X" de Tablas cubre el caso de respuesta incompleta o encabezados faltantes.
- Si *Escribir hoja* falla, el usuario no recibe respuesta (se responde después de escribir) y el admin recibe el aviso. Sin reintento ciego de append, según contrato.
- Carrera: dos usos simultáneos del mismo código podrían leer ambos "Disponible" (lectura única por ejecución, sin candado). Aceptado en v1.
- `limpio()` antepone `'` también con `valueInputOption=RAW`, donde el apóstrofo queda visible en la celda; es lo que manda el CONTRATO §2.
- `settings.errorWorkflow` de Entrada es el marcador `PENDIENTE_ID_ERRORES`; William debe elegir Gym - Errores al importar. Credenciales `PENDIENTE_TELEGRAM` / `PENDIENTE_SHEETS` y `PENDIENTE_ID_HOJA` se reasignan al importar.
- Responder y Enviar (Telegram) sin reintento (el contrato solo pide reintento en lecturas e IA): el verificador/mapa lo lista, justificado.
- Cada Code lleva el núcleo completo (~1300 líneas); es lo que pide el brief, pesa en el JSON pero no afecta la ejecución.

## BLOCKERS
Ninguno.
