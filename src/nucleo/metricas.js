// Métricas de progreso: funciones puras sobre filas de la hoja (encabezados exactos de hoja/esquema.json).
// Todas filtran por "ID usuario" y descartan filas con Estado registro = Anulado.
var _t_met = (function () { try { return require('./texto'); } catch (e) { return { normalizar: normalizar, num: num }; } })();
var _f_met = (function () { try { return require('./fechas'); } catch (e) { return { _aDT: _aDT }; } })();

var _MAX_REPS_E1RM = 12;
var _RE_TECNICA_MET = /tecnica|tempo|lent[oa]|pausa|superserie|super serie|biserie|excentric|isometric|negativa|drop ?set/;

// ---------- utilidades internas ----------
function _redondear1(x) { return Math.round(x * 10) / 10; }
function _redondear2(x) { return Math.round(x * 100) / 100; }

function _usuarioOk(usuario) {
  return usuario !== null && usuario !== undefined && String(usuario).trim() !== '';
}
function _esDe(fila, usuario) {
  return !!fila && _usuarioOk(usuario) && String(fila['ID usuario'] === undefined || fila['ID usuario'] === null ? '' : fila['ID usuario']).trim() === String(usuario).trim();
}
function _activa(fila) {
  return _t_met.normalizar(fila['Estado registro']) !== 'anulado';
}
function _filasDe(filas, usuario) {
  if (!Array.isArray(filas) || !_usuarioOk(usuario)) return [];
  return filas.filter(function (f) { return f && typeof f === 'object' && _esDe(f, usuario) && _activa(f); });
}
function _fechaIso(v) {
  if (typeof v !== 'string') return null;
  var m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
  return m ? m[1] : null;
}
function _enRango(fecha, desde, hasta) {
  if (!desde && !hasta) return true;
  if (!fecha) return false;
  if (desde && fecha < _fechaIso(String(desde))) return false;
  if (hasta && fecha > _fechaIso(String(hasta))) return false;
  return true;
}
function _utc(fecha) {
  var p = fecha.split('-');
  return Date.UTC(+p[0], +p[1] - 1, +p[2]);
}
function _isoDeUtc(ms) { return new Date(ms).toISOString().slice(0, 10); }
function _lunesDe(fecha) {
  var d = new Date(_utc(fecha));
  var dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  return _isoDeUtc(_utc(fecha) - dow * 86400000);
}
function _gruposDe(s) {
  var t = (s === null || s === undefined) ? '' : String(s);
  return t.split(/[,;\/]/).map(function (g) { return _t_met.normalizar(g); }).filter(function (g) { return g !== ''; });
}
function _porFechaId(a, b) {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

// Normaliza una fila de Series a un objeto con tipos limpios.
function _serie(f) {
  var unidad = _t_met.normalizar(f['Unidad']);
  var peso = _t_met.num(f['Peso (kg)']);
  var placa = _t_met.num(f['Placa']);
  if (unidad === '') unidad = (placa !== null && peso === null) ? 'placa' : 'kg';
  var modalidad = _t_met.normalizar(f['Modalidad']) || 'normal';
  var reps = _t_met.num(f['Reps']);
  var seg = _t_met.num(f['Segundos']);
  return {
    idSesion: f['ID sesión'] === undefined || f['ID sesión'] === null ? '' : String(f['ID sesión']).trim(),
    idSerie: f['ID serie'] === undefined || f['ID serie'] === null ? '' : String(f['ID serie']).trim(),
    fecha: _fechaIso(f['Fecha']),
    ejercicio: f['Ejercicio'] === undefined || f['Ejercicio'] === null ? '' : String(f['Ejercicio']).trim(),
    n: _t_met.num(f['N.º serie']),
    unidad: unidad,
    pesoKg: peso,
    placa: placa,
    modalidad: modalidad,
    reps: reps,
    segundos: seg,
    rpe: _t_met.num(f['RPE']),
    notas: f['Notas'] === undefined || f['Notas'] === null ? '' : String(f['Notas'])
  };
}

// Series activas del usuario (normalizadas), opcionalmente de un ejercicio y de un rango de fechas.
function _seriesDe(series, usuario, ejercicio, desde, hasta) {
  var clave = (ejercicio === undefined || ejercicio === null) ? null : _t_met.normalizar(ejercicio);
  return _filasDe(series, usuario).map(_serie).filter(function (s) {
    if (clave !== null && _t_met.normalizar(s.ejercicio) !== clave) return false;
    return _enRango(s.fecha, desde, hasta);
  });
}

// e1RM de una serie normalizada (solo kg + normal).
function _e1rmSerie(s) {
  if (s.unidad !== 'kg' || s.modalidad !== 'normal') return null;
  return e1rm(s.pesoKg, s.reps);
}

// Volumen en kg de una serie normalizada; categoria: 'kg' | 'corporal' | 'placa' | 'ninguna'.
function _volSerie(s) {
  if (s.unidad === 'placa') return { cat: 'placa', kg: 0 };
  if (s.unidad !== 'kg') return { cat: 'ninguna', kg: 0 };
  if (s.modalidad === 'corporal' || s.modalidad === 'asistida') return { cat: 'corporal', kg: 0 };
  if ((s.modalidad === 'normal' || s.modalidad === 'lastre') && s.pesoKg !== null && s.pesoKg > 0 && s.reps !== null && s.reps > 0) {
    return { cat: 'kg', kg: s.pesoKg * s.reps };
  }
  return { cat: 'ninguna', kg: 0 };
}

// ---------- 1. e1rm ----------
// Epley: peso x (1 + reps/30), redondeo 0,1. reps = 1 -> peso. reps > 12 o sin peso -> null.
function e1rm(pesoKg, reps) {
  var p = _t_met.num(pesoKg), r = _t_met.num(reps);
  if (p === null || r === null || p <= 0 || r < 1 || r > _MAX_REPS_E1RM || Math.floor(r) !== r) return null;
  if (r === 1) return p;
  return _redondear1(p * (1 + r / 30));
}

// ---------- 2. volumen ----------
// -> {total, repsCorporales, seriesPlaca, porSesion:{id:kg}, porSemana:{lunes:kg}, porMes:{'AAAA-MM':kg}}
function volumen(series, usuario, desde, hasta) {
  var res = { total: 0, repsCorporales: 0, seriesPlaca: 0, porSesion: {}, porSemana: {}, porMes: {} };
  _seriesDe(series, usuario, null, desde, hasta).forEach(function (s) {
    var v = _volSerie(s);
    if (v.cat === 'placa') { res.seriesPlaca += 1; return; }
    if (v.cat === 'corporal') { if (s.reps !== null && s.reps > 0) res.repsCorporales += s.reps; return; }
    if (v.cat !== 'kg') return;
    res.total += v.kg;
    if (s.idSesion) res.porSesion[s.idSesion] = (res.porSesion[s.idSesion] || 0) + v.kg;
    if (s.fecha) {
      var sem = _lunesDe(s.fecha), mes = s.fecha.slice(0, 7);
      res.porSemana[sem] = (res.porSemana[sem] || 0) + v.kg;
      res.porMes[mes] = (res.porMes[mes] || 0) + v.kg;
    }
  });
  res.total = _redondear2(res.total);
  [res.porSesion, res.porSemana, res.porMes].forEach(function (o) {
    Object.keys(o).forEach(function (k) { o[k] = _redondear2(o[k]); });
  });
  return res;
}

// ---------- 3. records ----------
// Cada récord conserva la PRIMERA fecha en que se logró el valor (los empates no lo mueven).
function records(series, usuario, ejercicio) {
  var res = { ejercicio: ejercicio === undefined ? null : ejercicio, mayorPeso: null, mayor1RM: null, mayorPlaca: null, masRepsCorporal: null, mayorLastre: null, masSegundos: null };
  if (ejercicio === undefined || ejercicio === null || String(ejercicio).trim() === '') return res;
  var lista = _seriesDe(series, usuario, ejercicio).filter(function (s) { return s.fecha; });
  lista.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });
  lista.forEach(function (s) {
    if (s.unidad === 'kg' && s.modalidad === 'normal' && s.pesoKg !== null && s.pesoKg > 0 && s.reps !== null && s.reps > 0) {
      if (!res.mayorPeso || s.pesoKg > res.mayorPeso.pesoKg) res.mayorPeso = { pesoKg: s.pesoKg, reps: s.reps, fecha: s.fecha };
      else if (s.pesoKg === res.mayorPeso.pesoKg && s.fecha === res.mayorPeso.fecha && s.reps > res.mayorPeso.reps) res.mayorPeso.reps = s.reps;
      var e = _e1rmSerie(s);
      if (e !== null && (!res.mayor1RM || e > res.mayor1RM.e1rm)) res.mayor1RM = { e1rm: e, pesoKg: s.pesoKg, reps: s.reps, fecha: s.fecha };
    }
    if (s.unidad === 'placa' && s.placa !== null && s.placa > 0 && s.reps !== null && s.reps > 0) {
      if (!res.mayorPlaca || s.placa > res.mayorPlaca.placa) res.mayorPlaca = { placa: s.placa, reps: s.reps, fecha: s.fecha };
    }
    if (s.unidad === 'kg' && s.modalidad === 'corporal' && s.reps !== null && s.reps > 0) {
      if (!res.masRepsCorporal || s.reps > res.masRepsCorporal.reps) res.masRepsCorporal = { reps: s.reps, fecha: s.fecha };
    }
    if (s.unidad === 'kg' && s.modalidad === 'lastre' && s.pesoKg !== null && s.pesoKg > 0) {
      if (!res.mayorLastre || s.pesoKg > res.mayorLastre.lastreKg) res.mayorLastre = { lastreKg: s.pesoKg, reps: s.reps, fecha: s.fecha };
    }
    if (s.segundos !== null && s.segundos > 0) {
      if (!res.masSegundos || s.segundos > res.masSegundos.segundos) res.masSegundos = { segundos: s.segundos, fecha: s.fecha };
    }
  });
  return res;
}

