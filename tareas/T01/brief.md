# T01 · Núcleo A — entrada

**TASK_ID:** T01
**OBJECTIVE:** Módulos puros que convierten lo que escribe el usuario (o el JSON de la IA) en un registro de entrenamiento normalizado y validado, sin inventar datos. Más el esquema de la hoja.

## SCOPE
**Sí:**
1. `src/nucleo/texto.js` — `normalizar(s)` (minúsculas, sin tildes, espacios simples, sin puntuación de borde).
2. `src/nucleo/catalogo.js` — `resolverEjercicio(nombreLibre, catalogo)` → `{estado: 'exacto'|'sinonimo'|'dudoso'|'desconocido', ejercicio|null, candidatos: [máx 3]}`. Compara normalizado contra nombre canónico y sinónimos; distancia de edición pequeña (p. ej. Levenshtein ≤ 2 o ≤ 20 % del largo) → `dudoso` con candidatos. Nunca devuelve `exacto` por aproximación.
3. `src/nucleo/catalogo-semilla.json` — ~35 ejercicios comunes en español: `{ejercicio, grupo, sinonimos[], tipo: 'peso'|'peso corporal'|'tiempo', porMano: bool, provisional: true}`. Grupos: pecho, espalda, hombro, bíceps, tríceps, pierna (cuádriceps/femoral/glúteo/pantorrilla según convenga), abdomen. Sinónimos en español e inglés de gimnasio (`banca, press plano, bench`).
4. `src/nucleo/unidades.js`
   - `aKg(valor, unidad)`: `kg` igual; `lb|lbs|libras` × 0,45359237 redondeado a 0,5 kg; devuelve `{kg, convertido: bool}`.
   - `leerPlaca(texto)`: "placa 4", "4 placas", "la cuarta placa", "quinta plaqueta", "tercera plaquita" → `4/5/3`; si no hay, `null`.
   - Constante `MODALIDADES = ['normal','lastre','asistida','corporal']` (fácil de extender).
5. `src/nucleo/fechas.js` — `resolverFecha(texto|null, ahora)` en `America/Bogota` → `{ok:true, fecha:'AAAA-MM-DD'}` o `{ok:false, motivo:'futura'|'no_entendida'}`.
   - vacío/`hoy` → hoy; `ayer`; `anteayer`; nombre de día ("el lunes") → ese día de la semana más reciente, **hoy incluido** si coincide; "7 de octubre" / "7 oct" → año actual, y si esa fecha quedaría en el futuro → se rechaza como `futura` (no se cambia el año a escondidas); "12/11" = día/mes; ISO `2026-10-07`; "mañana" o cualquier fecha posterior a hoy → `futura`.
6. `src/nucleo/series.js` — `atajoSeries(texto)`: parser sin IA para patrones frecuentes. Devuelve `[{ejercicioTexto, series:[{n, unidad:'kg'|'placa', pesoKg|null, placa|null, modalidad, reps}]}]` o `null` si no está seguro (entonces el flujo usará la IA). Debe cubrir:
   - "Press banca 60 kg 10, 9 y 8" → 3 series de 60 kg con 10/9/8.
   - "Sentadilla 3x10 con 80" / "sentadilla 3x10 80kg" → 3 series 80 kg × 10.
   - "Remo 4x8 placa 5" / "remo cuarta placa 12, 10, 10" → unidad placa.
   - "Curl 25 lb 12, 10" → convierte a kg (marca convertido).
   - "Dominadas 10, 8, 8" → corporal; "dominadas con lastre 10 kg 8, 7, 6" → lastre 10 kg; "dominadas asistidas 20 kg 10, 10" → asistida 20 kg.
   - Varios ejercicios separados por punto, punto y coma o salto de línea: "Hoy pecho y tríceps. Press banca 60 kg 10, 9 y 8. Inclinado 40 kg 12, 10, 10".
   - Si falta el peso de un ejercicio de tipo peso o las reps → no adivina: deja `pesoKg: null` / devuelve `null`.
7. `src/nucleo/validar.js` — `validarRegistro(entrada, catalogo, ahora)`; `entrada` = JSON de la IA o salida del atajo: `{fecha?, ejercicios:[{nombre, series:[{pesoKg?, unidad?, placa?, modalidad?, reps?, rpe?, notas?}]}], observaciones?}`. Devuelve `{completo, registro, faltantes:[{ejercicio, serie, campo}], dudas:[{nombre, candidatos}], errores:[]}`.
   - Resuelve cada ejercicio con el catálogo (`dudoso`/`desconocido` → a `dudas`, no se guarda).
   - Peso faltante en tipo `peso` sin placa, o reps faltantes → `faltantes`. **Nunca** rellena valores.
   - Rangos: reps 1–100, peso 0–500 kg, placa 1–30, RPE 1–10 (fuera → `errores`).
   - Fecha con `resolverFecha`; futura → error.
   - Mancuernas (`porMano`): se guarda el peso tal cual (por mano), sin × 2.
   - `registro` normalizado listo para escribir: fecha, grupos musculares (únicos, del catálogo), y series numeradas por ejercicio.
8. `src/nucleo/index.js` — reexporta todo.
9. `hoja/esquema.json` — pestañas y columnas exactas de `PROYECTO.md §3` (sin *Retos* ni *Participantes*, pendientes de la ronda 2), en orden.

**No:** métricas (1RM, volumen, récords: T02), textos de respuesta, flujos n8n, scripts de build, nada de Google/Telegram.

## RELEVANT_FILES
`tareas/CONTRATO.md` (§1, §2, §4) · `PROYECTO.md` §1 (D04–D11) y §3 · `.claude/skills/n8n-workflow-check/node_modules/luxon` (ya instalado).

## CONSTRAINTS
- Contrato §1: JS puro CommonJS, Node 22, sin dependencias salvo Luxon; `ahora` siempre por parámetro; exportar con `module.exports` protegido.
- Luxon: en n8n existe el global `DateTime`; en Node, cargarlo desde `.claude/skills/n8n-workflow-check/node_modules/luxon`. El módulo debe funcionar en los dos casos (detección o inyección). **No** crear `package.json` ni `node_modules` en la raíz.
- Datos de prueba inventados.

## ACCEPTANCE_CRITERIA
1. `node --test src/nucleo/` pasa, con al menos un caso válido, uno inválido y uno de borde por función pública.
2. Todos los ejemplos del punto 6 tienen prueba y dan lo indicado.
3. `resolverFecha` con `ahora = 2026-11-09T08:00:00-05:00` (lunes): "ayer" → 2026-11-08; "el lunes" → 2026-11-09; "el viernes" → 2026-11-06; "7 de octubre" → 2026-10-07; "25 de diciembre" → `futura`; "mañana" → `futura`. Y un caso cerca de medianoche: `ahora = 2026-11-10T03:30:00Z` (22:30 del 9 en Bogotá) → "hoy" = 2026-11-09.
4. `validarRegistro` con peso faltante devuelve `completo:false` y el faltante exacto, sin valor inventado.
5. "press plano" → `sinonimo` Press banca; "pres banka" → `dudoso` con Press banca entre los candidatos; "zumba" → `desconocido`.
6. `hoja/esquema.json` es JSON válido y coincide con `PROYECTO.md §3`.

## VALIDATION_COMMANDS
```bash
node --test src/nucleo/
node -e "const n=require('./src/nucleo'); console.log(Object.keys(n).join(', '))"
python3 -c "import json;d=json.load(open('hoja/esquema.json'));print(len(d), 'pestañas')"
git status --short
```
