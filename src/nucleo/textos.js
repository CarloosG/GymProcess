// Textos de respuesta de Telegram (HTML ya escapado, español, tono de entrenador). Sin datos inventados.
var _t_tx = (function () { try { return require('./texto'); } catch (e) { return { num: num }; } })();

var _NO_DISP_TX = 'No disponible';
var _DIAS_TX = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
var _MESES_TX = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// ---------- 12. formato ----------
function escaparHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 62.5 -> "62,5"; sin separador de miles; máximo 2 decimales. Inválido -> null.
function _numTx(v) {
  var n = _t_tx.num(v);
  if (n === null) return null;
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

function formatearNumero(v) {
  var t = _numTx(v);
  return t === null ? _NO_DISP_TX : t;
}

function formatearKg(v) {
  var t = _numTx(v);
  return t === null ? _NO_DISP_TX : t + ' kg';
}

// '2026-11-07' -> 'vie 7 nov'. Inválida -> "No disponible".
function formatearFecha(f) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof f === 'string' ? f.trim() : '');
  if (!m) return _NO_DISP_TX;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return _NO_DISP_TX;
  return _DIAS_TX[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + _MESES_TX[d.getUTCMonth()];
}

// ---------- 13. partirMensaje ----------
function _tokensTx(linea) {
  return linea.match(/<[^>]*>|&[a-zA-Z#0-9]+;|[^<&]+|[<&]/g) || [];
}
function _cierresTx(pila) {
  var s = '';
  for (var i = pila.length - 1; i >= 0; i--) s += '</' + pila[i].nombre + '>';
  return s;
}
function _aperturasTx(pila) {
  return pila.map(function (p) { return p.abre; }).join('');
}
function _aplicarTagTx(pila, tok) {
  var c = /^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>$/.exec(tok);
  if (c) {
    var nuevo = pila.slice();
    for (var i = nuevo.length - 1; i >= 0; i--) {
      if (nuevo[i].nombre.toLowerCase() === c[1].toLowerCase()) { nuevo.splice(i, 1); break; }
    }
    return nuevo;
  }
  var a = /^<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>$/.exec(tok);
  if (a) return pila.concat([{ nombre: a[1], abre: tok }]);
  return pila;
}

// Corta por saltos de línea; ninguna parte supera `max`; nunca corta dentro de una etiqueta;
// si un bloque abierto (<pre>, <b>…) se parte, lo cierra y lo reabre en la parte siguiente.
function partirMensaje(texto, max) {
  var limite = (typeof max === 'number' && max >= 50) ? Math.floor(max) : 4096;
  var t = (texto === null || texto === undefined) ? '' : String(texto);
  var partes = [], cur = '', pila = [], base = 0; // base = longitud del prefijo de reapertura

  function sustancia() { return cur.length > base; }
  function cerrar() {
    if (sustancia() && cur.replace(/<[^>]*>/g, '').trim() !== '') partes.push(cur + _cierresTx(pila));
    cur = _aperturasTx(pila);
    base = cur.length;
  }

  var lineas = t.split('\n');
  lineas.forEach(function (linea, idx) {
    var texto1 = linea + (idx < lineas.length - 1 ? '\n' : '');
    var toks = _tokensTx(texto1);
    // ¿la línea completa cabe en la parte actual? si no, pero cabe en una nueva, corta antes.
    var pilaFin = pila;
    toks.forEach(function (k) { if (k.charAt(0) === '<' && k.length > 1) pilaFin = _aplicarTagTx(pilaFin, k); });
    if (cur.length + texto1.length + _cierresTx(pilaFin).length > limite && sustancia()) cerrar();
    toks.forEach(function (k) {
      if (k.charAt(0) === '<' && k.length > 1) {
        var nueva = _aplicarTagTx(pila, k);
        if (cur.length + k.length + _cierresTx(nueva).length > limite && sustancia()) cerrar();
        cur += k; pila = nueva;
        return;
      }
      var resto = k;
      while (resto.length > 0) {
        var libre = limite - cur.length - _cierresTx(pila).length;
        if (libre < 1) {
          if (sustancia()) { cerrar(); continue; }
          libre = 1; // degenerado: etiquetas más largas que el límite
        }
        if (resto.length <= libre) { cur += resto; resto = ''; }
        else if (/^&[a-zA-Z#0-9]+;$/.test(resto)) {
          if (sustancia()) cerrar(); else { cur += resto; resto = ''; }
        } else { cur += resto.slice(0, libre); resto = resto.slice(libre); cerrar(); }
      }
    });
  });
  if (sustancia() && cur.replace(/<[^>]*>/g, '').trim() !== '') partes.push(cur + _cierresTx(pila));
  return partes;
}

// ---------- 14. plantillas ----------
function _e(s) { return escaparHtml(s); }

function _lineaSerieTx(s) {
  if (!s) return _NO_DISP_TX;
  var reps = (s.reps !== null && s.reps !== undefined && _numTx(s.reps) !== null) ? _numTx(s.reps) : null;
  var seg = (s.segundos !== null && s.segundos !== undefined && _numTx(s.segundos) !== null) ? _numTx(s.segundos) : null;
  var cola = reps !== null ? ' × ' + reps : (seg !== null ? ' × ' + seg + ' s' : ' × ' + _NO_DISP_TX);
  if (s.unidad === 'placa') return 'placa ' + (_numTx(s.placa) !== null ? _numTx(s.placa) : _NO_DISP_TX) + cola;
  if (s.modalidad === 'corporal') return 'peso corporal' + cola;
  var peso = _numTx(s.pesoKg) !== null ? formatearKg(s.pesoKg) : _NO_DISP_TX;
  if (s.modalidad === 'lastre') return '+' + peso + ' de lastre' + cola;
  if (s.modalidad === 'asistida') return '−' + peso + ' de ayuda' + cola;
  return peso + cola;
}

function _listaEjerciciosTx(ejercicios) {
  var out = [];
  (ejercicios || []).forEach(function (ej) {
    var nombre = ej.ejercicio || ej.nombreOriginal || _NO_DISP_TX;
    out.push('<b>' + _e(nombre) + '</b>');
    (ej.series || []).forEach(function (s, i) { out.push('  ' + (i + 1) + '. ' + _e(_lineaSerieTx(s))); });
  });
  return out;
}

// registro: {fecha, grupos, ejercicios:[{ejercicio, series:[...]}]} (salida de validarRegistro). conversiones: lista (o cantidad) de series pasadas de lb a kg.
function txtConfirmacionRegistro(registro, conversiones) {
  if (!registro || !Array.isArray(registro.ejercicios) || registro.ejercicios.length === 0) return txtSinDatos('registro');
  var out = ['✅ <b>Guardado</b> · ' + _e(formatearFecha(registro.fecha))];
  out = out.concat(_listaEjerciciosTx(registro.ejercicios));
  var conv = Array.isArray(conversiones) ? conversiones.length : (typeof conversiones === 'number' ? conversiones : 0);
  var hayConv = conv > 0 || registro.ejercicios.some(function (ej) { return (ej.series || []).some(function (s) { return s && s.convertido; }); });
  if (hayConv) out.push('ℹ️ Convertí libras a kg (redondeo a 0,5 kg).');
  out.push('¿Me equivoqué? Pulsa ↩️ Deshacer.');
  return out.join('\n');
}

function txtFaltantes(faltantes, dudas) {
  var out = [];
  var f = Array.isArray(faltantes) ? faltantes : [], d = Array.isArray(dudas) ? dudas : [];
  if (f.length === 0 && d.length === 0) return txtSinDatos('faltantes');
  out.push('🤔 <b>Me falta algo para guardarlo</b>');
  var nombres = { pesoKg: 'el peso', placa: 'la placa', reps: 'las repeticiones', segundos: 'los segundos', modalidad: 'si fue con lastre, asistida o solo peso corporal' };
  f.forEach(function (x) {
    out.push('• ' + _e(x.ejercicio || _NO_DISP_TX) + ', serie ' + _e(x.serie) + ': ' + _e(nombres[x.campo] || x.campo || _NO_DISP_TX));
  });
  d.forEach(function (x) {
    var c = Array.isArray(x.candidatos) && x.candidatos.length ? ' ¿Es ' + x.candidatos.map(_e).join(' o ') + '?' : '';
    out.push('• No reconozco "' + _e(x.nombre) + '".' + c);
  });
  out.push('Respóndeme con lo que falta y lo guardo.');
  return out.join('\n');
}

function txtSinDatos(que) {
  var q = (que === null || que === undefined || String(que).trim() === '') ? 'eso' : String(que);
  return 'Todavía no tengo datos de ' + _e(q) + '. Registra una sesión y lo veremos juntos. 💪';
}

// resultado: salida de ultimaSesionGrupo (o null).
function txtUltimaSesion(resultado) {
  if (!resultado || !Array.isArray(resultado.sesiones) || resultado.sesiones.length === 0) return txtSinDatos('ese grupo muscular');
  var out = ['📅 <b>Última sesión de ' + _e(resultado.grupo || _NO_DISP_TX) + '</b> · ' + _e(formatearFecha(resultado.fecha))];
  resultado.sesiones.forEach(function (s, i) {
    if (resultado.sesiones.length > 1) out.push('<i>Sesión ' + (i + 1) + '</i>');
    var lista = _listaEjerciciosTx(s.ejercicios);
    if (lista.length === 0) out.push('Sin series registradas.');
    else out = out.concat(lista);
    if (s.observaciones) out.push('📝 ' + _e(s.observaciones));
  });
  out.push('🎯 Reto: supérala hoy, aunque sea con una rep más.');
  return out.join('\n');
}

function _recordLineaTx(etiqueta, valor) { return '• ' + etiqueta + ': ' + valor; }

// records: salida de records().
function txtRecords(r) {
  if (!r) return txtSinDatos('récords');
  var tiene = r.mayorPeso || r.mayor1RM || r.mayorPlaca || r.masRepsCorporal || r.mayorLastre || r.masSegundos;
  if (!tiene) return txtSinDatos('récords de ' + (r.ejercicio || 'ese ejercicio'));
  var out = ['🏆 <b>Récords · ' + _e(r.ejercicio || _NO_DISP_TX) + '</b>'];
  if (r.mayorPeso) out.push(_recordLineaTx('Mayor peso', _e(formatearKg(r.mayorPeso.pesoKg) + ' × ' + formatearNumero(r.mayorPeso.reps) + ' (' + formatearFecha(r.mayorPeso.fecha) + ')')));
  if (r.mayor1RM) out.push(_recordLineaTx('Mayor 1RM estimado', _e(formatearKg(r.mayor1RM.e1rm) + ' (' + formatearFecha(r.mayor1RM.fecha) + ')')));
  if (r.mayorPlaca) out.push(_recordLineaTx('Mayor placa', _e('placa ' + formatearNumero(r.mayorPlaca.placa) + ' × ' + formatearNumero(r.mayorPlaca.reps) + ' (' + formatearFecha(r.mayorPlaca.fecha) + ')')));
  if (r.masRepsCorporal) out.push(_recordLineaTx('Más reps con peso corporal', _e(formatearNumero(r.masRepsCorporal.reps) + ' (' + formatearFecha(r.masRepsCorporal.fecha) + ')')));
  if (r.mayorLastre) out.push(_recordLineaTx('Mayor lastre', _e(formatearKg(r.mayorLastre.lastreKg) + ' (' + formatearFecha(r.mayorLastre.fecha) + ')')));
  if (r.masSegundos) out.push(_recordLineaTx('Más tiempo', _e(formatearNumero(r.masSegundos.segundos) + ' s (' + formatearFecha(r.masSegundos.fecha) + ')')));
  return out.join('\n');
}

// resultado: salida de estancado().
function txtEstancado(r) {
  if (!r) return txtSinDatos('ese ejercicio');
  if (r.motivo === 'pocas sesiones') {
    return 'Aún no hay suficientes sesiones de ' + _e(r.ejercicio || 'ese ejercicio') + ' para saber si estás estancado (necesito ' + _e(r.necesarias || 3) + ', tengo ' + _e(r.sesiones === undefined ? 0 : r.sesiones) + '). ¡Sigue registrando!';
  }
  var nom = _e(r.ejercicio || 'ese ejercicio');
  if (!r.estancado) return '📈 <b>' + nom + '</b>: sigues progresando. ¡Buen trabajo, sigue así!';
  var out = ['🧱 <b>' + nom + '</b>: llevas ' + (r.ventana ? r.ventana.length : 0) + ' sesiones sin mejorar. Les pasa a todos; se rompe con un pequeño cambio.'];
  (r.ventana || []).forEach(function (v) {
    var carga = v.unidad === 'placa' ? (v.pesoMax === null ? _NO_DISP_TX : 'placa ' + formatearNumero(v.pesoMax)) : formatearKg(v.pesoMax);
    out.push('  ' + _e(formatearFecha(v.fecha)) + ': ' + _e(carga + ' × ' + formatearNumero(v.reps)));
  });
  (r.sugerencias || []).forEach(function (s) { out.push('💡 ' + _e(s)); });
  return out.join('\n');
}

// resultado: salida de progreso().
function txtProgreso(r) {
  if (!r) return txtSinDatos('ese ejercicio');
  if (!r.ok) return 'Con una sola sesión de ' + _e(r.ejercicio || 'ese ejercicio') + ' aún no hay comparación. ¡Vuelve a entrenarlo y lo medimos!';
  var carga = function (x) { return r.unidad === 'placa' ? 'placa ' + formatearNumero(x) : formatearKg(x); };
  var signo = function (x) { return x === null || x === undefined ? '' : (x > 0 ? '+' : '') + formatearNumero(x); };
  var pct = function (x) { return x === null || x === undefined ? '' : ' (' + signo(x) + ' %)'; };
  var out = ['📊 <b>Progreso · ' + _e(r.ejercicio) + '</b>'];
  out.push('Primera (' + _e(formatearFecha(r.primera.fecha)) + '): ' + _e(carga(r.primera.mejorPeso)));
  out.push('Última (' + _e(formatearFecha(r.ultima.fecha)) + '): ' + _e(carga(r.ultima.mejorPeso)));
  out.push('Cambio en peso: ' + (r.difPeso === null ? _NO_DISP_TX : _e(signo(r.difPeso) + (r.unidad === 'placa' ? ' placas' : ' kg') + pct(r.pctPeso))));
  if (r.unidad !== 'placa') {
    out.push('Cambio en 1RM estimado: ' + (r.difE1rm === null ? _NO_DISP_TX : _e(signo(r.difE1rm) + ' kg' + pct(r.pctE1rm))));
  }
  return out.join('\n');
}

// ---------- 15. entrada (T04) ----------
function _alias(a) {
  var t = (a === null || a === undefined) ? '' : String(a).trim();
  return t === '' ? 'amigo' : t;
}
function txtHola(alias) {
  return 'Hola, <b>' + _e(_alias(alias)) + '</b>.\nEl registro de entrenamientos llega en la próxima versión.';
}
function txtBienvenida(alias) {
  return 'Bienvenido, <b>' + _e(_alias(alias)) + '</b>. Ya quedaste registrado.\nEl registro de entrenamientos llega en la próxima versión.';
}
function txtPedirCodigo() {
  return 'Para usar el bot pide un código de invitación.';
}

if (typeof module !== 'undefined') {
  module.exports = {
    txtHola: txtHola, txtBienvenida: txtBienvenida, txtPedirCodigo: txtPedirCodigo,
    escaparHtml: escaparHtml, formatearNumero: formatearNumero, formatearKg: formatearKg, formatearFecha: formatearFecha,
    partirMensaje: partirMensaje, txtConfirmacionRegistro: txtConfirmacionRegistro, txtFaltantes: txtFaltantes,
    txtUltimaSesion: txtUltimaSesion, txtRecords: txtRecords, txtEstancado: txtEstancado,
    txtProgreso: txtProgreso, txtSinDatos: txtSinDatos
  };
}
