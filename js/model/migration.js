/**
 * MODELO — Migración y normalización
 * Convierte datos guardados con versiones anteriores del modelo (formato
 * plano v4, o v5 con temas en texto libre) al formato vigente, sin perder
 * información. Se ejecuta automáticamente al cargar el plan.
 */
(function (App) {
  'use strict';

  App.Model = App.Model || {};
  const M = App.Model;

  // -- v4 (formato plano, una sola cursada por materia) -> cursadas ----------
  function migrarMateriaLegacy(mOld) {
    const c = M.crearCursadaVacia(1);
    c.estado = mOld.estado || 'Pendiente';
    c.observaciones = mOld.avances || '';
    c.fechaInicio = '';

    c.parciales = [];
    ['p1', 'p2', 'p3'].forEach(k => {
      const p = M.crearParcialVacio();
      const kU = k.toUpperCase();
      p.fecha = mOld['fecha' + kU] || '';
      const temasTexto = (mOld['notas' + kU] || '').trim();
      p.temas = temasTexto ? [M.crearTemaVacio(temasTexto)] : [];
      p.nota = (mOld[k] != null && mOld[k] !== '') ? Number(mOld[k]) : null;
      const rk = 'rec' + k.slice(1);
      const rkU = rk.toUpperCase();
      p.recuperatorio.fecha = mOld['fecha' + rkU] || '';
      const temasRecTexto = (mOld['notas' + rkU] || '').trim();
      p.recuperatorio.temas = temasRecTexto ? [M.crearTemaVacio(temasRecTexto)] : [];
      p.recuperatorio.nota = (mOld[rk] != null && mOld[rk] !== '') ? Number(mOld[rk]) : null;
      if (k === 'p3' && !(p.fecha || p.nota != null || p.temas.length || p.recuperatorio.fecha || p.recuperatorio.nota != null || p.recuperatorio.temas.length)) return;
      c.parciales.push(p);
    });
    while (c.parciales.length < 2) c.parciales.push(M.crearParcialVacio());

    const finalNota = (mOld.finalNota != null && mOld.finalNota !== '') ? Number(mOld.finalNota) : null;
    const notaCierreLegacy = (mOld.notaCierre != null && mOld.notaCierre !== '') ? Number(mOld.notaCierre) : null;
    if (finalNota != null) {
      c.final.modalidad = 'final';
      c.final.nota = finalNota;
      c.final.fecha = mOld.fechaCierre || '';
      c.final.estado = finalNota >= 4 ? 'Aprobado' : 'Desaprobado';
      c.notaCierre = finalNota;
      c.fechaCierre = mOld.fechaCierre || '';
    } else if (notaCierreLegacy != null) {
      c.final.modalidad = 'promocion';
      c.final.nota = notaCierreLegacy;
      c.final.fecha = mOld.fechaCierre || '';
      c.final.estado = 'Aprobado';
      c.notaCierre = notaCierreLegacy;
      c.fechaCierre = mOld.fechaCierre || '';
    } else {
      c.final.modalidad = 'pendiente';
      c.final.estado = 'Sin Rendir';
    }

    return {
      id: mOld.id, nombre: mOld.nombre, nivel: mOld.nivel, creditos: mOld.creditos,
      req: mOld.req || [], reqCreds: mOld.reqCreds || 0,
      estado: mOld.estado || 'Pendiente',
      cursadaActualId: c.id,
      cursadas: [c]
    };
  }

  function materiaNecesitaMigracion(materia) {
    return !materia.cursadas || !Array.isArray(materia.cursadas) || !materia.cursadaActualId;
  }

  // Convierte una cursada al formato vigente sin importar de qué versión de
  // almacenamiento provenga (v4 ya migrada a v5, o v5 con temas en texto plano).
  function normalizarParcial(p) {
    if (!p) return M.crearParcialVacio();
    if (typeof p.temas === 'string') {
      const texto = p.temas.trim();
      p.temas = texto ? [M.crearTemaVacio(texto)] : [];
    } else if (!Array.isArray(p.temas)) {
      p.temas = [];
    }
    delete p.observaciones;
    if (!p.recuperatorio) p.recuperatorio = { fecha: '', temas: [], nota: null };
    if (typeof p.recuperatorio.temas === 'string') {
      const texto = p.recuperatorio.temas.trim();
      p.recuperatorio.temas = texto ? [M.crearTemaVacio(texto)] : [];
    } else if (!Array.isArray(p.recuperatorio.temas)) {
      p.recuperatorio.temas = [];
    }
    delete p.recuperatorio.observaciones;
    return p;
  }

  function normalizarCursada(c) {
    if (typeof c.observaciones !== 'string') c.observaciones = c.bitacoraGeneral || '';
    delete c.bitacoraGeneral;
    delete c.porcentajeAvance;
    if (c.notaCierre === undefined) c.notaCierre = null;
    if (c.fechaCierre === undefined) c.fechaCierre = '';
    if (!Array.isArray(c.parciales)) {
      const old = c.parciales || {};
      c.parciales = [];
      ['p1', 'p2', 'p3'].forEach(k => { if (old[k]) c.parciales.push(normalizarParcial(old[k])); });
      while (c.parciales.length < 2) c.parciales.push(M.crearParcialVacio());
    }
    c.parciales = c.parciales.map(normalizarParcial);
    delete c.tieneTercerParcial;
    if (!c.final) c.final = { modalidad: 'pendiente', estado: 'Sin Rendir', fecha: '', nota: null, observaciones: '', recuperatorios: [] };
    if (c.final.recuperatorio && !Array.isArray(c.final.recuperatorios)) {
      c.final.recuperatorios = [c.final.recuperatorio];
    }
    delete c.final.recuperatorio;
    if (!Array.isArray(c.final.recuperatorios)) c.final.recuperatorios = [];
    return c;
  }

  function normalizarPlan(planCrudo) {
    planCrudo.materias = (planCrudo.materias || []).map(m => materiaNecesitaMigracion(m) ? migrarMateriaLegacy(m) : m);
    planCrudo.materias.forEach(m => { m.cursadas = m.cursadas.map(normalizarCursada); });
    if (typeof planCrudo.carrera !== 'string') planCrudo.carrera = '';
    if (typeof planCrudo.facultad !== 'string') planCrudo.facultad = '';
    if (planCrudo.foto && typeof planCrudo.foto !== 'string') delete planCrudo.foto; // foto opcional (data URL)
    if (!planCrudo.id) planCrudo.id = M.uid('plan');
    return planCrudo;
  }

  // Valida la forma de la colección completa de carreras: normaliza cada
  // plan, se asegura de que todos tengan id, y de que `planActualId` señale
  // a uno que realmente exista. Si la colección viene vacía (no debería
  // pasar en uso normal, pero cubre el caso de datos corruptos), cae de
  // nuevo a la semilla en vez de dejar la app sin ninguna carrera.
  function normalizarColeccion(coleccionCruda) {
    let planes = Array.isArray(coleccionCruda && coleccionCruda.planes) ? coleccionCruda.planes.map(normalizarPlan) : [];
    if (!planes.length) planes = [JSON.parse(JSON.stringify(M.planSemilla))];

    let planActualId = coleccionCruda && coleccionCruda.planActualId;
    if (!planActualId || !planes.some(p => p.id === planActualId)) planActualId = planes[0].id;

    return { planes, planActualId };
  }

  M.migrarMateriaLegacy = migrarMateriaLegacy;
  M.materiaNecesitaMigracion = materiaNecesitaMigracion;
  M.normalizarParcial = normalizarParcial;
  M.normalizarCursada = normalizarCursada;
  M.normalizarPlan = normalizarPlan;
  M.normalizarColeccion = normalizarColeccion;

})(window.App = window.App || {});
