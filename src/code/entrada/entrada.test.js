const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const { codigoNodo, esquema } = require('../../../scripts/lib_codigo');
const { DateTime } = require('../../../.claude/skills/n8n-workflow-check/node_modules/luxon');

// Carga un nodo con el núcleo concatenado (como en n8n: require que no resuelve rutas, DateTime global).
function cargar(archivo, nombres) {
  const require = (m) => { throw new Error("Cannot find module '" + m + "'"); };
  const ctx = vm.createContext({ DateTime, require, module: undefined, Date, JSON, Math, Number, String, Object, Array, Error, RegExp });
  const codigo = codigoNodo('src/code/entrada/' + archivo);
  const fns = vm.runInContext('(function(){' + codigo + '\nreturn {' + nombres.map((n) => n + ': ' + n).join(',') + '};})()', ctx);
  // la salida cruza de realm (vm): se normaliza a objetos del realm de la prueba
  return Object.fromEntries(nombres.map((n) => [n, (...a) => { const r = fns[n](...a); return r === undefined ? r : JSON.parse(JSON.stringify(r)); }]));
}

const AHORA = DateTime.fromISO('2026-11-07T14:30:00', { zone: 'America/Bogota' });
const { normalizarUpdate } = cargar('normalizar.js', ['normalizarUpdate']);
const { construirTablas } = cargar('tablas.js', ['construirTablas']);
const { planificar } = cargar('plan.js', ['planificar']);
const { armarSolicitudes } = cargar('solicitudes.js', ['armarSolicitudes']);
const { armarMensajes } = cargar('mensajes.js', ['armarMensajes']);
const { armarAvisos, adminsDe } = cargar('aviso.js', ['armarAvisos', 'adminsDe']);

const ESQ = esquema();
const ENC = Object.fromEntries(ESQ.map((t) => [t.pestana, t.columnas]));

function tablasBase() {
  return {
    Usuarios: [
      { 'ID usuario': 1001, Alias: 'Ana', Nombre: 'Ana Prueba', Activo: 'Sí', Rol: 'usuario', row_number: 2 },
      { 'ID usuario': 9001, Alias: 'Admin', Nombre: 'Admin Prueba', Activo: 'Sí', Rol: 'admin', row_number: 3 },
      { 'ID usuario': 1003, Alias: 'Inactivo', Nombre: 'Ex Usuario', Activo: 'No', Rol: 'usuario', row_number: 4 },
    ],
    Invitaciones: [
      { 'Código': 'GYM-AAA111', 'Creado por': 9001, Estado: 'Disponible', row_number: 2 },
      { 'Código': 'GYM-BBB222', 'Creado por': 9001, Estado: 'Usado', 'Usado por': 1001, row_number: 3 },
    ],
    'Log Bot': [{ update_id: 5000, 'ID usuario': 1001, row_number: 2 }],
  };
}
function norm(extra) {
  return Object.assign({ update_id: 6001, chat_id: 2002, nombre: 'Luis Prueba', alias_tg: 'Luis', username: 'luis_p', texto: '', tipo: 'texto', recibido_ms: Date.now() }, extra);
}

test('normalizar: mensaje de texto válido, comando, botón y voz', () => {
  const u = { update_id: 7, message: { message_id: 11, text: ' hola ', chat: { id: 55, type: 'private' }, from: { id: 55, is_bot: false, first_name: 'Ana', last_name: 'Prueba' } } };
  const n = normalizarUpdate(u);
  assert.strictEqual(n.chat_id, 55); assert.strictEqual(n.texto, 'hola'); assert.strictEqual(n.tipo, 'texto');
  assert.strictEqual(n.ignorar, false); assert.strictEqual(n.nombre, 'Ana Prueba'); assert.strictEqual(n.message_id, 11);
  assert.strictEqual(normalizarUpdate({ update_id: 8, message: { message_id: 1, text: '/start GYM-X', chat: { id: 5, type: 'private' }, from: { id: 5, is_bot: false } } }).tipo, 'comando');
  const b = normalizarUpdate({ update_id: 9, callback_query: { id: 'c', data: 'pc:1:si', from: { id: 5, is_bot: false }, message: { message_id: 3, chat: { id: 5, type: 'private' } } } });
  assert.strictEqual(b.tipo, 'boton'); assert.strictEqual(b.texto, 'pc:1:si'); assert.strictEqual(b.chat_id, 5);
  assert.strictEqual(normalizarUpdate({ update_id: 10, message: { message_id: 1, voice: {}, chat: { id: 5, type: 'private' }, from: { id: 5, is_bot: false } } }).tipo, 'voz');
});
test('normalizar: bots, chats no privados y basura se ignoran', () => {
  const bot = normalizarUpdate({ update_id: 1, message: { message_id: 1, text: 'x', chat: { id: 5, type: 'private' }, from: { id: 6, is_bot: true } } });
  assert.strictEqual(bot.ignorar, true); assert.strictEqual(bot.motivo_ignorar, 'bot'); assert.strictEqual(bot.is_bot, true);
  const grupo = normalizarUpdate({ update_id: 2, message: { message_id: 1, text: 'x', chat: { id: -100, type: 'supergroup' }, from: { id: 6, is_bot: false } } });
  assert.strictEqual(grupo.ignorar, true); assert.strictEqual(grupo.motivo_ignorar, 'chat_no_privado');
  for (const basura of [null, undefined, {}, 'x', 5, { update_id: 3 }]) assert.strictEqual(normalizarUpdate(basura).ignorar, true);
});

