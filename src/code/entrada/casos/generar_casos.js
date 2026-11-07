// Genera los casos de prueba (datos inventados) para simular_code.js. Uso: node generar_casos.js
const fs = require('node:fs');
const path = require('node:path');
const { esquema } = require('../../../../scripts/lib_codigo');
const ESQ = esquema();
const ENC = Object.fromEntries(ESQ.map((t) => [t.pestana, t.columnas]));
const AHORA = '2026-11-07T14:30:00';
const guardar = (n, o) => fs.writeFileSync(path.join(__dirname, n), JSON.stringify(o, null, 2) + '\n');
const q = (p) => (/\s/.test(p) ? "'" + p + "'" : p);

// ---- respuesta de values:batchGet
const rangos = ESQ.map((t) => ({ range: q(t.pestana) + '!A1:Z1000', majorDimension: 'ROWS', values: [t.columnas] }));
const poner = (pest, filas) => rangos.find((r) => r.range.startsWith(q(pest) + '!')).values.push(...filas);
poner('Usuarios', [
  [1001, 'Ana', 'Ana Prueba', 62.5, '2026-11-01', 9001, 'Sí', '2026-11-01 10:00:00', 'usuario'],
  [9001, 'Admin', 'Admin Prueba', '', '', '', 'Sí', '2026-10-01 09:00:00', 'admin'],
  [1003, 'Inactivo', 'Ex Usuario', '', '', 9001, 'No', '2026-10-05 09:00:00', 'usuario'],
]);
poner('Invitaciones', [['GYM-AAA111', 9001, 'Disponible', '', ''], ['GYM-BBB222', 9001, 'Usado', 1001, '2026-11-01']]);
poner('Log Bot', [['2026-11-01 10:00:00', 1001, 5000, 'registro', 'registrado', 0.4, '']]);
guardar('batchget_ok.json', [{ spreadsheetId: 'HOJA_DE_PRUEBA', valueRanges: rangos }]);
guardar('batchget_sin_series.json', [{ spreadsheetId: 'HOJA_DE_PRUEBA', valueRanges: rangos.filter((r) => !r.range.startsWith('Series')) }]);
const sinEnc = JSON.parse(JSON.stringify(rangos)); sinEnc.find((r) => r.range.startsWith('Invitaciones')).values[0] = ['Código', 'Creado por'];
guardar('batchget_sin_encabezado.json', [{ valueRanges: sinEnc }]);

// ---- Tablas ya construidas (salida de "Tablas")
const tablas = Object.fromEntries(ESQ.map((t) => [t.pestana, []]));
tablas.Usuarios = [
  { 'ID usuario': 1001, Alias: 'Ana', Nombre: 'Ana Prueba', 'Peso corporal (kg)': 62.5, 'Fecha peso': '2026-11-01', 'Invitado por': 9001, Activo: 'Sí', Registrado: '2026-11-01 10:00:00', Rol: 'usuario', row_number: 2 },
  { 'ID usuario': 9001, Alias: 'Admin', Nombre: 'Admin Prueba', Activo: 'Sí', Rol: 'admin', row_number: 3 },
  { 'ID usuario': 1003, Alias: 'Inactivo', Nombre: 'Ex Usuario', Activo: 'No', Rol: 'usuario', row_number: 4 },
];
tablas.Invitaciones = [
  { 'Código': 'GYM-AAA111', 'Creado por': 9001, Estado: 'Disponible', row_number: 2 },
  { 'Código': 'GYM-BBB222', 'Creado por': 9001, Estado: 'Usado', 'Usado por': 1001, 'Fecha uso': '2026-11-01', row_number: 3 },
];
tablas['Log Bot'] = [{ Fecha: '2026-11-01 10:00:00', 'ID usuario': 1001, update_id: 5000, 'Intención': 'registro', Resultado: 'registrado', row_number: 2 }];
guardar('tablas.json', [{ tablas, _h: ENC }]);

