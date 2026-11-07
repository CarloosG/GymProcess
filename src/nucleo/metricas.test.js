const test = require('node:test');
const assert = require('node:assert');
const m = require('./metricas');
const { DateTime } = require('../../.claude/skills/n8n-workflow-check/node_modules/luxon');

const A = '111', B = '222';
let cont = 0;
function ser(u, ses, fecha, ej, n, extra) {
  return Object.assign({ 'ID serie': 'SER-' + (++cont), 'ID sesión': ses, 'ID usuario': u, 'Fecha': fecha, 'Ejercicio': ej, 'N.º serie': n,
    'Unidad': 'kg', 'Peso (kg)': 60, 'Placa': '', 'Modalidad': 'normal', 'Reps': 8, 'Segundos': '', 'RPE': '', 'Notas': '', 'Estado registro': 'Activo', 'ID mensaje': '1' }, extra);
}
function ses(u, id, fecha, grupos, extra) {
  return Object.assign({ 'ID sesión': id, 'ID usuario': u, 'Fecha': fecha, 'Grupos musculares': grupos, 'Observaciones': '', 'ID mensaje': '1', 'Estado registro': 'Activo' }, extra);
}

test('e1rm: válido, inválido y borde', () => {
  assert.strictEqual(m.e1rm(60, 10), 80);
  assert.strictEqual(m.e1rm(100, 1), 100);
  assert.strictEqual(m.e1rm(50, 15), null);
  assert.strictEqual(m.e1rm(50, 12), 70);
  assert.strictEqual(m.e1rm(null, 5), null);
  assert.strictEqual(m.e1rm('62,5', 8), 79.2);
  assert.strictEqual(m.e1rm(0, 5), null);
  assert.strictEqual(m.e1rm(60, 0), null);
  assert.strictEqual(m.e1rm('abc', 5), null);
});

test('volumen: kg, lastre, placa y corporal por separado; por sesión, semana y mes', () => {
  const s = [
    ser(A, 'S1', '2026-11-02', 'Press banca', 1, { 'Peso (kg)': 60, Reps: 10 }),
    ser(A, 'S1', '2026-11-02', 'Press banca', 2, { 'Peso (kg)': '62,5', Reps: 8 }),
    ser(A, 'S1', '2026-11-02', 'Dominadas', 1, { 'Peso (kg)': '', Reps: 9, Modalidad: 'corporal' }),
    ser(A, 'S1', '2026-11-02', 'Dominadas', 2, { 'Peso (kg)': 10, Reps: 5, Modalidad: 'lastre' }),
    ser(A, 'S1', '2026-11-02', 'Prensa', 1, { Unidad: 'placa', 'Peso (kg)': '', Placa: 5, Reps: 12 }),
    ser(A, 'S2', '2026-11-12', 'Press banca', 1, { 'Peso (kg)': 100, Reps: 1 }),
    ser(B, 'X1', '2026-11-02', 'Press banca', 1, { 'Peso (kg)': 200, Reps: 10 })
  ];
  const v = m.volumen(s, A, '2026-11-01', '2026-11-30');
  assert.strictEqual(v.total, 600 + 500 + 50 + 100);
  assert.strictEqual(v.repsCorporales, 9);
  assert.strictEqual(v.seriesPlaca, 1);
  assert.strictEqual(v.porSesion.S1, 1150);
  assert.strictEqual(v.porSemana['2026-11-02'], 1150);
  assert.strictEqual(v.porSemana['2026-11-09'], 100);
  assert.strictEqual(v.porMes['2026-11'], 1250);
  assert.strictEqual(m.volumen(s, A, '2026-11-10', '2026-11-30').total, 100);
  assert.strictEqual(m.volumen(s, '999', null, null).total, 0);
  assert.strictEqual(m.volumen(s, '', null, null).total, 0);
  assert.strictEqual(m.volumen(s, B, null, null).total, 2000);
});

