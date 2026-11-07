# GymProcess — Bot de gimnasio y competencia entre amigos

**Estado (2026-11-07):** T00–T02 y T04 ✅, T03 ◐ (PRUEBAS lista). **En espera de William:** instancia n8n + importar y probar T04 en Telegram (regla: lo que toca Telegram no avanza sin prueba real), y ronda 2 de la entrevista. Siguiente tras eso: T05 Registro.

Bot de Telegram → n8n (self-hosted) → Google Sheets → Apps Script (tablero). Para el Ingeniero William Delgado y sus amigos.
Al retomar una sesión **este archivo es lo primero que se lee**. Reglas para agentes: `AGENTS.md`. Contrato de subflujos: `tareas/CONTRATO.md`.

---

## 1. Decisiones (con fecha)

| # | Fecha | Decisión |
|---|---|---|
| D01 | 2026-11-07 | Se empieza de cero en este repo con Sheets + Gemini. La rama `claude/affectionate-pascal-zgdnct` (PostgreSQL/OpenAI/Docker) queda solo como referencia; no se fusiona. |
| D02 | 2026-11-07 | **Usuarios iniciales: 3** (William + 2 amigos). Entrada por código de invitación de un solo uso (`t.me/<bot>?start=<código>`); un desconocido solo recibe "pide un código". |
| D03 | 2026-11-07 | **Base de datos: Google Sheets.** Con 3 usuarios (~30 mensajes/día, unas miles de series al año) sobra; PostgreSQL no se justifica en un servidor de 1 GB compartido. |
| D04 | 2026-11-07 | Catálogo de ejercicios: William pasará un repositorio con los ejercicios. Mientras tanto, catálogo semilla mínimo marcado *provisional*. Ejercicio desconocido → pregunta con botones; nunca se crea en silencio. |
| D05 | 2026-11-07 | **Unidades:** todo en kg. "lb" se convierte a kg (× 0,45359237, redondeo 0,5 kg) y se avisa en la confirmación. Mancuernas: peso **por mano**; el volumen no se multiplica × 2. |
| D06 | 2026-11-07 | **Placas de máquina:** se acepta "placa N" / "la cuarta placa" cuando no se sabe el peso. Se guarda *Unidad = placa* y *Placa = N*, sin kg inventados. Récords y estancados se comparan placa con placa en la misma máquina; no suma al volumen en kg. |
| D07 | 2026-11-07 | **Peso corporal (dominadas, fondos…):** modalidad *corporal* (sin peso), *lastre* (+kg), *asistida* (−kg de ayuda o banda). El récord se mide en reps y en lastre; no suma al volumen en kg (se informan "reps totales"). |
| D08 | 2026-11-07 | **Confirmación:** si el mensaje está completo (ejercicio + peso/placa + reps de cada serie) se guarda directo y se responde con el resumen y botón ↩️ Deshacer. Solo se pregunta si falta algo o hay duda. |
| D09 | 2026-11-07 | **Corregir/deshacer por el bot: hasta 3 días** después del registro, respondiendo al mensaje de confirmación o con ↩️. Nada se borra: *Estado registro = Anulado* + bitácora *Cambios*. Después de 3 días se edita desde el tablero web (cada persona solo sus datos). |
| D10 | 2026-11-07 | **Fechas:** sin fecha = hoy (America/Bogota). Acepta "ayer", "anteayer", "el lunes" (el último pasado) y fechas concretas ("7 de octubre", "12/11" día/mes). Fecha futura → se rechaza. |
| D11 | 2026-11-07 | **Varias sesiones por día** son válidas e independientes: cada mensaje de registro crea su propia sesión. "Última sesión de pecho" = todas las sesiones con pecho del **día** más reciente en que hubo pecho. |
| D12 | 2026-11-07 | **Estancado:** N = 3 sesiones del ejercicio sin mejorar peso, reps con ese peso ni 1RM estimado. El mensaje es de entrenador, no de reproche: reconoce notas de técnica/tempo/superserie y sugiere (bajar tempo, +1 rep, subir un escalón de peso). |
| D13 | 2026-11-07 | **Mejor entrenamiento del período:** la sesión con más volumen (kg × reps); se mencionan aparte los récords de esa sesión. *(Recomendación aceptada por omisión; se puede cambiar.)* |
| D14 | 2026-11-07 | Voz y tablero no van en la v1. El reparto de tareas lo decide el arquitecto (tareas medianas, equilibradas en tokens y tiempo). |
| D15 | 2026-11-07 | **Resumen semanal** (domingo, hora por confirmar; propuesta 19:00): una parte **grupal** igual para todos (quién lidera, quién ha ido más veces en el año, "on fire", "repuntando", felicitaciones por PR) y una parte **individual** (a punto de alcanzar a alguien, alguien te está alcanzando, ejercicio que pide subir peso). |
| D16 | 2026-11-07 | **Autonomía total** del arquitecto: commit y push sin esperar "dale". Se informa en 1–2 líneas. Siguen siendo de William: OAuth de Google, token de BotFather, importar/activar flujos en n8n, cualquier costo. |
| D17 | 2026-11-07 | Git: push **solo** a la rama de trabajo `claude/cloud-environment-setup-34uf4a`; `master` por PR que decide William. Commits sin *Co-Authored-By*. |
| D18 | 2026-11-07 | n8n: la instancia/proyecto aún no existe. Se trabaja sin ella; William importará los flujos y devolverá los exports. Esta sesión en la nube no tiene Claude in Chrome. |
| D19 | 2026-11-07 | IA: Gemini 3.5 Flash-Lite (gratis, JSON estructurado, audio) como principal; respaldo de texto Groq `openai/gpt-oss-20b` (1.000 RPD gratis, verificado); voz Groq `whisper-large-v3-turbo` (2.000 RPD, 28.800 s/día, verificado). RPD gratis de Gemini **no publicado**: William lo confirma en aistudio.google.com/rate-limit. Sin facturación. William acepta que el nivel gratis de Google puede usar los datos para mejorar productos. |
| D20 | 2026-11-07 | Documentación: `PROYECTO.md` es la fuente de verdad (reemplaza `plan-maestro.md` y `arquitectura.md` de la plantilla). Se quitaron las skills que solo sirven con `n8n-mcp` y `planning-with-files`. |

