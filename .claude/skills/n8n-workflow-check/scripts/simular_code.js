#!/usr/bin/env node
// Simula un nodo Code de n8n (JavaScript) con datos de prueba, sin n8n.
//
// Uso:
//   node simular_code.js FLUJO.json "Nombre del nodo" CASOS.json [--ver]
//   node simular_code.js FLUJO.json "Nombre del nodo" --plantilla      (genera un CASOS.json de ejemplo)
//
// CASOS.json = lista de casos, que corren EN ORDEN y comparten $getWorkflowStaticData (para probar duplicados):
// [
//   {
//     "nombre": "gasto válido",
//     "tipo": "valido" | "invalido" | "duplicado",          // solo para el informe
//     "entrada": [{ "message": { "text": "Abono de 50.000 de Laura por Nequi" } }],   // items de $input (solo el json)
//     "nodos":   { "Config": [{ "chatId": "123456789" }] },                // salida de otros nodos para $('Nodo')
//     "ejecucion": "1234",                                   // $execution.id (por defecto 1000 + n.º de caso)
//     "ahora": "2026-10-03T10:15:00",                       // hora de Bogotá para $now, DateTime.now() y new Date()
//     "espera": {
//       "error": false,                                      // true, o un texto que debe contener el error
//       "cantidad": 1,                                       // n.º de items de salida
//       "salida": [{ "tipo": "gasto", "monto": 50000 }],     // coincidencia parcial con los items de salida
//       "contiene": ["!C5"],                                 // textos que deben aparecer en la salida
//       "no_contiene": ["undefined", "NaN"]                  // textos que no deben aparecer en la salida
//     }
//   }
// ]
// En "entrada" y "nodos" se puede poner "@archivo.json" para cargar datos desde un archivo (ruta relativa a CASOS.json).
//
// Limitaciones: no llama a Telegram, Sheets ni Gemini; this.helpers.httpRequest falla a propósito.
// $('Nodo').item devuelve el item con el mismo índice (n8n usa pairedItem; casi siempre coincide).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let luxon;
try {
  luxon = require(path.join(__dirname, '..', 'node_modules', 'luxon'));
} catch (e) {
  console.error('Falta Luxon. Ejecute una vez:  npm install --prefix "' + path.join(__dirname, '..') + '"');
  process.exit(2);
}
const { DateTime, Duration, Interval, Settings } = luxon;
const ZONA = 'America/Bogota';
Settings.defaultZone = ZONA;

const args = process.argv.slice(2);
const ver = args.includes('--ver');
const plantilla = args.includes('--plantilla');
const [rutaFlujo, nombreNodo, rutaCasos] = args.filter((a) => !a.startsWith('--'));
if (!rutaFlujo || !nombreNodo || (!rutaCasos && !plantilla)) {
  console.error('Uso: node simular_code.js FLUJO.json "Nodo" CASOS.json [--ver] | --plantilla');
  process.exit(2);
}

const flujo = JSON.parse(fs.readFileSync(rutaFlujo, 'utf8'));
const nodo = flujo.nodes.find((n) => n.name === nombreNodo);
if (!nodo) {
  console.error(`No existe el nodo "${nombreNodo}". Nodos Code: ` +
    flujo.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => n.name).join(', '));
  process.exit(2);
}
if (nodo.type !== 'n8n-nodes-base.code') {
  console.error(`"${nombreNodo}" es ${nodo.type}, no un nodo Code.`);
  process.exit(2);
}
const p = nodo.parameters || {};
if ((p.language || 'javaScript') !== 'javaScript') {
  console.error('Solo se simulan nodos Code en JavaScript.');
  process.exit(2);
}
const codigo = p.jsCode || '';
const porItem = p.mode === 'runOnceForEachItem';
const referencias = [...new Set([...codigo.matchAll(/\$\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]))];

