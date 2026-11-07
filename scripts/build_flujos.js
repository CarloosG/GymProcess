#!/usr/bin/env node
// Genera flujos/gym/*.json a partir de flujos/plantillas/*.json.
// Marcadores en la plantilla (en cualquier cadena de parameters):
//   "@@codigo:<ruta>@@"  -> jsCode = núcleo concatenado + ESQUEMA + <ruta> (ver scripts/lib_codigo.js)
//   "@@url_batchget@@"   -> URL de values:batchGet con todas las pestañas de hoja/esquema.json
//   "@@url_admins@@"     -> URL de values:get de la pestaña Usuarios
// Determinista: mismo resultado en cada corrida. Nunca se edita a mano el jsCode de los JSON generados.
const fs = require('node:fs');
const path = require('node:path');
const { RAIZ, codigoNodo, esquema } = require('./lib_codigo');

const HOJA = "{{ $('Config').first().json.hojaId }}";
const BASE = '=https://sheets.googleapis.com/v4/spreadsheets/' + HOJA;

function urlBatchGet() {
  const rangos = esquema().map((t) => 'ranges=' + encodeURIComponent("'" + t.pestana + "'")).join('&');
  return BASE + '/values:batchGet?' + rangos +
    '&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&majorDimension=ROWS';
}
function urlAdmins() {
  return BASE + "/values/Usuarios?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING";
}

function sustituir(valor) {
  if (typeof valor === 'string') {
    const m = /^@@codigo:(.+)@@$/.exec(valor);
    if (m) return codigoNodo(m[1]);
    if (valor === '@@url_batchget@@') return urlBatchGet();
    if (valor === '@@url_admins@@') return urlAdmins();
    return valor;
  }
  if (Array.isArray(valor)) return valor.map(sustituir);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, sustituir(v)]));
  }
  return valor;
}

const PLANTILLAS = [
  ['gym-entrada', 'gym-entrada-v1.json'],
  ['gym-errores', 'gym-errores-v1.json'],
];

fs.mkdirSync(path.join(RAIZ, 'flujos', 'gym'), { recursive: true });
for (const [plantilla, salida] of PLANTILLAS) {
  const origen = path.join(RAIZ, 'flujos', 'plantillas', plantilla + '.json');
  const flujo = sustituir(JSON.parse(fs.readFileSync(origen, 'utf8')));
  const destino = path.join(RAIZ, 'flujos', 'gym', salida);
  fs.writeFileSync(destino, JSON.stringify(flujo, null, 2) + '\n');
  console.log('generado flujos/gym/' + salida + ' (' + flujo.nodes.length + ' nodos)');
}
