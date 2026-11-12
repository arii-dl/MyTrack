/**
 * VISTA — Tarjeta de materia
 * Card que se muestra en la grilla principal del plan de estudios.
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;
  const M = App.Model;

  V.renderTarjetaMateria = function (plan, m) {
    const check = M.evaluarHabilitacion(plan, m);
    const bloqueada = !check.habilitada && m.estado === 'Pendiente';
    const estadoClase = m.estado === 'Aprobada' ? 'aprobada' : (m.estado === 'En Cursada' ? 'cursando' : (bloqueada ? 'bloqueada' : 'pendiente'));
    const badgeClase = m.estado === 'Aprobada' ? 'badge-aprobada' : (m.estado === 'En Cursada' ? 'badge-cursando' : 'badge-pendiente');
    const cur = M.obtenerCursadaActual(m);
    const esRecursada = m.cursadas.length > 1;
    const nota = M.notaCierreEfectiva(cur);

    return `
      <div class="subject-card ${estadoClase === 'bloqueada' ? 'bloqueada' : (estadoClase === 'aprobada' ? 'aprobada' : (estadoClase === 'cursando' ? 'cursando' : ''))}" onclick="App.Controller.abrirDetalle('${m.id}')">
        <div class="subject-card-main">
          <div class="subject-card-body">
            <div class="subject-card-header">
              <div class="subject-card-title">${V.escapeHtml(m.nombre)}</div>
              <span class="badge ${bloqueada ? 'badge-locked' : badgeClase}">${bloqueada ? 'Bloqueada' : m.estado}</span>
            </div>
            <div class="subject-card-meta">
              ${V.escapeHtml(m.nivel)} · ${m.creditos} cr.${esRecursada ? ` · Recursada (cursada ${cur.numero})` : ''}
              ${nota !== null && !isNaN(nota) ? `<span class="subject-card-nota">Cierre: ${V.fmtNota(nota)}</span>` : ''}
            </div>
            ${bloqueada ? `<div style="font-size:.73rem; color:var(--danger);">${V.escapeHtml(check.razon)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  };

})(window.App = window.App || {});
