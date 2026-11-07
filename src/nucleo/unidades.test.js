const test = require('node:test');
const assert = require('node:assert');
const { aKg, leerPlaca, MODALIDADES } = require('./unidades');

test('aKg: kg queda igual', () => {
  assert.deepStrictEqual(aKg(60, 'kg'), { kg: 60, convertido: false });
  assert.deepStrictEqual(aKg('12,5', 'KG'), { kg: 12.5, convertido: false });
});
test('aKg: lb/lbs/libras convierten y redondean a 0,5 kg', () => {
  assert.deepStrictEqual(aKg(25, 'lb'), { kg: 11.5, convertido: true });
  assert.deepStrictEqual(aKg(100, 'lbs'), { kg: 45.5, convertido: true });
  assert.deepStrictEqual(aKg(10, 'libras'), { kg: 4.5, convertido: true });
});
test('aKg: inválido y borde', () => {
  assert.deepStrictEqual(aKg('abc', 'kg'), { kg: null, convertido: false });
  assert.deepStrictEqual(aKg(10, 'stone'), { kg: null, convertido: false });
  assert.deepStrictEqual(aKg(0, 'lb'), { kg: 0, convertido: true });
  assert.deepStrictEqual(aKg(undefined, 'kg'), { kg: null, convertido: false });
});
test('leerPlaca: formas válidas', () => {
  assert.strictEqual(leerPlaca('placa 4'), 4);
  assert.strictEqual(leerPlaca('4 placas'), 4);
  assert.strictEqual(leerPlaca('la cuarta placa'), 4);
  assert.strictEqual(leerPlaca('quinta plaqueta'), 5);
  assert.strictEqual(leerPlaca('tercera plaquita'), 3);
  assert.strictEqual(leerPlaca('Remo CUARTA placa 12, 10'), 4);
});
test('leerPlaca: sin placa -> null', () => {
  assert.strictEqual(leerPlaca('press banca 60 kg'), null);
  assert.strictEqual(leerPlaca(''), null);
  assert.strictEqual(leerPlaca(null), null);
});
test('leerPlaca: borde, en "4x8 placa 5" gana la placa 5, no el 8', () => {
  assert.strictEqual(leerPlaca('4x8 placa 5'), 5);
  assert.strictEqual(leerPlaca('placa 12'), 12);
});
test('MODALIDADES', () => {
  assert.deepStrictEqual(MODALIDADES, ['normal', 'lastre', 'asistida', 'corporal']);
});
