/**
 * VISTA — Navbar
 * Barra global que se renderiza en todas las pantallas: a la izquierda la
 * marca "MyTrack" (vuelve a Inicio) y, solo en Inicio, los anclas de
 * sección; a la derecha el desplegable de carreras (con el avance de cada
 * una) y el botón Inicio. El desplegable vive en `state.panelMenuAbierto`;
 * crear/editar/eliminar tableros se gestionan desde la grilla de Mis
 * Paneles y desde el encabezado del Panel.
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;
  const M = App.Model;

  const ICONO_HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.8 12 3.5l9 7.3"/><path d="M5.5 9.4V20h13V9.4"/><path d="M10 20v-5.5h4V20"/></svg>';

  const ICONO_CARET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

  // Anclas de la página de Inicio: escrolean a cada sección.
  const SECCIONES_INICIO = [
    { href: '#inicio-top', label: 'Inicio' },
    { href: '#inicio-como-funciona', label: 'Cómo Funciona' },
    { href: '#inicio-que-es', label: 'Qué es' }
  ];

  function renderPanelItem(p, activoId) {
    const activo = p.id === activoId;
    const nombre = p.carrera || p.titulo || 'Tablero sin nombre';
    const sub = [p.carrera, p.facultad].filter(Boolean).join(' · ');
    const total = p.materias.reduce((a, m) => a + Number(m.creditos || 0), 0);
    const obtenidos = M.obtenerCreditosTotales(p);
    const pct = total ? Math.round((obtenidos / total) * 100) : 0;
    return `
      <button class="panel-menu-item ${activo ? 'active' : ''}" onclick="App.Controller.abrirPanel('${p.id}')" role="menuitem">
        <span class="panel-menu-dot"></span>
        <span class="panel-menu-text">
          <span class="panel-menu-name">${V.escapeHtml(nombre)}</span>
          ${sub ? `<span class="panel-menu-sub">${V.escapeHtml(sub)}</span>` : ''}
          <span class="panel-menu-avance">
            <span class="panel-menu-progress" aria-hidden="true"><span style="width:${pct}%"></span></span>
            <span class="panel-menu-pct">${pct}%</span>
          </span>
        </span>
      </button>`;
  }

  V.renderNavbar = function (state) {
    const enInicio = state.pantalla === 'inicio';
    const planes = state.planes || [];
    const activoId = state.planActualId;

    return `
      <header class="navbar">
        <div class="navbar-main">
          <button class="navbar-brand" onclick="App.Controller.irAInicio()" title="MyTrack — Inicio">
            <span class="navbar-wordmark">MyTrack</span>
          </button>

          ${enInicio ? `
            <nav class="navbar-links">
              ${SECCIONES_INICIO.map(l => `<a href="${l.href}" class="navbar-link">${l.label}</a>`).join('')}
            </nav>
          ` : ''}

          <div class="navbar-tools">
            <button class="btn navbar-home" onclick="App.Controller.irAInicio()" title="Ir a Inicio" aria-label="Ir a Inicio">
              <span class="navbar-home-icon">${ICONO_HOME}</span>
              <span class="navbar-home-text">Inicio</span>
            </button>
            <div class="navbar-menu">
              <button class="btn navbar-menu-btn ${state.panelMenuAbierto ? 'open' : ''}" onclick="App.Controller.togglePanelMenu()" title="Cambiar carrera" aria-haspopup="menu" aria-expanded="${!!state.panelMenuAbierto}">
                <span class="navbar-menu-caret-icon">${ICONO_CARET}</span>
              </button>
              ${state.panelMenuAbierto ? `
                <div class="navbar-menu-dropdown" role="menu">
                  <div class="panel-menu-list">
                    ${planes.map(p => renderPanelItem(p, activoId)).join('')}
                  </div>
                  <button class="panel-menu-add" onclick="App.Controller.crearPanel()">+ Nuevo Tablero</button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </header>
    `;
  };

})(window.App = window.App || {});