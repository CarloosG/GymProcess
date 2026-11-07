// Unidades, placas de máquina y modalidades.

var MODALIDADES = ['normal', 'lastre', 'asistida', 'corporal'];
var LB_A_KG = 0.45359237;

var _UNI_KG = ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'];
var _UNI_LB = ['lb', 'lbs', 'libra', 'libras'];

function _normUnidad(u) {
  return String(u === null || u === undefined ? '' : u).toLowerCase().replace(/\./g, '').trim();
}

// Devuelve {kg, convertido}. Unidad o valor no válidos -> {kg:null, convertido:false}.
function aKg(valor, unidad) {
  var v = valor;
  if (typeof valor === 'string') v = /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(valor) ? Number(valor.replace(',', '.')) : NaN;
  if (typeof v !== 'number' || !isFinite(v)) return { kg: null, convertido: false };
  var u = _normUnidad(unidad);
  if (_UNI_KG.indexOf(u) !== -1) return { kg: v, convertido: false };
  if (_UNI_LB.indexOf(u) !== -1) return { kg: Math.round(v * LB_A_KG * 2) / 2, convertido: true };
  return { kg: null, convertido: false };
}

var _ORDINALES = {
  primera: 1, primer: 1, segunda: 2, segundo: 2, tercera: 3, tercer: 3, cuarta: 4, cuarto: 4,
  quinta: 5, quinto: 5, sexta: 6, sexto: 6, septima: 7, septimo: 7, octava: 8, octavo: 8,
  novena: 9, noveno: 9, decima: 10, decimo: 10
};
var _PLACA = '(?:placas?|plaquetas?|plaquitas?)';

function _sinTildes(t) {
  return String(t === null || t === undefined ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Busca una placa en el texto. Devuelve {placa, inicio, fin} (índices sobre el texto
// en minúsculas y sin tildes) o null.
function buscarPlaca(texto) {
  var t = _sinTildes(texto);
  var m;
  // "la cuarta placa"
  m = new RegExp('\\b(?:la\\s+)?(' + Object.keys(_ORDINALES).join('|') + ')\\s+' + _PLACA + '\\b').exec(t);
  if (m) return { placa: _ORDINALES[m[1]], inicio: m.index, fin: m.index + m[0].length };
  // "placa 4", "placa n° 4"
  m = new RegExp('\\b' + _PLACA + '\\s*(?:n(?:o|\\u00ba|\\u00b0)?\\.?\\s*)?(\\d{1,2})\\b').exec(t);
  if (m) return { placa: parseInt(m[1], 10), inicio: m.index, fin: m.index + m[0].length };
  // "4 placas" (no "4x8 placa", donde el 8 son reps)
  m = new RegExp('(?:^|[^x\\u00d7\\d])(\\d{1,2})\\s+' + _PLACA + '\\b').exec(t);
  if (m && /placas|plaquetas|plaquitas/.test(m[0])) {
    var ini = m.index + m[0].indexOf(m[1]);
    return { placa: parseInt(m[1], 10), inicio: ini, fin: m.index + m[0].length };
  }
  return null;
}

function leerPlaca(texto) {
  var r = buscarPlaca(texto);
  return r ? r.placa : null;
}

if (typeof module !== 'undefined') {
  module.exports = { aKg: aKg, leerPlaca: leerPlaca, buscarPlaca: buscarPlaca, MODALIDADES: MODALIDADES, LB_A_KG: LB_A_KG };
}