// ---------- 4. ultimaSesionGrupo ----------
function _detalleSesion(ses, seriesUsuario) {
  var id = String(ses['ID sesión']).trim();
  var propias = seriesUsuario.filter(function (s) { return s.idSesion === id; });
  var orden = [], porEj = {};
  propias.forEach(function (s) {
    if (!porEj[s.ejercicio]) { porEj[s.ejercicio] = { ejercicio: s.ejercicio, series: [] }; orden.push(s.ejercicio); }
    porEj[s.ejercicio].series.push(s);
  });
  return {
    idSesion: id,
    fecha: _fechaIso(ses['Fecha']),
    grupos: _gruposDe(ses['Grupos musculares']),
    observaciones: ses['Observaciones'] === undefined || ses['Observaciones'] === null || ses['Observaciones'] === '' ? null : String(ses['Observaciones']),
    ejercicios: orden.map(function (nom) {
      var ss = porEj[nom].series.slice().sort(function (a, b) { return (a.n === null ? 1e9 : a.n) - (b.n === null ? 1e9 : b.n); });
      return {
        ejercicio: nom,
        series: ss.map(function (s) {
          return { n: s.n, unidad: s.unidad, pesoKg: s.pesoKg, placa: s.placa, modalidad: s.modalidad, reps: s.reps, segundos: s.segundos, rpe: s.rpe, notas: s.notas === '' ? null : s.notas };
        })
      };
    })
  };
}