function batchGetOk() {
  return { valueRanges: ESQ.map((t) => ({ range: (/\s/.test(t.pestana) ? "'" + t.pestana + "'" : t.pestana) + '!A1:Z1000', values: [t.columnas] })) };
}
test('tablas: filas como objetos con row_number, vacías omitidas, filas cortas rellenas', () => {
  const r = batchGetOk();
  const u = r.valueRanges.find((x) => x.range.startsWith('Usuarios'));
  u.values.push([1001, 'Ana', 'Ana Prueba', '', '', 9001, 'Sí', '2026-11-01 10:00:00', 'usuario'], [], [1002, 'Beto']);
  const t = construirTablas(r, ESQ);
  assert.strictEqual(t.tablas.Usuarios.length, 2);
  assert.strictEqual(t.tablas.Usuarios[0].row_number, 2);
  assert.strictEqual(t.tablas.Usuarios[1].row_number, 4);
  assert.strictEqual(t.tablas.Usuarios[1].Activo, '');
  assert.deepStrictEqual(t._h.Usuarios, ENC.Usuarios);
  assert.deepStrictEqual(t.tablas['Log Bot'], []);
});
test('tablas: pestaña o encabezado faltante -> error que nombra cuál', () => {
  const r = batchGetOk();
  r.valueRanges = r.valueRanges.filter((x) => !x.range.startsWith('Series'));
  assert.throws(() => construirTablas(r, ESQ), /Series/);
  const r2 = batchGetOk();
  r2.valueRanges.find((x) => x.range.startsWith('Invitaciones')).values = [['Código', 'Creado por']];
  assert.throws(() => construirTablas(r2, ESQ), /Invitaciones.*Estado/);
  assert.throws(() => construirTablas({}, ESQ), /Falta la pestaña/);
  assert.throws(() => construirTablas(null, ESQ), /Falta la pestaña/);
});

