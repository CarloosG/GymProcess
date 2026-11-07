// Resolución de nombres libres de ejercicio contra el catálogo.
var _t_cat = (typeof require === 'function') ? require('./texto') : { normalizar: normalizar };

function _distancia(a, b) {
  if (a === b) return 0;
  var prev = [], cur = [], i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    cur = [i];
    for (j = 1; j <= b.length; j++) {
      var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
    }
    prev = cur;
  }
  return prev[b.length];
}

function _umbral(largo) {
  return Math.min(2, Math.floor(largo * 0.2));
}

// -> {estado:'exacto'|'sinonimo'|'dudoso'|'desconocido', ejercicio:<entrada>|null, candidatos:[<entrada>]}
// Nunca devuelve 'exacto' por aproximación: lo aproximado es 'dudoso'.
function resolverEjercicio(nombreLibre, catalogo) {
  var norm = _t_cat.normalizar(nombreLibre);
  var lista = Array.isArray(catalogo) ? catalogo : [];
  if (!norm) return { estado: 'desconocido', ejercicio: null, candidatos: [] };

  var exactos = [], sinonimos = [];
  lista.forEach(function (e) {
    if (!e || !e.ejercicio) return;
    if (_t_cat.normalizar(e.ejercicio) === norm) { exactos.push(e); return; }
    var sins = Array.isArray(e.sinonimos) ? e.sinonimos : [];
    for (var i = 0; i < sins.length; i++) {
      if (_t_cat.normalizar(sins[i]) === norm) { sinonimos.push(e); return; }
    }
  });
  if (exactos.length === 1 && sinonimos.length === 0) return { estado: 'exacto', ejercicio: exactos[0], candidatos: [] };
  if (exactos.length === 0 && sinonimos.length === 1) return { estado: 'sinonimo', ejercicio: sinonimos[0], candidatos: [] };
  var ambiguos = exactos.concat(sinonimos);
  if (ambiguos.length > 1) return { estado: 'dudoso', ejercicio: null, candidatos: ambiguos.slice(0, 3) };

  // aproximado
  var puntuados = [];
  lista.forEach(function (e) {
    if (!e || !e.ejercicio) return;
    var nombres = [e.ejercicio].concat(Array.isArray(e.sinonimos) ? e.sinonimos : []);
    var mejor = null;
    nombres.forEach(function (n) {
      var nn = _t_cat.normalizar(n);
      if (!nn) return;
      var d = _distancia(norm, nn);
      if (d <= _umbral(Math.max(norm.length, nn.length)) && (mejor === null || d < mejor)) mejor = d;
    });
    if (mejor !== null) puntuados.push({ e: e, d: mejor });
  });
  puntuados.sort(function (a, b) { return a.d - b.d; });
  if (puntuados.length) {
    return { estado: 'dudoso', ejercicio: null, candidatos: puntuados.slice(0, 3).map(function (p) { return p.e; }) };
  }
  return { estado: 'desconocido', ejercicio: null, candidatos: [] };
}

if (typeof module !== 'undefined') module.exports = { resolverEjercicio: resolverEjercicio };
