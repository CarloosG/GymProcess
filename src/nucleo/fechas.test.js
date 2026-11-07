const test = require('node:test');
const assert = require('node:assert');
const { resolverFecha } = require('./fechas');

const LUNES = '2026-11-09T08:00:00-05:00';

test('vacío, null y hoy -> hoy', () => {
  for (const t of [null, undefined, '', 'hoy', 'Hoy']) {
    assert.deepStrictEqual(resolverFecha(t, LUNES), { ok: true, fecha: '2026-11-09' });
  }
});
test('ayer y anteayer', () => {
  assert.deepStrictEqual(resolverFecha('ayer', LUNES), { ok: true, fecha: '2026-11-08' });
  assert.deepStrictEqual(resolverFecha('anteayer', LUNES), { ok: true, fecha: '2026-11-07' });
});
test('día de la semana: el último pasado, hoy incluido', () => {
  assert.deepStrictEqual(resolverFecha('el lunes', LUNES), { ok: true, fecha: '2026-11-09' });
  assert.deepStrictEqual(resolverFecha('el viernes', LUNES), { ok: true, fecha: '2026-11-06' });
  assert.deepStrictEqual(resolverFecha('el domingo', LUNES), { ok: true, fecha: '2026-11-08' });
  assert.deepStrictEqual(resolverFecha('el miércoles', LUNES), { ok: true, fecha: '2026-11-04' });
});
test('fecha concreta: "7 de octubre", "7 oct", ISO, d/m', () => {
  assert.deepStrictEqual(resolverFecha('7 de octubre', LUNES), { ok: true, fecha: '2026-10-07' });
  assert.deepStrictEqual(resolverFecha('7 oct', LUNES), { ok: true, fecha: '2026-10-07' });
  assert.deepStrictEqual(resolverFecha('2026-10-07', LUNES), { ok: true, fecha: '2026-10-07' });
  assert.deepStrictEqual(resolverFecha('5/11', LUNES), { ok: true, fecha: '2026-11-05' });
});
test('d/m es día/mes: 12/11 es 12 de noviembre (futura un lunes 9)', () => {
  assert.deepStrictEqual(resolverFecha('12/11', LUNES), { ok: false, motivo: 'futura' });
  assert.deepStrictEqual(resolverFecha('12/11', '2026-11-20T10:00:00-05:00'), { ok: true, fecha: '2026-11-12' });
});
test('futuras: mañana, 25 de diciembre (no cambia el año), ISO futuro', () => {
  assert.deepStrictEqual(resolverFecha('mañana', LUNES), { ok: false, motivo: 'futura' });
  assert.deepStrictEqual(resolverFecha('25 de diciembre', LUNES), { ok: false, motivo: 'futura' });
  assert.deepStrictEqual(resolverFecha('2027-01-01', LUNES), { ok: false, motivo: 'futura' });
});
test('no entendida: basura y fechas imposibles', () => {
  assert.deepStrictEqual(resolverFecha('cuando pueda', LUNES), { ok: false, motivo: 'no_entendida' });
  assert.deepStrictEqual(resolverFecha('31 de febrero', LUNES), { ok: false, motivo: 'no_entendida' });
  assert.deepStrictEqual(resolverFecha('45/13', LUNES), { ok: false, motivo: 'no_entendida' });
});
test('medianoche: 03:30Z del día 10 es 22:30 del 9 en Bogotá', () => {
  assert.deepStrictEqual(resolverFecha('hoy', '2026-11-10T03:30:00Z'), { ok: true, fecha: '2026-11-09' });
  assert.deepStrictEqual(resolverFecha('ayer', '2026-11-10T03:30:00Z'), { ok: true, fecha: '2026-11-08' });
  assert.deepStrictEqual(resolverFecha('2026-11-10', '2026-11-10T03:30:00Z'), { ok: false, motivo: 'futura' });
});
test('ahora admite Date y DateTime de Luxon; ahora inválido lanza', () => {
  assert.deepStrictEqual(resolverFecha('hoy', new Date('2026-11-10T03:30:00Z')), { ok: true, fecha: '2026-11-09' });
  const { DateTime } = require('../../.claude/skills/n8n-workflow-check/node_modules/luxon');
  assert.deepStrictEqual(resolverFecha('hoy', DateTime.fromISO('2026-11-10T03:30:00Z')), { ok: true, fecha: '2026-11-09' });
  assert.throws(() => resolverFecha('hoy', 'no es fecha'));
});
