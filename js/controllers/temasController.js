/**
 * CONTROLADOR — Checklist de temas
 * Estas acciones se aplican al instante (no esperan al "Guardar Cambios"
 * del formulario), por lo que primero sincronizan cualquier campo simple
 * sin guardar de la cursada abierta para no perder información.
 */
(function (App) {
  'use strict';

  App.Controller = App.Controller || {};
  const C = App.Controller;
  const M = App.Model;
  const V = App.View;

  function obtenerDestinoTemas(materiaId, cursadaId, key, esRec) {
    const m = C.state.plan.materias.find(x => x.id === materiaId);
    if (!m) return null;
    const cur = M.obtenerCursadaPorId(m, cursadaId);
    C.sincronizarFormularioDetalle(cur);
    const parcial = M.obtenerParcialPorClave(cur, key);
    return esRec ? parcial.recuperatorio : parcial;
  }

  // Persiste el plan sin re-renderizar el modal (la actualización del DOM se
  // hace en el lugar, para que tocar temas o el 3er parcial no haga parpadeo).
  function persistir() {
    M.guardarPlanes(C.state.planes, C.state.planActualId);
  }

  C.agregarTema = function (materiaId, cursadaId, key, esRec) {
    const inputId = `nuevo-tema-${key}${esRec ? 'r' : ''}`;
    const input = document.getElementById(inputId);
    const texto = input ? input.value.trim() : '';
    if (!texto) return;
    const destino = obtenerDestinoTemas(materiaId, cursadaId, key, esRec);
    if (!destino) return;
    const t = M.crearTemaVacio(texto);
    destino.temas.push(t);
    const checklist = input.closest('.temas-checklist');
    if (checklist) {
      const empty = checklist.querySelector('.temas-empty');
      if (empty) empty.remove();
      const addRow = checklist.querySelector('.tema-add-row');
      if (addRow) addRow.insertAdjacentHTML('beforebegin', V.renderTemaItem(materiaId, cursadaId, key, esRec, t));
      input.value = '';
      input.focus();
    }
    persistir();
  };

  C.cicloEstadoTema = function (materiaId, cursadaId, key, esRec, temaId) {
    const destino = obtenerDestinoTemas(materiaId, cursadaId, key, esRec);
    if (!destino) return;
    const tema = destino.temas.find(t => t.id === temaId);
    if (!tema) return;
    const orden = ['falta', 'repasar', 'estudiado'];
    tema.estado = orden[(orden.indexOf(tema.estado) + 1) % orden.length];
    const btn = document.getElementById('tema-btn-' + temaId);
    if (btn) {
      const info = V.ESTADO_TEMA_INFO[tema.estado] || V.ESTADO_TEMA_INFO.falta;
      btn.className = 'tema-estado-btn ' + info.clase;
      btn.textContent = info.label;
    }
    persistir();
  };

  C.eliminarTema = function (materiaId, cursadaId, key, esRec, temaId) {
    const destino = obtenerDestinoTemas(materiaId, cursadaId, key, esRec);
    if (!destino) return;
    destino.temas = destino.temas.filter(t => t.id !== temaId);
    const row = document.getElementById('tema-item-' + temaId);
    if (row) {
      const checklist = row.closest('.temas-checklist');
      row.remove();
      if (checklist && !checklist.querySelector('.tema-item')) {
        const addRow = checklist.querySelector('.tema-add-row');
        if (addRow) addRow.insertAdjacentHTML('beforebegin', '<div class="temas-empty">Todavía no se cargaron temas.</div>');
      }
    }
    persistir();
  };

})(window.App = window.App || {});