// D11: todas las sesiones del día más reciente que contengan el grupo. Sin datos -> null.
function ultimaSesionGrupo(sesiones, series, usuario, grupo) {
  var g = _t_met.normalizar(grupo);
  if (g === '') return null;
  var cand = _filasDe(sesiones, usuario).filter(function (s) {
    return _fechaIso(s['Fecha']) && s['ID sesión'] && _gruposDe(s['Grupos musculares']).indexOf(g) !== -1;
  });
  if (cand.length === 0) return null;
  var dia = cand.reduce(function (m, s) { var f = _fechaIso(s['Fecha']); return f > m ? f : m; }, '0000-00-00');
  var delDia = cand.filter(function (s) { return _fechaIso(s['Fecha']) === dia; })
    .sort(function (a, b) { return String(a['ID sesión']) < String(b['ID sesión']) ? -1 : 1; });
  var susSeries = _seriesDe(series, usuario, null);
  return { grupo: grupo, fecha: dia, sesiones: delDia.map(function (s) { return _detalleSesion(s, susSeries); }) };
}

// ---------- 5. estancado ----------
// Resumen de una sesión de un ejercicio: carga máxima, reps con esa carga, e1RM.
function _resumenSesion(grupoSeries) {
  var unidad = null;
  grupoSeries.forEach(function (s) { if (s.unidad === 'placa') unidad = 'placa'; });
  if (unidad === null) unidad = 'kg';
  var cargaDe = function (s) {
    if (unidad === 'placa') return s.unidad === 'placa' && s.placa !== null ? s.placa : null;
    if (s.unidad !== 'kg') return null;
    if (s.modalidad === 'corporal') return 0;
    if (s.modalidad === 'asistida') return null;
    return s.pesoKg;
  };
  var repsDe = function (s) { return s.reps !== null ? s.reps : (s.segundos !== null ? s.segundos : null); };
  var valor = null;
  grupoSeries.forEach(function (s) { var c = cargaDe(s); if (c !== null && repsDe(s) !== null && (valor === null || c > valor)) valor = c; });
  var reps = null, e = null;
  grupoSeries.forEach(function (s) {
    var c = cargaDe(s), r = repsDe(s);
    if (c !== null && r !== null && c === valor && (reps === null || r > reps)) reps = r;
    var ee = _e1rmSerie(s);
    if (ee !== null && (e === null || ee > e)) e = ee;
  });
  return { unidad: unidad, valor: valor, reps: reps, e1rm: e, series: grupoSeries };
}

