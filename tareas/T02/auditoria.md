# T02 · Auditoría

VERDICT: APROBADO

## FINDINGS
1. (Observación) Una serie activa cuyo registro de sesión esté Anulado cuenta en volumen/records/estancado/progreso (solo mejorEntrenamiento, ultimaSesionGrupo, asistencia y frecuenciaGrupos cruzan con la sesión). Si la anulación marca también las series (CONTRATO §Nada se borra), no hay efecto.
2. (Observación) `index.js` exporta `_aDT` interno; `Grupos musculares` acepta coma, ";" y "/".
3. (Observación) `rangoSemana/rangoMes` aceptan solo ISO string/DateTime con zona (un Date nativo funciona); luxon se inyecta como en T01.

## EVIDENCE
- `node --test "src/nucleo/**/*.test.js"`: tests 91, pass 91, fail 0.
- Exploración en /tmp/aud: aislamiento entre usuarios OK (200 kg del usuario 2 no aparece), Anulado ignorado, números "60,0"/"" -> null o 0 nunca inventado, placa sin 1RM, estancado 60x8/60x8/60x7 true, 60x8/60x9/60x8 false, rangoSemana en 2026-11-08T23:30-05:00 y 2026-11-09T04:30Z = 2026-11-02..08, cambio de año 2026-12-31 -> 2026-12-28..2027-01-03, rangoMes correcto, nombres con <b>&x escapados, partirMensaje <pre> 6 partes todas <=4096 balanceadas sin cortar &amp;, 10 000 chars -> 3 partes, formatearFecha('2026-11-07') = "sáb 7 nov".
- concat.test.js (vm con require que lanza) pasa dentro de la suite.
- Grep de secretos en el diff: vacío.

## REQUIRED_FIXES
Ninguno.
