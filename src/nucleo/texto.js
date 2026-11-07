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

// Número tolerante: acepta número o texto con coma o punto decimal ("62,5"). Vacío o basura -> null.
function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  var t = v.trim();
  if (!/^-?\d+(?:[.,]\d+)?$/.test(t)) return null;
  return Number(t.replace(',', '.'));
}

// Protege un valor de texto antes de escribirlo en la hoja: si empieza con = + @ o parece fecha corta ("1/2"),
// le antepone un apóstrofo. Números, booleanos y vacíos pasan sin cambio (null/undefined -> '').
function limpio(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') return v;
  if (/^[=+@]/.test(v) || /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(v)) return "'" + v;
  return v;
}

if (typeof module !== 'undefined') module.exports = { normalizar: normalizar, num: num, limpio: limpio };
