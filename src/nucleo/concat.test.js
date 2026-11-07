const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DateTime } = require('../../.claude/skills/n8n-workflow-check/node_modules/luxon');

const orden = ['texto', 'catalogo', 'unidades', 'fechas', 'series', 'validar'];
const codigo = orden.map((f) => fs.readFileSync(path.join(__dirname, f + '.js'), 'utf8')).join('\n');
const cat = require('./catalogo-semilla.json');

function correr(contexto) {
  const ctx = Object.assign({ cat, out: null }, contexto);
  vm.createContext(ctx);
  vm.runInContext(codigo + `;out = {
    v: validarRegistro(atajoSeries('Press banca 60 kg 3 series de 10', cat), cat, '2026-11-09T08:00:00-05:00'),
    f: resolverFecha('ayer', '2026-11-09T08:00:00-05:00'),
    p: leerPlaca('quinta plaqueta'), n: normalizar(' Tríceps ') };`, ctx);
  return JSON.parse(JSON.stringify(ctx.out));
}
function verificar(o) {
  assert.strictEqual(o.v.completo, true);
  assert.strictEqual(o.v.registro.ejercicios[0].series.length, 3);
  assert.strictEqual(o.f.fecha, '2026-11-08');
  assert.strictEqual(o.p, 5);
  assert.strictEqual(o.n, 'triceps');
}

test('concatenado en vm: sin require y con DateTime global', () => verificar(correr({ DateTime })));
test('concatenado en vm: require que lanza para rutas relativas (como n8n) y DateTime global', () => {
  const require = (m) => { throw new Error("Cannot find module '" + m + "'"); };
  verificar(correr({ DateTime, require, module: undefined }));
});
test('concatenado en vm: require que solo resuelve luxon', () => {
  const require = (m) => { if (m === 'luxon') return { DateTime }; throw new Error("Cannot find module '" + m + "'"); };
  verificar(correr({ require }));
});
