const test = require('node:test');
const assert = require('node:assert');
const { validarRegistro } = require('./validar');
const cat = require('./catalogo-semilla.json');
const { atajoSeries } = require('./series');

const AHORA = '2026-11-09T08:00:00-05:00';

test('válido: registro completo, normalizado y numerado', () => {
  const r = validarRegistro({
    ejercicios: [
      { nombre: 'press plano', series: [{ pesoKg: 60, reps: 10 }, { pesoKg: 60, reps: 9, rpe: 8, notas: 'lento' }] },
      { nombre: 'Press inclinado con mancuernas', series: [{ pesoKg: 22.5, reps: 10 }] }
    ],
    observaciones: 'buen día'
  }, cat, AHORA);
  assert.strictEqual(r.completo, true);
  assert.deepStrictEqual(r.faltantes, []);
  assert.deepStrictEqual(r.dudas, []);
  assert.deepStrictEqual(r.errores, []);
  assert.strictEqual(r.registro.fecha, '2026-11-09');
  assert.deepStrictEqual(r.registro.grupos, ['pecho']);
  assert.strictEqual(r.registro.observaciones, 'buen día');
  const e0 = r.registro.ejercicios[0];
  assert.strictEqual(e0.ejercicio, 'Press banca');
  assert.deepStrictEqual(e0.series.map((s) => s.n), [1, 2]);
  assert.strictEqual(e0.series[1].rpe, 8);
  assert.strictEqual(e0.series[0].unidad, 'kg');
  assert.strictEqual(e0.series[0].modalidad, 'normal');
});
test('peso faltante: completo false y el faltante exacto, sin valor inventado', () => {
  const r = validarRegistro({ ejercicios: [{ nombre: 'Press banca', series: [{ reps: 10 }, { pesoKg: 60, reps: 9 }] }] }, cat, AHORA);
  assert.strictEqual(r.completo, false);
  assert.deepStrictEqual(r.faltantes, [{ ejercicio: 'Press banca', serie: 1, campo: 'pesoKg' }]);
  assert.strictEqual(r.registro.ejercicios[0].series[0].pesoKg, null);
});
test('reps faltantes', () => {
  const r = validarRegistro({ ejercicios: [{ nombre: 'Sentadilla', series: [{ pesoKg: 80 }] }] }, cat, AHORA);
  assert.strictEqual(r.completo, false);
  assert.deepStrictEqual(r.faltantes, [{ ejercicio: 'Sentadilla', serie: 1, campo: 'reps' }]);
  assert.strictEqual(r.registro.ejercicios[0].series[0].reps, null);
});
test('ejercicio dudoso o desconocido va a dudas, no se completa', () => {
  const r = validarRegistro({ ejercicios: [
    { nombre: 'pres banka', series: [{ pesoKg: 60, reps: 10 }] },
    { nombre: 'zumba', series: [{ pesoKg: 1, reps: 10 }] }
  ] }, cat, AHORA);
  assert.strictEqual(r.completo, false);
  assert.strictEqual(r.dudas.length, 2);
  assert.ok(r.dudas[0].candidatos.includes('Press banca'));
  assert.deepStrictEqual(r.dudas[1], { nombre: 'zumba', candidatos: [] });
  assert.deepStrictEqual(r.registro.grupos, []);
});
test('rangos fuera -> errores', () => {
  const mala = (s) => validarRegistro({ ejercicios: [{ nombre: 'Press banca', series: [s] }] }, cat, AHORA);
  assert.ok(mala({ pesoKg: 60, reps: 0 }).errores.length);
  assert.ok(mala({ pesoKg: 60, reps: 101 }).errores.length);
  assert.ok(mala({ pesoKg: 501, reps: 5 }).errores.length);
  assert.ok(mala({ pesoKg: -5, reps: 5 }).errores.length);
  assert.ok(mala({ pesoKg: 60, reps: 5, rpe: 11 }).errores.length);
  assert.ok(mala({ pesoKg: 60, reps: 5, rpe: 0 }).errores.length);
  assert.ok(mala({ pesoKg: 60, reps: 5.5 }).errores.length);
  assert.ok(mala({ pesoKg: 60, reps: 'abc' }).errores.length);
  assert.ok(mala({ placa: 31, reps: 5 }).errores.length);
  assert.ok(mala({ pesoKg: 60, reps: 5, modalidad: 'rara' }).errores.length);
  assert.strictEqual(mala({ pesoKg: 60, reps: 5 }).errores.length, 0);
});
test('bordes de rango válidos: reps 1 y 100, peso 0 y 500, RPE 1 y 10, placa 1 y 30', () => {
  const r = validarRegistro({ ejercicios: [
    { nombre: 'Press banca', series: [{ pesoKg: 0, reps: 1, rpe: 1 }, { pesoKg: 500, reps: 100, rpe: 10 }] },
    { nombre: 'Remo en polea', series: [{ unidad: 'placa', placa: 1, reps: 5 }, { unidad: 'placa', placa: 30, reps: 5 }] }
  ] }, cat, AHORA);
  assert.deepStrictEqual(r.errores, []);
  assert.strictEqual(r.completo, true);
});
test('fecha: ayer, futura -> error, no entendida -> error', () => {
  const base = { ejercicios: [{ nombre: 'Press banca', series: [{ pesoKg: 60, reps: 10 }] }] };
  assert.strictEqual(validarRegistro(Object.assign({ fecha: 'ayer' }, base), cat, AHORA).registro.fecha, '2026-11-08');
  const f = validarRegistro(Object.assign({ fecha: 'mañana' }, base), cat, AHORA);
  assert.strictEqual(f.completo, false);
  assert.ok(f.errores.some((e) => /futura/.test(e)));
  const n = validarRegistro(Object.assign({ fecha: 'xyz' }, base), cat, AHORA);
  assert.strictEqual(n.completo, false);
  assert.ok(n.errores.length);
});
test('mancuernas: el peso se guarda por mano, sin × 2', () => {
  const r = validarRegistro({ ejercicios: [{ nombre: 'Curl con mancuernas', series: [{ pesoKg: 12, reps: 10 }] }] }, cat, AHORA);
  assert.strictEqual(r.registro.ejercicios[0].porMano, true);
  assert.strictEqual(r.registro.ejercicios[0].series[0].pesoKg, 12);
});
test('placa: se guarda placa sin kg inventados; peso y placa a la vez es error', () => {
  const r = validarRegistro({ ejercicios: [{ nombre: 'Remo en polea', series: [{ placa: 5, reps: 8 }] }] }, cat, AHORA);
  assert.strictEqual(r.completo, true);
  assert.deepStrictEqual([r.registro.ejercicios[0].series[0].unidad, r.registro.ejercicios[0].series[0].placa, r.registro.ejercicios[0].series[0].pesoKg], ['placa', 5, null]);
  const x = validarRegistro({ ejercicios: [{ nombre: 'Remo en polea', series: [{ placa: 5, pesoKg: 40, reps: 8 }] }] }, cat, AHORA);
  assert.ok(x.errores.length);
});
test('peso corporal: corporal sin peso es completo; lastre sin peso falta; sin modalidad con peso pregunta', () => {
  const c = validarRegistro({ ejercicios: [{ nombre: 'Dominadas', series: [{ reps: 10 }] }] }, cat, AHORA);
  assert.strictEqual(c.completo, true);
  assert.strictEqual(c.registro.ejercicios[0].series[0].modalidad, 'corporal');
  const l = validarRegistro({ ejercicios: [{ nombre: 'Dominadas', series: [{ modalidad: 'lastre', reps: 8 }] }] }, cat, AHORA);
  assert.deepStrictEqual(l.faltantes, [{ ejercicio: 'Dominadas', serie: 1, campo: 'pesoKg' }]);
  const a = validarRegistro({ ejercicios: [{ nombre: 'Dominadas', series: [{ pesoKg: 10, reps: 8 }] }] }, cat, AHORA);
  assert.deepStrictEqual(a.faltantes, [{ ejercicio: 'Dominadas', serie: 1, campo: 'modalidad' }]);
});
test('lb en la entrada se convierte y se marca', () => {
  const r = validarRegistro({ ejercicios: [{ nombre: 'Curl de bíceps', series: [{ pesoKg: 25, unidad: 'lb', reps: 12 }] }] }, cat, AHORA);
  assert.strictEqual(r.registro.ejercicios[0].series[0].pesoKg, 11.5);
  assert.strictEqual(r.registro.ejercicios[0].series[0].convertido, true);
});
test('grupos únicos y mismo ejercicio repetido continúa la numeración', () => {
  const r = validarRegistro({ ejercicios: [
    { nombre: 'Press banca', series: [{ pesoKg: 60, reps: 10 }] },
    { nombre: 'Press inclinado', series: [{ pesoKg: 40, reps: 10 }] },
    { nombre: 'bench', series: [{ pesoKg: 60, reps: 8 }] },
    { nombre: 'Curl con mancuernas', series: [{ pesoKg: 10, reps: 10 }] }
  ] }, cat, AHORA);
  assert.deepStrictEqual(r.registro.grupos, ['pecho', 'bíceps']);
  assert.strictEqual(r.registro.ejercicios.length, 3);
  assert.deepStrictEqual(r.registro.ejercicios[0].series.map((s) => s.n), [1, 2]);
});
test('entrada inválida: sin ejercicios, null, ejercicio sin series o sin nombre', () => {
  assert.ok(validarRegistro(null, cat, AHORA).errores.length);
  assert.ok(validarRegistro({}, cat, AHORA).errores.length);
  assert.ok(validarRegistro({ ejercicios: [] }, cat, AHORA).errores.length);
  assert.strictEqual(validarRegistro({ ejercicios: [{ nombre: 'Press banca', series: [] }] }, cat, AHORA).completo, false);
  assert.strictEqual(validarRegistro({ ejercicios: [{ series: [{ pesoKg: 1, reps: 1 }] }] }, cat, AHORA).completo, false);
  assert.strictEqual(validarRegistro(null, cat, AHORA).registro, null);
});
test('integración: salida del atajo -> validar', () => {
  const a = atajoSeries('Hoy pecho. Press banca 60 kg 10, 9 y 8. Dominadas 10, 8', cat);
  const r = validarRegistro(a, cat, AHORA);
  assert.strictEqual(r.completo, true);
  assert.strictEqual(r.registro.ejercicios.length, 2);
  const sinPeso = validarRegistro(atajoSeries('Press banca 10, 9', cat), cat, AHORA);
  assert.strictEqual(sinPeso.completo, false);
  assert.strictEqual(sinPeso.faltantes.length, 2);
});
test('tiempo: guarda segundos y deja reps vacío; sin segundos -> faltante segundos', () => {
  const ok = validarRegistro(atajoSeries('Plancha 3 series de 45 s', cat), cat, AHORA);
  assert.strictEqual(ok.completo, true);
  assert.deepStrictEqual(ok.registro.ejercicios[0].series.map((s) => [s.segundos, s.reps]), [[45, null], [45, null], [45, null]]);
  const f = validarRegistro({ ejercicios: [{ nombre: 'Plancha', series: [{ segundos: 30 }, {}] }] }, cat, AHORA);
  assert.strictEqual(f.completo, false);
  assert.deepStrictEqual(f.faltantes, [{ ejercicio: 'Plancha', serie: 2, campo: 'segundos' }]);
  assert.strictEqual(f.registro.ejercicios[0].series[1].segundos, null);
});
test('tiempo: rangos y mezclas -> errores', () => {
  const e = (s, n = 'Plancha') => validarRegistro({ ejercicios: [{ nombre: n, series: [s] }] }, cat, AHORA).errores.length;
  assert.ok(e({ segundos: 0 }));
  assert.ok(e({ segundos: 3601 }));
  assert.ok(e({ segundos: 'x' }));
  assert.ok(e({ segundos: 30, reps: 10 }));
  assert.ok(e({ segundos: 30, pesoKg: 1, reps: 5 }, 'Press banca'));
  assert.strictEqual(e({ segundos: 1 }), 0);
  assert.strictEqual(e({ segundos: 3600 }), 0);
});