## 2. Arquitectura

```
Telegram ──► [Gym - Entrada]  Telegram Trigger (secret_token)
               Normalizar → anti-bucle (from.is_bot) → ¿Registrado/activo? → Anti-duplicado (update_id)
               → Leer hoja (UNA lectura, values:batchGet) → Tablas
               → Tipo: botón | comando | texto (voz en T11)
               → Atajo sin IA (patrones conocidos) │ si no: IA → JSON (temperatura 0, salida estructurada)
               → Code "Plan" (núcleo determinista): qué escribir / responder / preguntar
               → Escribir en lote (values:append INSERT_ROWS) → Responder (HTML escapado) → Log
               ├─► [Gym - Registro]   sesión + series, confirmación, faltantes, corregir/deshacer (≤ 3 días)
               ├─► [Gym - Consultas]  última sesión, récords, progreso, volumen, frecuencia, estancados
               ├─► [Gym - Social]     invitaciones, perfil, peso corporal, privacidad
               └─► [Gym - Retos]      (según ronda 2)
Schedule (domingo) ──► [Gym - Programado]  resumen grupal + individual
Fallo en cualquiera ──► [Gym - Errores] → aviso a William
Tablero Apps Script (T12) ──► lee la hoja; edita solo filas del propio usuario, por ID, con LockService
```

Principios (ESTRICTO): la IA solo entiende y el código decide (`src/nucleo/`, probado en Node, insertado en los Code con `scripts/build_<flujo>.js`); la hoja es la fuente de verdad; una lectura por ejecución y escrituras en lote; filas nuevas solo con `values:append`; append sin reintento ciego (si falla: releer y buscar el *ID mensaje*; si no está, un único intento más); cada fila guarda su *ID mensaje*; IDs `SES-yyMMddHHmmss-<execution.id>`, `SER-…`, `INV-…`; toda consulta sobre otro usuario pasa por `puedeVer(solicitante, dueño, métrica)`; preguntas pendientes en *Por confirmar* con candado anti doble toque.

## 3. Modelo de datos (Google Sheets)

Hoja **PRUEBAS** y hoja **real** con la misma estructura. Pestañas y encabezados no se renombran; columnas solo se agregan.

