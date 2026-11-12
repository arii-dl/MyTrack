/**
 * MODELO — Selectores y reglas de negocio
 * Funciones puras que derivan información a partir del plan/cursada: nunca
 * mutan datos ni acceden al DOM. Reciben el `plan` (o la entidad puntual)
 * como parámetro explícito para no depender de estado global.
 */
(function (App) {
  'use strict';

  App.Model = App.Model || {};
  const M = App.Model;

  // -- Cursadas ----------------------------------------------------------------
  function obtenerCursadaActual(m) {
    return m.cursadas.find(c => c.id === m.cursadaActualId) || m.cursadas[m.cursadas.length - 1];
  }
  function obtenerCursadaPorId(m, cid) {
    if (!cid) return obtenerCursadaActual(m);
    return m.cursadas.find(c => c.id === cid) || obtenerCursadaActual(m);
  }

  // -- Parciales y recuperatorios -----------------------------------------------
  // Los parciales viven en un array: los índices 0 y 1 son los fijos (p1, p2);
  // el resto son opcionales y se agregan dinámicamente (p3, p4, ...).
  function clavesParciales(cursada) {
    return cursada.parciales.map((p, i) => 'p' + (i + 1));
  }
  function obtenerParcialPorClave(cursada, key) {
    const idx = parseInt(key.slice(1), 10) - 1;
    return cursada.parciales[idx];
  }
  function etiquetaParcial(key) {
    return parseInt(key.slice(1), 10) + 'º Parcial';
  }
  function notaEfectivaParcial(parcial) {
    if (!parcial) return null;
    if (parcial.recuperatorio && parcial.recuperatorio.nota != null && parcial.recuperatorio.nota !== '') {
      return Number(parcial.recuperatorio.nota);
    }
    if (parcial.nota != null && parcial.nota !== '') return Number(parcial.nota);
    return null;
  }

  // Un recuperatorio solo se habilita cuando el parcial fue rendido y desaprobado (nota < 4).
  function recuperatorioHabilitado(parcial) {
    if (!parcial) return false;
    if (parcial.nota == null || parcial.nota === '') return false;
    return Number(parcial.nota) < 4;
  }

  function calcularPromedioParciales(cursada) {
    const notas = cursada.parciales.map(p => notaEfectivaParcial(p)).filter(n => n !== null && !isNaN(n));
    if (!notas.length) return null;
    return notas.reduce((a, b) => a + b, 0) / notas.length;
  }

  // -- Final y cierre de cursada -------------------------------------------------
  // El final se puede recuperar hasta 3 veces: vale la nota del último
  // recuperatorio rendido; si no hubo ninguno, la del final.
  function notaFinalEfectiva(cursada) {
    const f = cursada.final;
    if (!f) return null;
    const recs = Array.isArray(f.recuperatorios) ? f.recuperatorios : [];
    for (let i = recs.length - 1; i >= 0; i--) {
      const r = recs[i];
      if (r && r.nota != null && r.nota !== '') return Number(r.nota);
    }
    if (f.nota != null && f.nota !== '') return Number(f.nota);
    return null;
  }

  // La nota de cierre manual (pestaña General) tiene prioridad sobre la nota
  // calculada a partir del proceso de Final, ya que es la que el usuario
  // define explícitamente como cierre de la cursada.
  function notaCierreEfectiva(cursada) {
    if (cursada.notaCierre != null && cursada.notaCierre !== '') return Number(cursada.notaCierre);
    return notaFinalEfectiva(cursada);
  }
  function fechaCierreEfectiva(cursada) {
    return cursada.fechaCierre || (cursada.final ? cursada.final.fecha : '') || '';
  }

  function estadoFinalDescriptivo(cursada) {
    const f = cursada.final;
    if (f.modalidad === 'promocion') return { texto: 'Promocionada', clase: 'aprobada' };
    if (f.modalidad === 'pendiente') return { texto: 'Sin Rendir', clase: 'pendiente' };
    if (f.estado === 'Aprobado') return { texto: 'Final Aprobado', clase: 'aprobada' };
    if (f.estado === 'Desaprobado') {
      const recs = Array.isArray(f.recuperatorios) ? f.recuperatorios : [];
      const rec = recs[recs.length - 1];
      if (rec && rec.nota != null && rec.nota !== '') {
        return Number(rec.nota) >= 4
          ? { texto: 'Recuperatorio de Final Aprobado', clase: 'aprobada' }
          : { texto: 'Recuperatorio de Final Desaprobado', clase: 'desaprobada' };
      }
      return { texto: 'A Recuperatorio de Final', clase: 'cursando' };
    }
    return { texto: 'Requiere Final', clase: 'pendiente' };
  }

  // -- Plan de estudios (créditos, niveles, correlativas) ------------------------
  function obtenerCreditosTotales(plan) {
    return plan.materias.filter(m => m.estado === 'Aprobada').reduce((acc, m) => acc + Number(m.creditos), 0);
  }

  function nivelesUnicos(plan) {
    const set = [];
    plan.materias.forEach(m => { if (m.nivel && !set.includes(m.nivel)) set.push(m.nivel); });
    return set;
  }

  function evaluarHabilitacion(plan, materia) {
    const creditosActuales = obtenerCreditosTotales(plan);
    if (materia.reqCreds > 0 && creditosActuales < materia.reqCreds) {
      return { habilitada: false, razon: `Requiere ${materia.reqCreds} créditos acumulados (tenés ${creditosActuales})` };
    }
    const faltantes = (materia.req || [])
      .map(id => plan.materias.find(m => m.id === id))
      .filter(m => m && m.estado !== 'Aprobada');
    if (faltantes.length > 0) {
      return { habilitada: false, razon: `Correlativas pendientes: ${faltantes.map(m => m.nombre).join(', ')}` };
    }
    return { habilitada: true, razon: '' };
  }

  // -- Título del plan ----------------------------------------------------------
  // Deriva un título legible para la página principal a partir de la carrera y
  // la facultad cargadas en Inicio. Si falta uno de los dos datos, arma el
  // título con el que esté disponible; si no hay ninguno, devuelve ''.
  function construirTitulo(carrera, facultad) {
    const c = (carrera || '').trim();
    const f = (facultad || '').trim();
    if (c && f) return `${c} — ${f}`;
    return c || f || '';
  }

  M.obtenerCursadaActual = obtenerCursadaActual;
  M.obtenerCursadaPorId = obtenerCursadaPorId;
  M.clavesParciales = clavesParciales;
  M.obtenerParcialPorClave = obtenerParcialPorClave;
  M.etiquetaParcial = etiquetaParcial;
  M.notaEfectivaParcial = notaEfectivaParcial;
  M.recuperatorioHabilitado = recuperatorioHabilitado;
  M.calcularPromedioParciales = calcularPromedioParciales;
  M.notaFinalEfectiva = notaFinalEfectiva;
  M.notaCierreEfectiva = notaCierreEfectiva;
  M.fechaCierreEfectiva = fechaCierreEfectiva;
  M.estadoFinalDescriptivo = estadoFinalDescriptivo;
  M.obtenerCreditosTotales = obtenerCreditosTotales;
  M.nivelesUnicos = nivelesUnicos;
  M.evaluarHabilitacion = evaluarHabilitacion;
  M.construirTitulo = construirTitulo;
})(window.App = window.App || {});