test('records: separados por tipo, null cuando no aplica', () => {
  const s = [
    ser(A, 'S1', '2026-10-01', 'Press banca', 1, { 'Peso (kg)': 60, Reps: 10 }),
    ser(A, 'S2', '2026-10-08', 'Press banca', 1, { 'Peso (kg)': 70, Reps: 3 }),
    ser(A, 'S3', '2026-10-15', 'Press banca', 1, { 'Peso (kg)': 65, Reps: 8 }),
    ser(A, 'S1', '2026-10-01', 'Dominadas', 1, { 'Peso (kg)': '', Reps: 8, Modalidad: 'corporal' }),
    ser(A, 'S2', '2026-10-08', 'Dominadas', 1, { 'Peso (kg)': '', Reps: 10, Modalidad: 'corporal' }),
    ser(A, 'S2', '2026-10-08', 'Dominadas', 2, { 'Peso (kg)': 12.5, Reps: 4, Modalidad: 'lastre' }),
    ser(A, 'S1', '2026-10-01', 'Prensa', 1, { Unidad: 'placa', 'Peso (kg)': '', Placa: 4, Reps: 10 }),
    ser(A, 'S2', '2026-10-08', 'Prensa', 1, { Unidad: 'placa', 'Peso (kg)': '', Placa: 6, Reps: 8 }),
    ser(A, 'S1', '2026-10-01', 'Plancha', 1, { 'Peso (kg)': '', Reps: '', Segundos: 45, Modalidad: 'corporal' }),
    ser(B, 'X', '2026-10-20', 'Press banca', 1, { 'Peso (kg)': 150, Reps: 5 })
  ];
  const r = m.records(s, A, 'Press banca');
  assert.deepStrictEqual(r.mayorPeso, { pesoKg: 70, reps: 3, fecha: '2026-10-08' });
  assert.strictEqual(r.mayor1RM.e1rm, 82.3); // 65 x 8: mayor 1RM aunque no sea el mayor peso (70 x 3 = 77)
  assert.strictEqual(r.mayor1RM.fecha, '2026-10-15');
  assert.strictEqual(r.mayorPlaca, null);
  assert.strictEqual(r.masRepsCorporal, null);
  assert.strictEqual(r.mayorLastre, null);
  assert.strictEqual(r.masSegundos, null);
  const d = m.records(s, A, 'dominadas');
  assert.strictEqual(d.masRepsCorporal.reps, 10);
  assert.strictEqual(d.mayorLastre.lastreKg, 12.5);
  assert.strictEqual(d.mayorPeso, null);
  assert.strictEqual(d.mayor1RM, null);
  const p = m.records(s, A, 'Prensa');
  assert.strictEqual(p.mayorPlaca.placa, 6);
  assert.strictEqual(p.mayor1RM, null);
  assert.strictEqual(m.records(s, A, 'Plancha').masSegundos.segundos, 45);
  assert.strictEqual(m.records(s, B, 'Press banca').mayorPeso.pesoKg, 150);
  assert.strictEqual(m.records(s, A, 'Nada').mayorPeso, null);
  assert.strictEqual(m.records(s, A, '').mayorPeso, null);
  assert.strictEqual(m.records(s, A, null).mayorPeso, null);
});

test('ultimaSesionGrupo: dos sesiones el mismo día, y día más reciente con el grupo', () => {
  const sesiones = [
    ses(A, 'S1', '2026-11-04', 'pecho, tríceps'),
    ses(A, 'S2', '2026-11-04', 'pecho'),
    ses(A, 'S3', '2026-11-07', 'espalda'),
    ses(B, 'X1', '2026-11-06', 'pecho')
  ];
  const series = [
    ser(A, 'S1', '2026-11-04', 'Press banca', 1), ser(A, 'S1', '2026-11-04', 'Press banca', 2),
    ser(A, 'S1', '2026-11-04', 'Fondos', 1, { Reps: 10, Modalidad: 'corporal', 'Peso (kg)': '' }),
    ser(A, 'S2', '2026-11-04', 'Aperturas', 1, { 'Peso (kg)': 15 }),
    ser(A, 'S3', '2026-11-07', 'Remo', 1),
    ser(B, 'X1', '2026-11-06', 'Press banca', 1, { 'Peso (kg)': 999 })
  ];
  const r = m.ultimaSesionGrupo(sesiones, series, A, 'Pecho');
  assert.strictEqual(r.fecha, '2026-11-04');
  assert.deepStrictEqual(r.sesiones.map((s) => s.idSesion), ['S1', 'S2']);
  assert.deepStrictEqual(r.sesiones[0].ejercicios.map((e) => e.ejercicio), ['Press banca', 'Fondos']);
  assert.strictEqual(r.sesiones[0].ejercicios[0].series.length, 2);
  assert.strictEqual(r.sesiones[1].ejercicios[0].series[0].pesoKg, 15);
  assert.strictEqual(m.ultimaSesionGrupo(sesiones, series, A, 'espalda').fecha, '2026-11-07');
  assert.strictEqual(m.ultimaSesionGrupo(sesiones, series, A, 'pierna'), null);
  assert.strictEqual(m.ultimaSesionGrupo(sesiones, series, A, ''), null);
  const rb = m.ultimaSesionGrupo(sesiones, series, B, 'pecho');
  assert.strictEqual(rb.sesiones.length, 1);
  assert.strictEqual(rb.sesiones[0].ejercicios[0].series[0].pesoKg, 999);
  assert.strictEqual(m.ultimaSesionGrupo(sesiones, series, '333', 'pecho'), null);
});

