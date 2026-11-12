/**
 * VISTA — Inicio
 * Landing informativo: hero con la marca, "Cómo funciona" y "Qué es
 * MyTrack". La creación/edición de tableros ya no vive acá — se maneja en
 * Mis Paneles (ver mispanelesView.js) —, así que el CTA principal lleva a
 * esa grilla.
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;

  // Set de íconos lineales propios (trazo simple, un solo color vía currentColor).
  const ICONOS = {
    materias: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 13c-4.5-3-11-4-18-2.5v25c7-1.5 13.5-.5 18 2.5 4.5-3 11-4 18-2.5v-25c-7-1.5-13.5-.5-18 2.5Z"/><path d="M24 13v25"/></svg>',
    parciales: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="11" y="8" width="26" height="35" rx="3"/><path d="M18 8V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1"/><path d="M17 25l5 5.5L32 19"/></svg>',
    temas: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="8" width="8" height="8" rx="2"/><path d="M20 12h21"/><path d="M8.5 25.5l2 2.2 3.5-4.4"/><path d="M20 24h21"/><rect x="7" y="32" width="8" height="8" rx="2"/><path d="M20 36h21"/></svg>',
    correlativas: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="24" r="6"/><circle cx="38" cy="24" r="6"/><path d="M16 24h16"/><path d="M28 18l6 6-6 6"/></svg>',
    progreso: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 33l10.5-10.5 8 8L41 14"/><path d="M30 14h11v11"/></svg>',
    organizacion: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="15" height="15" rx="2.5"/><rect x="26" y="7" width="15" height="15" rx="2.5"/><rect x="7" y="26" width="15" height="15" rx="2.5"/><rect x="26" y="26" width="15" height="15" rx="2.5"/></svg>',
    seguimiento: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="10" width="36" height="31" rx="3"/><path d="M6 19h36"/><path d="M15 5v9M33 5v9"/><path d="M15 30l5.5 5.5L34 23"/></svg>'
  };

  function renderArchCard(item) {
    return `
      <div class="arch-card">
        <div class="arch-card-shape" style="--arch-h:${item.altura}px">
          <span class="arch-card-icon" style="color:${item.color}">${item.icono}</span>
        </div>
        <div class="arch-card-title">${item.titulo}</div>
        <p class="arch-card-text">${item.texto}</p>
      </div>`;
  }

  function renderFeatureCol(item) {
    return `
      <div class="feature-col">
        <span class="feature-icon">${item.icono}</span>
        <h3>${item.titulo}</h3>
        <p>${item.texto}</p>
      </div>`;
  }

  V.renderInicio = function (state) {
    const comoFunciona = [
      { icono: ICONOS.materias, titulo: 'Materias', texto: 'Cargá tus materias con su nivel y créditos.', altura: 154, color: 'var(--accent)' },
      { icono: ICONOS.parciales, titulo: 'Parciales', texto: 'Notas, fechas y recuperatorios al día.', altura: 164, color: 'var(--rose-dark)' },
      { icono: ICONOS.temas, titulo: 'Temas', texto: 'Anotá qué repasar antes de cada examen.', altura: 174, color: 'var(--sage-dark)' },
      { icono: ICONOS.correlativas, titulo: 'Correlativas', texto: 'Sabé qué materias se habilitan al aprobar.', altura: 164, color: 'var(--peach-dark)' },
      { icono: ICONOS.progreso, titulo: 'Progreso', texto: 'Promedio y créditos, siempre a la vista.', altura: 154, color: 'var(--accent)' }
    ];

    const features = [
      { icono: ICONOS.organizacion, titulo: 'Organización', texto: 'Todo tu plan de estudios, ordenado en un solo lugar.' },
      { icono: ICONOS.seguimiento, titulo: 'Seguimiento', texto: 'Parciales, recuperatorios y finales con fecha y nota.' },
      { icono: ICONOS.progreso, titulo: 'Progreso', texto: 'Promedio, créditos y avance, calculados al instante.' }
    ];

    return `
      <div class="inicio-page">

        <header class="inicio-hero" id="inicio-top">
          <div class="inicio-inner inicio-hero-inner">
            <div class="inicio-eyebrow">TU CARRERA, MÁS SIMPLE</div>
            <h1 class="inicio-hero-title">MyTrack</h1>
            
            <p class="inicio-hero-subtitle">Toda tu carrera, en un solo lugar.</p>
            <p class="inicio-hero-desc">Cargá tu plan una vez y seguí materias, parciales y créditos al instante. Todo queda en tu navegador, sin cuentas.</p>
            <div class="inicio-hero-actions">
              <button class="btn btn-primary btn-lg" onclick="App.Controller.irAMisPaneles()">Ir a Mis Paneles</button>
              <a href="#inicio-como-funciona" class="inicio-link-text">Ver cómo funciona</a>
            </div>
          </div>
        </header>

        <section class="inicio-band inicio-band-deep" id="inicio-como-funciona">
          <div class="inicio-inner">
            <h2 class="inicio-section-title">Cómo funciona</h2>
            <div class="arch-row">
              ${comoFunciona.map(renderArchCard).join('')}
            </div>
          </div>
        </section>

        <section class="inicio-band" id="inicio-que-es">
          <div class="inicio-inner">
            <h2 class="inicio-section-title">¿Qué es MyTrack?</h2>
            <p class="inicio-section-lead">Es tu plan de estudios vivo: promedio, créditos y habilitaciones se calculan solos, sin planillas ni papel.</p>
            <div class="inicio-features">
              ${features.map(renderFeatureCol).join('')}
            </div>
          </div>
        </section>

        <footer class="inicio-footer">
          <div class="inicio-inner inicio-footer-inner">
            <span>MyTrack — Gestor Académico</span>
            <span class="inicio-footer-muted">Tus datos se guardan solo en este navegador.</span>
          </div>
        </footer>

      </div>
    `;
  };

})(window.App = window.App || {});