// ---- updates de Telegram (salida de "Config": update + hojaId)
const upd = (id, from, chat, texto, extra) => ({ update_id: id, hojaId: 'HOJA_DE_PRUEBA', message: Object.assign({ message_id: id + 100, text: texto, date: 1790000000, chat: Object.assign({ id: from.id, type: 'private' }, chat), from }, extra) });
const persona = (id, nombre, extra) => Object.assign({ id, is_bot: false, first_name: nombre, language_code: 'es' }, extra);
const base = (over) => Object.assign({ update_id: 6001, chat_id: 2002, nombre: 'Luis Prueba', alias_tg: 'Luis', username: 'luis_p', texto: '', tipo: 'texto', message_id: 6101, recibido_ms: 0, ignorar: false }, over);

guardar('casos-normalizar.json', [
  { nombre: 'usuario activo dice "hola"', tipo: 'valido', ahora: AHORA, entrada: [upd(6000, persona(1001, 'Ana', { last_name: 'Prueba' }), {}, 'hola')],
    espera: { cantidad: 1, salida: [{ chat_id: 1001, texto: 'hola', tipo: 'texto', update_id: 6000, message_id: 6100, ignorar: false, is_bot: false, nombre: 'Ana Prueba' }], no_contiene: ['undefined', 'NaN'] } },
  { nombre: 'registro con /start <código>', tipo: 'valido', ahora: AHORA, entrada: [upd(6001, persona(2002, 'Luis'), {}, '/start GYM-AAA111')],
    espera: { cantidad: 1, salida: [{ tipo: 'comando', texto: '/start GYM-AAA111', ignorar: false }] } },
  { nombre: 'mensaje de un bot se ignora', tipo: 'invalido', ahora: AHORA, entrada: [upd(6002, persona(777, 'Robot', { is_bot: true }), {}, 'hola')],
    espera: { cantidad: 1, salida: [{ ignorar: true, motivo_ignorar: 'bot', is_bot: true }] } },
  { nombre: 'chat de grupo se ignora', tipo: 'invalido', ahora: AHORA, entrada: [upd(6003, persona(2002, 'Luis'), { id: -1001234, type: 'supergroup' }, 'hola')],
    espera: { cantidad: 1, salida: [{ ignorar: true, motivo_ignorar: 'chat_no_privado' }] } },
  { nombre: 'update vacío no revienta', tipo: 'invalido', ahora: AHORA, entrada: [{}], espera: { cantidad: 1, salida: [{ ignorar: true, motivo_ignorar: 'sin_chat' }] } },
  { nombre: 'botón (callback_query)', tipo: 'valido', ahora: AHORA, entrada: [{ update_id: 6004, callback_query: { id: 'cb1', data: 'pc:AB12:si', from: persona(1001, 'Ana'), message: { message_id: 55, chat: { id: 1001, type: 'private' } } } }],
    espera: { cantidad: 1, salida: [{ tipo: 'boton', texto: 'pc:AB12:si', chat_id: 1001 }] } },
  { nombre: 'mismo update repetido da la misma salida (el anti-duplicado lo decide Plan)', tipo: 'duplicado', ahora: AHORA, entrada: [upd(6000, persona(1001, 'Ana', { last_name: 'Prueba' }), {}, 'hola')],
    espera: { cantidad: 1, salida: [{ update_id: 6000, chat_id: 1001 }] } },
]);

guardar('casos-tablas.json', [
  { nombre: 'lectura completa', tipo: 'valido', ahora: AHORA, entrada: '@batchget_ok.json',
    espera: { cantidad: 1, salida: [{ tablas: { Usuarios: [{ 'ID usuario': 1001, Alias: 'Ana', row_number: 2 }, { row_number: 3 }, { row_number: 4 }], Invitaciones: [{ 'Código': 'GYM-AAA111', row_number: 2 }] } }], no_contiene: ['undefined', 'NaN'] } },
  { nombre: 'falta la pestaña Series', tipo: 'invalido', ahora: AHORA, entrada: '@batchget_sin_series.json', espera: { error: 'Series' } },
  { nombre: 'falta el encabezado Estado en Invitaciones', tipo: 'invalido', ahora: AHORA, entrada: '@batchget_sin_encabezado.json', espera: { error: 'Estado' } },
  { nombre: 'respuesta vacía', tipo: 'invalido', ahora: AHORA, entrada: [{}], espera: { error: 'Falta la pestaña' } },
  { nombre: 'misma lectura otra vez (idempotente)', tipo: 'duplicado', ahora: AHORA, entrada: '@batchget_ok.json', espera: { cantidad: 1, salida: [{ _h: { Usuarios: ENC.Usuarios } }] } },
]);

