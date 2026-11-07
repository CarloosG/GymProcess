# T02 · Reporte del ejecutor

STATUS: HECHO

## FILES_CHANGED
- NUEVOS: `src/nucleo/metricas.js`, `src/nucleo/metricas.test.js`, `src/nucleo/textos.js`, `src/nucleo/textos.test.js`
- `src/nucleo/texto.js`: agrega y exporta `num()` (número tolerante, acepta "62,5"). `normalizar` sin cambios.
- `src/nucleo/fechas.js`: solo exporta además `_aDT` (para rangos); sin cambio de comportamiento.
- `src/nucleo/index.js`: reexporta `metricas` y `textos`.
- `src/nucleo/concat.test.js`: orden ampliado a `metricas` y `textos`, y comprueba e1rm, formatearKg, rangoSemana, partirMensaje y estancado dentro de `node:vm` (con `require` que lanza, sin require y con solo luxon).
- `src/nucleo/index.test.js`: lista de exportaciones ampliada.

## SUMMARY
Funciones 1–11 en `metricas.js` y 12–14 en `textos.js` según el brief. Todas filtran por `ID usuario` (usuario vacío = nada) y descartan `Estado registro = Anulado` (series y sesiones; una serie cuya sesión está anulada no cuenta en `mejorEntrenamiento`, `ultimaSesionGrupo`, `asistencia`, `frecuenciaGrupos`). Mantiene el patrón try/catch de `require` + global; nombres internos con sufijos (`_met`, `_tx`) para no chocar al concatenar.

## DECISIONES
- Brief dice `formatearFecha('2026-11-07')` → "vie 7 nov", pero el 7-nov-2026 es sábado (y el criterio 8 trata el domingo 8). Implementé el día real: "sáb 7 nov". Pendiente de confirmar por el arquitecto.
- `asistencia` devuelve `{dias, fechas}`; `rangoSemana/rangoMes` devuelven `{desde, hasta}`.
- Récords: conservan la primera fecha en que se logró el valor; `mejorEntrenamiento.records` lista los logrados ese día con `primeraVez` (true si no había historial previo del ejercicio).
- Lastre cuenta solo el lastre en volumen; asistida y corporal suman a `repsCorporales`; placas a `seriesPlaca`.
- `estancado`: "reps con ese peso" = mejores reps en la sesión k con carga >= la máxima de la primera sesión de la ventana. Cambio de unidad (kg↔placa) en la ventana se trata como no comparable (no estancado). N<2 se corrige a 3.
- `fuerzaRelativa`: pesos de hace 0–30 días válidos; futuro o >30 días → `sin peso corporal`; sin 1RM → motivo `sin 1RM`.
- `txtConfirmacionRegistro` avisa lb→kg si `conversiones` no está vacío o alguna serie trae `convertido`.

## TESTS
Comando: `node --test "src/nucleo/**/*.test.js"`
```
# tests 91
# suites 0
# pass 91
# fail 0
# cancelled 0
# skipped 0
```
Comando: `node -e "const n=require('./src/nucleo'); console.log(n.e1rm(60,10), n.e1rm(50,15), n.formatearKg(62.5))"`
```
80 null 62,5 kg
```
Comando: `git status --short`
```
 M src/nucleo/concat.test.js
 M src/nucleo/fechas.js
 M src/nucleo/index.js
 M src/nucleo/index.test.js
 M src/nucleo/texto.js
?? src/nucleo/metricas.js
?? src/nucleo/metricas.test.js
?? src/nucleo/textos.js
?? src/nucleo/textos.test.js
```
Cobertura de criterios: 1 (suite completa), 2 (e1rm), 3 (test "aislamiento entre usuarios" + por función), 4 (test "filas anuladas"), 5 (dos tests de ultimaSesionGrupo), 6 (estancado: estancado, mejora, pocas sesiones, placas), 7 (partirMensaje 10 000 chars, 7 casos con balance de etiquetas y `<pre>` cerrado/reabierto), 8 (rangoSemana con 2026-11-09T04:30Z y -05:00), 9 (concat.test.js en vm con require que lanza).

## RISKS
- Día de la semana del ejemplo del brief (ver DECISIONES).
- `Grupos musculares` se asume texto separado por coma, `;` o `/`.
- No se probó contra datos reales de la hoja ni dentro de n8n (no permitido); solo `node:vm`.
- `index.js` ahora también exporta `_aDT` (interno de fechas).

## BLOCKERS
Ninguno.
