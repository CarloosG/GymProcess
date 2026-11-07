// Atajo sin IA para patrones frecuentes de registro de series.
// Devuelve [{ejercicioTexto, series:[{n, unidad, pesoKg, placa, modalidad, reps, [segundos], [convertido]}]}] o null si no está seguro.
var _t_ser = (function () { try { return require('./texto'); } catch (e) { return { normalizar: normalizar }; } })();
var _u_ser = (function () { try { return require('./unidades'); } catch (e) { return { aKg: aKg, buscarPlaca: buscarPlaca }; } })();
var _c_ser = (function () { try { return require('./catalogo'); } catch (e) { return { resolverEjercicio: resolverEjercicio }; } })();

var _UNI_RE = '(kg|kgs|kilos?|kilogramos?|lb|lbs|libras?)';
var _CORPORAL_RE = /^(dominadas?|fondos|flexiones|pull ?ups?|chin ?ups?|lagartijas|paralelas)\b/;
var _FECHA_RE = /\b(ayer|anteayer|antier|manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b|\b\d{1,2}\/\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2} de [a-z]+/;
var _ENCABEZADO_RE = /^(hoy|entrene|hice|rutina de hoy|dia de|sesion de hoy)\b/;
var _MAX_REPS_ATAJO = 50;
var _MAX_SERIES_ATAJO = 20;