test('plan: usuario activo recibe hola con su alias y se registra en Log Bot', () => {
  const p = planificar(norm({ chat_id: 1001, texto: 'hola' }), tablasBase(), AHORA);
  assert.ok(p.respuesta.includes('Hola, <b>Ana</b>')); assert.ok(p.respuesta.includes('próxima versión'));
  assert.strictEqual(p.ops.length, 1); assert.strictEqual(p.ops[0].tabla, 'Log Bot');
  assert.strictEqual(p.ops[0].valores.update_id, 6001); assert.strictEqual(p.ops[0].valores.Resultado, 'ok');
  assert.strictEqual(p.ops[0].valores.Fecha, '2026-11-07 14:30:00');
});
test('plan: registro con código válido (usuario + invitación por fila + log)', () => {
  const p = planificar(norm({ texto: '/start gym-aaa111' }), tablasBase(), AHORA);
  assert.strictEqual(p.resultado, 'registrado');
  const [u, i, l] = p.ops;
  assert.strictEqual(u.tabla, 'Usuarios'); assert.strictEqual(u.tipo, 'append');
  assert.strictEqual(u.valores['ID usuario'], 2002); assert.strictEqual(u.valores.Activo, 'Sí'); assert.strictEqual(u.valores.Rol, 'usuario');
  assert.strictEqual(u.valores['Invitado por'], 9001); assert.strictEqual(u.valores.Registrado, '2026-11-07 14:30:00');
  assert.strictEqual(i.tabla, 'Invitaciones'); assert.strictEqual(i.tipo, 'update'); assert.strictEqual(i.fila, 2);
  assert.deepStrictEqual(i.cambios, { Estado: 'Usado', 'Usado por': 2002, 'Fecha uso': '2026-11-07' });
  assert.strictEqual(l.tabla, 'Log Bot');
  assert.ok(p.respuesta.includes('Bienvenido, <b>Luis</b>'));
});
test('plan: código usado, inexistente o ausente -> mismo mensaje, sin escribir salvo el log', () => {
  for (const [texto, res] of [['/start GYM-BBB222', 'codigo_invalido'], ['/start NOEXISTE', 'codigo_invalido'], ['/start', 'sin_codigo'], ['hola', 'sin_codigo'], ['/start@gym_bot', 'sin_codigo']]) {
    const p = planificar(norm({ texto }), tablasBase(), AHORA);
    assert.strictEqual(p.respuesta, 'Para usar el bot pide un código de invitación.', texto);
    assert.strictEqual(p.resultado, res, texto);
    assert.deepStrictEqual(p.ops.map((o) => o.tabla), ['Log Bot'], texto);
  }
});
test('plan: usuario inactivo no se reactiva ni se duplica, aunque traiga código válido', () => {
  const p = planificar(norm({ chat_id: 1003, texto: '/start GYM-AAA111' }), tablasBase(), AHORA);
  assert.strictEqual(p.resultado, 'usuario_inactivo');
  assert.deepStrictEqual(p.ops.map((o) => o.tabla), ['Log Bot']);
});
test('plan: usuario activo con /start <código> no consume el código', () => {
  const p = planificar(norm({ chat_id: 1001, texto: '/start GYM-AAA111' }), tablasBase(), AHORA);
  assert.deepStrictEqual(p.ops.map((o) => o.tabla), ['Log Bot']);
});
test('plan: duplicado (update_id ya en Log Bot) -> null; update_id ajeno no cuenta', () => {
  assert.strictEqual(planificar(norm({ update_id: 5000 }), tablasBase(), AHORA), null);
  assert.strictEqual(planificar(norm({ update_id: '5000' }), tablasBase(), AHORA), null);
  assert.notStrictEqual(planificar(norm({ update_id: 5001 }), tablasBase(), AHORA), null);
});
test('plan: nada de datos de otro usuario en la respuesta; nombre con HTML se escapa', () => {
  const p = planificar(norm({ nombre: '<b>&', alias_tg: '<b>&', texto: '/start GYM-AAA111' }), tablasBase(), AHORA);
  assert.ok(p.respuesta.includes('&lt;b&gt;&amp;')); assert.ok(!p.respuesta.includes('<b>&<'));
  const q = planificar(norm({ chat_id: 1001, texto: 'dame los datos de Admin' }), tablasBase(), AHORA);
  assert.ok(!q.respuesta.includes('Admin')); assert.ok(!q.respuesta.includes('9001'));
});
test('plan: las ops solo usan columnas del esquema', () => {
  for (const texto of ['hola', '/start GYM-AAA111', '/start MAL']) {
    const p = planificar(norm({ texto }), tablasBase(), AHORA);
    for (const o of p.ops) for (const k of Object.keys(o.valores || o.cambios)) assert.ok(ENC[o.tabla].includes(k), o.tabla + '.' + k);
  }
});

