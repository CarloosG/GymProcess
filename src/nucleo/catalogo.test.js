const test = require('node:test');
const assert = require('node:assert');
const { resolverEjercicio } = require('./catalogo');
const cat = require('./catalogo-semilla.json');

test('semilla: ~35 ejercicios, campos completos y marcada provisional', () => {
  assert.ok(cat.length >= 30);
  for (const e of cat) {
    assert.ok(e.ejercicio && e.grupo && Array.isArray(e.sinonimos));
    assert.ok(['peso', 'peso corporal', 'tiempo'].includes(e.tipo));
    assert.strictEqual(typeof e.porMano, 'boolean');
    assert.strictEqual(e.provisional, true);
  }
});
test('exacto (ignora mayúsculas y tildes)', () => {
  const r = resolverEjercicio('PRESS BANCA', cat);
  assert.strictEqual(r.estado, 'exacto');
  assert.strictEqual(r.ejercicio.ejercicio, 'Press banca');
  assert.strictEqual(resolverEjercicio('Curl de biceps', cat).estado, 'exacto');
});
test('sinónimo: "press plano" -> Press banca', () => {
  const r = resolverEjercicio('press plano', cat);
  assert.strictEqual(r.estado, 'sinonimo');
  assert.strictEqual(r.ejercicio.ejercicio, 'Press banca');
  assert.strictEqual(resolverEjercicio('bench', cat).ejercicio.ejercicio, 'Press banca');
});
test('dudoso: "pres banka" trae Press banca entre los candidatos y no es exacto', () => {
  const r = resolverEjercicio('pres banka', cat);
  assert.strictEqual(r.estado, 'dudoso');
  assert.strictEqual(r.ejercicio, null);
  assert.ok(r.candidatos.length >= 1 && r.candidatos.length <= 3);
  assert.ok(r.candidatos.some((c) => c.ejercicio === 'Press banca'));
});
test('desconocido: "zumba", vacío y catálogo vacío', () => {
  const r = resolverEjercicio('zumba', cat);
  assert.strictEqual(r.estado, 'desconocido');
  assert.strictEqual(r.ejercicio, null);
  assert.deepStrictEqual(r.candidatos, []);
  assert.strictEqual(resolverEjercicio('', cat).estado, 'desconocido');
  assert.strictEqual(resolverEjercicio('press banca', []).estado, 'desconocido');
  assert.strictEqual(resolverEjercicio('press banca', null).estado, 'desconocido');
});
test('borde: nombre ambiguo entre dos ejercicios es dudoso, nunca elige', () => {
  const c2 = [
    { ejercicio: 'A', grupo: 'x', sinonimos: ['mismo'], tipo: 'peso', porMano: false },
    { ejercicio: 'B', grupo: 'y', sinonimos: ['mismo'], tipo: 'peso', porMano: false }
  ];
  const r = resolverEjercicio('mismo', c2);
  assert.strictEqual(r.estado, 'dudoso');
  assert.strictEqual(r.candidatos.length, 2);
});
test('borde: una palabra corta con 1 letra distinta no se aproxima', () => {
  assert.strictEqual(resolverEjercicio('remp', [{ ejercicio: 'Remo', grupo: 'espalda', sinonimos: [], tipo: 'peso', porMano: false }]).estado, 'desconocido');
});