| Pestaña | Columnas |
|---|---|
| **Usuarios** | ID usuario (= chat_id) · Alias · Nombre · Peso corporal (kg) · Fecha peso · Invitado por · Activo · Registrado · Rol (`admin/usuario`) |
| **Invitaciones** | Código · Creado por · Estado (`Disponible/Usado/Anulado`) · Usado por · Fecha uso |
| **Ejercicios** | Ejercicio (nombre canónico) · Grupo muscular · Sinónimos · Tipo (`peso`, `peso corporal`, `tiempo`) · Por mano (`Sí/No`) · Provisional |
| **Sesiones** | ID sesión · ID usuario · Fecha · Grupos musculares · Observaciones · ID mensaje · ID mensaje bot · Estado registro · Origen · Registrado |
| **Series** | ID serie · ID sesión · ID usuario · Fecha · Ejercicio · N.º serie · Unidad (`kg/placa`) · Peso (kg) · Placa · Modalidad (`normal/lastre/asistida/corporal`) · Reps · Segundos · RPE · Notas · Estado registro · ID mensaje |
| **Amigos** | ID · Usuario A · Usuario B · Estado (`Pendiente/Aceptada/Rechazada`) · Fecha |
| **Permisos** | ID usuario · Compartir con (`amigos`/ID) · Métricas (`ninguna/récords/volumen/todo`) |
| **Retos** · **Participantes** | según ronda 2 |
| **Por confirmar** | ID · ID usuario · Pregunta · Borrador JSON · ID mensaje bot · Estado · Reservado por · Creado |
| **Cambios** | Fecha · ID usuario · Tabla · ID registro · Acción (`anular/corregir`) · Antes · Después · Origen |
| **Log Bot** | Fecha · ID usuario · update_id · Intención · Resultado · Duración (s) · Error |

Los encabezados reales son los de `hoja/esquema.json` (sin el texto entre paréntesis; ver CONTRATO E2). Las métricas no se guardan: se calculan en el núcleo. Si la lectura se vuelve lenta, se agrega una pestaña caché con su regla de recálculo.

### Fórmulas del núcleo
- **1RM (Epley):** `peso × (1 + reps/30)`, solo reps ≤ 12; con reps = 1, 1RM = peso. No aplica a placas ni a corporal/asistida.
- **Volumen** = Σ peso × reps de series en kg (no anuladas). Placas y peso corporal aparte (reps totales).
- **Récord** = mayor peso con ≥ 1 rep y, aparte, mayor 1RM estimado. Placas: mayor placa. Corporal: más reps; lastre: más kg.
- **Estancado** = ver D12. **Última sesión de un grupo** = ver D11.
- **Fuerza relativa** = 1RM ÷ peso corporal, solo con peso corporal de hace ≤ 30 días; si no, "sin peso corporal".
- Semanas lunes–domingo en America/Bogota. **Asistencia** = días distintos con al menos una sesión.

## 4. Plan de tareas

Regla: no se pasa a la siguiente sin **APROBADO**; en las que tocan Telegram, tampoco sin prueba real de William.

| # | Tarea | Entregable | Quién | Estado |
|---|---|---|---|---|
| T00 | Esqueleto: plantilla, agentes, `PROYECTO.md`, `CONTRATO.md`, Luxon | Repo | Arquitecto | ✅ |
| T01 | Núcleo A — entrada: catálogo y sinónimos (sin tildes), unidades (lb→kg, placas, modalidades), fechas relativas en Bogotá, atajo sin IA para series ("3x10 con 50", "60 kg 10, 9 y 8"), validación del JSON de la IA, `hoja/esquema.json` | `src/nucleo/` + pruebas | ejecutor + auditor | ✅ |
| T02 | Núcleo B — métricas: 1RM, volumen, récords, última sesión por grupo, estancados con sugerencias, mejor entrenamiento, asistencia; textos (HTML escapado, corte 4096) | `src/nucleo/` + pruebas | ejecutor + auditor | ✅ |
| T03 | Hojas PRUEBAS y real desde el esquema (pestañas, encabezados, validaciones, catálogo) | Hojas + IDs en `docs/ids-y-credenciales.md` | Arquitecto (conector) | ◐ PRUEBAS lista |
| T04 | *Gym - Entrada* + *Gym - Errores*: recibir, invitación/registro, anti-duplicado, "hola", log | JSON + build | ejecutor + auditor | ✅ (sin probar en n8n) |
| T05 | *Gym - Registro*: texto → sesión + series, confirmación, faltantes, ↩️/corregir ≤ 3 días | JSON + build | ejecutor + auditor | |
| — | Importar y probar en vivo con hoja PRUEBAS (William) | `tareas/T05/evidencia.md` | William + arquitecto | |
| T06 | *Gym - Consultas* | JSON | ejecutor + auditor | |
| T07 | Núcleo C — social: `puedeVer`, puntos/metas, rankings, frases del resumen (on fire, repuntando, alcanzando) | `src/nucleo/` + pruebas | ejecutor + auditor (crítica) | ronda 2 |
| T08 | *Gym - Programado*: resumen semanal grupal + individual | JSON | ejecutor + auditor | ronda 2 |
| T09 | *Gym - Social*: perfil, peso corporal, invitaciones, privacidad | JSON | ejecutor + auditor (crítica) | ronda 2 |
| T10 | *Gym - Retos* | JSON | ejecutor + auditor | ronda 2 |
| T11 | Voz (Gemini audio → respaldo Groq Whisper) | JSON | ejecutor + auditor | |
| T12 | Tablero Apps Script: progreso, gráficas y edición de lo propio | `apps-script/` | ejecutor + auditor + arquitecto | ronda 2 |
| T13 | Pruebas integrales, limpieza de PRUEBAS, producción | Informe | Arquitecto + William | |

