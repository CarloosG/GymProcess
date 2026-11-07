// Reexporta el núcleo A (entrada) y B (métricas y textos).
if (typeof module !== 'undefined') {
  module.exports = Object.assign({},
    require('./texto'),
    require('./catalogo'),
    require('./unidades'),
    require('./fechas'),
    require('./series'),
    require('./validar'),
    require('./metricas'),
    require('./textos')
  );
}

