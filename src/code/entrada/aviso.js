// Nodo "Aviso" (flujo Gym - Errores): arma el aviso de error (HTML escapado) para cada admin activo leído de la hoja.
// Destinatarios = filas de Usuarios con Rol = admin y Activo = Sí. Sin admins: no devuelve nada (termina, sin bucle).
function _tx(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

function adminsDe(valores) {
  var filas = Array.isArray(valores) ? valores : [];
  if (filas.length < 2) return [];
  var h = filas[0].map(function (x) { return _tx(x); });
  var iId = h.indexOf('ID usuario'), iRol = h.indexOf('Rol'), iAct = h.indexOf('Activo');
  if (iId < 0 || iRol < 0 || iAct < 0) return [];
  var out = [];
  for (var i = 1; i < filas.length; i++) {
    var f = filas[i] || [];
    var id = _tx(f[iId]);
    if (id !== '' && normalizar(f[iRol]) === 'admin' && normalizar(f[iAct]) === 'si' && out.indexOf(id) < 0) out.push(id);
  }
  return out;
}

function _corto(s, max) { var t = _tx(s); return t.length > max ? t.slice(0, max - 1) + '…' : t; }

function textoAviso(err) {
  var e = (err && typeof err === 'object') ? err : {};
  var ex = e.execution || {};
  var wf = e.workflow || {};
  var er = ex.error || {};
  var lineas = ['<b>Error en un flujo de GymProcess</b>'];
  lineas.push('Flujo: ' + escaparHtml(_corto(wf.name, 100) || 'desconocido'));
  lineas.push('Nodo: ' + escaparHtml(_corto(ex.lastNodeExecuted || er.node && er.node.name, 100) || 'desconocido'));
  lineas.push('Error: ' + escaparHtml(_corto(er.message, 800) || 'sin mensaje'));
  lineas.push('Ejecución: ' + escaparHtml(_corto(ex.id, 40) || 'desconocida'));
  return lineas.join('\n');
}

function armarAvisos(err, valoresUsuarios) {
  var texto = partirMensaje(textoAviso(err), 4096)[0] || '';
  return adminsDe(valoresUsuarios).map(function (id) { return { chat_id: /^-?\d+$/.test(id) ? Number(id) : id, texto: texto }; });
}

if (typeof $input !== 'undefined') {
  return armarAvisos($('Error Trigger').first().json, $input.first().json.values).map(function (a) { return { json: a }; });
}
