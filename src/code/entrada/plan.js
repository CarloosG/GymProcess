// Nodo "Plan": decide qué escribir y qué responder (núcleo determinista; sin IA en v1).
// Devuelve null cuando el update ya se procesó (duplicado por update_id en Log Bot): no responde ni escribe.
// ops: { tabla, tipo: 'append', valores: {columna: valor} } | { tabla, tipo: 'update', fila, cambios: {columna: valor} }
var _ZONA_PLAN = 'America/Bogota';

function _esSi(v) { return normalizar(v) === 'si'; }
function _texto(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function _mismo(a, b) { return _texto(a) !== '' && _texto(a) === _texto(b); }

function _codigoDe(texto) {
  var m = /^\/start(?:@\w+)?(?:\s+(\S+))?/i.exec(_texto(texto));
  return m ? (m[1] || '') : '';
}

function planificar(norm, tablas, ahora) {
  var t = tablas || {};
  var log = t['Log Bot'] || [];
  if (norm.update_id !== null && norm.update_id !== undefined &&
      log.some(function (r) { return _mismo(r['update_id'], norm.update_id); })) return null;

  var marcaHora = ahora.setZone(_ZONA_PLAN).toFormat('yyyy-MM-dd HH:mm:ss');
  var dia = ahora.setZone(_ZONA_PLAN).toFormat('yyyy-MM-dd');
  var ops = [];
  var respuesta, intencion, resultado;

  var usuario = (t['Usuarios'] || []).find(function (r) { return _mismo(r['ID usuario'], norm.chat_id); }) || null;

  if (usuario && _esSi(usuario['Activo'])) {
    intencion = 'hola';
    resultado = 'ok';
    respuesta = txtHola(_texto(usuario['Alias']) || _texto(usuario['Nombre']));
  } else {
    intencion = 'registro';
    var codigo = _codigoDe(norm.texto);
    var inv = null;
    if (codigo !== '') {
      inv = (t['Invitaciones'] || []).find(function (r) {
        return _texto(r['Código']).toUpperCase() === codigo.toUpperCase() && normalizar(r['Estado']) === 'disponible';
      }) || null;
    }
    if (usuario) {
      // existe pero no está activo: no se reactiva ni se duplica por código; mismo mensaje que un desconocido
      resultado = 'usuario_inactivo';
      respuesta = txtPedirCodigo();
    } else if (inv) {
      var alias = _texto(norm.alias_tg) || _texto(norm.username);
      resultado = 'registrado';
      ops.push({ tabla: 'Usuarios', tipo: 'append', valores: {
        'ID usuario': norm.chat_id, 'Alias': alias, 'Nombre': _texto(norm.nombre),
        'Invitado por': inv['Creado por'], 'Activo': 'Sí', 'Registrado': marcaHora, 'Rol': 'usuario'
      } });
      ops.push({ tabla: 'Invitaciones', tipo: 'update', fila: inv.row_number, cambios: {
        'Estado': 'Usado', 'Usado por': norm.chat_id, 'Fecha uso': dia
      } });
      respuesta = txtBienvenida(alias || _texto(norm.nombre));
    } else {
      resultado = codigo === '' ? 'sin_codigo' : 'codigo_invalido';
      respuesta = txtPedirCodigo();
    }
  }

  var dur = (typeof norm.recibido_ms === 'number') ? Math.max(0, (Date.now() - norm.recibido_ms) / 1000) : 0;
  ops.push({ tabla: 'Log Bot', tipo: 'append', valores: {
    'Fecha': marcaHora, 'ID usuario': norm.chat_id, 'update_id': norm.update_id,
    'Intención': intencion, 'Resultado': resultado, 'Duración (s)': Math.round(dur * 10) / 10, 'Error': ''
  } });

  return { chat_id: norm.chat_id, update_id: norm.update_id, intencion: intencion, resultado: resultado, respuesta: respuesta, ops: ops };
}

if (typeof $input !== 'undefined') {
  var _norm = $('Normalizar').first().json;
  var _res = planificar(_norm, $input.first().json.tablas, DateTime.now().setZone(_ZONA_PLAN));
  return _res === null ? [] : [{ json: _res }];
}
