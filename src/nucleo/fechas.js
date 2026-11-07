// Resolución de fechas en America/Bogota. Luxon: global DateTime (n8n) o carga desde el repo (Node).
var _ZONA_F = 'America/Bogota';
var _luxonDT = null;

function inyectarLuxon(DT) { _luxonDT = DT; }

function _obtenerDT() {
  if (_luxonDT) return _luxonDT;
  if (typeof DateTime !== 'undefined') { _luxonDT = DateTime; return _luxonDT; }
  if (typeof require === 'function') {
    var rutas = ['luxon', '../../.claude/skills/n8n-workflow-check/node_modules/luxon'];
    for (var i = 0; i < rutas.length; i++) {
      try { _luxonDT = require(rutas[i]).DateTime; if (_luxonDT) return _luxonDT; } catch (e) { /* siguiente */ }
    }
  }
  throw new Error('Luxon no disponible: usa inyectarLuxon(DateTime)');
}

function _sinTildesF(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function _aDT(ahora) {
  var DT = _obtenerDT();
  var d;
  if (ahora && ahora.isLuxonDateTime) d = ahora.setZone(_ZONA_F);
  else if (ahora instanceof Date) d = DT.fromJSDate(ahora, { zone: _ZONA_F });
  else if (typeof ahora === 'string') d = DT.fromISO(ahora, { zone: _ZONA_F });
  else throw new Error('ahora inválido');
  if (!d.isValid) throw new Error('ahora inválido');
  return d;
}

var _DIAS = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 7 };
var _MESES = {
  enero: 1, ene: 1, febrero: 2, feb: 2, marzo: 3, mar: 3, abril: 4, abr: 4, mayo: 5, may: 5, junio: 6, jun: 6,
  julio: 7, jul: 7, agosto: 8, ago: 8, septiembre: 9, setiembre: 9, sept: 9, sep: 9, set: 9,
  octubre: 10, oct: 10, noviembre: 11, nov: 11, diciembre: 12, dic: 12
};

function _fin(hoy, d) {
  if (!d || !d.isValid) return { ok: false, motivo: 'no_entendida' };
  if (d.toISODate() > hoy.toISODate()) return { ok: false, motivo: 'futura' };
  return { ok: true, fecha: d.toISODate() };
}

function _construir(DT, y, m, d) {
  var x = DT.fromObject({ year: y, month: m, day: d }, { zone: _ZONA_F });
  return x.isValid ? x : null;
}

// -> {ok:true, fecha:'AAAA-MM-DD'} | {ok:false, motivo:'futura'|'no_entendida'}
function resolverFecha(texto, ahora) {
  var DT = _obtenerDT();
  var hoy = _aDT(ahora).startOf('day');
  var t = (texto === null || texto === undefined) ? '' : _sinTildesF(texto);
  t = t.replace(/[.,;!]+$/, '').trim();
  if (t === '' || t === 'hoy') return { ok: true, fecha: hoy.toISODate() };
  if (t === 'ayer') return { ok: true, fecha: hoy.minus({ days: 1 }).toISODate() };
  if (t === 'anteayer' || t === 'antier' || t === 'antes de ayer') return { ok: true, fecha: hoy.minus({ days: 2 }).toISODate() };
  if (t === 'manana' || t === 'pasado manana') return { ok: false, motivo: 'futura' };

  var m;
  // ISO
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return _fin(hoy, _construir(DT, +m[1], +m[2], +m[3]));

  // día de la semana: "el lunes", "lunes pasado", "este lunes"
  m = /^(?:el |este |ese )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)(?: pasado)?$/.exec(t);
  if (m) {
    var atras = (hoy.weekday - _DIAS[m[1]] + 7) % 7;
    return { ok: true, fecha: hoy.minus({ days: atras }).toISODate() };
  }

  // d/m o d/m/aaaa o d-m
  m = /^(?:el )?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2}|\d{4}))?$/.exec(t);
  if (m) {
    var anio = m[3] ? (m[3].length === 2 ? 2000 + (+m[3]) : +m[3]) : hoy.year;
    return _fin(hoy, _construir(DT, anio, +m[2], +m[1]));
  }

  // "7 de octubre", "7 oct", "7 de octubre de 2026"
  m = /^(?:el )?(\d{1,2}) ?(?:de )?([a-z]+)(?: (?:de )?(\d{4}))?$/.exec(t);
  if (m && _MESES[m[2]]) {
    var a2 = m[3] ? +m[3] : hoy.year;
    return _fin(hoy, _construir(DT, a2, _MESES[m[2]], +m[1]));
  }
  return { ok: false, motivo: 'no_entendida' };
}

if (typeof module !== 'undefined') module.exports = { resolverFecha: resolverFecha, inyectarLuxon: inyectarLuxon, _aDT: _aDT };
