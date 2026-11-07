const test = require('node:test');
const assert = require('node:assert');
const { atajoSeries } = require('./series');

const S = (n, o) => Object.assign({ n, unidad: 'kg', pesoKg: null, placa: null, modalidad: 'normal', reps: 0 }, o);

test('"Press banca 60 kg 10, 9 y 8"', () => {
  assert.deepStrictEqual(atajoSeries('Press banca 60 kg 10, 9 y 8'), [{
    ejercicioTexto: 'Press banca',
    series: [S(1, { pesoKg: 60, reps: 10 }), S(2, { pesoKg: 60, reps: 9 }), S(3, { pesoKg: 60, reps: 8 })]
  }]);
});
test('"Sentadilla 3x10 con 80" y "sentadilla 3x10 80kg"', () => {
  const esperado = (nombre) => [{ ejercicioTexto: nombre, series: [1, 2, 3].map((n) => S(n, { pesoKg: 80, reps: 10 })) }];
  assert.deepStrictEqual(atajoSeries('Sentadilla 3x10 con 80'), esperado('Sentadilla'));
  assert.deepStrictEqual(atajoSeries('sentadilla 3x10 80kg'), esperado('sentadilla'));
});
test('placas: "Remo 4x8 placa 5" y "remo cuarta placa 12, 10, 10"', () => {
  const a = atajoSeries('Remo 4x8 placa 5');
  assert.strictEqual(a[0].series.length, 4);
  assert.deepStrictEqual(a[0].series[0], S(1, { unidad: 'placa', placa: 5, reps: 8 }));
  const b = atajoSeries('remo cuarta placa 12, 10, 10');
  assert.deepStrictEqual(b[0].series.map((s) => [s.unidad, s.placa, s.pesoKg, s.reps]),
    [['placa', 4, null, 12], ['placa', 4, null, 10], ['placa', 4, null, 10]]);
});
test('libras: "Curl 25 lb 12, 10" convierte y marca convertido', () => {
  const r = atajoSeries('Curl 25 lb 12, 10');
  assert.deepStrictEqual(r[0].series, [
    S(1, { pesoKg: 11.5, reps: 12, convertido: true }),
    S(2, { pesoKg: 11.5, reps: 10, convertido: true })
  ]);
});
test('peso corporal: dominadas corporal, con lastre, asistidas', () => {
  const c = atajoSeries('Dominadas 10, 8, 8');
  assert.deepStrictEqual(c[0].series.map((s) => [s.modalidad, s.pesoKg, s.reps]), [['corporal', null, 10], ['corporal', null, 8], ['corporal', null, 8]]);
  const l = atajoSeries('dominadas con lastre 10 kg 8, 7, 6');
  assert.deepStrictEqual(l[0].series.map((s) => [s.modalidad, s.pesoKg, s.reps]), [['lastre', 10, 8], ['lastre', 10, 7], ['lastre', 10, 6]]);
  assert.strictEqual(l[0].ejercicioTexto, 'dominadas');
  const a = atajoSeries('dominadas asistidas 20 kg 10, 10');
  assert.deepStrictEqual(a[0].series.map((s) => [s.modalidad, s.pesoKg, s.reps]), [['asistida', 20, 10], ['asistida', 20, 10]]);
});
test('varios ejercicios con encabezado "Hoy pecho y tríceps."', () => {
  const r = atajoSeries('Hoy pecho y tríceps. Press banca 60 kg 10, 9 y 8. Inclinado 40 kg 12, 10, 10');
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0].ejercicioTexto, 'Press banca');
  assert.strictEqual(r[1].ejercicioTexto, 'Inclinado');
  assert.deepStrictEqual(r[1].series.map((s) => [s.pesoKg, s.reps]), [[40, 12], [40, 10], [40, 10]]);
});
test('separadores: punto y coma y salto de línea; decimales con punto no parten', () => {
  const r = atajoSeries('Press banca 60 kg 10, 9; Remo 4x8 placa 5\nCurl 12.5 kg 10, 10');
  assert.strictEqual(r.length, 3);
  assert.strictEqual(r[2].series[0].pesoKg, 12.5);
  assert.strictEqual(atajoSeries('Curl 12,5 kg 10, 10')[0].series[0].pesoKg, 12.5);
});
test('falta el peso: no adivina (pesoKg null)', () => {
  const r = atajoSeries('Press banca 10, 9');
  assert.deepStrictEqual(r[0].series.map((s) => [s.pesoKg, s.modalidad, s.reps]), [[null, 'normal', 10], [null, 'normal', 9]]);
});
test('faltan reps o no está seguro -> null', () => {
  assert.strictEqual(atajoSeries('Press banca 60 kg'), null);
  assert.strictEqual(atajoSeries('Press banca'), null);
  assert.strictEqual(atajoSeries('Press banca 60 10, 9, 8'), null); // 60 reps: ambiguo
  assert.strictEqual(atajoSeries('hice muchas cosas hoy'), null);
  assert.strictEqual(atajoSeries(''), null);
  assert.strictEqual(atajoSeries(null), null);
});
test('con fecha en el texto delega a la IA (null)', () => {
  assert.strictEqual(atajoSeries('ayer press banca 60 kg 10, 9'), null);
  assert.strictEqual(atajoSeries('el lunes press banca 60 kg 10'), null);
});
test('con catálogo: tipo peso corporal -> corporal; tipo peso -> normal', () => {
  const cat = require('./catalogo-semilla.json');
  assert.strictEqual(atajoSeries('Fondos 12, 10', cat)[0].series[0].modalidad, 'corporal');
  assert.strictEqual(atajoSeries('Sentadilla 12, 10', cat)[0].series[0].modalidad, 'normal');
});
test('tiempo: "plancha 3 series de 45 s", "3x45 s" y lista de segundos; reps queda vacío', () => {
  const esp = [1, 2, 3].map((n) => S(n, { reps: null, segundos: 45 }));
  assert.deepStrictEqual(atajoSeries('Plancha 3 series de 45 s')[0].series, esp);
  assert.deepStrictEqual(atajoSeries('plancha 3x45 seg')[0].series, esp);
  assert.deepStrictEqual(atajoSeries('Plancha 45 s, 40 s y 30 s')[0].series.map((s) => s.segundos), [45, 40, 30]);
  assert.strictEqual(atajoSeries('Plancha 45 s con 20 kg'), null);
});
test('"N series (de) M" es NxM; nunca cuenta el número de series como reps', () => {
  const rm = (t) => atajoSeries(t)[0].series.map((s) => [s.pesoKg, s.reps]);
  assert.deepStrictEqual(rm('press banca 60 kg 3 series de 10'), [[60, 10], [60, 10], [60, 10]]);
  assert.deepStrictEqual(rm('press banca 60 kg 4 series 10'), [[60, 10], [60, 10], [60, 10], [60, 10]]);
  assert.deepStrictEqual(rm('curl 3 series 10 20 kg'), [[20, 10], [20, 10], [20, 10]]);
  assert.strictEqual(atajoSeries('press banca 60 kg 10 reps 3 series'), null);
  assert.strictEqual(atajoSeries('press banca 60 kg 3 series'), null);
  assert.strictEqual(atajoSeries('press banca 60 kg 3 series 10 8'), null);
});
test('sin unidad de peso y números que parecen peso -> null ("curl 20 10 8")', () => {
  assert.strictEqual(atajoSeries('curl 20 10 8'), null);
  assert.strictEqual(atajoSeries('press banca 40 10'), null);
  assert.ok(atajoSeries('Dominadas 15, 12'));
  assert.ok(atajoSeries('Press banca 10, 9'));
});