// Sesiones de un ejercicio, ordenadas por fecha y luego por ID sesión.
function _sesionesDeEjercicio(series, usuario, ejercicio) {
  var lista = _seriesDe(series, usuario, ejercicio).filter(function (s) { return s.fecha; });
  var grupos = {}, claves = [];
  lista.forEach(function (s) {
    var k = s.idSesion || ('fecha:' + s.fecha);
    if (!grupos[k]) { grupos[k] = { id: k, fecha: s.fecha, series: [] }; claves.push(k); }
    grupos[k].series.push(s);
  });
  var out = claves.map(function (k) {
    var g = grupos[k], r = _resumenSesion(g.series);
    return { id: g.id, fecha: g.fecha, unidad: r.unidad, valor: r.valor, reps: r.reps, e1rm: r.e1rm, series: g.series };
  });
  out.sort(_porFechaId);
  return out;
}

function estancado(series, usuario, ejercicio, N) {
  var n = (typeof N === 'number' && N >= 2) ? Math.floor(N) : 3;
  var todas = _sesionesDeEjercicio(series, usuario, ejercicio);
  if (todas.length < n) return { estancado: false, motivo: 'pocas sesiones', sesiones: todas.length, necesarias: n };
  var ventana = todas.slice(todas.length - n);
  var primera = ventana[0];
  var mejora = false;
  for (var i = 1; i < ventana.length; i++) {
    var v = ventana[i];
    if (v.unidad !== primera.unidad) { mejora = true; break; } // cambió de unidad: no es comparable, no se acusa
    if (primera.valor === null || v.valor === null) continue;
    if (v.valor > primera.valor) { mejora = true; break; }
    // reps con la carga de la primera sesión (o más)
    var mejorReps = null;
    v.series.forEach(function (s) {
      var c = v.unidad === 'placa' ? s.placa : (s.modalidad === 'corporal' ? 0 : s.pesoKg);
      var r = s.reps !== null ? s.reps : s.segundos;
      if (c !== null && r !== null && c >= primera.valor && (mejorReps === null || r > mejorReps)) mejorReps = r;
    });
    if (mejorReps !== null && primera.reps !== null && mejorReps > primera.reps) { mejora = true; break; }
    if (v.e1rm !== null && primera.e1rm !== null && v.e1rm > primera.e1rm) { mejora = true; break; }
  }
  var notasTecnica = ventana.some(function (v) {
    return v.series.some(function (s) { return _RE_TECNICA_MET.test(_t_met.normalizar(s.notas)); });
  });
  var res = {
    estancado: !mejora,
    ejercicio: ejercicio,
    ventana: ventana.map(function (v) { return { fecha: v.fecha, idSesion: v.id, unidad: v.unidad, pesoMax: v.valor, reps: v.reps, e1rm: v.e1rm }; }),
    notasTecnica: notasTecnica,
    sugerencias: []
  };
  if (res.estancado) {
    var u = primera.unidad, modo = ventana[ventana.length - 1].series.some(function (s) { return s.modalidad === 'corporal'; });
    if (notasTecnica) res.sugerencias.push('Veo notas de técnica o tempo: vas por buen camino, no es falta de esfuerzo.');
    if (u === 'placa') {
      res.sugerencias.push('Sube una placa en la máquina y baja las reps si hace falta.');
      res.sugerencias.push('Intenta +1 rep con la misma placa antes de subir.');
      res.sugerencias.push('Baja el tempo (3 s al bajar) para sacar más trabajo de la misma placa.');
    } else if (modo) {
      res.sugerencias.push('Busca +1 rep en la primera serie.');
      res.sugerencias.push('Baja el tempo (3 s al bajar) antes de añadir lastre.');
      res.sugerencias.push('Prueba con un lastre pequeño (1 o 2 kg).');
    } else {
      res.sugerencias.push('Baja el tempo (3 s al bajar) con el mismo peso.');
      res.sugerencias.push('Busca +1 rep en tus series antes de subir de peso.');
      res.sugerencias.push('Sube el escalón de peso más pequeño que tengas (+1 o +2,5 kg).');
    }
  }
  return res;
}

