const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const n = require('./index');

test('index reexporta el núcleo A y B', () => {
  for (const k of ['normalizar', 'resolverEjercicio', 'aKg', 'leerPlaca', 'MODALIDADES', 'resolverFecha', 'atajoSeries', 'validarRegistro',
    'num', 'e1rm', 'volumen', 'records', 'ultimaSesionGrupo', 'estancado', 'mejorEntrenamiento', 'asistencia', 'rangoSemana', 'rangoMes',
    'progreso', 'frecuenciaGrupos', 'fuerzaRelativa', 'escaparHtml', 'formatearKg', 'formatearFecha', 'partirMensaje',
    'txtConfirmacionRegistro', 'txtFaltantes', 'txtUltimaSesion', 'txtRecords', 'txtEstancado', 'txtProgreso', 'txtSinDatos']) {
    assert.ok(k in n, k);
  }
});

function tablaProyecto() {
  const md = fs.readFileSync(path.join(__dirname, '../../PROYECTO.md'), 'utf8');
  const sec = md.split('## 3. Modelo de datos')[1].split('### Fórmulas')[0];
  const filas = {};
  for (const l of sec.split('\n')) {
    const m = /^\| \*\*(.+?)\*\* \| (.+) \|$/.exec(l);
    if (m && !m[1].includes('Retos')) filas[m[1]] = m[2];
  }
  return filas;
}
// quita las aclaraciones entre backticks o paréntesis que no son parte del encabezado
const limpiar = (c) => c.replace(/\s*\(`[^)]*`[^)]*\)/g, '').replace(/\s*\((?:=\s*)?(?:chat_id|nombre canónico|canónico)\)/, '').trim();

test('hoja/esquema.json coincide con PROYECTO.md §3 (sin Retos/Participantes), en orden', () => {
  const esquema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../hoja/esquema.json'), 'utf8'));
  const filas = tablaProyecto();
  assert.deepStrictEqual(esquema.map((p) => p.pestana), Object.keys(filas));
  for (const p of esquema) {
    const esperadas = filas[p.pestana].split(' · ').map(limpiar);
    assert.deepStrictEqual(p.columnas, esperadas, p.pestana);
  }
});
