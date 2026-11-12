/**
 * VISTA — Mis Paneles
 * Pantalla tipo Trello: grilla con todos los tableros (carreras) y su
 * avance. Desde acá se abre un tablero para ver su Panel, se editan los
 * datos de uno existente o se crea uno nuevo con el formulario de datos
 * de cursada (el mismo que antes vivía en Inicio, con importación de PDF).
 */
(function (App) {
  'use strict';

  App.View = App.View || {};
  const V = App.View;
  const M = App.Model;

  const ICONO_PDF = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h15l8 8v28a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M28 5v8h8"/><path d="M24 21v13"/><path d="M18.5 28.5L24 34l5.5-5.5"/></svg>';

  function avancePlan(plan) {
    const total = plan.materias.reduce((a, m) => a + Number(m.creditos || 0), 0);
    const obtenidos = M.obtenerCreditosTotales(plan);
    const pct = total ? Math.round((obtenidos / total) * 100) : 0;
    const aprobadas = plan.materias.filter(m => m.estado === 'Aprobada').length;
    return { total, obtenidos, pct, aprobadas };
  }

  function renderTableroCard(p, esActual, cantidad) {
    const nombre = p.carrera || p.titulo || 'Carrera sin nombre';
    const av = avancePlan(p);
    return `
      <div class="tablero-card ${esActual ? 'actual' : ''}" onclick="App.Controller.abrirPanel('${p.id}')" role="button" tabindex="0">
        <div class="tablero-card-top">
          ${p.foto ? `<img class="tablero-card-foto" src="${p.foto}" alt="">` : ''}
          <div class="tablero-card-info">
            <div class="tablero-card-nombre">${V.escapeHtml(nombre)}</div>
            <div class="tablero-card-facultad">${p.facultad ? V.escapeHtml(p.facultad) : 'Sin facultad'}</div>
          </div>
          ${esActual ? '<span class="tablero-card-actual">Actual</span>' : ''}
        </div>
        <div class="tablero-card-meta">
          <span class="chip">${av.aprobadas} / ${p.materias.length} materias</span>
          <span class="chip">${av.obtenidos} / ${av.total} créditos</span>
        </div>
        <div class="tablero-card-progress" aria-hidden="true"><span style="width:${av.pct}%"></span></div>
        <div class="tablero-card-actions">
          <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); App.Controller.abrirPanel('${p.id}')">Abrir tablero</button>
          <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); App.Controller.editarTablero('${p.id}')">Editar datos</button>
          ${cantidad > 1 ? `<button type="button" class="btn btn-sm btn-danger" title="Eliminar tablero" onclick="event.stopPropagation(); App.Controller.eliminarCarrera('${p.id}')">×</button>` : ''}
        </div>
      </div>`;
  }

  // Formulario de datos del tablero: crear (tablero nuevo en blanco) o
  // editar (tablero existente). Es el mismo formulario que antes estaba en
  // Inicio: carrera + facultad + importación de PDF.
  function renderFormTablero(state, plan) {
    const esCreacion = state.creandoTablero;
    const editado = state.editandoTableroId ? (state.planes.find(p => p.id === state.editandoTableroId) || plan) : plan;
    const carrera = (editado && editado.carrera) || '';
    const facultad = (editado && editado.facultad) || '';
    const fotoActual = state.fotoBorrador !== undefined ? state.fotoBorrador : ((editado && editado.foto) || '');

    return `
      <div class="tablero-form-panel">
        <h2 class="tablero-form-title">${esCreacion ? 'Nuevo Tablero' : 'Editar Tablero'}</h2>
        <p class="tablero-form-lead">${esCreacion ? 'Contanos de qué carrera es este tablero. Después podés importar el plan desde PDF o cargar las materias a mano.' : 'Actualizá los datos de la carrera de este tablero.'}</p>

        <form id="form-datos-cursada" class="inicio-form">
          <div class="inicio-field-row">
            <div class="inicio-field">
              <label for="input-carrera">Carrera</label>
              <input type="text" id="input-carrera" name="carrera" value="${V.escapeHtml(carrera)}" placeholder="Ej: Ingeniería Informática">
            </div>
            <div class="inicio-field">
              <label for="input-facultad">Facultad</label>
              <input type="text" id="input-facultad" name="facultad" value="${V.escapeHtml(facultad)}" placeholder="Ej: FIUBA — Facultad de Ingeniería, UBA">
            </div>
          </div>

          <div class="foto-row">
            <div class="foto-preview ${fotoActual ? 'con-foto' : ''}" id="foto-preview">
              ${fotoActual ? `<img src="${fotoActual}" alt="Foto del plan de estudios">` : '<span class="foto-vacia">Sin foto</span>'}
            </div>
            <div class="foto-info">
              <strong>Foto del plan de estudios <span class="foto-opcional">(opcional)</span></strong>
              <span>Sacale una foto a tu plan impreso o elegí una de la galería.</span>
              <div class="foto-botones">
                <button type="button" class="btn btn-sm" id="btn-foto-camara">${fotoActual ? 'Volver a tomar' : 'Tomar foto'}</button>
                <button type="button" class="btn btn-sm" id="btn-foto-galeria">Elegir de galería</button>
                <button type="button" class="btn btn-sm btn-danger ${fotoActual ? '' : 'hidden'}" id="btn-foto-quitar">Quitar</button>
              </div>
            </div>
            <input type="file" id="foto-input-galeria" accept="image/*" class="hidden" />
            <input type="file" id="foto-input-camara" accept="image/*" capture="environment" class="hidden" />
          </div>

          <div class="inicio-pdf-row">
            <div class="inicio-pdf-info">
              <span class="inicio-pdf-icon">${ICONO_PDF}</span>
              <span class="inicio-pdf-text">
                <strong>¿Ya tenés tu plan de estudios en PDF?</strong>
                Importalo y cargamos las materias en este tablero automáticamente.
              </span>
            </div>
            <button type="button" class="btn btn-sm" id="btn-pdf-inicio">Cargar desde PDF</button>
          </div>

          <div class="inicio-botonera">
            <button type="submit" class="btn btn-primary">${esCreacion ? 'Crear Tablero' : 'Guardar Cambios'}</button>
            ${esCreacion ? `<button type="button" class="btn" onclick="App.Controller.cancelarCreacion()">Cancelar</button>` : ''}
          </div>

          ${state.datosCursadaGuardado && !esCreacion ? `<div class="inicio-form-success">Datos guardados correctamente.</div>` : ''}
        </form>
      </div>`;
  }

  V.renderMisPaneles = function (state) {
    const planes = state.planes || [];
    const actualId = state.planActualId;
    const mostrarForm = state.creandoTablero || state.editandoTableroId || planes.length === 0;

    return `
      <div class="mispaneles-page">
        <header class="mispaneles-header">
          <h1 class="mispaneles-titulo">Mis Paneles</h1>
          <p class="mispaneles-sub">Elegí un tablero para seguir tu carrera, o creá otro y llevá varias a la vez.</p>
        </header>

        ${state.datosCursadaGuardado && !mostrarForm ? '<div class="inicio-form-success mispaneles-ok">Tablero actualizado.</div>' : ''}

        <div class="tableros-grid">
          ${planes.map(p => renderTableroCard(p, p.id === actualId, planes.length)).join('')}
          ${state.creandoTablero ? '' : `
            <button type="button" class="tablero-card-new" onclick="App.Controller.crearCarrera()">
              Nuevo Tablero
            </button>`}
        </div>

        ${mostrarForm ? renderFormTablero(state, state.plan) : ''}
      </div>`;
  };

})(window.App = window.App || {});