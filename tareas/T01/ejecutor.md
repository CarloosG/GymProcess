# T01 · Reporte del ejecutor

## STATUS
HECHO

## FILES_CHANGED
- src/nucleo/texto.js, catalogo.js, catalogo-semilla.json (37 ejercicios), unidades.js, fechas.js, series.js, validar.js, index.js
- src/nucleo/{texto,catalogo,unidades,fechas,series,validar,index}.test.js
- hoja/esquema.json (10 pestañas)
- tareas/T01/ejecutor.md

## SUMMARY
Núcleo A completo: normalización, resolución de ejercicios, unidades/placas, fechas en Bogotá, atajo de series sin IA, validación de registro y esquema de hoja. Todos los ejemplos del brief (puntos 6 y criterios 3, 4, 5) tienen prueba. También verifiqué que los módulos concatenados (como los inserta el build) funcionan sin `require` con el global `DateTime`.

## DECISIONES
- `resolverEjercicio`: `ejercicio` y `candidatos` son las entradas completas del catálogo (no solo el nombre). Umbral de aproximación = min(2, floor(20 % del largo)); nombre ambiguo entre dos ejercicios -> dudoso.
- `validarRegistro`: `dudas[].candidatos` son nombres canónicos (strings). `faltantes.campo` usa `pesoKg` | `reps` | `placa` | `modalidad`. `errores` es lista de textos. `registro` se devuelve siempre como borrador (con `null` en lo que falta y `ejercicio:null` + `nombreOriginal` en dudosos); solo se escribe si `completo:true`. Forma: `{fecha, grupos, observaciones, ejercicios:[{ejercicio, nombreOriginal, grupo, tipo, porMano, series:[{n, unidad, pesoKg, placa, modalidad, reps, rpe, notas, convertido?}]}]}`. Mismo ejercicio repetido se fusiona y continúa la numeración.
- Acepta como entrada directa la salida del atajo (`ejercicioTexto` como alias de `nombre`). Unidad `lb` en la entrada se convierte. Peso + placa a la vez, o corporal con peso -> error. Peso>0 sin modalidad en tipo "peso corporal" -> falta `modalidad` (no adivina lastre/asistida).
- `atajoSeries(texto, catalogo?)`: segundo parámetro opcional para decidir "corporal" por tipo; sin él usa una lista corta (dominadas, fondos, flexiones...). Devuelve `null` si hay fecha en el texto (ayer, lunes, 7 de octubre...), para que no se registre en hoy por error; reps > 50 -> `null` ("Press banca 60 10, 9" es ambiguo). Solo ignora segmentos sin números si empiezan por "hoy|entrené|hice|rutina|día de"; los demás sin números -> `null`. Series convertidas de lb llevan `convertido:true` (solo ellas).
- `unidades.js` exporta además `buscarPlaca` y `LB_A_KG`; `fechas.js` exporta `inyectarLuxon(DT)`. Luxon: global `DateTime` -> `require('luxon')` -> ruta del skill.
- `hoja/esquema.json`: lista de `{pestana, columnas[], valores?}`. Encabezados sin aclaraciones: "ID usuario (chat_id)" -> "ID usuario", "Ejercicio (canónico)" -> "Ejercicio"; se conservan "(kg)" y "(s)". La prueba index.test.js compara contra PROYECTO.md §3.
- Node 22 trata `node --test src/nucleo/` como un archivo (carga index.js) y no corría nada. Solución: al final de index.js, si es punto de entrada bajo el runner (`NODE_TEST_CONTEXT`), carga los `*.test.js`. Así el comando del brief ejecuta todo.
- Tiempo (plancha): no exige peso; `reps` se usa como segundos (la hoja no tiene columna de segundos). Revisar en la ronda siguiente.