// ---------- 6. mejorEntrenamiento ----------
// D13: sesión con más volumen en kg del período, con los récords logrados ese día.
function mejorEntrenamiento(sesiones, series, usuario, desde, hasta) {
  var ses = _filasDe(sesiones, usuario).filter(function (s) { return s['ID sesión'] && _enRango(_fechaIso(s['Fecha']), desde, hasta); });
  if (ses.length === 0) return null;
  var susSeries = _seriesDe(series, usuario, null);
  var mejor = null;
  ses.forEach(function (s) {
    var id = String(s['ID sesión']).trim(), vol = 0;
    susSeries.forEach(function (x) { if (x.idSesion === id) vol += _volSerie(x).kg; });
    vol = _redondear2(vol);
    var fecha = _fechaIso(s['Fecha']);
    if (vol > 0 && (!mejor || vol > mejor.volumen || (vol === mejor.volumen && fecha > mejor.fecha))) {
      mejor = { idSesion: id, fecha: fecha, volumen: vol };
    }
  });
  if (!mejor) return null;
  var nombres = [];
  susSeries.forEach(function (x) { if (x.idSesion === mejor.idSesion && nombres.indexOf(x.ejercicio) === -1) nombres.push(x.ejercicio); });
  mejor.ejercicios = nombres;
  mejor.records = [];
  nombres.forEach(function (nom) {
    var r = records(series, usuario, nom);
    var previo = _seriesDe(series, usuario, nom).some(function (x) { return x.fecha && x.fecha < mejor.fecha; });
    var tipos = [['mayorPeso', 'peso'], ['mayor1RM', '1RM estimado'], ['mayorPlaca', 'placa'], ['masRepsCorporal', 'reps'], ['mayorLastre', 'lastre'], ['masSegundos', 'segundos']];
    tipos.forEach(function (t) {
      if (r[t[0]] && r[t[0]].fecha === mejor.fecha) {
        var item = { ejercicio: nom, tipo: t[1], dato: r[t[0]], primeraVez: !previo };
        mejor.records.push(item);
      }
    });
  });
  return mejor;
}

