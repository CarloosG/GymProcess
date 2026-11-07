// Utilidades de texto del núcleo. JS puro, sin dependencias.

// minúsculas, sin tildes, espacios simples, sin puntuación en los bordes.
function normalizar(s) {
  if (s === null || s === undefined) return '';
  var t = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  t = t.replace(/\s+/g, ' ').trim();
  // quita todo lo que no sea letra/número en los bordes
  t = t.replace(/^[^a-z0-9]+/, '').replace(/[^a-z0-9]+$/, '');
  return t;
}

if (typeof module !== 'undefined') module.exports = { normalizar: normalizar };
