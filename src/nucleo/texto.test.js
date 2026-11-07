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
