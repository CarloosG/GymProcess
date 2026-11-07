const test = require('node:test');
const assert = require('node:assert');
const { normalizar } = require('./texto');

test('normalizar: válido (tildes, mayúsculas, espacios)', () => {
  assert.strictEqual(normalizar('  Press   BANCA  '), 'press banca');
  assert.strictEqual(normalizar('Tríceps Extensión'), 'triceps extension');
});
test('normalizar: inválido (null, undefined, no texto)', () => {
  assert.strictEqual(normalizar(null), '');
  assert.strictEqual(normalizar(undefined), '');
  assert.strictEqual(normalizar('...!!'), '');
});
test('normalizar: borde (puntuación de borde sí, interna se conserva)', () => {
  assert.strictEqual(normalizar('¿Press banca?'), 'press banca');
  assert.strictEqual(normalizar('pull-over.'), 'pull-over');
  assert.strictEqual(normalizar(12), '12');
});

test('limpio: válido, inválido y borde', () => {
  const { limpio } = require('./texto');
  assert.strictEqual(limpio('Ana'), 'Ana');
  assert.strictEqual(limpio('=SUM(A1)'), "'=SUM(A1)");
  assert.strictEqual(limpio('+57 300'), "'+57 300");
  assert.strictEqual(limpio('@ana'), "'@ana");
  assert.strictEqual(limpio('1/2'), "'1/2");
  assert.strictEqual(limpio(62.5), 62.5);
  assert.strictEqual(limpio(null), '');
  assert.strictEqual(limpio(undefined), '');
  assert.strictEqual(limpio(''), '');
  assert.strictEqual(limpio('Press 1/2 banca'), 'Press 1/2 banca');
});