if (plantilla) {
  const ej = {
    nombre: 'caso válido',
    tipo: 'valido',
    entrada: [{}],
    nodos: Object.fromEntries(referencias.map((r) => [r, [{}]])),
    ahora: DateTime.now().setZone(ZONA).toFormat("yyyy-MM-dd'T'HH:mm:ss"),
    espera: { error: false, cantidad: 1, salida: [{}], no_contiene: ['undefined', 'NaN'] },
  };
  const dup = { ...ej, nombre: 'mismo mensaje repetido', tipo: 'duplicado' };
  const inv = { ...ej, nombre: 'entrada vacía o inválida', tipo: 'invalido', entrada: [{}] };
  console.log(JSON.stringify([ej, inv, dup], null, 2));
  console.error(`Modo: ${porItem ? 'una vez por item' : 'una vez para todos'}. Nodos que lee: ${referencias.join(', ') || '(ninguno)'}`);
  process.exit(0);
}

const dirCasos = path.dirname(path.resolve(rutaCasos));
const cargar = (v) => (typeof v === 'string' && v.startsWith('@')
  ? JSON.parse(fs.readFileSync(path.resolve(dirCasos, v.slice(1)), 'utf8')) : v);
const casos = JSON.parse(fs.readFileSync(rutaCasos, 'utf8'));
const estatico = { global: {}, node: {} };

const aItems = (lista) => (lista || []).map((j) => (j && j.json && Object.keys(j).every((k) => ['json', 'binary', 'pairedItem'].includes(k)) ? j : { json: j }));

function relojFijo(ms) {
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(ms); else super(...a); }
    static now() { return ms; }
  }
  return FakeDate;
}

function coincide(real, esperado) {
  if (esperado === null || typeof esperado !== 'object') return real === esperado;
  if (Array.isArray(esperado)) return Array.isArray(real) && esperado.every((e, i) => coincide(real[i], e));
  return real && typeof real === 'object' && Object.keys(esperado).every((k) => coincide(real[k], esperado[k]));
}