function _base(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function _esPalabraFrontera(tok, sig) {
  if (/^\d/.test(tok)) return true;
  if (/^(con|lastre|asistid[oa]s?|ayuda|banda)$/.test(tok)) return true;
  if (/^(placas?|plaquetas?|plaquitas?)$/.test(tok)) return true;
  if (/^(primera|primer|segunda|tercera|tercer|cuarta|quinta|sexta|septima|octava|novena|decima)$/.test(tok) &&
      sig && /^(placas?|plaquetas?|plaquitas?)$/.test(sig)) return true;
  if (tok === 'la' && sig && /^(primera|segunda|tercera|cuarta|quinta|sexta|septima|octava|novena|decima)$/.test(sig)) return true;
  return false;
}

function _esCorporal(nombre, catalogo) {
  var res = catalogo ? _c_ser.resolverEjercicio(nombre, catalogo) : null;
  if (res && res.ejercicio) return res.ejercicio.tipo === 'peso corporal';
  return _CORPORAL_RE.test(_base(nombre));
}

function _parsearSegmento(seg, catalogo) {
  var palabras = seg.split(/\s+/);
  var toks = palabras.map(function (p) { return _base(p).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''); });
  var corte = -1;
  for (var i = 0; i < toks.length; i++) {
    if (_esPalabraFrontera(toks[i], toks[i + 1])) { corte = i; break; }
  }
  if (corte <= 0) return null; // sin nombre o sin datos
  var nombre = palabras.slice(0, corte).join(' ').replace(/[,:\-]+$/, '').trim();
  if (!/[a-zA-ZñÑáéíóúÁÉÍÓÚ]/.test(nombre)) return null;
  var r = ' ' + _base(palabras.slice(corte).join(' ')) + ' ';

  // coma decimal pegada a unidad: "12,5 kg" -> "12.5 kg"
  r = r.replace(new RegExp('(\\d+),(\\d{1,2})(?=\\s*' + _UNI_RE + '\\b)', 'g'), '$1.$2');

  var modalidad = null;
  if (/\blastre\b/.test(r)) { modalidad = 'lastre'; r = r.replace(/\b(con )?lastre\b/, ' '); }
  else if (/\b(asistid[oa]s?|ayuda|banda)\b/.test(r)) {
    modalidad = 'asistida';
    r = r.replace(/\b(asistid[oa]s?|con ayuda|ayuda|con banda|banda)\b/, ' ');
  }

  var placa = null;
  var bp = _u_ser.buscarPlaca(r);
  if (bp) { placa = bp.placa; r = r.slice(0, bp.inicio) + ' ' + r.slice(bp.fin); }

  var pesoKg = null, convertido = false, hayPeso = false;
  var mp = new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + _UNI_RE + '\\b').exec(r);
  if (mp) {
    var conv = _u_ser.aKg(parseFloat(mp[1]), mp[2]);
    if (conv.kg === null) return null;
    pesoKg = conv.kg; convertido = conv.convertido; hayPeso = true;
    r = r.slice(0, mp.index) + ' ' + r.slice(mp.index + mp[0].length);
  }
  if (hayPeso && placa !== null) return null;

  // segundos (ejercicios de tiempo): "3x45 s", "3 series de 45 s", "45 s, 40 s"
  var SEG = '(?:s|seg|segs|segundos?)';
  var segList = null;
  var ms1 = new RegExp('(\\d+)\\s*(?:[x\u00d7]|series?\\s+de)\\s*(\\d+)\\s*' + SEG + '\\b').exec(r);
  if (ms1) {
    var ns = parseInt(ms1[1], 10);
    if (ns < 1 || ns > _MAX_SERIES_ATAJO) return null;
    segList = [];
    for (var z = 0; z < ns; z++) segList.push(parseInt(ms1[2], 10));
    r = r.slice(0, ms1.index) + ' ' + r.slice(ms1.index + ms1[0].length);
  } else if (new RegExp('\\d\\s*' + SEG + '\\b').test(r)) {
    var re = new RegExp('(\\d+)\\s*' + SEG + '\\b', 'g'), mm;
    segList = [];
    while ((mm = re.exec(r))) segList.push(parseInt(mm[1], 10));
    r = r.replace(re, ' ');
  }
  if (segList) {
    r = r.replace(/\b(y|e|con|de)\b|,/g, ' ');
    if (r.trim() !== '' || hayPeso || placa !== null || modalidad !== null) return null;
    if (segList.length > _MAX_SERIES_ATAJO || segList.some(function (x) { return x < 1 || x > 3600; })) return null;
    return {
      ejercicioTexto: nombre,
      series: segList.map(function (sg, idx) {
        return { n: idx + 1, unidad: 'kg', pesoKg: null, placa: null, modalidad: 'normal', reps: null, segundos: sg };
      })
    };
  }

  // "3 series de 10" / "3 series 10" = 3x10; cualquier otro "series" suelto es ambiguo -> null
  r = r.replace(/(\d+)\s*series?\s*(?:de\s*)?(\d+)(?!\d)/, ' $1x$2 ');
  if (/\d\s*series?\b|\bseries?\s*\d/.test(r)) return null;

  var nSeries = null, repsFijas = null;
  var mx = /(\d+)\s*[x×]\s*(\d+)/.exec(r);
  if (mx) {
    nSeries = parseInt(mx[1], 10); repsFijas = parseInt(mx[2], 10);
    r = r.slice(0, mx.index) + ' ' + r.slice(mx.index + mx[0].length);
    // número suelto restante (con o sin "con") = peso en kg
    if (!hayPeso && placa === null) {
      var ms = /^\s*(?:con\s+)?(\d+(?:\.\d+)?)\s*$/.exec(r);
      if (ms) { pesoKg = parseFloat(ms[1]); hayPeso = true; r = ' '; }
    }
  }

  r = r.replace(/\b(reps|repeticiones|series|con|de)\b/g, ' ');
  var reps = [];
  if (repsFijas !== null) {
    if (r.trim() !== '') return null;
    if (nSeries < 1 || nSeries > _MAX_SERIES_ATAJO) return null;
    for (var k = 0; k < nSeries; k++) reps.push(repsFijas);
  } else {
    if (!/^[\d\s,y]*$/.test(r.replace(/\be\b/g, ' '))) return null;
    var nums = r.match(/\d+/g);
    if (!nums || nums.length > _MAX_SERIES_ATAJO) return null;
    reps = nums.map(function (x) { return parseInt(x, 10); });
  }
  for (var q = 0; q < reps.length; q++) if (reps[q] < 1 || reps[q] > _MAX_REPS_ATAJO) return null;
  // sin unidad de peso ni placa y con números que parecen peso ("curl 20 10 8"): no adivina
  if (!hayPeso && placa === null && modalidad === null && repsFijas === null &&
      reps.some(function (x) { return x > 12; }) && !_esCorporal(nombre, catalogo)) return null;

  // modalidad
  if (modalidad === null) {
    var corporal = _esCorporal(nombre, catalogo);
    modalidad = (corporal && !hayPeso && placa === null) ? 'corporal' : 'normal';
  }

  var series = reps.map(function (rp, idx) {
    var s = {
      n: idx + 1,
      unidad: placa !== null ? 'placa' : 'kg',
      pesoKg: placa !== null ? null : (hayPeso ? pesoKg : null),
      placa: placa,
      modalidad: modalidad,
      reps: rp
    };
    if (convertido) s.convertido = true;
    return s;
  });
  return { ejercicioTexto: nombre, series: series };
}

function atajoSeries(texto, catalogo) {
  if (typeof texto !== 'string' || !texto.trim()) return null;
  if (_FECHA_RE.test(_base(texto))) return null; // la fecha la resuelve el flujo/IA
  var segmentos = texto.split(/\r?\n|;|\.(?=\s|$)/).map(function (s) { return s.trim(); }).filter(Boolean);
  var salida = [];
  for (var i = 0; i < segmentos.length; i++) {
    var seg = segmentos[i];
    var b = _base(seg);
    if (!/\d/.test(b)) {
      if (_ENCABEZADO_RE.test(b)) continue; // "Hoy pecho y tríceps"
      return null;
    }
    seg = seg.replace(/^\s*hoy[\s,:]+/i, '');
    var p = _parsearSegmento(seg, catalogo);
    if (!p) return null;
    salida.push(p);
  }
  return salida.length ? salida : null;
}

if (typeof module !== 'undefined') module.exports = { atajoSeries: atajoSeries };