test('solicitudes: append por pestaña y un solo batchUpdate por fila; limpio() protege textos', () => {
  const p = planificar(norm({ nombre: '=HYPERLINK("x")', alias_tg: '+57', texto: '/start GYM-AAA111' }), tablasBase(), AHORA);
  const s = armarSolicitudes(p.ops, 'HOJA123', ENC);
  assert.strictEqual(s.length, 3);
  assert.ok(s[0].url.startsWith('https://sheets.googleapis.com/v4/spreadsheets/HOJA123/values/'));
  assert.ok(s[0].url.endsWith(':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'));
  assert.ok(s[1].url.includes('Log%20Bot'));
  const fila = s[0].body.values[0];
  assert.strictEqual(fila.length, ENC.Usuarios.length);
  assert.strictEqual(fila[ENC.Usuarios.indexOf('Nombre')], "'=HYPERLINK(\"x\")");
  assert.strictEqual(fila[ENC.Usuarios.indexOf('Alias')], "'+57");
  assert.strictEqual(fila[ENC.Usuarios.indexOf('ID usuario')], 2002);
  assert.ok(s[2].url.endsWith('/values:batchUpdate'));
  assert.strictEqual(s[2].body.valueInputOption, 'RAW');
  assert.deepStrictEqual(s[2].body.data.map((d) => d.range), ["'Invitaciones'!C2", "'Invitaciones'!D2", "'Invitaciones'!E2"]);
});
test('solicitudes: sin hojaId, columna desconocida, fila inválida y operación desconocida -> error', () => {
  const ops = [{ tabla: 'Log Bot', tipo: 'append', valores: { update_id: 1 } }];
  assert.throws(() => armarSolicitudes(ops, 'PENDIENTE_ID_HOJA', ENC), /hojaId/);
  assert.throws(() => armarSolicitudes(ops, '', ENC), /hojaId/);
  assert.throws(() => armarSolicitudes([{ tabla: 'Log Bot', tipo: 'append', valores: { Nada: 1 } }], 'H', ENC), /Nada/);
  assert.throws(() => armarSolicitudes([{ tabla: 'Invitaciones', tipo: 'update', fila: 1, cambios: { Estado: 'x' } }], 'H', ENC), /Fila inválida/);
  assert.throws(() => armarSolicitudes([{ tabla: 'Log Bot', tipo: 'borrar' }], 'H', ENC), /desconocida/);
  assert.throws(() => armarSolicitudes(ops, 'H', {}), /encabezados/);
});
test('solicitudes: columnas más allá de Z', () => {
  const enc = { T: Array.from({ length: 30 }, (_, i) => 'c' + i) };
  const s = armarSolicitudes([{ tabla: 'T', tipo: 'update', fila: 5, cambios: { c26: 1, c27: 2 } }], 'H', enc);
  assert.deepStrictEqual(s[0].body.data.map((d) => d.range), ["'T'!AA5", "'T'!AB5"]);
});

test('mensajes: parte a 4096 y mantiene el chat; sin chat no devuelve nada', () => {
  const largo = Array.from({ length: 800 }, (_, i) => 'línea ' + i).join('\n');
  const m = armarMensajes(1001, largo);
  assert.ok(m.length >= 2); assert.ok(m.every((x) => x.texto.length <= 4096 && x.chat_id === 1001));
  assert.strictEqual(armarMensajes(1001, 'hola').length, 1);
  assert.deepStrictEqual(armarMensajes(null, 'hola'), []);
  assert.deepStrictEqual(armarMensajes(1001, ''), []);
});

const USUARIOS_VALS = [
  ESQ[0].columnas,
  [1001, 'Ana', 'Ana', '', '', 9001, 'Sí', '', 'usuario'],
  [9001, 'Admin', 'Admin', '', '', '', 'Sí', '', 'admin'],
  [9002, 'Otro', 'Otro', '', '', '', 'No', '', 'admin'],
  [9003, 'Dos', 'Dos', '', '', '', 'Sí', '', 'admin'],
];
test('aviso: solo admins activos; texto escapado; un item por admin', () => {
  const err = { execution: { id: '77', lastNodeExecuted: 'Plan <x>', error: { message: 'falló <b> & más' } }, workflow: { name: 'Gym - Entrada' } };
  const a = armarAvisos(err, USUARIOS_VALS);
  assert.deepStrictEqual(a.map((x) => x.chat_id), [9001, 9003]);
  assert.ok(a[0].texto.includes('Gym - Entrada')); assert.ok(a[0].texto.includes('Plan &lt;x&gt;'));
  assert.ok(a[0].texto.includes('falló &lt;b&gt; &amp; más')); assert.ok(a[0].texto.includes('Ejecución: 77'));
});
test('aviso: sin admins, hoja vacía o basura -> nada (sin fallar)', () => {
  assert.deepStrictEqual(armarAvisos({}, [ESQ[0].columnas]), []);
  assert.deepStrictEqual(armarAvisos({}, undefined), []);
  assert.deepStrictEqual(armarAvisos({}, [['x'], [1]]), []);
  assert.deepStrictEqual(adminsDe([ESQ[0].columnas, [1, 'a', 'a', '', '', '', 'No', '', 'admin']]), []);
  assert.strictEqual(armarAvisos(null, USUARIOS_VALS).length, 2);
});
test('aviso: un error larguísimo se recorta', () => {
  const a = armarAvisos({ execution: { error: { message: 'x'.repeat(10000) } } }, USUARIOS_VALS);
  assert.ok(a[0].texto.length < 4096);
});