const OK = 'Para usar el bot pide un código de invitación.';
const plan = (nombre, tipo, n, espera) => ({ nombre, tipo, ahora: AHORA, entrada: '@tablas.json', nodos: { Normalizar: [base(n)] }, espera: Object.assign({ no_contiene: ['undefined', 'NaN'] }, espera) });
guardar('casos-plan.json', [
  plan('usuario activo dice "hola"', 'valido', { chat_id: 1001, texto: 'hola', recibido_ms: Date.parse('2026-11-07T14:30:00-05:00') }, { cantidad: 1, salida: [{ intencion: 'hola', resultado: 'ok', ops: [{ tabla: 'Log Bot', tipo: 'append' }] }], contiene: ['Hola, <b>Ana</b>', 'próxima versión'] }),
  plan('registro con código válido', 'valido', { texto: '/start GYM-AAA111' }, { cantidad: 1, salida: [{ resultado: 'registrado', ops: [{ tabla: 'Usuarios', tipo: 'append' }, { tabla: 'Invitaciones', tipo: 'update', fila: 2, cambios: { Estado: 'Usado', 'Usado por': 2002, 'Fecha uso': '2026-11-07' } }, { tabla: 'Log Bot' }] }], contiene: ['Bienvenido, <b>Luis</b>', '"Invitado por":9001', '"Rol":"usuario"'] }),
  plan('código ya usado', 'invalido', { texto: '/start GYM-BBB222' }, { cantidad: 1, salida: [{ resultado: 'codigo_invalido', respuesta: OK }], no_contiene: ['Usuarios', 'Invitaciones'] }),
  plan('sin código', 'invalido', { texto: 'hola, quiero entrar' }, { cantidad: 1, salida: [{ resultado: 'sin_codigo', respuesta: OK }], no_contiene: ['"tabla":"Usuarios"'] }),
  plan('código que no existe (no se revela nada)', 'invalido', { texto: '/start XXXX' }, { cantidad: 1, salida: [{ respuesta: OK }], no_contiene: ['GYM-'] }),
  plan('DUPLICADO: update_id ya está en Log Bot', 'duplicado', { update_id: 5000, chat_id: 1001, texto: 'hola' }, { cantidad: 0 }),
  plan('texto con <b>& en el nombre se escapa', 'valido', { nombre: '<b>&', alias_tg: '<b>&', texto: '/start GYM-AAA111' }, { cantidad: 1, contiene: ['&lt;b&gt;&amp;'], no_contiene: ['<b>&<', 'Hola, <b><b>'] }),
  plan('usuario inactivo con código válido', 'invalido', { chat_id: 1003, texto: '/start GYM-AAA111' }, { cantidad: 1, salida: [{ resultado: 'usuario_inactivo', respuesta: OK }] }),
]);

const planSal = { chat_id: 2002, update_id: 6001, respuesta: 'x', ops: [
  { tabla: 'Usuarios', tipo: 'append', valores: { 'ID usuario': 2002, Alias: '=HYPERLINK("x")', Nombre: 'Luis Prueba', 'Invitado por': 9001, Activo: 'Sí', Registrado: '2026-11-07 14:30:00', Rol: 'usuario' } },
  { tabla: 'Invitaciones', tipo: 'update', fila: 2, cambios: { Estado: 'Usado', 'Usado por': 2002, 'Fecha uso': '2026-11-07' } },
  { tabla: 'Log Bot', tipo: 'append', valores: { Fecha: '2026-11-07 14:30:00', 'ID usuario': 2002, update_id: 6001, 'Intención': 'registro', Resultado: 'registrado', 'Duración (s)': 0.1, Error: '' } }] };
