/**
 * VISTA — Modal de detalle de materia
 * Pestañas: General (estado, cierre, recursada e historial), Parciales,
 * Final y Observaciones. Es una función pura: recibe el estado de la app y
 * devuelve el HTML del modal; no muta nada.
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;
  const M = App.Model;

  V.renderModalDetalle = function (state) {
    const plan = state.plan;
    const m = plan.materias.find(x => x.id === state.modalEstado.id);
    if (!m) return '';

    const cur = M.obtenerCursadaPorId(m, state.modalEstado.cursadaId);
    const viendoHistorial = cur.id !== m.cursadaActualId;
    const tabActivaModal = state.tabActivaModal;

    const promedioParciales = M.calcularPromedioParciales(cur);
    const finalInfo = M.estadoFinalDescriptivo(cur);

    return `
      <div class="overlay" id="overlay">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-header-top">
              <h2>${V.escapeHtml(m.nombre)}</h2>
              <button class="modal-close-btn" id="btn-cerrar-x">&times;</button>
            </div>
            <div class="modal-header-meta">
              <span class="chip">${V.escapeHtml(m.nivel)}</span>
              <span>${m.creditos} Créditos</span>
              <span class="chip ${viendoHistorial ? 'chip-recursada' : ''}">Cursada ${cur.numero}${cur.id === m.cursadaActualId ? ' (actual)' : ' (historial)'}</span>
            </div>
          </div>

          <!-- NAVEGACIÓN PESTAÑAS -->
          <div class="modal-tabs">
            <button type="button" class="tab-btn ${tabActivaModal === 'estado' ? 'active' : ''}" data-tab="estado" onclick="App.Controller.switchTab('estado')">General</button>
            <button type="button" class="tab-btn ${tabActivaModal === 'parciales' ? 'active' : ''}" data-tab="parciales" onclick="App.Controller.switchTab('parciales')">Parciales</button>
            <button type="button" class="tab-btn ${tabActivaModal === 'final' ? 'active' : ''}" data-tab="final" onclick="App.Controller.switchTab('final')">Final</button>
            <button type="button" class="tab-btn ${tabActivaModal === 'bitacora' ? 'active' : ''}" data-tab="bitacora" onclick="App.Controller.switchTab('bitacora')">Observaciones</button>
          </div>

          <form id="form-detalle-materia" novalidate style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
            <div class="modal-body">

              <!-- PESTAÑA 1: ESTADO GENERAL + CIERRE + RECURSADAS -->
              <div class="tab-content ${tabActivaModal === 'estado' ? 'active' : ''}" data-tab="estado">

                ${viendoHistorial ? `
                  <div class="banner-info">
                    <span>Estás viendo el historial de la <strong>cursada ${cur.numero}</strong>. Podés consultarla o editarla igual que la cursada actual.</span>
                    <button type="button" class="btn btn-sm" onclick="App.Controller.volverActual('${m.id}')">Volver a la cursada actual</button>
                  </div>
                ` : ''}

                <div class="field">
                  <label>Estado de esta cursada</label>
                  <select name="estado">
                    <option value="Pendiente" ${cur.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="En Cursada" ${cur.estado === 'En Cursada' ? 'selected' : ''}>En Cursada</option>
                    <option value="Aprobada" ${cur.estado === 'Aprobada' ? 'selected' : ''}>Aprobada</option>
                  </select>
                  
                </div>

                <div style="margin-top:16px; border-top:1px solid var(--border); padding-top:16px;">
                  <div class="section-title" style="margin-bottom:10px;">Cierre de la Cursada</div>
                  <div class="field-row">
                    <div class="field">
                      <label>Nota de cierre</label>
                      <input type="number" step="0.1" min="0" max="10" name="notaCierre" value="${cur.notaCierre != null ? cur.notaCierre : ''}" placeholder="-">
                    </div>
                    <div class="field">
                      <label>Fecha de cierre</label>
                      <input type="date" name="fechaCierre" value="${cur.fechaCierre || ''}">
                    </div>
                  </div> 
                  <div class="field-hint" style="margin-top:-6px;"></div>
                </div>

                <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                  <div>
                    <div class="section-title" style="margin-bottom:2px;">Recursada</div>
                    <div class="field-hint" style="margin-top:0;">Inicia una nueva cursada sin perder el historial de la actual.</div>
                  </div>
                  <button type="button" class="btn" ${viendoHistorial ? 'disabled title="Volvé a la cursada actual para recursar"' : ''} onclick="App.Controller.recursar('${m.id}')">↻ Recursar</button>
                </div>

                ${m.cursadas.length > 1 ? `
                  <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:16px;">
                    <div class="section-title">Historial de cursadas (${m.cursadas.length})</div>
                    <div class="historial-list">
                      ${m.cursadas.slice().reverse().map(c => {
                        const esActual = c.id === m.cursadaActualId;
                        const seEstaViendo = c.id === cur.id;
                        const prom = M.calcularPromedioParciales(c);
                        const fInfo = M.estadoFinalDescriptivo(c);
                        return `
                          <div class="historial-item ${esActual ? 'actual' : ''}">
                            <div class="historial-item-info">
                              <span class="historial-item-title">Cursada ${c.numero} ${esActual ? '· Actual' : ''} ${c.fechaInicio ? '· ' + V.escapeHtml(c.fechaInicio) : ''}</span>
                              <span class="historial-item-meta">Estado: ${V.escapeHtml(c.estado)} · Promedio parciales: ${prom !== null ? prom.toFixed(2) : '—'} · Final: ${fInfo.texto} · Cierre: ${V.fmtNota(M.notaCierreEfectiva(c))}</span>
                            </div>
                            <button type="button" class="btn btn-sm" ${seEstaViendo ? 'disabled' : ''} onclick="App.Controller.verCursada('${m.id}','${c.id}')">${seEstaViendo ? 'Viendo' : 'Abrir'}</button>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- PESTAÑA 2: PARCIALES Y RECUPERATORIOS -->
              <div class="tab-content ${tabActivaModal === 'parciales' ? 'active' : ''}" data-tab="parciales" id="pestana-parciales">
                <div class="promedio-box">
                  <div>
                    <div class="label">Promedio de Parciales</div>
                  </div>
                  <div class="valor" id="promedio-parciales-valor">${promedioParciales !== null ? promedioParciales.toFixed(2) : '—'}</div>
                </div>

                <div class="eval-grid">
                  ${cur.parciales.map((p, i) => {
                    const key = 'p' + (i + 1);
                    return V.renderParcialCard(m.id, cur.id, key, M.etiquetaParcial(key), p);
                  }).join('')}

                  <div class="add-p3-row" id="add-parcial-row">
                    <button type="button" class="btn btn-ghost" onclick="App.Controller.agregarParcial()">+ Agregar Parcial</button>
                    <button type="button" id="btn-quitar-parcial" class="btn btn-ghost" style="display:${cur.parciales.length > 2 ? 'inline-block' : 'none'};" onclick="App.Controller.quitarParcial()">− Quitar Parcial</button>
                  </div>
                </div>
              </div>

              <!-- PESTAÑA 3: FINAL -->
              <div class="tab-content ${tabActivaModal === 'final' ? 'active' : ''}" data-tab="final">
                

                <div class="field">
                  <label>Modalidad de cierre de la materia</label>
                  <select name="final_modalidad" onchange="App.Controller.onFinalModalidadChange()">
                    <option value="pendiente" ${cur.final.modalidad === 'pendiente' ? 'selected' : ''}>Todavía sin definir</option>
                    <option value="promocion" ${cur.final.modalidad === 'promocion' ? 'selected' : ''}>Promocionada (sin final)</option>
                    <option value="final" ${cur.final.modalidad === 'final' ? 'selected' : ''}>Requiere examen final</option>
                    <option value="finalO" ${cur.final.modalidad === 'finalO' ? 'selected' : ''}>Final obligatorio</option>
                  </select>
                </div>

                <div class="final-block" id="final-block-pendiente" style="display:${cur.final.modalidad === 'pendiente' ? 'block' : 'none'};">
                  <div class="field-hint" style="margin:0;">Modalidad de cierre sin definir. Podés actualizarlo más adelante.</div>
                </div>

                <div class="final-block" id="final-block-promocion" style="display:${cur.final.modalidad === 'promocion' ? 'block' : 'none'};">
                  <div class="field-hint" style="margin-top:0;">La materia se aprueba directamente por promoción, sin rendir final.</div>
                  
                </div>

                <div class="final-block" id="final-block-final" style="display:${cur.final.modalidad === 'final' || cur.final.modalidad === 'finalO' ? 'block' : 'none'};">
                  <div class="field">
                    <label>Estado del examen final</label>
                    <select name="final_sub_estado" onchange="App.Controller.onFinalEstadoChange()">
                      <option value="sin_rendir" ${cur.final.estado === 'Sin Rendir' ? 'selected' : ''}>Sin rendir</option>
                      <option value="aprobado" ${cur.final.estado === 'Aprobado' ? 'selected' : ''}>Aprobado</option>
                      <option value="desaprobado" ${cur.final.estado === 'Desaprobado' ? 'selected' : ''}>Desaprobado (a recuperatorio)</option>
                    </select>
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <label>Fecha del final</label>
                      <input type="date" name="final_fecha" value="${cur.final.modalidad === 'final' || cur.final.modalidad === 'finalO' ? (cur.final.fecha || '') : ''}">
                    </div>
                    <div class="field">
                      <label>Nota del final</label>
                      <input type="number" step="0.1" min="0" max="10" name="final_nota" value="${(cur.final.modalidad === 'final' || cur.final.modalidad === 'finalO') && cur.final.nota != null ? cur.final.nota : ''}" placeholder="-">
                    </div>
                  </div>
                  <div class="field">
                    <label>Observaciones (bitácora del final)</label>
                    <textarea name="final_obs" placeholder="Temas de mesa, tribunal, condiciones...">${(cur.final.modalidad === 'final' || cur.final.modalidad === 'finalO') ? V.escapeHtml(cur.final.observaciones) : ''}</textarea>
                  </div>

                  <div class="rec-box" id="final-rec-block" style="display:${(cur.final.modalidad === 'final' || cur.final.modalidad === 'finalO') && cur.final.estado === 'Desaprobado' ? 'block' : 'none'};">
                    <div class="rec-box-header"><span>Recuperatorios de Final (se desbloquean de a uno)</span></div>
                    ${[1, 2, 3].map(n => {
                      const r = (cur.final.recuperatorios && cur.final.recuperatorios[n - 1]) || { fecha: '', nota: null, observaciones: '' };
                      const prev = (cur.final.recuperatorios && cur.final.recuperatorios[n - 2]) || null;
                      const visible = n === 1 || !!(prev && prev.nota != null && prev.nota !== '' && Number(prev.nota) < 4);
                      return `
                      <div class="rec-intento" style="display:${visible ? 'block' : 'none'};">
                        <div class="rec-box-header"><span>${n} </span></div>
                        <div class="field-row">
                          <div class="field">
                            <label>Fecha</label>
                            <input type="date" name="finalr_${n}_fecha" value="${r.fecha || ''}">
                          </div>
                          <div class="field">
                            <label>Nota</label>
                            <input type="number" step="0.1" min="0" max="10" name="finalr_${n}_nota" value="${r.nota != null ? r.nota : ''}" placeholder="-">
                          </div>
                        </div>
                        <div class="field" style="margin-bottom:0;">
                          <label>Observaciones</label>
                          <textarea name="finalr_${n}_obs" placeholder="Observaciones del intento ${n}...">${V.escapeHtml(r.observaciones)}</textarea>
                        </div>
                      </div>`;
                    }).join('')}
                  </div>
                </div>
              </div>

              <!-- PESTAÑA 4: OBSERVACIONES -->
              <div class="tab-content ${tabActivaModal === 'bitacora' ? 'active' : ''}" data-tab="bitacora">
                <div class="field">
                  <label>Observaciones generales de esta cursada</label>
                  <textarea name="observaciones" style="min-height:220px;" placeholder="Notas generales sobre esta cursada: modalidad, docente, bibliografía, condiciones especiales...">${V.escapeHtml(cur.observaciones)}</textarea>
                </div>
              </div>

            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" onclick="App.Controller.editarForm('${m.id}')">⚙  </button>
              <div style="display:flex; gap:5%;">
                <button type="button" class="btn" id="btn-cancelar">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Cambios</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  };

})(window.App = window.App || {});