test('ultimaSesionGrupo: pecho hace 3 días y espalda hoy devuelve la de hace 3 días', () => {
  const sesiones = [ses(A, 'S1', '2026-11-04', 'pecho'), ses(A, 'S2', '2026-11-07', 'espalda')];
  const r = m.ultimaSesionGrupo(sesiones, [], A, 'pecho');
  assert.strictEqual(r.fecha, '2026-11-04');
  assert.strictEqual(r.sesiones.length, 1);
  assert.deepStrictEqual(r.sesiones[0].ejercicios, []);
});

function tres(u, ej, datos, extra) {
  const out = [];
  datos.forEach((d, i) => out.push(ser(u, 'E' + u + (i + 1), '2026-10-0' + (i + 1), ej, 1, Object.assign({ 'Peso (kg)': d[0], Reps: d[1] }, extra || {}))));
  return out;
}

test('estancado: estancado, con mejora, pocas sesiones y placas', () => {
  const e = m.estancado(tres(A, 'Press banca', [[60, 8], [60, 8], [60, 7]]), A, 'Press banca');
  assert.strictEqual(e.estancado, true);
  assert.strictEqual(e.ventana.length, 3);
  assert.strictEqual(e.notasTecnica, false);
  assert.ok(e.sugerencias.length >= 3);
  assert.ok(e.sugerencias.some((s) => /tempo/.test(s)));
  assert.ok(e.sugerencias.some((s) => /1 rep/.test(s)));
  assert.ok(e.sugerencias.some((s) => /escalón/.test(s)));
  assert.strictEqual(m.estancado(tres(A, 'Press banca', [[60, 8], [60, 9], [60, 8]]), A, 'Press banca').estancado, false);
  assert.strictEqual(m.estancado(tres(A, 'Press banca', [[60, 8], [62.5, 6], [60, 8]]), A, 'Press banca').estancado, false);
  const poc = m.estancado(tres(A, 'Press banca', [[60, 8], [60, 8]]), A, 'Press banca');
  assert.deepStrictEqual([poc.estancado, poc.motivo], [false, 'pocas sesiones']);
  assert.strictEqual(m.estancado([], A, 'Press banca').motivo, 'pocas sesiones');
  const pl = (vals) => vals.map((v, i) => ser(A, 'P' + i, '2026-10-0' + (i + 1), 'Prensa', 1, { Unidad: 'placa', 'Peso (kg)': '', Placa: v[0], Reps: v[1] }));
  const ep = m.estancado(pl([[5, 10], [5, 10], [5, 9]]), A, 'Prensa');
  assert.strictEqual(ep.estancado, true);
  assert.ok(ep.sugerencias.some((s) => /placa/.test(s)));
  assert.strictEqual(m.estancado(pl([[5, 10], [5, 10], [6, 8]]), A, 'Prensa').estancado, false);
});

test('estancado: ventana = últimas N, notas de técnica, N personalizado y aislamiento', () => {
  const s = tres(A, 'Press banca', [[40, 5], [60, 8], [60, 8], [60, 7]]);
  s[3].Notas = 'tempo lento 3 s';
  const e = m.estancado(s, A, 'Press banca');
  assert.strictEqual(e.estancado, true);
  assert.strictEqual(e.ventana[0].pesoMax, 60);
  assert.strictEqual(e.notasTecnica, true);
  assert.ok(/técnica|tempo/.test(e.sugerencias[0]));
  assert.strictEqual(m.estancado(s, A, 'Press banca', 4).estancado, false); // 40 -> 60 mejora
  const mezcla = s.concat(tres(B, 'Press banca', [[100, 5], [100, 5], [110, 5]]));
  assert.strictEqual(m.estancado(mezcla, A, 'Press banca').ventana.every((v) => v.pesoMax === 60), true);
  assert.strictEqual(m.estancado(mezcla, B, 'Press banca').estancado, false);
});

