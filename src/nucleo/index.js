// Reexporta todo el núcleo A (entrada).
if (typeof module !== 'undefined') {
  module.exports = Object.assign({},
    require('./texto'),
    require('./catalogo'),
    require('./unidades'),
    require('./fechas'),
    require('./series'),
    require('./validar')
  );
}

