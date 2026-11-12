/**
 * VISTA — Tarjeta de parcial
 * Bloque reutilizable para cada parcial (1º, 2º y 3º opcional) dentro de la
 * pestaña "Parciales" del modal de detalle.
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;
  const M = App.Model;

  V.renderParcialCard = function (materiaId, cursadaId, key, label, parcial) {
    const habilitadoRec = M.recuperatorioHabilitado(parcial);
    const yaCargoNota = parcial.nota != null && parcial.nota !== '';
    const estadoTag = !yaCargoNota
      ? { texto: 'Pendiente de rendir', clase: 'badge-pendiente' }
      : (Number(parcial.nota) >= 4 ? { texto: 'Aprobado', clase: 'badge-aprobada' } : { texto: 'Desaprobado', clase: 'badge-desaprobada' });

    const mensajeRec = !yaCargoNota
      ? 'Todavía no se cargó una nota para este parcial.'
      : (habilitadoRec ? 'Recuperatorio habilitado (nota menor a 4).' : 'Parcial aprobado — el recuperatorio no está disponible.');

    return `
      <div class="eval-card" id="parcial-block-${key}" data-parcial-key="${key}">
        <div class="eval-card-header">
          <span>${label}</span>
          <span class="estado-tag ${estadoTag.clase}">${estadoTag.texto}</span>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Fecha</label>
            <input type="date" name="${key}_fecha" value="${parcial.fecha || ''}">
          </div>
        </div>
        <div class="field">
          <label>Temas a evaluar</label>
          ${V.renderTemasChecklist(materiaId, cursadaId, key, false, parcial.temas)}
        </div>

        <div class="field" style="max-width:200px;">
          <label>Nota obtenida</label>
          <input type="number" step="0.1" min="0" max="10" name="${key}_nota" value="${parcial.nota != null ? parcial.nota : ''}" placeholder="-" oninput="App.Controller.onNotaParcialInput('${key}')">
        </div>

        <div class="rec-box" id="rec-box-${key}" style="display: ${habilitadoRec ? 'block' : 'none'};">
          <div class="rec-box-header"><span>Recuperatorio de ${label}</span></div>
          <div class="field-row">
            <div class="field">
              <label>Fecha</label>
              <input type="date" name="${key}r_fecha" data-rec-of="${key}" value="${parcial.recuperatorio.fecha || ''}" ${habilitadoRec ? '' : 'disabled'}>
            </div>
          </div>
          <div class="field">
            <label>Temas a evaluar</label>
            ${V.renderTemasChecklist(materiaId, cursadaId, key, true, parcial.recuperatorio.temas)}
          </div>
          <div class="field" style="max-width:200px; margin-bottom:0;">
            <label>Nota del recuperatorio</label>
            <input type="number" step="0.1" min="0" max="10" name="${key}r_nota" data-rec-of="${key}" value="${parcial.recuperatorio.nota != null ? parcial.recuperatorio.nota : ''}" placeholder="-" ${habilitadoRec ? '' : 'disabled'} oninput="App.Controller.onPromedioRecalc()">
          </div>
          <div class="rec-msg ${habilitadoRec ? 'ok' : ''}" id="rec-msg-${key}">${mensajeRec}</div>
        </div>
      </div>
    `;
  };

})(window.App = window.App || {});