test('mejorEntrenamiento: sesión con más volumen y récords de ese día', () => {
  const sesiones = [ses(A, 'S1', '2026-11-02', 'pecho'), ses(A, 'S2', '2026-11-09', 'pecho'), ses(B, 'X1', '2026-11-03', 'pecho')];
  const series = [
    ser(A, 'S1', '2026-11-02', 'Press banca', 1, { 'Peso (kg)': 60, Reps: 10 }),
    ser(A, 'S2', '2026-11-09', 'Press banca', 1, { 'Peso (kg)': 80, Reps: 10 }),
    ser(A, 'S2', '2026-11-09', 'Aperturas', 1, { 'Peso (kg)': 10, Reps: 10 }),
    ser(B, 'X1', '2026-11-03', 'Press banca', 1, { 'Peso (kg)': 500, Reps: 10 })
  ];
  const r = m.mejorEntrenamiento(sesiones, series, A, '2026-11-01', '2026-11-30');
  assert.strictEqual(r.idSesion, 'S2');
  assert.strictEqual(r.volumen, 900);
  assert.ok(r.records.some((x) => x.ejercicio === 'Press banca' && x.tipo === 'peso' && x.primeraVez === false));
  assert.ok(r.records.some((x) => x.ejercicio === 'Aperturas' && x.primeraVez === true));
  assert.strictEqual(m.mejorEntrenamiento(sesiones, series, A, '2026-11-01', '2026-11-05').idSesion, 'S1');
  assert.strictEqual(m.mejorEntrenamiento(sesiones, series, A, '2026-12-01', '2026-12-31'), null);
  assert.strictEqual(m.mejorEntrenamiento(sesiones, series, '333', null, null), null);
  assert.strictEqual(m.mejorEntrenamiento(sesiones, series, B, null, null).volumen, 5000);
});

test('asistencia: días distintos, rango y usuario', () => {
  const sesiones = [ses(A, 'S1', '2026-11-02', 'pecho'), ses(A, 'S2', '2026-11-02', 'pierna'), ses(A, 'S3', '2026-11-04', 'espalda'),
    ses(A, 'S4', '2026-11-20', 'pecho'), ses(B, 'X1', '2026-11-03', 'pecho')];
  const r = m.asistencia(sesiones, A, '2026-11-01', '2026-11-07');
  assert.deepStrictEqual(r, { dias: 2, fechas: ['2026-11-02', '2026-11-04'] });
  assert.strictEqual(m.asistencia(sesiones, A, null, null).dias, 3);
  assert.strictEqual(m.asistencia(sesiones, B, null, null).dias, 1);
  assert.strictEqual(m.asistencia(sesiones, '333', null, null).dias, 0);
  assert.strictEqual(m.asistencia([], A, null, null).dias, 0);
});

test('rangoSemana / rangoMes en America/Bogota', () => {
  // domingo 8 nov 2026 23:30 Bogotá = lunes 9 nov 04:30 UTC
  assert.deepStrictEqual(m.rangoSemana('2026-11-09T04:30:00Z'), { desde: '2026-11-02', hasta: '2026-11-08' });
  assert.deepStrictEqual(m.rangoSemana('2026-11-08T23:30:00-05:00'), { desde: '2026-11-02', hasta: '2026-11-08' });
  assert.deepStrictEqual(m.rangoSemana('2026-11-09T00:00:00-05:00'), { desde: '2026-11-09', hasta: '2026-11-15' });
  assert.deepStrictEqual(m.rangoSemana(DateTime.fromISO('2026-11-07T10:00:00', { zone: 'America/Bogota' })), { desde: '2026-11-02', hasta: '2026-11-08' });
  assert.deepStrictEqual(m.rangoMes('2026-11-07T10:00:00-05:00'), { desde: '2026-11-01', hasta: '2026-11-30' });
  assert.deepStrictEqual(m.rangoMes('2026-12-01T03:00:00Z'), { desde: '2026-11-01', hasta: '2026-11-30' }); // 30 nov 22:00 Bogotá
  assert.deepStrictEqual(m.rangoMes('2028-02-10T12:00:00-05:00'), { desde: '2028-02-01', hasta: '2028-02-29' });
  assert.throws(() => m.rangoSemana('no-es-fecha'));
  assert.throws(() => m.rangoSemana(undefined));
});

