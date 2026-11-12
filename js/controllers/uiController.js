/**
 * CONTROLADOR — UI: navegación, reactividad en vivo y eventos del DOM
 * Incluye tanto las acciones que abren/cierran el modal y cambian de
 * pestaña o de cursada, como la interactividad instantánea dentro del tab
 * de Parciales/Final que no requiere un render() completo (habilitar
 * recuperatorios, recalcular el promedio, mostrar/ocultar bloques del
 * Final), y finalmente `bindEvents`, que ata los listeners después de cada
 * render.
 */
(function (App) {
  'use strict';

  App.Controller = App.Controller || {};
  const C = App.Controller;
  const M = App.Model;
  const V = App.View;

  // Cierra el desplegable "Mis Paneles" de la navbar cuando se hace clic
  // fuera de él. Se ata una sola vez (guard por módulo): bindEvents se
  // re-ejecuta en cada render y no debe acumular listeners.
  let dropdownDocListenerAtado = false;
  function atarCierreDropdownFuera() {
    if (dropdownDocListenerAtado) return;
    dropdownDocListenerAtado = true;
    document.addEventListener('click', e => {
      if (C.state.panelMenuAbierto && !e.target.closest('.navbar-menu')) {
        C.state.panelMenuAbierto = false;
        C.render();
      }
    });
  }

  C.abrirDetalle = function (id) { C.abrirModal({ tipo: 'detalle', id, cursadaId: null }); };

  C.verCursada = function (materiaId, cursadaId) {
    const m = C.state.plan.materias.find(x => x.id === materiaId);
    if (m) C.sincronizarFormularioDetalle(M.obtenerCursadaPorId(m, C.state.modalEstado.cursadaId));
    C.state.modalEstado.cursadaId = cursadaId;
    C.state.tabActivaModal = 'estado';
    C.render();
  };

  C.volverActual = function (materiaId) {
    const m = C.state.plan.materias.find(x => x.id === materiaId);
    if (m) C.sincronizarFormularioDetalle(M.obtenerCursadaPorId(m, C.state.modalEstado.cursadaId));
    C.state.modalEstado.cursadaId = null;
    C.state.tabActivaModal = 'estado';
    C.render();
  };

  // Los parciales extras se agregan/quitan en el lugar (sin re-renderizar el
  // modal): se modifica el modelo, se inserta/elimina la tarjeta y se persiste.
  C.agregarParcial = function () {
    const m = C.state.plan.materias.find(x => x.id === C.state.modalEstado.id);
    if (!m) return;
    const cur = M.obtenerCursadaPorId(m, C.state.modalEstado.cursadaId);
    C.sincronizarFormularioDetalle(cur);
    const idx = cur.parciales.length;
    cur.parciales.push(M.crearParcialVacio());
    const key = 'p' + (idx + 1);
    const addRow = document.getElementById('add-parcial-row');
    if (addRow) {
      addRow.insertAdjacentHTML('beforebegin', V.renderParcialCard(m.id, cur.id, key, M.etiquetaParcial(key), cur.parciales[idx]));
    }
    const btnQuitar = document.getElementById('btn-quitar-parcial');
    if (btnQuitar) btnQuitar.style.display = 'inline-block';
    C.onPromedioRecalc();
    M.guardarPlanes(C.state.planes, C.state.planActualId);
  };

  C.quitarParcial = function () {
    const m = C.state.plan.materias.find(x => x.id === C.state.modalEstado.id);
    if (!m) return;
    const cur = M.obtenerCursadaPorId(m, C.state.modalEstado.cursadaId);
    C.sincronizarFormularioDetalle(cur);
    if (cur.parciales.length <= 2) return;
    if (!confirm('¿Quitar el último parcial? Se pierde su temario y notas.')) return;
    cur.parciales.pop();
    const cards = document.querySelectorAll('#pestana-parciales [data-parcial-key]');
    if (cards.length) cards[cards.length - 1].closest('.eval-card').remove();
    const btnQuitar = document.getElementById('btn-quitar-parcial');
    if (btnQuitar) btnQuitar.style.display = cur.parciales.length > 2 ? 'inline-block' : 'none';
    C.onPromedioRecalc();
    M.guardarPlanes(C.state.planes, C.state.planActualId);
  };

  C.switchTab = function (tab) {
    C.state.tabActivaModal = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const target = document.querySelector(`.tab-content[data-tab="${tab}"]`);
    if (target) target.classList.add('active');
  };

  C.addReq = function (id) {
    if (!C.state.tempReqs.includes(id)) C.state.tempReqs.push(id);
    C.state.busquedaCorrelativa = '';
    C.render();
  };
  C.removeReq = function (id) {
    C.state.tempReqs = C.state.tempReqs.filter(x => x !== id);
    C.render();
  };

  // -- Interactividad en vivo dentro del tab de Parciales (sin re-render) ----
  C.onNotaParcialInput = function (pKey) {
    const notaInput = document.querySelector(`[name="${pKey}_nota"]`);
    if (!notaInput) return;
    const nota = notaInput.value;
    const habilitado = nota !== '' && Number(nota) < 4;

    document.querySelectorAll(`[data-rec-of="${pKey}"]`).forEach(inp => { inp.disabled = !habilitado; });

    const box = document.getElementById(`rec-box-${pKey}`);
    if (box) {
      box.style.display = habilitado ? 'block' : 'none';
      box.classList.toggle('disabled', !habilitado);
    }

    const msg = document.getElementById(`rec-msg-${pKey}`);
    if (msg) {
      msg.textContent = nota === ''
        ? 'Todavía no se cargó una nota para este parcial.'
        : (habilitado ? 'Recuperatorio habilitado (nota menor a 4).' : 'Parcial aprobado — el recuperatorio no está disponible.');
      msg.classList.toggle('ok', habilitado);
    }

    C.onPromedioRecalc();
  };

  C.onPromedioRecalc = function () {
    let suma = 0, cuenta = 0;
    document.querySelectorAll('[data-parcial-key]').forEach(card => {
      const k = card.getAttribute('data-parcial-key');
      const rec = card.querySelector(`[name="${k}r_nota"]`);
      const base = card.querySelector(`[name="${k}_nota"]`);
      let val = null;
      if (rec && rec.value !== '') val = Number(rec.value);
      else if (base && base.value !== '') val = Number(base.value);
      if (val !== null && !isNaN(val)) { suma += val; cuenta++; }
    });
    const el = document.getElementById('promedio-parciales-valor');
    if (el) el.textContent = cuenta ? (suma / cuenta).toFixed(2) : '—';
  };

  C.onFinalModalidadChange = function () {
    const val = document.querySelector('[name="final_modalidad"]').value;
    const esFinal = val === 'final' || val === 'finalO';
    const blocks = { pendiente: 'final-block-pendiente', promocion: 'final-block-promocion', final: 'final-block-final' };
    Object.keys(blocks).forEach(k => {
      const el = document.getElementById(blocks[k]);
      if (el) el.style.display = (k === val) || (k === 'final' && esFinal) ? 'block' : 'none';
    });
  };
  C.onFinalEstadoChange = function () {
    const val = document.querySelector('[name="final_sub_estado"]').value;
    const recBlock = document.getElementById('final-rec-block');
    if (recBlock) recBlock.style.display = (val === 'desaprobado') ? 'block' : 'none';
  };

  // -- Atado de eventos del DOM (se re-ejecuta después de cada render) -------
  C.bindEvents = function () {
    const state = C.state;

    atarCierreDropdownFuera();
    C.bindEventsInicio();

    const btnIrMisPaneles = document.getElementById('btn-ir-mispaneles');
    if (btnIrMisPaneles) btnIrMisPaneles.addEventListener('click', () => C.irAMisPaneles());

    const planTitulo = document.getElementById('plan-titulo');
    if (planTitulo) planTitulo.addEventListener('change', async e => {
      state.plan.titulo = e.target.value;
      await M.guardarPlanes(state.planes, state.planActualId);
    });

    const btnNueva = document.getElementById('btn-nueva');
    if (btnNueva) btnNueva.addEventListener('click', () => C.nuevaMateria());

    const btnVaciar = document.getElementById('btn-vaciar');
    if (btnVaciar) btnVaciar.addEventListener('click', async () => {
      if (confirm('¿Vaciar todas las materias del plan actual?')) {
        state.plan.materias = [];
        await C.guardarPlanYRenderizar();
      }
    });

    // El input de archivo vive fuera de #app (en el shell de index.html), así
    // que sobrevive a todos los renders: usamos asignación directa (no
    // addEventListener) para no acumular un listener repetido por cada
    // render. Los botones que lo disparan (uno en el Panel, otro en Inicio)
    // sí viven dentro de #app y se re-atan sin problema en cada pasada.
    const pdfInput = document.getElementById('pdf-input');
    if (pdfInput) {
      pdfInput.onchange = e => {
        if (e.target.files.length) C.procesarPDF(e.target.files[0]);
      };
    }

    const btnPdf = document.getElementById('btn-pdf');
    if (btnPdf && pdfInput) btnPdf.addEventListener('click', () => pdfInput.click());

    document.querySelectorAll('.filter-btn').forEach(b => {
      b.addEventListener('click', () => { state.filtroActual = b.dataset.nivel; C.render(); });
    });

    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.addEventListener('click', e => { if (e.target === overlay) C.cerrarModal(); });

      const btnCancelar = document.getElementById('btn-cancelar');
      if (btnCancelar) btnCancelar.addEventListener('click', C.cerrarModal);

      const btnCerrarX = document.getElementById('btn-cerrar-x');
      if (btnCerrarX) btnCerrarX.addEventListener('click', C.cerrarModal);

      const formDetalle = document.getElementById('form-detalle-materia');
      if (formDetalle) {
        const cid = state.modalEstado.cursadaId || null;
        formDetalle.addEventListener('submit', e => C.guardarDetalleMateria(e, state.modalEstado.id, cid));
      }

      const formCrear = document.getElementById('form-crear-materia');
      if (formCrear) formCrear.addEventListener('submit', e => C.guardarMateriaForm(e, state.modalEstado.tipo === 'editar' ? state.modalEstado.id : null));

      const searchInput = document.getElementById('req-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          state.busquedaCorrelativa = e.target.value;
          C.render();
          const inp = document.getElementById('req-search-input');
          if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
        });
      }
    }
  };

})(window.App = window.App || {});
