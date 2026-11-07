# T01 · Auditoría

## CICLO 1 (resumen) — RECHAZADO
Hallazgos: (1) ALTA: `atajoSeries` tomaba el "3" de "3 series de 10" como reps (dato inventado); (2) ALTA: núcleo concatenado fallaba en n8n si `require` existe como función (`require('./texto')` lanza); (3) MEDIA: `validarRegistro` convertía " " en 0 y aceptaba "0x10"/"1e1"; (4) BAJA: "curl 20 10 8" registraba el peso como reps. Resto (fechas, catálogo, esquema, E1/E2, secretos) correcto.

## CICLO 2 (re-auditoría)

### VERDICT
APROBADO

### FINDINGS
1. Hallazgo 1 RESUELTO: "press banca 60 kg 3 series de 10" -> 3x(60x10); "4 series 10" -> 4x(60x10); "curl 3 series 10 20 kg" -> 3x(20x10); "60 kg 10 reps 3 series", "3 series" sin reps, "3 series 10 8", "3 series 10, 9, 8", "series 10 9 8", "3 sets de 10", "tres series de 10", "3 series de 10 y 2 series de 8", "serie 1 10 serie 2 8" -> null. Ninguno cuenta "series" como reps.
2. Hallazgo 2 RESUELTO: núcleo concatenado corre en `node:vm` (a) sin require, (b) con require que lanza para toda ruta, (c) con require que solo resuelve luxon, todos con `DateTime` global; mismos resultados (fecha, atajo, catálogo, validar). También sin `DateTime` global pero con require de luxon.
3. Hallazgo 3 RESUELTO: `" "`, `"\t"`, `"\n"`, `" "` -> faltante (no 0); "0x10", "1e1", ".5", "5.", "+5", "60 kg", "１０", arreglos, objetos, NaN -> error; `" 60,5 "` -> 60.5. `aKg(' ','lb')` -> null. RPE en blanco -> vacío (campo opcional), "0x5" -> error.
4. Hallazgo 4 RESUELTO: "curl 20 10 8", "press banca 40 10", "curl 50 12", "curl 12.5 10" -> null; "Press banca 10, 9" y "Dominadas 15, 12/20 15 12" siguen funcionando (sin peso -> `validarRegistro` pide peso o es corporal).
5. Sin regresiones: 62/62 pruebas; esquema (10 pestañas), índice, sin secretos, working tree limpio.

Observaciones NO bloqueantes:
- "press banca 60 kg 10 series 3" se lee como 10 series de 3 (orden literal "N series M"); es una lectura coherente con la regla, no inventa números que el usuario no escribió.
- "plancha 3 series de 45 s" devuelve 3 series con `segundos: null` (no inventa; `validarRegistro` lo marca faltante). El atajo no extrae segundos en ese formato; la IA lo cubriría.
- Las pruebas de los ajustes 1, 3 y 4 se escribieron junto con el arreglo (el ejecutor lo declara); los casos coinciden con los reproducidos aquí y pasan.
- Heredado: `notas` con `=...` no se protege aquí (capa de escritura, T04/T05).

### EVIDENCE
```
$ node --test "src/nucleo/**/*.test.js"
# tests 62  # pass 62  # fail 0
$ node /tmp/aud2/vm.js   (concat de texto,catalogo,unidades,fechas,series,validar)
norequire [1,{"ok":true,"fecha":"2026-11-06"},{"ok":true,"fecha":"2026-11-09"},"dudoso",true]
throws    [1,{"ok":true,"fecha":"2026-11-06"},{"ok":true,"fecha":"2026-11-09"},"dudoso",true]
n8n-like  [1,{"ok":true,"fecha":"2026-11-06"},{"ok":true,"fecha":"2026-11-09"},"dudoso",true]
sin global {"ok":true,"fecha":"2026-11-08"}
$ node /tmp/aud2/t.js   (casos de series, números raros y blancos; ver FINDINGS 1-4)
press banca 60 kg 3 series de 10 => 60x10 x3 | 60 kg 10 reps 3 series => null | curl 20 10 8 => null
{"pesoKg":" ","reps":5} => completo:false, faltante pesoKg, valor null
{"pesoKg":60,"reps":"1e1"} => error | {"pesoKg":"0x10"} => error
$ git status --short -> vacío; grep de secretos sobre src/ hoja/ y git diff HEAD -> vacío
```

### REQUIRED_FIXES
Ninguno.
