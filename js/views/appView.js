/**
 * VISTA — Orquestador de la app
 * `renderApp(state)` es la única función que arma la pantalla completa a
 * partir del estado. Es pura: no muta `state` ni toca localStorage; el
 * controlador es quien decide cuándo llamarla y qué hacer con el HTML que
 * devuelve. Siempre renderiza la navbar global (ver navbarView.js) y luego,
 * según `state.pantalla`, Inicio, Mis Paneles o el Panel (con el botón
 * "Mis Paneles" en el header de este último).
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;
  const M = App.Model;

  function renderKpi(valor, titulo) {
    return `
      <div class="kpi-card">
        <div class="kpi-value">${valor}</div>
        <div class="kpi-title">${titulo}</div>
      </div>
    `;
  }

  function renderModales(state) {
    if (!state.modalEstado) return '';
    if (state.modalEstado.tipo === 'detalle') return V.renderModalDetalle(state);
    if (state.modalEstado.tipo === 'nueva' || state.modalEstado.tipo === 'editar') return V.renderModalForm(state);
    return '';
  }

  function renderPanel(state) {
    const plan = state.plan;
    const totalCreditos = plan.materias.reduce((a, m) => a + Number(m.creditos), 0);
    const creditosObtenidos = M.obtenerCreditosTotales(plan);
    const aprobadas = plan.materias.filter(m => m.estado === 'Aprobada');

    const notasCierre = aprobadas
      .map(m => M.notaCierreEfectiva(M.obtenerCursadaActual(m)))
      .filter(n => n !== null && !isNaN(n));

    const promedio = notasCierre.length ? (notasCierre.reduce((a, b) => a + b, 0) / notasCierre.length).toFixed(2) : '0.00';
    const porcentaje = totalCreditos ? ((creditosObtenidos / totalCreditos) * 100).toFixed(1) : '0.0';

    const niveles = M.nivelesUnicos(plan);
    const filtradas = state.filtroActual === 'todas' ? plan.materias : plan.materias.filter(m => m.nivel === state.filtroActual);

    return `
      <div class="panel-main">
        <header>
          <div class="titulo-wrap">
            ${plan.foto ? `<img class="panel-foto" src="${plan.foto}" alt="Foto del plan de estudios">` : ''}
            <input id="plan-titulo" value="${V.escapeHtml(plan.titulo)}" />
          </div>
          <div class="header-actions">
            <button class="btn btn-inicio" id="btn-ir-mispaneles">Mis Paneles</button>
            <button class="btn btn-primary" id="btn-nueva">+ Nueva Materia</button>
            <button class="btn" id="btn-pdf"> Cargar desde PDF</button>
            <button class="btn btn-danger" id="btn-vaciar">Vaciar Plan</button>
          </div>
        </header>

        <div class="kpi-grid">
          ${renderKpi(promedio, 'Promedio de Cierre')}
          ${renderKpi(`${creditosObtenidos} / ${totalCreditos}`, 'Créditos Obtenidos')}
          ${renderKpi(`${porcentaje}%`, 'Avance Global')}
          ${renderKpi(`${aprobadas.length} / ${plan.materias.length}`, 'Materias Aprobadas')}
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>Asignaturas (${filtradas.length})</h2>
            <div class="filter-bar">
              <button class="filter-btn ${state.filtroActual === 'todas' ? 'active' : ''}" data-nivel="todas">Todas</button>
              ${niveles.map(n => `<button class="filter-btn ${state.filtroActual === n ? 'active' : ''}" data-nivel="${V.escapeHtml(n)}">${V.escapeHtml(n)}</button>`).join('')}
            </div>
          </div>
          <div class="subject-grid-list-center">
            ${filtradas.length ? filtradas.map(m => V.renderTarjetaMateria(plan, m)).join('') : `<div class="empty-state"><strong>No hay materias registradas</strong>Cargá un archivo PDF o agregá asignaturas.</div>`}
          </div>
        </div>
      </div>

      ${renderModales(state)}
    `;
  }

  V.renderApp = function (state) {
    const pantalla = state.pantalla === 'inicio'
      ? V.renderInicio(state)
      : state.pantalla === 'mispaneles'
        ? V.renderMisPaneles(state)
        : renderPanel(state);
    return V.renderNavbar(state) + pantalla;
  };

})(window.App = window.App || {});