guardar('casos-solicitudes.json', [
  { nombre: 'registro: 2 appends y 1 batchUpdate; limpio() en texto', tipo: 'valido', ahora: AHORA, entrada: [planSal], nodos: { Config: [{ hojaId: 'HOJA_DE_PRUEBA' }], Tablas: '@tablas.json' },
    espera: { cantidad: 3, salida: [{ descripcion: 'append Usuarios' }, { descripcion: 'append Log Bot' }, { descripcion: 'batchUpdate', body: { valueInputOption: 'RAW' } }], contiene: ["'=HYPERLINK", 'insertDataOption=INSERT_ROWS', 'Log%20Bot'] } },
  { nombre: 'hojaId sin configurar', tipo: 'invalido', ahora: AHORA, entrada: [planSal], nodos: { Config: [{ hojaId: 'PENDIENTE_ID_HOJA' }], Tablas: '@tablas.json' }, espera: { error: 'hojaId' } },
  { nombre: 'misma entrada otra vez: mismas peticiones (el anti-duplicado ocurre antes, en Plan)', tipo: 'duplicado', ahora: AHORA, entrada: [planSal], nodos: { Config: [{ hojaId: 'HOJA_DE_PRUEBA' }], Tablas: '@tablas.json' }, espera: { cantidad: 3 } },
]);

guardar('casos-mensajes.json', [
  { nombre: 'respuesta corta', tipo: 'valido', ahora: AHORA, entrada: [{}], nodos: { Plan: [{ chat_id: 1001, respuesta: 'Hola, <b>Ana</b>.' }] }, espera: { cantidad: 1, salida: [{ chat_id: 1001, texto: 'Hola, <b>Ana</b>.' }] } },
  { nombre: 'respuesta de 9000 caracteres se parte', tipo: 'valido', ahora: AHORA, entrada: [{}], nodos: { Plan: [{ chat_id: 1001, respuesta: Array.from({ length: 900 }, (_, i) => 'línea ' + i).join('\n') }] }, espera: { cantidad: 3 } },
  { nombre: 'sin chat_id no envía', tipo: 'invalido', ahora: AHORA, entrada: [{}], nodos: { Plan: [{ respuesta: 'x' }] }, espera: { cantidad: 0 } },
  { nombre: 'mismo plan otra vez', tipo: 'duplicado', ahora: AHORA, entrada: [{}], nodos: { Plan: [{ chat_id: 1001, respuesta: 'Hola' }] }, espera: { cantidad: 1 } },
]);

const errTrig = (msg) => ({ execution: { id: '231', url: 'https://n8n.ejemplo/execution/231', lastNodeExecuted: 'Escribir hoja', mode: 'trigger', error: { message: msg, name: 'NodeApiError' } }, workflow: { id: 'wf1', name: 'Gym - Entrada' } });
const vals = [ENC.Usuarios, [1001, 'Ana', 'Ana', '', '', 9001, 'Sí', '', 'usuario'], [9001, 'Admin', 'Admin', '', '', '', 'Sí', '', 'admin'], [9002, 'Ex', 'Ex', '', '', '', 'No', '', 'admin']];
guardar('casos-aviso.json', [
  { nombre: 'un admin activo recibe el aviso', tipo: 'valido', ahora: AHORA, entrada: [{ range: 'Usuarios!A1:I1000', majorDimension: 'ROWS', values: vals }], nodos: { 'Error Trigger': [errTrig('The service was not able to process your request')] },
    espera: { cantidad: 1, salida: [{ chat_id: 9001 }], contiene: ['Gym - Entrada', 'Escribir hoja', 'Ejecución: 231', 'not able to process'], no_contiene: ['1001', '9002', 'undefined'] } },
  { nombre: 'mensaje de error con <b>& se escapa', tipo: 'valido', ahora: AHORA, entrada: [{ values: vals }], nodos: { 'Error Trigger': [errTrig('falló <b>x</b> & más')] },
    espera: { cantidad: 1, contiene: ['falló &lt;b&gt;x&lt;/b&gt; &amp; más'], no_contiene: ['<b>x</b>'] } },
  { nombre: 'sin admins: no falla y no envía', tipo: 'invalido', ahora: AHORA, entrada: [{ values: [ENC.Usuarios] }], nodos: { 'Error Trigger': [errTrig('x')] }, espera: { cantidad: 0 } },
  { nombre: 'hoja sin datos (respuesta sin values)', tipo: 'invalido', ahora: AHORA, entrada: [{ range: 'Usuarios!A1:I1000' }], nodos: { 'Error Trigger': [errTrig('x')] }, espera: { cantidad: 0 } },
  { nombre: 'mismo error otra vez: mismo aviso (sin estado oculto)', tipo: 'duplicado', ahora: AHORA, entrada: [{ values: vals }], nodos: { 'Error Trigger': [errTrig('x')] }, espera: { cantidad: 1 } },
]);
