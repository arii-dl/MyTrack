/**
 * VISTA — Checklist de temas
 * Bloque reutilizable para el temario de un parcial o de su recuperatorio.
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;

  V.ESTADO_TEMA_INFO = {
    falta: { label: 'Falta estudiar', clase: 'tema-falta' },
    repasar: { label: 'A repasar', clase: 'tema-repasar' },
    estudiado: { label: 'Estudiado', clase: 'tema-estudiado' }
  };

  V.renderTemaItem = function (materiaId, cursadaId, key, esRec, t) {
    const recFlag = esRec ? 'true' : 'false';
    const info = V.ESTADO_TEMA_INFO[t.estado] || V.ESTADO_TEMA_INFO.falta;
    return `
      <div class="tema-item" id="tema-item-${t.id}">
        <button type="button" id="tema-btn-${t.id}" class="tema-estado-btn ${info.clase}" title="Click para cambiar el estado" onclick="App.Controller.cicloEstadoTema('${materiaId}','${cursadaId}','${key}',${recFlag},'${t.id}')">${info.label}</button>
        <span class="tema-texto">${V.escapeHtml(t.texto)}</span>
        <span class="tema-eliminar" title="Eliminar tema" onclick="App.Controller.eliminarTema('${materiaId}','${cursadaId}','${key}',${recFlag},'${t.id}')">&times;</span>
      </div>`;
  };

  V.renderTemasChecklist = function (materiaId, cursadaId, key, esRec, temas) {
    const inputId = `nuevo-tema-${key}${esRec ? 'r' : ''}`;
    return `
      <div class="temas-checklist">
        ${temas.length ? temas.map(t => V.renderTemaItem(materiaId, cursadaId, key, esRec, t)).join('') : '<div class="temas-empty">Todavía no se cargaron temas.</div>'}
        <div class="tema-add-row">
          <input type="text" id="${inputId}" placeholder="Agregar un tema..." onkeydown="if(event.key==='Enter'){event.preventDefault(); App.Controller.agregarTema('${materiaId}','${cursadaId}','${key}',${esRec});}">
          <button type="button" class="btn btn-sm" onclick="App.Controller.agregarTema('${materiaId}','${cursadaId}','${key}',${esRec})">+</button>
        </div>
      </div>
    `;
  };

})(window.App = window.App || {});
