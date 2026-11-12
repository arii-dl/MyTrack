/**
 * VISTA — Modal de crear/editar materia
 * Formulario simple con buscador de correlativas. `state.tempReqs` contiene
 * el borrador de correlativas seleccionadas mientras el modal está abierto
 * (lo inicializa el controlador al abrir el modal, no esta vista).
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;

  V.renderModalForm = function (state) {
    const plan = state.plan;
    const editando = state.modalEstado.tipo === 'editar';
    const m = editando ? plan.materias.find(x => x.id === state.modalEstado.id) : null;
    const tempReqs = state.tempReqs || [];

    const otrasMaterias = plan.materias.filter(x => x.id !== (m ? m.id : ''));
    const correlativasSeleccionadas = otrasMaterias.filter(x => tempReqs.includes(x.id));
    const sugerencias = otrasMaterias.filter(x => !tempReqs.includes(x.id) && x.nombre.toLowerCase().includes(state.busquedaCorrelativa.toLowerCase()));

    return `
      <div class="overlay" id="overlay">
        <div class="modal" style="max-width: 560px;">
          <div class="modal-header">
            <div class="modal-header-top">
              <h2>${editando ? 'Editar Asignatura' : 'Nueva Asignatura'}</h2>
              <button class="modal-close-btn" id="btn-cerrar-x">&times;</button>
            </div>
          </div>

          <form id="form-crear-materia" style="display:flex; flex-direction:column; flex:1;">
            <div class="modal-body">
              <div class="field">
                <label>Nombre de la Asignatura</label>
                <input type="text" name="nombre" value="${m ? V.escapeHtml(m.nombre) : ''}" required placeholder="Ej: Algoritmos y Estructuras de Datos">
              </div>
              <div class="field-row">
                <div class="field">
                  <label>Nivel / Cuatrimestre</label>
                  <input type="text" name="nivel" value="${m ? V.escapeHtml(m.nivel) : ''}" placeholder="Ej: 3º Cuatrimestre" required>
                </div>
                <div class="field">
                  <label>Créditos</label>
                  <input type="number" name="creditos" value="${m ? m.creditos : 6}" required>
                </div>
              </div>

              <div class="field">
                <label>Correlativas Requeridas</label>
                <div class="search-selector">
                  <div class="tags-container">
                    ${correlativasSeleccionadas.map(c => `
                      <span class="tag">${V.escapeHtml(c.nombre)} <span onclick="App.Controller.removeReq('${c.id}')">&times;</span></span>
                    `).join('')}
                  </div>
                  <input type="text" id="req-search-input" placeholder="Buscar y agregar correlativas..." value="${V.escapeHtml(state.busquedaCorrelativa)}">
                  ${state.busquedaCorrelativa ? `
                    <div class="suggestions-list">
                      ${sugerencias.length ? sugerencias.map(s => `
                        <div class="suggestion-item" onclick="App.Controller.addReq('${s.id}')">${V.escapeHtml(s.nombre)}</div>
                      `).join('') : '<div class="suggestion-item" style="color:var(--muted)">Sin resultados</div>'}
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="field">
                <label>Créditos acumulados requeridos</label>
                <input type="number" name="reqCreds" value="${m ? m.reqCreds : 0}">
              </div>
            </div>

            <div class="modal-footer">
              ${editando ? `<button type="button" class="btn btn-danger" onclick="App.Controller.eliminar('${m.id}')">Eliminar</button>` : '<div></div>'}
              <div style="display:flex; gap:8px;">
                <button type="button" class="btn" id="btn-cancelar">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  };

})(window.App = window.App || {});