async function correr(caso, i) {
  const entrada = aItems(cargar(caso.entrada) || [{}]);
  const otros = Object.fromEntries(Object.entries(caso.nodos || {}).map(([k, v]) => [k, aItems(cargar(v))]));
  const faltan = referencias.filter((r) => !(r in otros));
  const ahoraDT = caso.ahora ? DateTime.fromISO(caso.ahora, { zone: ZONA }) : DateTime.now().setZone(ZONA);
  if (!ahoraDT.isValid) throw new Error(`"ahora" inválido: ${caso.ahora}`);
  const ms = ahoraDT.toMillis();
  Settings.now = () => ms;

  const logs = [];
  const nodoRef = (nombre, idx) => {
    if (!(nombre in otros)) throw new Error(`Referenced node doesn't exist or has not run: '${nombre}' (agréguelo en "nodos")`);
    const its = otros[nombre];
    return {
      all: () => its, first: () => its[0], last: () => its[its.length - 1],
      get item() { return its[Math.min(idx, its.length - 1)]; },
      itemMatching: (k) => its[Math.min(k, its.length - 1)], isExecuted: true,
    };
  };
  const base = (idx) => ({
    $input: {
      all: () => entrada, first: () => entrada[0], last: () => entrada[entrada.length - 1],
      get item() { return entrada[idx]; },
    },
    $: (n) => nodoRef(n, idx),
    $json: entrada[idx] ? entrada[idx].json : {},
    $binary: entrada[idx] ? entrada[idx].binary || {} : {},
    $execution: { id: String(caso.ejecucion || 1000 + i), mode: 'production', resumeUrl: '' },
    $workflow: { id: flujo.id || 'sim', name: flujo.name, active: true },
    $now: ahoraDT, $today: ahoraDT.startOf('day'),
    $getWorkflowStaticData: (t) => (t === 'node' ? estatico.node : estatico.global),
    $vars: {}, $env: new Proxy({}, { get() { throw new Error('access to env vars denied'); } }),
    $jmespath: () => { throw new Error('$jmespath no está simulado'); },
    DateTime, Duration, Interval, luxon,
    Date: relojFijo(ms),
    console: { log: (...a) => logs.push(a.map(String).join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
    require: (m) => { if (m === 'luxon') return luxon; throw new Error(`require('${m}') no permitido en n8n`); },
    helpers: { httpRequest: () => { throw new Error('this.helpers.httpRequest no se ejecuta en la simulación'); } },
  });

  const ejecutar = async (idx) => {
    const ctx = base(idx);
    if (porItem) ctx.$input.item = entrada[idx];
    const fn = vm.runInNewContext('(async function () {\n' + codigo + '\n})', { ...ctx, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, Promise, Set, Map, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent, escape, unescape, Buffer }, { filename: nombreNodo, timeout: 5000 });
    return fn.call({ helpers: ctx.helpers, getWorkflowStaticData: ctx.$getWorkflowStaticData });
  };

  let salida;
  if (porItem) {
    salida = [];
    for (let k = 0; k < entrada.length; k++) {
      const r = await ejecutar(k);
      if (r !== undefined && r !== null) salida.push(r.json ? r : { json: r });
    }
  } else {
    salida = await ejecutar(0);
  }
  if (!Array.isArray(salida)) throw new Error('El código debe devolver una lista de items: return [{ json: {...} }]');
  salida = salida.map((x) => (x && x.json ? x : { json: x }));
  return { salida, logs, faltan };
}

(async () => {
  let fallidos = 0;
  console.log(`Simulando "${nombreNodo}" (${porItem ? 'una vez por item' : 'una vez para todos'}) — ${casos.length} casos\n`);
  for (let i = 0; i < casos.length; i++) {
    const c = casos[i];
    const e = c.espera || {};
    const etiqueta = `${i + 1}. [${c.tipo || 'caso'}] ${c.nombre || ''}`;
    const problemas = [];
    let res = null;
    let error = null;
    try { res = await correr(c, i); } catch (err) { error = err; }
    if (error) {
      if (!e.error) problemas.push('falló: ' + error.message);
      else if (typeof e.error === 'string' && !String(error.message).includes(e.error)) problemas.push(`error distinto: ${error.message}`);
    } else {
      const jsons = res.salida.map((x) => x.json);
      const texto = JSON.stringify(jsons);
      if (e.error) problemas.push('se esperaba un error y terminó bien');
      if (e.cantidad !== undefined && jsons.length !== e.cantidad) problemas.push(`devolvió ${jsons.length} items (esperado ${e.cantidad})`);
      if (e.salida && !coincide(jsons, e.salida)) problemas.push('la salida no coincide con "espera.salida"');
      for (const t of e.contiene || []) if (!texto.includes(t)) problemas.push(`la salida no contiene "${t}"`);
      for (const t of e.no_contiene || []) if (texto.includes(t)) problemas.push(`la salida contiene "${t}"`);
    }
    if (problemas.length) fallidos++;
    console.log(`${problemas.length ? '❌' : '✅'} ${etiqueta}`);
    problemas.forEach((pb) => console.log('     - ' + pb));
    if (res && res.faltan.length) console.log(`     (nodos no provistos, solo fallan si se usan: ${res.faltan.join(', ')})`);
    if (res && (ver || problemas.length)) {
      const s = JSON.stringify(res.salida.map((x) => x.json), null, 1);
      console.log('     salida: ' + (s.length > 1500 ? s.slice(0, 1500) + ' …' : s).replace(/\n/g, '\n     '));
      if (res.logs.length) console.log('     console.log: ' + res.logs.join(' | ').slice(0, 500));
    }
  }
  console.log(`\nResultado: ${casos.length - fallidos}/${casos.length} casos correctos`);
  console.log('Recordatorio: esto simula el código del nodo; no prueba Telegram, Sheets ni Gemini dentro de n8n.');
  process.exit(fallidos ? 1 : 0);
})();