test('progreso: primera vs última, sin comparación y aislamiento', () => {
  const s = [].concat(tres(A, 'Press banca', [[60, 10], [65, 8], [70, 5]]), tres(B, 'Press banca', [[100, 5], [120, 5], [140, 5]]));
  const r = m.progreso(s, A, 'Press banca');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.primera.mejorPeso, 60);
  assert.strictEqual(r.ultima.mejorPeso, 70);
  assert.strictEqual(r.difPeso, 10);
  assert.strictEqual(r.pctPeso, 16.7);
  assert.strictEqual(r.primera.e1rm, 80);
  assert.strictEqual(r.ultima.e1rm, 81.7);
  assert.strictEqual(r.difE1rm, 1.7);
  assert.strictEqual(m.progreso(s, B, 'Press banca').ultima.mejorPeso, 140);
  const una = m.progreso(tres(A, 'Remo', [[50, 10]]), A, 'Remo');
  assert.deepStrictEqual([una.ok, una.motivo], [false, 'sin comparación']);
  assert.strictEqual(m.progreso([], A, 'Remo').ok, false);
  assert.strictEqual(m.progreso(s, '333', 'Press banca').ok, false);
});

test('frecuenciaGrupos: días por grupo, ordenado', () => {
  const sesiones = [ses(A, 'S1', '2026-11-02', 'pecho, tríceps'), ses(A, 'S2', '2026-11-02', 'pecho'), ses(A, 'S3', '2026-11-04', 'Pecho'),
    ses(A, 'S4', '2026-11-05', 'espalda'), ses(B, 'X1', '2026-11-03', 'pierna')];
  assert.deepStrictEqual(m.frecuenciaGrupos(sesiones, A, null, null), [{ grupo: 'pecho', dias: 2 }, { grupo: 'espalda', dias: 1 }, { grupo: 'triceps', dias: 1 }]);
  assert.deepStrictEqual(m.frecuenciaGrupos(sesiones, A, '2026-11-05', '2026-11-30'), [{ grupo: 'espalda', dias: 1 }]);
  assert.deepStrictEqual(m.frecuenciaGrupos(sesiones, B, null, null), [{ grupo: 'pierna', dias: 1 }]);
  assert.deepStrictEqual(m.frecuenciaGrupos(sesiones, '333', null, null), []);
});

test('fuerzaRelativa: peso reciente, viejo, ausente y borde de 30 días', () => {
  const ahora = '2026-11-07T10:00:00-05:00';
  assert.deepStrictEqual(m.fuerzaRelativa(100, 80, '2026-10-20', ahora), { ok: true, ratio: 1.25, pesoCorporal: 80, diasDesdePeso: 18 });
  assert.strictEqual(m.fuerzaRelativa(100, 80, '2026-10-08', ahora).ok, true); // 30 días justos
  assert.deepStrictEqual(m.fuerzaRelativa(100, 80, '2026-10-07', ahora), { ok: false, motivo: 'sin peso corporal' }); // 31
  assert.strictEqual(m.fuerzaRelativa(100, '', '2026-11-01', ahora).motivo, 'sin peso corporal');
  assert.strictEqual(m.fuerzaRelativa(100, 80, '', ahora).motivo, 'sin peso corporal');
  assert.strictEqual(m.fuerzaRelativa(100, 80, '2026-12-01', ahora).ok, false); // fecha futura
  assert.strictEqual(m.fuerzaRelativa(null, 80, '2026-11-01', ahora).ok, false);
  assert.strictEqual(m.fuerzaRelativa(100, '80,5', '2026-11-01', ahora).ok, true);
});

