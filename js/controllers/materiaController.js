/**
 * CONTROLADOR — Acciones sobre materias
 * Maneja los envíos de formularios (crear/editar materia, guardar el
 * detalle de una cursada), eliminar, recursar e importar desde PDF.
 */
(function (App) {
  'use strict';

  App.Controller = App.Controller || {};
  const C = App.Controller;
  const M = App.Model;

  C.nuevaMateria = function () {
    C.state.tempReqs = [];
    C.abrirModal({ tipo: 'nueva' });
  };

  C.editarForm = function (id) {
    const m = C.state.plan.materias.find(x => x.id === id);
    C.state.tempReqs = m ? [...(m.req || [])] : [];
    C.abrirModal({ tipo: 'editar', id });
  };

  C.guardarMateriaForm = async function (e, idEditar) {
    e.preventDefault();
    const f = e.target;
    const plan = C.state.plan;
    const nombre = C.campoForm(f, 'nombre').trim();
    const nivel = C.campoForm(f, 'nivel').trim();
    const creditos = Number(C.campoForm(f, 'creditos'));
    const reqCreds = Number(C.campoForm(f, 'reqCreds') || 0);

    if (idEditar) {
      const m = plan.materias.find(x => x.id === idEditar);
      Object.assign(m, { nombre, nivel, creditos, reqCreds, req: C.state.tempReqs || [] });
    } else {
      plan.materias.push(M.crearMateriaBase({ nombre, nivel, creditos, reqCreds, req: C.state.tempReqs || [] }));
    }
    C.cerrarModal();
    await M.guardarPlanes(C.state.planes, C.state.planActualId);
    C.render();
  };

  C.guardarDetalleMateria = async function (e, materiaId, cursadaId) {
    e.preventDefault();
    const f = e.target;
    const plan = C.state.plan;
    const m = plan.materias.find(x => x.id === materiaId);
    if (!m) return;
    const cur = M.obtenerCursadaPorId(m, cursadaId);
    const val = nombre => C.campoForm(f, nombre);

    cur.estado = val('estado');
    cur.notaCierre = val('notaCierre') !== '' ? Number(val('notaCierre')) : null;
    cur.fechaCierre = val('fechaCierre') || '';
    cur.observaciones = val('observaciones') || '';

    // El temario (checklist) se administra aparte con acciones inmediatas,
    // por lo que acá solo se preserva tal cual está en `cur`.
    const leerParcial = key => {
      const p = M.obtenerParcialPorClave(cur, key);
      return {
        fecha: val(key + '_fecha') || '',
        temas: p.temas,
        nota: val(key + '_nota') !== '' ? Number(val(key + '_nota')) : null,
        recuperatorio: {
          fecha: val(key + 'r_fecha') || '',
          temas: p.recuperatorio.temas,
          nota: val(key + 'r_nota') !== '' ? Number(val(key + 'r_nota')) : null
        }
      };
    };

    M.clavesParciales(cur).forEach(k => {
      cur.parciales[Number(k.slice(1)) - 1] = leerParcial(k);
    });

    const modalidad = val('final_modalidad');
    cur.final.modalidad = modalidad;
    if (modalidad === 'promocion') {
      cur.final.estado = 'Aprobado';
      cur.final.nota = val('final_nota_promocion') !== '' ? Number(val('final_nota_promocion')) : null;
      cur.final.fecha = val('final_fecha_promocion') || '';
      cur.final.observaciones = val('final_obs_promocion') || '';
      cur.final.recuperatorios = [];
    } else if (modalidad === 'final' || modalidad === 'finalO') {
      const subEstado = val('final_sub_estado');
      cur.final.estado = subEstado === 'aprobado' ? 'Aprobado' : (subEstado === 'desaprobado' ? 'Desaprobado' : 'Sin Rendir');
      cur.final.fecha = val('final_fecha') || '';
      cur.final.nota = val('final_nota') !== '' ? Number(val('final_nota')) : null;
      cur.final.observaciones = val('final_obs') || '';
      cur.final.recuperatorios = [1, 2, 3].map(n => ({
        fecha: val('finalr_' + n + '_fecha') || '',
        nota: val('finalr_' + n + '_nota') !== '' ? Number(val('finalr_' + n + '_nota')) : null,
        observaciones: val('finalr_' + n + '_obs') || ''
      }));
    } else {
      cur.final.estado = 'Sin Rendir';
      cur.final.nota = null;
      cur.final.fecha = '';
      cur.final.observaciones = '';
      cur.final.recuperatorios = [];
    }

    // La materia global solo se sincroniza con el estado de la cursada VIGENTE
    if (cur.id === m.cursadaActualId) m.estado = cur.estado;

    C.cerrarModal();
    await M.guardarPlanes(C.state.planes, C.state.planActualId);
    C.render();
  };

  C.eliminar = async function (id) {
    if (!confirm('¿Eliminar esta materia del plan? Se perderá todo su historial de cursadas.')) return;
    const plan = C.state.plan;
    plan.materias = plan.materias.filter(x => x.id !== id);
    plan.materias.forEach(x => { x.req = (x.req || []).filter(r => r !== id); });
    C.cerrarModal();
    await M.guardarPlanes(C.state.planes, C.state.planActualId);
    C.render();
  };

  C.recursar = async function (materiaId) {
    const m = C.state.plan.materias.find(x => x.id === materiaId);
    if (!m) return;
    const ok = confirm('¿Iniciar una recursada de esta materia?\n\nSe conservará todo el historial de la cursada actual (parciales, recuperatorios, final y observaciones) y se creará una nueva cursada en blanco para registrar el nuevo intento.');
    if (!ok) return;
    C.sincronizarFormularioDetalle(M.obtenerCursadaPorId(m, C.state.modalEstado.cursadaId));
    const nueva = M.crearCursadaVacia(m.cursadas.length + 1);
    m.cursadas.push(nueva);
    m.cursadaActualId = nueva.id;
    m.estado = nueva.estado;
    C.state.modalEstado.cursadaId = null;
    C.state.tabActivaModal = 'estado';
    await C.guardarPlanYRenderizar();
  };

  // Intenta reconocer un listado real de materias en el PDF que subió el
  // usuario (ver M.extraerMateriasDePdf). Si no se pudo reconocer nada con
  // confianza suficiente —el formato de los planes de estudio varía mucho
  // entre facultades—, nunca sustituye en silencio con datos de otro plan:
  // se lo explica al usuario y, si quiere, le ofrece el catálogo de
  // ejemplo como algo aparte, claramente identificado como tal.
  C.procesarPDF = async function (file) {
    try {
      const reconocidas = await M.extraerMateriasDePdf(file);
      if (reconocidas && reconocidas.length > 0) {
        if (confirm(`Se reconocieron ${reconocidas.length} materias en el PDF. ¿Reemplazar las materias del plan actual con estas?`)) {
          C.state.plan.materias = reconocidas;
          await C.guardarPlanYRenderizar();
        }
        return;
      }
      const usarEjemplo = confirm(
        'No pudimos reconocer automáticamente un listado de materias en este PDF ' +
        '(el formato de los planes de estudio varía mucho entre facultades).\n\n' +
        'Podés cargar las materias a mano, o aceptar para cargar un plan de ' +
        'ejemplo (Ingeniería Informática) solo para explorar cómo funciona la app.'
      );
      if (usarEjemplo) {
        C.state.plan.materias = M.materiasDeEjemplo();
        await C.guardarPlanYRenderizar();
      }
    } catch (e) {
      alert('Error al leer el PDF: ' + e.message);
    }
  };

})(window.App = window.App || {});
