# T02 · Núcleo B — métricas y textos

**TASK_ID:** T02
**OBJECTIVE:** Funciones puras que calculan progreso a partir de las filas de la hoja, y los textos de respuesta de Telegram, sin inventar datos y sin mezclar usuarios.

## Entrada de datos
Filas como objetos con los **encabezados exactos** de `hoja/esquema.json` (p. ej. `{"ID sesión": "SES-…", "ID usuario": "111", "Fecha": "2026-11-07", "Estado registro": "Activo", …}`), tal como las dará el nodo *Tablas* de n8n. Las filas con `Estado registro = Anulado` se ignoran siempre. Valores numéricos pueden llegar como número o como texto con coma decimal (`"62,5"`): usa un `num()` tolerante (reutiliza/ubica en `texto.js` o un `util.js`).

## SCOPE
**Sí:** `src/nucleo/metricas.js`, `src/nucleo/textos.js` (+ `*.test.js`), reexport en `index.js`.

`metricas.js` (cada función recibe `usuario` y filtra estrictamente por `ID usuario`):
1. `e1rm(pesoKg, reps)` — Epley `peso × (1 + reps/30)`, redondeo 0,1; reps = 1 → peso; reps > 12 o sin peso → `null`. Solo series `Unidad = kg` y modalidad `normal`; placas, corporal, asistida, lastre → `null`.
2. `volumen(series, usuario, desde, hasta)` — Σ peso × reps de series en kg (modalidad normal o lastre: lastre cuenta solo el lastre). Devuelve además `repsCorporales` y `seriesPlaca` aparte. Por sesión, semana y mes.
3. `records(series, usuario, ejercicio)` — por separado: mayor peso (con reps y fecha), mayor 1RM estimado, mayor placa, más reps en corporal, mayor lastre, más segundos. Lo que no aplique → `null` (no 0).
4. `ultimaSesionGrupo(sesiones, series, usuario, grupo)` — D11: el día más reciente con alguna sesión que contenga el grupo; devuelve **todas** las sesiones de ese día que lo contengan con todos sus ejercicios y series. Sin datos → `null`.
5. `estancado(series, usuario, ejercicio, N=3)` — toma las últimas N sesiones del ejercicio (por fecha y luego por ID). Estancado si ninguna de las sesiones 2..N supera a la primera de la ventana en: peso máximo, reps con ese peso, ni 1RM. Menos de N sesiones → `{estancado:false, motivo:'pocas sesiones'}`. Devuelve `{estancado, ventana, notasTecnica: bool (Notas con técnica/tempo/lento/pausa/superserie…), sugerencias: [...]}` con sugerencias de entrenador (bajar tempo, +1 rep, subir el escalón de peso más pequeño; en placas: subir una placa).
6. `mejorEntrenamiento(sesiones, series, usuario, desde, hasta)` — D13: sesión con más volumen en kg; incluye récords logrados ese día.
7. `asistencia(sesiones, usuario, desde, hasta)` — días distintos con al menos una sesión.
8. `rangoSemana(ahora)` / `rangoMes(ahora)` — lunes 00:00 a domingo 23:59 en America/Bogota; devuelve fechas `AAAA-MM-DD`.
9. `progreso(series, usuario, ejercicio)` — primera vs última sesión: mejor peso y mejor 1RM, diferencia absoluta y %. Con una sola sesión → "sin comparación".
10. `frecuenciaGrupos(sesiones, usuario, desde, hasta)` — conteo de días por grupo muscular, ordenado.
11. `fuerzaRelativa(e1rm, pesoCorporal, fechaPeso, ahora)` — solo si el peso corporal es de hace ≤ 30 días; si no → `{ok:false, motivo:'sin peso corporal'}`.

`textos.js`:
12. `escaparHtml(s)` (`&`, `<`, `>`), `formatearKg(62.5)` → `"62,5 kg"` y números con coma decimal **sin** `toLocaleString`, `formatearFecha('2026-11-07')` → `"vie 7 nov"`.
13. `partirMensaje(texto, 4096)` — corta por saltos de línea; ninguna parte > 4096; nunca corta dentro de una etiqueta HTML (`<b>…</b>`, `<pre>…</pre>`): si un bloque `<pre>` es enorme, lo cierra y reabre.
14. Plantillas (HTML ya escapado, cortas, en español, tono de entrenador): `txtConfirmacionRegistro(registro, conversiones)` (lista lo guardado; avisa lb→kg), `txtFaltantes(faltantes, dudas)`, `txtUltimaSesion(resultado)` + reto "supérala", `txtRecords(records)`, `txtEstancado(resultado)`, `txtProgreso(resultado)`, `txtSinDatos(que)`. Datos ausentes → "No disponible"; nunca un número inventado.

**No:** puntos, rankings, privacidad entre usuarios, resumen semanal (T07, pendiente de la ronda 2), flujos n8n, Google.

## RELEVANT_FILES
`tareas/CONTRATO.md` (§1–§3, §6, enmiendas) · `PROYECTO.md` §1 (D05–D13) y §3 · `hoja/esquema.json` · `src/nucleo/` existente (T01 aprobada: no cambiar su comportamiento; si tocas un módulo de T01, que sus pruebas sigan pasando) · patrón de dependencias entre módulos ya usado en T01 (try/catch de `require` + global) — **mantenerlo** para que el concatenado funcione en n8n.

## CONSTRAINTS
Contrato completo. `ahora` siempre por parámetro. Datos de prueba inventados con **al menos dos usuarios** para probar que nada se mezcla.

## ACCEPTANCE_CRITERIA
1. `node --test "src/nucleo/**/*.test.js"` pasa (T01 + T02), con válido, inválido y borde por función.
2. `e1rm(60,10)` = 80,0; `e1rm(100,1)` = 100; `e1rm(50,15)` = `null`.
3. Prueba de aislamiento: con datos de dos usuarios, ninguna función devuelve filas o cifras del otro.
4. Filas anuladas no cuentan en ninguna métrica (prueba explícita).
5. `ultimaSesionGrupo` con dos sesiones de pecho el mismo día devuelve ambas; con pecho hace 3 días y espalda hoy, devuelve la de hace 3 días.
6. `estancado`: caso estancado (60×8, 60×8, 60×7), caso con mejora (60×8, 60×9, 60×8 → no estancado), caso de pocas sesiones, caso con placas.
7. `partirMensaje` con un texto de 10 000 caracteres: todas las partes ≤ 4096 y etiquetas balanceadas en cada parte.
8. `rangoSemana` con `ahora` domingo 23:30 Bogotá (= lunes UTC) devuelve la semana que termina ese domingo.
9. El concatenado (prueba de `concat.test.js` de T01 ampliada) carga también `metricas` y `textos` en `node:vm` con `require` que lanza para rutas relativas.

## VALIDATION_COMMANDS
```bash
node --test "src/nucleo/**/*.test.js"
node -e "const n=require('./src/nucleo'); console.log(n.e1rm(60,10), n.e1rm(50,15), n.formatearKg(62.5))"
git status --short
```
