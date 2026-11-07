// Nodo "Solicitudes": convierte las ops del Plan en peticiones HTTP a la API de Sheets (un item por petición).
// Appends agrupados por pestaña (values:append, INSERT_ROWS, RAW) y todos los updates en un values:batchUpdate (RAW).
// Todo texto pasa por limpio(). Nunca borra filas.
function _letraColumna(i) {
  var s = '';
  var n = i + 1;
  while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function _rango(tabla) { return "'" + String(tabla).replace(/'/g, "''") + "'"; }

function armarSolicitudes(ops, hojaId, encabezados) {
  var id = _texto2(hojaId);
  if (id === '' || /^PENDIENTE/.test(id)) throw new Error('Falta configurar hojaId en el nodo Config (ID de la hoja de Google).');
  var base = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id);
  var enc = encabezados || {};
  function cols(tabla) {
    if (!Array.isArray(enc[tabla]) || enc[tabla].length === 0) throw new Error('No hay encabezados de la pestaña "' + tabla + '".');
    return enc[tabla];
  }
  function indice(tabla, col) {
    var i = cols(tabla).indexOf(col);
    if (i < 0) throw new Error('La pestaña "' + tabla + '" no tiene la columna "' + col + '".');
    return i;
  }
  var apends = {};
  var orden = [];
  var celdas = [];
  (ops || []).forEach(function (op) {
    if (op.tipo === 'append') {
      var h = cols(op.tabla);
      Object.keys(op.valores).forEach(function (k) { indice(op.tabla, k); });
      var fila = h.map(function (nombre) {
        return Object.prototype.hasOwnProperty.call(op.valores, nombre) ? limpio(op.valores[nombre]) : '';
      });
      if (!apends[op.tabla]) { apends[op.tabla] = []; orden.push(op.tabla); }
      apends[op.tabla].push(fila);
    } else if (op.tipo === 'update') {
      if (!(Number.isInteger(op.fila) && op.fila >= 2)) throw new Error('Fila inválida para actualizar "' + op.tabla + '".');
      Object.keys(op.cambios).forEach(function (k) {
        celdas.push({ range: _rango(op.tabla) + '!' + _letraColumna(indice(op.tabla, k)) + op.fila, values: [[limpio(op.cambios[k])]] });
      });
    } else {
      throw new Error('Operación desconocida: ' + op.tipo);
    }
  });
  var out = orden.map(function (tabla) {
    return {
      descripcion: 'append ' + tabla,
      url: base + '/values/' + encodeURIComponent(_rango(tabla)) + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
      body: { majorDimension: 'ROWS', values: apends[tabla] }
    };
  });
  if (celdas.length) {
    out.push({ descripcion: 'batchUpdate', url: base + '/values:batchUpdate', body: { valueInputOption: 'RAW', data: celdas } });
  }
  return out;
}
function _texto2(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

if (typeof $input !== 'undefined') {
  var _plan = $input.first().json;
  var _sol = armarSolicitudes(_plan.ops, $('Config').first().json.hojaId, $('Tablas').first().json._h);
  return _sol.map(function (s) { return { json: s }; });
}