test('filas anuladas no cuentan en ninguna métrica', () => {
  const anulada = { 'Estado registro': 'Anulado' };
  const series = [
    ser(A, 'S1', '2026-11-02', 'Press banca', 1, { 'Peso (kg)': 60, Reps: 10 }),
    ser(A, 'S1', '2026-11-02', 'Press banca', 2, Object.assign({ 'Peso (kg)': 200, Reps: 10 }, anulada)),
    ser(A, 'S9', '2026-11-03', 'Press banca', 1, { 'Peso (kg)': 150, Reps: 10 }), // su sesión está anulada
    ser(A, 'S1', '2026-11-02', 'Dominadas', 1, Object.assign({ Reps: 30, Modalidad: 'corporal', 'Peso (kg)': '' }, anulada))
  ];
  const sesiones = [ses(A, 'S1', '2026-11-02', 'pecho'), ses(A, 'S9', '2026-11-03', 'pecho', anulada), ses(A, 'S8', '2026-11-10', 'espalda', anulada)];
  assert.strictEqual(m.volumen(series, A, null, null).total, 600 + 1500);
  assert.strictEqual(m.volumen(series, A, null, null).repsCorporales, 0);
  assert.strictEqual(m.records(series, A, 'Press banca').mayorPeso.pesoKg, 150);
  assert.strictEqual(m.records(series, A, 'Dominadas').masRepsCorporal, null);
  assert.strictEqual(m.asistencia(sesiones, A, null, null).dias, 1);
  assert.strictEqual(m.ultimaSesionGrupo(sesiones, series, A, 'pecho').fecha, '2026-11-02');
  assert.strictEqual(m.ultimaSesionGrupo(sesiones, series, A, 'espalda'), null);
  assert.deepStrictEqual(m.frecuenciaGrupos(sesiones, A, null, null), [{ grupo: 'pecho', dias: 1 }]);
  const mejor = m.mejorEntrenamiento(sesiones, series, A, null, null);
  assert.strictEqual(mejor.idSesion, 'S1');
  assert.strictEqual(mejor.volumen, 600);
  assert.strictEqual(m.progreso(series.slice(0, 2), A, 'Press banca').ok, false);
  assert.strictEqual(m.estancado(series.filter((s) => s['Ejercicio'] === 'Press banca'), A, 'Press banca').motivo, 'pocas sesiones');
});

test('aislamiento entre usuarios: nada del otro aparece en ninguna función', () => {
  const sesiones = [ses(A, 'SA', '2026-11-02', 'pecho'), ses(B, 'SB', '2026-11-03', 'pierna')];
  const series = [].concat(
    tres(A, 'Press banca', [[60, 8], [60, 8], [60, 7]]),
    tres(B, 'Sentadilla', [[200, 5], [210, 5], [220, 5]]),
    [ser(B, 'SB', '2026-11-03', 'Press banca', 1, { 'Peso (kg)': 300, Reps: 3 })]
  );
  const todo = JSON.stringify([
    m.volumen(series, A, null, null), m.records(series, A, 'Press banca'), m.records(series, A, 'Sentadilla'),
    m.ultimaSesionGrupo(sesiones, series, A, 'pierna'), m.estancado(series, A, 'Sentadilla'),
    m.mejorEntrenamiento(sesiones, series, A, null, null), m.asistencia(sesiones, A, null, null),
    m.progreso(series, A, 'Sentadilla'), m.frecuenciaGrupos(sesiones, A, null, null)
  ]);
  assert.ok(!/\b(300|200|210|220|1000|1050|1100|900)\b|SB|pierna/.test(todo), todo);
  const vB = m.volumen(series, B, null, null);
  assert.ok(vB.total >= 200 * 5 + 210 * 5 + 220 * 5);
  assert.ok(!('SA' in vB.porSesion));
  assert.strictEqual(m.records(series, B, 'Press banca').mayorPeso.pesoKg, 300);
  // ID usuario numérico vs texto es el mismo usuario
  assert.strictEqual(m.asistencia([ses(111, 'Z', '2026-11-02', 'pecho')], '111', null, null).dias, 1);
  // usuario vacío o ausente: nada
  assert.strictEqual(m.asistencia(sesiones, undefined, null, null).dias, 0);
  assert.strictEqual(m.asistencia(sesiones, '', null, null).dias, 0);
});

test('entradas basura no rompen', () => {
  assert.strictEqual(m.volumen(null, A, null, null).total, 0);
  assert.strictEqual(m.volumen([null, 5, {}], A, null, null).total, 0);
  assert.deepStrictEqual(m.frecuenciaGrupos(undefined, A), []);
  assert.strictEqual(m.ultimaSesionGrupo(null, null, A, 'pecho'), null);
});