## 5. Criterios de auditoría (todas las tareas)
1. Pruebas existen, se corrieron en esa sesión y su salida está pegada.
2. Cada criterio del brief tiene evidencia (comando + resultado).
3. Ningún dato inventado: lo faltante se pregunta o queda "No disponible".
4. Ningún dato de otro usuario sin permiso (incluye casos de permiso negado).
5. Reprocesar el mismo mensaje no duplica filas.
6. Fechas en Bogotá; semanas lunes–domingo.
7. JSON con `active: false`, credenciales por ID, sin secretos, IDs de nodos estables entre versiones.
8. Telegram: HTML escapado y mensajes partidos si pasan de 4096 caracteres.

## 6. Pendiente de William
- Repositorio/lista de ejercicios (D04).
- RPD gratis de Gemini 3.5 y 3.1 Flash-Lite en aistudio.google.com/rate-limit (D19).
- Cuando exista: versión de n8n de la instancia (para `VERSIONES` del check) e IDs de credenciales (Google Sheets OAuth, Gemini, Telegram).
- Respuestas de la ronda 2.

## 7. Historial

| Tarea | Fecha | Resultado | Notas |
|---|---|---|---|
| T00 | 2026-11-07 | ✅ | Plantilla copiada (28 skills), agentes `ejecutor-ligero`/`ejecutor`/`auditor`, Luxon instalado por el hook. |
| T01 | 2026-11-07 | ✅ APROBADO (ciclo 2) | Núcleo A: catálogo semilla (37, provisional), unidades/placas/modalidades, fechas Bogotá, atajo de series, validación sin inventar. 62/62 pruebas. Ciclo 1 rechazado: atajo inventaba reps con "3 series de 10" y el concatenado fallaba con `require` de n8n. Observaciones menores: "10 series 3" se lee 10×3; "plancha 3 series de 45 s" deja segundos vacío (se pregunta). |
| T02 | 2026-11-07 | ✅ APROBADO (ciclo 1) | Núcleo B: 1RM, volumen, récords, última sesión por grupo, estancado con sugerencias, mejor entrenamiento, asistencia, rangos semana/mes, progreso, frecuencia, fuerza relativa; textos HTML escapados y `partirMensaje`. 91/91 pruebas. Observación → CONTRATO E3 (anular sesión anula sus series). |
| T03 | 2026-11-07 | ◐ PRUEBAS lista | Hoja PRUEBAS creada y verificada (10 pestañas, es_CO, Bogotá, validaciones, 37 ejercicios). ID en `docs/ids-y-credenciales.md`. Hoja real tras la ronda 2. |
| T04 | 2026-11-07 | ✅ APROBADO (ciclo 1) | Flujos *Gym - Entrada v1* y *Gym - Errores v1* generados por `scripts/build_flujos.js` (determinista). 112/112 pruebas, check 0 ❌ 0 ⚠, Code = núcleo + `src/code` byte a byte. E5: `limpio()` sin apóstrofo bajo RAW. **No probado en n8n/Telegram/Sheets.** Para T05: `answerCallbackQuery` en botones; un sticker de usuario activo hoy responde "hola"; escritura parcial si falla a mitad (aceptado). |
