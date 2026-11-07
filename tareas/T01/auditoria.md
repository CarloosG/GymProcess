# T01 · Auditoría

## VERDICT
RECHAZADO

## FINDINGS
1. **[ALTA, bloqueante] `atajoSeries` inventa reps con "N series (de) M".** "press banca 60 kg 3 series de 10" -> 2 series (60x3, 60x10); "press banca 60 kg 4 series 10" -> 60x4, 60x10; "curl 3 series 10 20 kg" -> 20x3, 20x10; "press banca 60 kg 10 reps 3 series" -> 60x10, 60x3. El "3" de "3 series" se toma como reps y la salida tiene peso, así que `validarRegistro` da `completo:true` y se guardaría dato falso sin preguntar. Debe devolver `null` (o interpretar NxM). Con "3 veces", "8 reps en 3 series" sí devuelve null, correcto.
2. **[ALTA, bloqueante] El núcleo concatenado falla si `require` existe como función (Code node de n8n).** Cada módulo hace `(typeof require === 'function') ? require('./texto') : {normalizar: normalizar}`. En n8n `require` existe (solo módulos permitidos) y `require('./texto')` lanza `Cannot find module './texto'`. Probé con `vm`: sin `require` + `DateTime` global OK; con `require` que solo resuelve `luxon` -> FALLA. El ejecutor solo probó el caso sin `require`. Fix: no depender de `require` en los módulos (usar funciones globales hoisted en el build; envolver `require` en try/catch con fallback al símbolo global), y usar `typeof module !== 'undefined'` para detectar Node.
3. [MEDIA] `validarRegistro` convierte un peso/reps en blanco `" "` en 0: `{pesoKg:" ",reps:5}` -> `completo:true`, `pesoKg:0` (dato inventado). `_num` debe tratar cadenas vacías tras `trim()` como vacío. También acepta `"0x10"` -> 16 y `"1e1"` -> 10 en reps.
4. [BAJA] `atajoSeries("curl 20 10 8")` / `"press banca 40 10"` -> reps 20,10,8 sin peso (no inventa peso; luego `validarRegistro` pide `pesoKg`), pero registra el peso como reps si el usuario responde solo el peso. Considerar `null` cuando no hay peso/placa y el primer número > 12 o sin "kg" en tipo peso.
5. [BAJA] `atajoSeries("press banca 1000 kg 10")` devuelve 1000 kg (lo frena `validarRegistro`, aceptable). `notas` con `=...` no se protege (corresponde a la capa de escritura, T04/T05).
6. [INFO] `resolverFecha`: correcto en medianoche Bogotá (04:59:59Z/05:00:00Z, 31 dic/1 ene, bisiesto, 12/11 futura, 25 dic futura). "1 de enero" el 31-dic -> 2026-01-01 (año actual, por especificación). `resolverEjercicio`: sin falsos "exacto" (sin colisiones en la semilla; ambiguos -> dudoso). Esquema coincide con PROYECTO §3 (Segundos tras Reps, encabezados simples E2). `index.js` solo reexporta (E1 cumplido). Sin secretos.

## EVIDENCE
```
$ node --test "src/nucleo/**/*.test.js"
# tests 56
# pass 56
# fail 0
$ node --test src/nucleo/        (comando original del brief, sustituido por E1)
# fail 0   (no ejecuta pruebas en Node 22; esperado, ver E1)
$ node -e "const n=require('./src/nucleo'); console.log(Object.keys(n).join(', '))"
normalizar, resolverEjercicio, aKg, leerPlaca, buscarPlaca, MODALIDADES, LB_A_KG, resolverFecha, inyectarLuxon, atajoSeries, validarRegistro
$ python3 -c "import json;d=json.load(open('hoja/esquema.json'));print(len(d),'pestañas')"
10 pestañas
$ git status --short
?? hoja/
?? src/
?? tareas/T01/ejecutor.md
$ git diff | grep -nE "AIza|gsk_|sk-|ya29\.|Bearer ..."   -> vacío (grep sobre src/ hoja/ también vacío)
```
Exploratorias (en /tmp/aud/): concat.js (vm: sin require OK; con require restringido FALLA `Cannot find module './texto'`), edge.js y edge2.js (casos de fechas, ejercicios, atajo y rangos). Salida de hallazgo 1:
```
"press banca 60 kg 3 series de 10" -> 60x3 60x10
"curl 3 series 10 20 kg"           -> 20x3 20x10
```

## REQUIRED_FIXES
1. `atajoSeries`: con la palabra "series" precedida de número ("N series", "N series de M") -> interpretar como NxM o devolver `null`; nunca contarlo como reps. Agregar pruebas.
2. Quitar la dependencia de `require` en los módulos para el build concatenado (o try/catch con fallback a globales) y agregar una prueba que concatene los módulos y los ejecute en `vm` con `DateTime` global, con y sin `require` restringido.
3. `_num` en validar.js: cadena en blanco -> vacío; rechazar hex/exponente en reps/peso. Agregar pruebas.
4. (Opcional) hallazgo 4.