## TESTS
```
$ node --test src/nucleo/
ok 1 - semilla: ~35 ejercicios, campos completos y marcada provisional
ok 2 - exacto (ignora mayúsculas y tildes)
ok 3 - sinónimo: "press plano" -> Press banca
ok 4 - dudoso: "pres banka" trae Press banca entre los candidatos y no es exacto
ok 5 - desconocido: "zumba", vacío y catálogo vacío
ok 6 - borde: nombre ambiguo entre dos ejercicios es dudoso, nunca elige
ok 7 - borde: una palabra corta con 1 letra distinta no se aproxima
ok 8 - vacío, null y hoy -> hoy
ok 9 - ayer y anteayer
ok 10 - día de la semana: el último pasado, hoy incluido
ok 11 - fecha concreta: "7 de octubre", "7 oct", ISO, d/m
ok 12 - d/m es día/mes: 12/11 es 12 de noviembre (futura un lunes 9)
ok 13 - futuras: mañana, 25 de diciembre (no cambia el año), ISO futuro
ok 14 - no entendida: basura y fechas imposibles
ok 15 - medianoche: 03:30Z del día 10 es 22:30 del 9 en Bogotá
ok 16 - ahora admite Date y DateTime de Luxon; ahora inválido lanza
ok 17 - index reexporta todo el núcleo A
ok 18 - hoja/esquema.json coincide con PROYECTO.md §3 (sin Retos/Participantes), en orden
ok 19 - "Press banca 60 kg 10, 9 y 8"
ok 20 - "Sentadilla 3x10 con 80" y "sentadilla 3x10 80kg"
ok 21 - placas: "Remo 4x8 placa 5" y "remo cuarta placa 12, 10, 10"
ok 22 - libras: "Curl 25 lb 12, 10" convierte y marca convertido
ok 23 - peso corporal: dominadas corporal, con lastre, asistidas
ok 24 - varios ejercicios con encabezado "Hoy pecho y tríceps."
ok 25 - separadores: punto y coma y salto de línea; decimales con punto no parten
ok 26 - falta el peso: no adivina (pesoKg null)
ok 27 - faltan reps o no está seguro -> null
ok 28 - con fecha en el texto delega a la IA (null)
ok 29 - con catálogo: tipo peso corporal -> corporal; tipo peso -> normal
ok 30 - normalizar: válido (tildes, mayúsculas, espacios)
ok 31 - normalizar: inválido (null, undefined, no texto)
ok 32 - normalizar: borde (puntuación de borde sí, interna se conserva)
ok 33 - aKg: kg queda igual
ok 34 - aKg: lb/lbs/libras convierten y redondean a 0,5 kg
ok 35 - aKg: inválido y borde
ok 36 - leerPlaca: formas válidas
ok 37 - leerPlaca: sin placa -> null
ok 38 - leerPlaca: borde, en "4x8 placa 5" gana la placa 5, no el 8
ok 39 - MODALIDADES
ok 40 - válido: registro completo, normalizado y numerado
ok 41 - peso faltante: completo false y el faltante exacto, sin valor inventado
ok 42 - reps faltantes
ok 43 - ejercicio dudoso o desconocido va a dudas, no se completa
ok 44 - rangos fuera -> errores
ok 45 - bordes de rango válidos: reps 1 y 100, peso 0 y 500, RPE 1 y 10, placa 1 y 30
ok 46 - fecha: ayer, futura -> error, no entendida -> error
ok 47 - mancuernas: el peso se guarda por mano, sin × 2
ok 48 - placa: se guarda placa sin kg inventados; peso y placa a la vez es error
ok 49 - peso corporal: corporal sin peso es completo; lastre sin peso falta; sin modalidad con peso pregunta
ok 50 - lb en la entrada se convierte y se marca
ok 51 - grupos únicos y mismo ejercicio repetido continúa la numeración
ok 52 - entrada inválida: sin ejercicios, null, ejercicio sin series o sin nombre
ok 53 - integración: salida del atajo -> validar
# tests 53
# pass 53
# fail 0
```
```
$ node -e "const n=require('./src/nucleo'); console.log(Object.keys(n).join(', '))"
normalizar, resolverEjercicio, aKg, leerPlaca, buscarPlaca, MODALIDADES, LB_A_KG, resolverFecha, inyectarLuxon, atajoSeries, validarRegistro
$ python3 -c "import json;d=json.load(open('hoja/esquema.json'));print(len(d), 'pestañas')"
10 pestañas
$ git status --short
?? hoja/
?? src/
?? tareas/T01/ejecutor.md
```

## RISKS
- Sinónimos y catálogo semilla son provisionales (D04); "remo" a secas mapea a Remo con barra.
- "tiempo": reps como segundos sin columna propia.
- Encabezados de hoja simplificados (ver DECISIONES); si el arquitecto quiere los textos literales de la tabla, es un cambio de una línea en esquema.json y en el test.
- El hack de index.js para `node --test <carpeta>` es específico de Node 22.

## BLOCKERS
Ninguno.

## AJUSTES v2
1. index.js solo reexporta; se quitó el hack que cargaba los *.test.js (E1). Comando oficial: `node --test "src/nucleo/**/*.test.js"`.
2. Tipo `tiempo` (E2): `hoja/esquema.json` agrega `Segundos` justo después de `Reps` en Series. `validarRegistro`: en tiempo guarda `segundos` (entero 1-3600) y deja `reps: null`; segundos faltantes -> faltante `{campo:'segundos'}`; reps en tiempo o segundos en otro tipo -> error. Todas las series llevan ahora `segundos` (null si no aplica). `atajoSeries` entiende "plancha 3 series de 45 s", "3x45 seg" y "45 s, 40 s y 30 s" (devuelve `segundos` y `reps:null`). Pruebas nuevas en series.test.js y validar.test.js.
3. Encabezados simples aprobados (E2); index.test.js los compara con PROYECTO.md §3 quitando "(= chat_id)" y "(nombre canónico)".
Esto reemplaza la decisión anterior sobre "reps como segundos" y el hack de index.js (ya no son riesgos).

```
$ node --test "src/nucleo/**/*.test.js"
# tests 56
# pass 56
# fail 0
$ node -e "const n=require('./src/nucleo'); console.log(Object.keys(n).join(', '))"
normalizar, resolverEjercicio, aKg, leerPlaca, buscarPlaca, MODALIDADES, LB_A_KG, resolverFecha, inyectarLuxon, atajoSeries, validarRegistro
$ python3 -c "import json;d=json.load(open('hoja/esquema.json'));print(len(d), 'pestañas')"
10 pestañas
$ git status --short
?? hoja/
?? src/
?? tareas/T01/ejecutor.md
```
