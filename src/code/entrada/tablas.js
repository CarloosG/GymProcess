// Nodo "Tablas": convierte la respuesta de values:batchGet en filas como objetos (con row_number y encabezados en _h).
// Valida que existan todas las pestañas y todos los encabezados de ESQUEMA (hoja/esquema.json); si falta algo, lanza
// un error que nombra cuál.
function _nombreRango(rango) {
  var s = String(rango || '');
  var i = s.lastIndexOf('!');
  var n = i >= 0 ? s.slice(0, i) : s;
  if (n.length >= 2 && n.charAt(0) === "'" && n.charAt(n.length - 1) === "'") n = n.slice(1, -1).replace(/''/g, "'");
  return n;
}

function construirTablas(respuesta, esquema) {
  var rangos = (respuesta && Array.isArray(respuesta.valueRanges)) ? respuesta.valueRanges : [];
  var porNombre = {};
  rangos.forEach(function (r) { porNombre[_nombreRango(r && r.range)] = r; });
  var tablas = {}, enc = {};
  esquema.forEach(function (t) {
    var r = porNombre[t.pestana];
    if (!r) throw new Error('Falta la pestaña "' + t.pestana + '" en la hoja (o la lectura no la devolvió).');
    var vals = Array.isArray(r.values) ? r.values : [];
    var h = (vals[0] || []).map(function (x) { return String(x === null || x === undefined ? '' : x).trim(); });
    t.columnas.forEach(function (c) {
      if (h.indexOf(c) < 0) throw new Error('A la pestaña "' + t.pestana + '" le falta el encabezado "' + c + '".');
    });
    var filas = [];
    for (var i = 1; i < vals.length; i++) {
      var fila = vals[i] || [];
      var obj = {};
      var vacia = true;
      h.forEach(function (nombre, j) {
        var v = (fila[j] === undefined || fila[j] === null) ? '' : fila[j];
        if (nombre !== '') obj[nombre] = v;
        if (v !== '') vacia = false;
      });
      if (vacia) continue;
      obj.row_number = i + 1;
      filas.push(obj);
    }
    tablas[t.pestana] = filas;
    enc[t.pestana] = h;
  });
  return { tablas: tablas, _h: enc };
}

if (typeof $input !== 'undefined') {
  return [{ json: construirTablas($input.first().json, ESQUEMA) }];
}
