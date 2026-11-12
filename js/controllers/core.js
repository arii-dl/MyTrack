/**
 * CONTROLADOR — Núcleo
 * Mantiene el único estado mutable de la aplicación en tiempo de ejecución y
 * expone `render()`: el punto de entrada que pinta la Vista a partir de ese
 * estado y vuelve a atar los eventos del DOM recién generado.
 *
 * Nada fuera de este archivo debería tocar `App.Controller.state` sin pasar
 * por una función del controlador.
 */
(function (App) {
  'use strict';

  App.Controller = App.Controller || {};
  const C = App.Controller;
  const M = App.Model;
  const V = App.View;

  C.state = {
    planes: [],                 // todas las carreras guardadas
    planActualId: null,         // id de la carrera que se está viendo/editando
    plan: null,                 // == planes.find(p => p.id === planActualId); ver sincronizarPlanActual()
    pantalla: 'inicio',         // 'inicio' (landing informativo) | 'mispaneles' (grilla de tableros) | 'panel' (grilla de materias)
    panelMenuAbierto: false,    // desplegable "Mis Paneles" de la navbar
    creandoTablero: false,      // true mientras se está completando el formulario de un tablero nuevo
    editandoTableroId: null,    // id del tablero cuyo formulario de datos está abierto (null si no)
    datosCursadaGuardado: false, // true justo después de guardar carrera/facultad, para mostrar la confirmación
    filtroActual: 'todas',
    modalEstado: null,          // { tipo: 'detalle'|'nueva'|'editar', id, cursadaId }
    busquedaCorrelativa: '',
    tabActivaModal: 'estado',
    fotoBorrador: undefined,    // foto del tablero en edición: undefined = sin cambios | null = quitar | dataURL = nueva
    tempReqs: []                // borrador de correlativas del formulario nueva/editar
  };

  // `state.plan` es siempre la MISMA referencia que su entrada dentro de
  // `state.planes` — así el resto del código (controllers de materia/temas,
  // las vistas) puede seguir leyendo y mutando `state.plan` exactamente
  // como si solo existiera una carrera, sin enterarse de que hay más.
  // Se llama después de cargar datos y cada vez que cambia planActualId.
  C.sincronizarPlanActual = function () {
    const state = C.state;
    state.plan = state.planes.find(p => p.id === state.planActualId) || state.planes[0] || null;
    if (state.plan) state.planActualId = state.plan.id;
  };

  // Acceso robusto a campos de formulario por nombre (usa la API estándar
  // `elements.namedItem`, más explícita y confiable que `form.campo`).
  C.campoForm = function (f, nombre) {
    const el = f.elements.namedItem(nombre);
    return el ? el.value : '';
  };

  // Antes de cualquier acción rápida que dispare un render() completo
  // (recursar, cambiar de cursada del historial, tocar el checklist de
  // temas), volcamos a `cur` los campos simples que el usuario pudo haber
  // tocado sin haber apretado todavía "Guardar Cambios", para no perder
  // esos datos.
  C.sincronizarFormularioDetalle = function (cur) {
    const f = document.getElementById('form-detalle-materia');
    if (!f || !cur) return;
    const val = nombre => { const el = f.elements.namedItem(nombre); return el ? el.value : undefined; };

    const estado = val('estado'); if (estado !== undefined) cur.estado = estado;
    const notaCierre = val('notaCierre'); if (notaCierre !== undefined) cur.notaCierre = notaCierre !== '' ? Number(notaCierre) : null;
    const fechaCierre = val('fechaCierre'); if (fechaCierre !== undefined) cur.fechaCierre = fechaCierre || '';
    const observaciones = val('observaciones'); if (observaciones !== undefined) cur.observaciones = observaciones || '';

    M.clavesParciales(cur).forEach(k => {
      const p = M.obtenerParcialPorClave(cur, k);
      const fecha = val(k + '_fecha'); if (fecha !== undefined) p.fecha = fecha;
      const nota = val(k + '_nota'); if (nota !== undefined) p.nota = nota !== '' ? Number(nota) : null;
      const rfecha = val(k + 'r_fecha'); if (rfecha !== undefined) p.recuperatorio.fecha = rfecha;
      const rnota = val(k + 'r_nota'); if (rnota !== undefined) p.recuperatorio.nota = rnota !== '' ? Number(rnota) : null;
    });
  };

  C.guardarPlanYRenderizar = async function () {
    await M.guardarPlanes(C.state.planes, C.state.planActualId);
    C.render();
  };

  C.abrirModal = function (estado) {
    C.state.modalEstado = estado;
    C.state.busquedaCorrelativa = '';
    C.state.tabActivaModal = 'estado';
    C.render();
  };

  C.cerrarModal = function () {
    C.state.modalEstado = null;
    C.render();
  };

  C.render = function () {
    const state = C.state;

    const app = document.getElementById('app');
    app.innerHTML = V.renderApp(state);

    C.bindEvents();

    // Sincroniza el estado visual (habilitado/deshabilitado) de recuperatorios y promedio al abrir el modal
    if (state.modalEstado && state.modalEstado.tipo === 'detalle') {
      const m = state.plan.materias.find(x => x.id === state.modalEstado.id);
      if (m) {
        const cur = M.obtenerCursadaPorId(m, state.modalEstado.cursadaId);
        M.clavesParciales(cur).forEach(k => { if (document.querySelector(`[name="${k}_nota"]`)) C.onNotaParcialInput(k); });
      }
    }
  };

})(window.App = window.App || {});