// ---------- 7. asistencia ----------
function asistencia(sesiones, usuario, desde, hasta) {
  var vistos = {}, fechas = [];
  _filasDe(sesiones, usuario).forEach(function (s) {
    var f = _fechaIso(s['Fecha']);
    if (f && _enRango(f, desde, hasta) && !vistos[f]) { vistos[f] = true; fechas.push(f); }
  });
  fechas.sort();
  return { dias: fechas.length, fechas: fechas };
}

// ---------- 8. rangos ----------
function rangoSemana(ahora) {
  var d = _f_met._aDT(ahora).startOf('week');
  return { desde: d.toISODate(), hasta: d.plus({ days: 6 }).toISODate() };
}
function rangoMes(ahora) {
  var d = _f_met._aDT(ahora).startOf('month');
  return { desde: d.toISODate(), hasta: d.endOf('month').toISODate() };
}

// ---------- 9. progreso ----------
function progreso(series, usuario, ejercicio) {
  var ses = _sesionesDeEjercicio(series, usuario, ejercicio).filter(function (s) { return s.valor !== null; });
  if (ses.length < 2) return { ok: false, motivo: 'sin comparación', sesiones: ses.length, ejercicio: ejercicio };
  var a = ses[0], b = ses[ses.length - 1];
  var dif = function (x, y) {
    if (x === null || y === null) return { abs: null, pct: null };
    return { abs: _redondear2(y - x), pct: x > 0 ? _redondear1((y - x) / x * 100) : null };
  };
  var dp = dif(a.valor, b.valor), de = dif(a.e1rm, b.e1rm);
  return {
    ok: true, ejercicio: ejercicio, unidad: b.unidad, sesiones: ses.length,
    primera: { fecha: a.fecha, mejorPeso: a.valor, reps: a.reps, e1rm: a.e1rm },
    ultima: { fecha: b.fecha, mejorPeso: b.valor, reps: b.reps, e1rm: b.e1rm },
    difPeso: dp.abs, pctPeso: dp.pct, difE1rm: de.abs, pctE1rm: de.pct
  };
}

// ---------- 10. frecuenciaGrupos ----------
function frecuenciaGrupos(sesiones, usuario, desde, hasta) {
  var dias = {};
  _filasDe(sesiones, usuario).forEach(function (s) {
    var f = _fechaIso(s['Fecha']);
    if (!f || !_enRango(f, desde, hasta)) return;
    _gruposDe(s['Grupos musculares']).forEach(function (g) {
      if (!dias[g]) dias[g] = {};
      dias[g][f] = true;
    });
  });
  return Object.keys(dias).map(function (g) { return { grupo: g, dias: Object.keys(dias[g]).length }; })
    .sort(function (a, b) { return b.dias - a.dias || (a.grupo < b.grupo ? -1 : 1); });
}

// ---------- 11. fuerzaRelativa ----------
function fuerzaRelativa(e1rmKg, pesoCorporal, fechaPeso, ahora) {
  var sin = { ok: false, motivo: 'sin peso corporal' };
  var e = _t_met.num(e1rmKg), p = _t_met.num(pesoCorporal), f = _fechaIso(typeof fechaPeso === 'string' ? fechaPeso : '');
  if (p === null || p <= 0 || !f) return sin;
  var hoy = _f_met._aDT(ahora).toISODate();
  var dias = Math.round((_utc(hoy) - _utc(f)) / 86400000);
  if (dias < 0 || dias > 30) return sin;
  if (e === null || e <= 0) return { ok: false, motivo: 'sin 1RM' };
  return { ok: true, ratio: _redondear2(e / p), pesoCorporal: p, diasDesdePeso: dias };
}

if (typeof module !== 'undefined') {
  module.exports = {
    e1rm: e1rm, volumen: volumen, records: records, ultimaSesionGrupo: ultimaSesionGrupo, estancado: estancado,
    mejorEntrenamiento: mejorEntrenamiento, asistencia: asistencia, rangoSemana: rangoSemana, rangoMes: rangoMes,
    progreso: progreso, frecuenciaGrupos: frecuenciaGrupos, fuerzaRelativa: fuerzaRelativa
  };
}
