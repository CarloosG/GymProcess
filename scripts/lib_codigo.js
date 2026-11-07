// Compone el código de los nodos Code: núcleo concatenado (mismo orden que src/nucleo/concat.test.js)
// + constante ESQUEMA (de hoja/esquema.json) + el código del nodo. Lo usan build_flujos.js y las pruebas.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const ORDEN_NUCLEO = ['texto', 'catalogo', 'unidades', 'fechas', 'series', 'validar', 'metricas', 'textos'];

function leer(ruta) { return fs.readFileSync(path.join(RAIZ, ruta), 'utf8').replace(/\r\n/g, '\n'); }

function esquema() { return JSON.parse(leer('hoja/esquema.json')); }

function codigoNucleo() {
  return ORDEN_NUCLEO.map((f) => leer('src/nucleo/' + f + '.js').trimEnd()).join('\n');
}

// ruta relativa a la raíz del repo, p. ej. 'src/code/entrada/plan.js'
function codigoNodo(ruta) {
  const esq = esquema().map((t) => ({ pestana: t.pestana, columnas: t.columnas }));
  return [
    '// ===== núcleo (src/nucleo) — generado por scripts/build_flujos.js, no editar a mano =====',
    codigoNucleo(),
    '// ===== esquema de la hoja (hoja/esquema.json) =====',
    'var ESQUEMA = ' + JSON.stringify(esq) + ';',
    '// ===== ' + ruta + ' =====',
    leer(ruta).trimEnd(),
    ''
  ].join('\n');
}

module.exports = { RAIZ, ORDEN_NUCLEO, codigoNucleo, codigoNodo, esquema };
