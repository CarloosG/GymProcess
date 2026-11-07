const test = require('node:test');
const assert = require('node:assert');
const t = require('./textos');
const m = require('./metricas');

function balanceado(parte) {
  const pila = [];
  const re = /<(\/?)([a-z]+)(?:\s[^>]*)?>/gi;
  let x;
  while ((x = re.exec(parte))) {
    if (x[1] === '') pila.push(x[2].toLowerCase());
    else { if (pila.pop() !== x[2].toLowerCase()) return false; }
  }
  // ninguna "<" suelta fuera de etiquetas, ninguna etiqueta cortada
  const sinTags = parte.replace(/<\/?[a-z]+(?:\s[^>]*)?>/gi, '');
  return pila.length === 0 && !/[<>]/.test(sinTags) && !/&(?![a-z#0-9]+;)/i.test(sinTags);
}

test('escaparHtml: válido, inválido y borde', () => {
  assert.strictEqual(t.escaparHtml('a & b < c > d'), 'a &amp; b &lt; c &gt; d');
  assert.strictEqual(t.escaparHtml('&amp;'), '&amp;amp;');
  assert.strictEqual(t.escaparHtml(null), '');
  assert.strictEqual(t.escaparHtml(undefined), '');
  assert.strictEqual(t.escaparHtml(5), '5');
  assert.strictEqual(t.escaparHtml('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
});

test('formatearKg / formatearNumero: coma decimal sin toLocaleString', () => {
  assert.strictEqual(t.formatearKg(62.5), '62,5 kg');
  assert.strictEqual(t.formatearKg(60), '60 kg');
  assert.strictEqual(t.formatearKg('62,5'), '62,5 kg');
  assert.strictEqual(t.formatearKg(1234.5), '1234,5 kg');
  assert.strictEqual(t.formatearKg(80.0000001), '80 kg');
  assert.strictEqual(t.formatearKg(null), 'No disponible');
  assert.strictEqual(t.formatearKg('abc'), 'No disponible');
  assert.strictEqual(t.formatearNumero(0), '0');
  assert.strictEqual(t.formatearNumero(''), 'No disponible');
  assert.ok(!/toLocaleString/.test(require('node:fs').readFileSync(__dirname + '/textos.js', 'utf8').replace(/\/\/.*$/gm, '')));
});

test('formatearFecha', () => {
  assert.strictEqual(t.formatearFecha('2026-11-07'), 'sáb 7 nov' /* 7 nov 2026 es sábado (el brief decía vie por error) */);
  assert.strictEqual(t.formatearFecha('2026-11-06'), 'vie 6 nov');
  assert.strictEqual(t.formatearFecha('2026-12-31'), 'jue 31 dic');
  assert.strictEqual(t.formatearFecha('2026-02-30'), 'No disponible');
  assert.strictEqual(t.formatearFecha('hoy'), 'No disponible');
  assert.strictEqual(t.formatearFecha(null), 'No disponible');
});

test('partirMensaje: texto corto, vacío y corte por líneas', () => {
  assert.deepStrictEqual(t.partirMensaje('hola', 4096), ['hola']);
  assert.deepStrictEqual(t.partirMensaje('', 4096), []);
  assert.deepStrictEqual(t.partirMensaje(null, 4096), []);
  const lineas = Array.from({ length: 300 }, (_, i) => 'línea número ' + i).join('\n');
  const p = t.partirMensaje(lineas, 4096);
  assert.ok(p.length > 1);
  p.forEach((x) => assert.ok(x.length <= 4096));
  assert.strictEqual(p.join(''), lineas); // cortó en saltos de línea, sin perder nada
});

test('partirMensaje: 10 000 caracteres, partes <= 4096 y etiquetas balanceadas', () => {
  const casos = [
    'x'.repeat(10000),
    ('<b>' + 'palabra '.repeat(30) + '</b>\n').repeat(60),
    '<pre>' + ('fila de tabla 60 kg x 10\n').repeat(450) + '</pre>',
    '<b>' + 'sin saltos de línea '.repeat(520) + '</b>',
    ('&amp; &lt;b&gt; ').repeat(900),
    '<pre>' + 'a'.repeat(10000) + '</pre>',
    '<a href="https://ejemplo.com/ruta?x=1">' + 'enlace '.repeat(1500) + '</a>'
  ];
  casos.forEach((c) => {
    const p = t.partirMensaje(c, 4096);
    assert.ok(p.length >= 3 || c.length < 9000, 'partes ' + p.length);
    p.forEach((x) => { assert.ok(x.length <= 4096, 'largo ' + x.length); assert.ok(balanceado(x), x.slice(0, 80)); });
    const plano = (s) => s.replace(/<\/?[a-z]+(?:\s[^>]*)?>/gi, '').replace(/\s+/g, '');
    assert.strictEqual(plano(p.join('')), plano(c)); // no se pierde contenido
  });
  const pre = t.partirMensaje(casos[2], 4096);
  assert.ok(pre.length > 1);
  pre.forEach((x) => { assert.ok(x.startsWith('<pre>')); assert.ok(x.endsWith('</pre>')); });
});

test('partirMensaje: límite pequeño y entidades no se parten', () => {
  const p = t.partirMensaje('&amp;'.repeat(100), 60);
  p.forEach((x) => { assert.ok(x.length <= 60); assert.ok(balanceado(x)); });
  assert.strictEqual(p.join(''), '&amp;'.repeat(100));
});

const registro = {
  fecha: '2026-11-06', grupos: ['pecho'],
  ejercicios: [
    { ejercicio: 'Press banca', series: [{ unidad: 'kg', pesoKg: 62.5, modalidad: 'normal', reps: 10 }, { unidad: 'kg', pesoKg: 62.5, modalidad: 'normal', reps: 8, convertido: true }] },
    { ejercicio: 'Prensa', series: [{ unidad: 'placa', placa: 5, modalidad: 'normal', reps: 12 }] },
    { ejercicio: 'Dominadas', series: [{ unidad: 'kg', pesoKg: null, modalidad: 'corporal', reps: 9 }, { unidad: 'kg', pesoKg: 10, modalidad: 'lastre', reps: 5 }] },
    { ejercicio: 'Plancha', series: [{ unidad: 'kg', modalidad: 'corporal', reps: null, segundos: 45 }] }
  ]
};

test('txtConfirmacionRegistro: lista lo guardado, avisa lb→kg, escapa HTML', () => {
  const s = t.txtConfirmacionRegistro(registro, [{ original: '135 lb', kg: 61 }]);
  assert.match(s, /Guardado/);
  assert.match(s, /vie 6 nov/);
  assert.match(s, /62,5 kg × 10/);
  assert.match(s, /placa 5 × 12/);
  assert.match(s, /\+10 kg de lastre × 5/);
  assert.match(s, /45 s/);
  assert.match(s, /libras a kg/);
  assert.ok(!/libras a kg/.test(t.txtConfirmacionRegistro({ fecha: '2026-11-06', ejercicios: [registro.ejercicios[1]] }, [])));
  assert.ok(balanceado(s));
  const raro = t.txtConfirmacionRegistro({ fecha: '2026-11-06', ejercicios: [{ ejercicio: '<script>&', series: [{ unidad: 'kg', pesoKg: 10, modalidad: 'normal', reps: 5 }] }] }, []);
  assert.ok(raro.includes('&lt;script&gt;&amp;'));
  assert.ok(!raro.includes('<script>'));
  assert.match(t.txtConfirmacionRegistro(null, []), /Todavía no tengo datos/);
  assert.match(t.txtConfirmacionRegistro({ fecha: '2026-11-06', ejercicios: [{ ejercicio: 'X', series: [{ unidad: 'kg', pesoKg: 10, modalidad: 'normal', reps: null }] }] }, []), /No disponible/);
});

test('txtFaltantes', () => {
  const s = t.txtFaltantes([{ ejercicio: 'Press banca', serie: 2, campo: 'reps' }], [{ nombre: 'pres <x>', candidatos: ['Press banca', 'Press militar'] }]);
  assert.match(s, /Press banca, serie 2: las repeticiones/);
  assert.match(s, /No reconozco "pres &lt;x&gt;"/);
  assert.match(s, /Press banca o Press militar/);
  assert.match(t.txtFaltantes([], []), /Todavía no tengo datos/);
  assert.match(t.txtFaltantes(undefined, undefined), /Todavía no tengo datos/);
});

test('txtUltimaSesion: con reto, varias sesiones y sin datos', () => {
  const ses = (id, g) => ({ 'ID sesión': id, 'ID usuario': '111', 'Fecha': '2026-11-04', 'Grupos musculares': g, 'Estado registro': 'Activo' });
  const ser = (id, ej, n) => ({ 'ID sesión': id, 'ID usuario': '111', 'Fecha': '2026-11-04', 'Ejercicio': ej, 'N.º serie': n, 'Unidad': 'kg', 'Peso (kg)': 60, 'Modalidad': 'normal', 'Reps': 10, 'Estado registro': 'Activo' });
  const r = m.ultimaSesionGrupo([ses('S1', 'pecho'), ses('S2', 'pecho')], [ser('S1', 'Press banca', 1), ser('S2', 'Aperturas', 1)], '111', 'pecho');
  const s = t.txtUltimaSesion(r);
  assert.match(s, /Última sesión de pecho/);
  assert.match(s, /Sesión 1/); assert.match(s, /Sesión 2/);
  assert.match(s, /Press banca/); assert.match(s, /Aperturas/);
  assert.match(s, /supérala/);
  assert.match(t.txtUltimaSesion(null), /Todavía no tengo datos/);
  assert.match(t.txtUltimaSesion({ grupo: 'pecho', sesiones: [] }), /Todavía no tengo datos/);
  assert.ok(balanceado(s));
});

test('txtRecords: solo lo que aplica y nunca un 0 inventado', () => {
  const s = t.txtRecords({ ejercicio: 'Press banca', mayorPeso: { pesoKg: 70, reps: 3, fecha: '2026-10-08' }, mayor1RM: { e1rm: 82.3, fecha: '2026-10-15' }, mayorPlaca: null, masRepsCorporal: null, mayorLastre: null, masSegundos: null });
  assert.match(s, /Mayor peso: 70 kg × 3/);
  assert.match(s, /82,3 kg/);
  assert.ok(!/placa|lastre|segundos|\b0\b/i.test(s));
  assert.match(t.txtRecords({ ejercicio: 'Remo' }), /Todavía no tengo datos de récords de Remo/);
  assert.match(t.txtRecords(null), /Todavía no tengo datos/);
  const p = t.txtRecords({ ejercicio: 'Prensa', mayorPlaca: { placa: 6, reps: 8, fecha: '2026-10-08' } });
  assert.match(p, /placa 6 × 8/);
});

test('txtEstancado: estancado, progresando, pocas sesiones', () => {
  const ses = (i, reps) => ({ 'ID sesión': 'E' + i, 'ID usuario': '111', 'Fecha': '2026-10-0' + i, 'Ejercicio': 'Press banca', 'N.º serie': 1, 'Unidad': 'kg', 'Peso (kg)': 60, 'Modalidad': 'normal', 'Reps': reps, 'Notas': i === 3 ? 'tempo lento' : '', 'Estado registro': 'Activo' });
  const e = m.estancado([ses(1, 8), ses(2, 8), ses(3, 7)], '111', 'Press banca');
  const s = t.txtEstancado(e);
  assert.match(s, /3 sesiones sin mejorar/);
  assert.match(s, /💡/);
  assert.match(s, /técnica|tempo/);
  assert.match(t.txtEstancado(m.estancado([ses(1, 8), ses(2, 9), ses(3, 8)], '111', 'Press banca')), /sigues progresando/);
  assert.match(t.txtEstancado(m.estancado([ses(1, 8)], '111', 'Press banca')), /necesito 3, tengo 1/);
  assert.match(t.txtEstancado(null), /Todavía no tengo datos/);
});

test('txtProgreso: con comparación, sin comparación y sin datos', () => {
  const f = (i, p) => ({ 'ID sesión': 'E' + i, 'ID usuario': '111', 'Fecha': '2026-10-0' + i, 'Ejercicio': 'Press banca', 'N.º serie': 1, 'Unidad': 'kg', 'Peso (kg)': p, 'Modalidad': 'normal', 'Reps': 5, 'Estado registro': 'Activo' });
  const s = t.txtProgreso(m.progreso([f(1, 60), f(2, 70)], '111', 'Press banca'));
  assert.match(s, /Primera \(jue 1 oct\): 60 kg/);
  assert.match(s, /Última \(vie 2 oct\): 70 kg/);
  assert.match(s, /\+10 kg \(\+16,7 %\)/);
  assert.match(t.txtProgreso(m.progreso([f(1, 60)], '111', 'Press banca')), /una sola sesión/);
  assert.match(t.txtProgreso(null), /Todavía no tengo datos/);
});

test('txtSinDatos escapa y tolera vacío', () => {
  assert.match(t.txtSinDatos('<b>x</b>'), /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(t.txtSinDatos(''), /de eso/);
  assert.match(t.txtSinDatos(undefined), /de eso/);
});

test('txtHola / txtBienvenida / txtPedirCodigo: escapan y no revelan nada', () => {
  assert.ok(t.txtHola('Ana').includes('Hola, <b>Ana</b>'));
  assert.ok(t.txtHola('Ana').includes('próxima versión'));
  assert.ok(t.txtHola('<b>&').includes('&lt;b&gt;&amp;'));
  assert.ok(!/<b>&</.test(t.txtHola('<b>&')));
  assert.ok(t.txtHola('').includes('amigo'));
  assert.ok(t.txtHola(null).includes('amigo'));
  assert.ok(t.txtBienvenida('Luis').includes('Bienvenido, <b>Luis</b>'));
  assert.strictEqual(t.txtPedirCodigo(), 'Para usar el bot pide un código de invitación.');
  assert.ok(balanceado(t.txtHola('x < y & z')));
});
