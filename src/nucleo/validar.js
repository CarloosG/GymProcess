// Validación y normalización de un registro de entrenamiento. Nunca rellena peso/reps.
var _c_val = (typeof require === 'function') ? require('./catalogo') : { resolverEjercicio: resolverEjercicio };
var _f_val = (typeof require === 'function') ? require('./fechas') : { resolverFecha: resolverFecha };
var _u_val = (typeof require === 'function') ? require('./unidades') : { aKg: aKg, MODALIDADES: MODALIDADES };

var _LIM = { repsMin: 1, repsMax: 100, pesoMin: 0, pesoMax: 500, placaMin: 1, placaMax: 30, rpeMin: 1, rpeMax: 10, maxSeries: 30, segMin: 1, segMax: 3600 };

function _vacio(v) { return v === null || v === undefined || v === ''; }

// número o null; {error:true} si no es numérico
function _num(v) {
  if (_vacio(v)) return null;
  var n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !isFinite(n)) return { error: true };
  return n;
}

function validarRegistro(entrada, catalogo, ahora) {
  var res = { completo: false, registro: null, faltantes: [], dudas: [], errores: [] };
  // acepta directamente la salida del atajo (arreglo con ejercicioTexto)
  if (Array.isArray(entrada)) {
    entrada = { ejercicios: entrada.map(function (e) { return { nombre: e && e.ejercicioTexto, series: e && e.series }; }) };
  }
  if (!entrada || typeof entrada !== 'object' || !Array.isArray(entrada.ejercicios) || entrada.ejercicios.length === 0) {
    res.errores.push('La entrada no trae ejercicios.');
    return res;
  }

  var fechaRes = _f_val.resolverFecha(_vacio(entrada.fecha) ? null : String(entrada.fecha), ahora);
  var fecha = null;
  if (fechaRes.ok) fecha = fechaRes.fecha;
  else res.errores.push(fechaRes.motivo === 'futura' ? 'La fecha es futura: no se registran entrenamientos del futuro.' : 'No entendí la fecha.');

  var registro = { fecha: fecha, grupos: [], observaciones: null, ejercicios: [] };
  if (typeof entrada.observaciones === 'string' && entrada.observaciones.trim()) registro.observaciones = entrada.observaciones.trim();
  var porNombre = {};

  entrada.ejercicios.forEach(function (ej) {
    var nom = ej && (ej.nombre !== undefined ? ej.nombre : ej.ejercicioTexto);
    var nombreOrig = typeof nom === 'string' ? nom.trim() : '';
    if (!nombreOrig) { res.errores.push('Hay un ejercicio sin nombre.'); return; }
    var series = ej && Array.isArray(ej.series) ? ej.series : null;
    if (!series || series.length === 0) { res.errores.push('El ejercicio "' + nombreOrig + '" no trae series.'); return; }
    if (series.length > _LIM.maxSeries) { res.errores.push('El ejercicio "' + nombreOrig + '" trae más de ' + _LIM.maxSeries + ' series.'); return; }

    var r = _c_val.resolverEjercicio(nombreOrig, catalogo);
    var cat = (r.estado === 'exacto' || r.estado === 'sinonimo') ? r.ejercicio : null;
    var etiqueta = cat ? cat.ejercicio : nombreOrig;
    if (!cat) {
      res.dudas.push({ nombre: nombreOrig, candidatos: r.candidatos.map(function (c) { return c.ejercicio; }) });
    }

    var clave = cat ? 'c:' + cat.ejercicio : 'n:' + nombreOrig;
    var salida = porNombre[clave];
    if (!salida) {
      salida = {
        ejercicio: cat ? cat.ejercicio : null,
        nombreOriginal: nombreOrig,
        grupo: cat ? cat.grupo : null,
        tipo: cat ? cat.tipo : null,
        porMano: cat ? !!cat.porMano : null,
        series: []
      };
      porNombre[clave] = salida;
      registro.ejercicios.push(salida);
      if (cat && registro.grupos.indexOf(cat.grupo) === -1) registro.grupos.push(cat.grupo);
    }

    series.forEach(function (s) {
      var n = salida.series.length + 1;
      var donde = 'Ejercicio "' + etiqueta + '", serie ' + n + ': ';
      if (!s || typeof s !== 'object') { res.errores.push(donde + 'serie inválida.'); return; }
      var tipo = cat ? cat.tipo : null;
      var hayError = false;
      function err(m) { res.errores.push(donde + m); hayError = true; }
      function falta(campo) { res.faltantes.push({ ejercicio: etiqueta, serie: n, campo: campo }); }

      // modalidad
      var modalidad = _vacio(s.modalidad) ? null : String(s.modalidad).trim().toLowerCase();
      if (modalidad !== null && _u_val.MODALIDADES.indexOf(modalidad) === -1) { err('modalidad "' + s.modalidad + '" no válida.'); modalidad = null; }

      // unidad
      var unidadIn = _vacio(s.unidad) ? null : String(s.unidad).trim().toLowerCase();
      var peso = _num(s.pesoKg);
      var placa = _num(s.placa);
      var convertido = false;
      if (peso && peso.error) { err('el peso no es un número.'); peso = null; }
      if (placa && placa.error) { err('la placa no es un número.'); placa = null; }

      var unidad;
      if (unidadIn === 'placa' || (unidadIn === null && placa !== null && peso === null)) unidad = 'placa';
      else unidad = 'kg';
      if (unidadIn !== null && unidadIn !== 'placa' && unidadIn !== 'kg') {
        var conv = _u_val.aKg(peso, unidadIn);
        if (peso !== null && conv.kg !== null) { peso = conv.kg; convertido = conv.convertido; }
        else if (peso !== null) err('unidad "' + s.unidad + '" no válida.');
      }

      if (peso !== null && placa !== null) err('trae peso y placa a la vez.');
      if (peso !== null && (peso < _LIM.pesoMin || peso > _LIM.pesoMax)) err('peso fuera de rango (' + _LIM.pesoMin + '–' + _LIM.pesoMax + ' kg).');
      if (placa !== null) {
        if (!Number.isInteger(placa) || placa < _LIM.placaMin || placa > _LIM.placaMax) err('placa fuera de rango (' + _LIM.placaMin + '–' + _LIM.placaMax + ').');
      }
      if (unidad === 'placa') peso = null;

      // modalidad por defecto según el tipo del ejercicio (no se inventa si es ambigua)
      if (modalidad === null || (modalidad === 'normal' && tipo === 'peso corporal')) {
        if (tipo === 'peso corporal') {
          if (peso !== null && peso > 0 && modalidad === null) { falta('modalidad'); modalidad = null; }
          else modalidad = 'corporal';
        } else modalidad = 'normal';
      }
      if (modalidad === 'corporal' && peso !== null && peso > 0) err('modalidad corporal no lleva peso.');

      // peso requerido
      if (cat && !hayError) {
        if (unidad === 'kg' && peso === null) {
          if ((tipo === 'peso' && modalidad === 'normal') || modalidad === 'lastre' || modalidad === 'asistida') falta('pesoKg');
        }
        if (unidad === 'placa' && placa === null) falta('placa');
      }

      // reps o, en ejercicios de tipo tiempo, segundos
      var reps = null, segundos = null;
      if (tipo === 'tiempo') {
        segundos = _num(s.segundos);
        if (segundos && segundos.error) { err('los segundos no son un número.'); segundos = null; }
        else if (segundos === null) falta('segundos');
        else if (!Number.isInteger(segundos) || segundos < _LIM.segMin || segundos > _LIM.segMax) err('segundos fuera de rango (' + _LIM.segMin + '–' + _LIM.segMax + ').');
        if (!_vacio(s.reps)) err('un ejercicio de tiempo no lleva reps, usa segundos.');
      } else {
        if (!_vacio(s.segundos)) err('solo los ejercicios de tipo tiempo llevan segundos.');
        reps = _num(s.reps);
        if (reps && reps.error) { err('las reps no son un número.'); reps = null; }
        else if (reps === null) falta('reps');
        else if (!Number.isInteger(reps) || reps < _LIM.repsMin || reps > _LIM.repsMax) err('reps fuera de rango (' + _LIM.repsMin + '–' + _LIM.repsMax + ').');
      }

      // rpe
      var rpe = _num(s.rpe);
      if (rpe && rpe.error) { err('el RPE no es un número.'); rpe = null; }
      else if (rpe !== null && (rpe < _LIM.rpeMin || rpe > _LIM.rpeMax)) err('RPE fuera de rango (' + _LIM.rpeMin + '–' + _LIM.rpeMax + ').');

      var out = {
        n: n,
        unidad: unidad,
        pesoKg: peso,
        placa: unidad === 'placa' ? placa : null,
        modalidad: modalidad,
        reps: (reps !== null && !(reps && reps.error)) ? reps : null,
        segundos: (segundos !== null && !(segundos && segundos.error)) ? segundos : null,
        rpe: rpe,
        notas: (typeof s.notas === 'string' && s.notas.trim()) ? s.notas.trim() : null
      };
      if (convertido || s.convertido === true) out.convertido = true;
      salida.series.push(out);
    });
  });

  res.registro = registro;
  res.completo = res.errores.length === 0 && res.faltantes.length === 0 && res.dudas.length === 0 &&
    fecha !== null && registro.ejercicios.length > 0;
  return res;
}

if (typeof module !== 'undefined') module.exports = { validarRegistro: validarRegistro };
