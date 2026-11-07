// Compila (sin ejecutar) el jsCode de cada nodo Code tal como lo envuelve n8n: dentro de una función async.
// Entrada por stdin: [[nombreNodo, jsCode], ...]. Salida: [{nodo, error}] solo con los que fallan.
const vm = require('vm');
let datos = '';
process.stdin.on('data', (c) => (datos += c));
process.stdin.on('end', () => {
  const fallos = [];
  for (const [nodo, code] of JSON.parse(datos)) {
    try {
      new vm.Script('(async function () {\n' + code + '\n})', { filename: nodo });
    } catch (e) {
      const linea = (e.stack || '').split('\n')[0].match(/:(\d+)$/);
      fallos.push({ nodo, error: e.message + (linea ? ` (cerca de la línea ${Math.min(Number(linea[1]) - 1, code.split('\n').length)})` : '') });
    }
  }
  process.stdout.write(JSON.stringify(fallos));
});
