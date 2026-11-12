/**
 * CONTROLADOR — Inicio, Mis Paneles y Panel
 * Navegación entre las pantallas de Inicio (landing informativo), Mis
 * Paneles (grilla tipo Trello con todos los tableros) y el Panel (grilla de
 * materias del tablero activo); alta, selección, edición y baja de
 * tableros; y guardado de los datos de cursada (carrera y facultad) del
 * tablero que se esté creando o editando.
 *
 * Cada tablero es un plan independiente (su propio título, materias y
 * correlativas) dentro de `state.planes`. `state.planActualId` dice cuál es
 * el que se ve en el Panel; `state.plan` es siempre ese mismo plan (ver
 * `C.sincronizarPlanActual` en core.js), así que el resto de la app
 * (materiaController, temasController, las vistas del Panel y del modal)
 * no necesita saber que puede haber más de uno.
 */
(function (App) {
  'use strict';

  App.Controller = App.Controller || {};
  const C = App.Controller;
  const M = App.Model;

  C.irAInicio = function () {
    C.state.pantalla = 'inicio';
    C.state.datosCursadaGuardado = false;
    C.state.panelMenuAbierto = false;
    C.render();
    window.scrollTo(0, 0);
  };

  C.irAMisPaneles = function () {
    C.descartarFotoBorrador();
    C.state.pantalla = 'mispaneles';
    C.state.creandoTablero = false;
    C.state.editandoTableroId = null;
    C.state.panelMenuAbierto = false;
    C.state.datosCursadaGuardado = false;
    C.render();
    window.scrollTo(0, 0);
  };

  C.irAPanel = function () {
    C.state.pantalla = 'panel';
    C.state.panelMenuAbierto = false;
    C.render();
    window.scrollTo(0, 0);
  };

  // Despliega/pliega el menú "Mis Paneles" de la navbar (solo cambia el
  // estado; el HTML lo decide navbarView.js).
  C.togglePanelMenu = function () {
    C.state.panelMenuAbierto = !C.state.panelMenuAbierto;
    C.render();
  };

  // Abre el tablero indicado (desde el dropdown de la navbar o desde la
  // grilla de Mis Paneles) y entra directo a su Panel.
  C.abrirPanel = function (id) {
    C.state.panelMenuAbierto = false;
    C.seleccionarCarrera(id);
  };

  // Elige qué tablero pasa a ser el actual y entra directo a su Panel.
  // También la usan la grilla de Mis Paneles y el dropdown de la navbar
  // (vía abrirPanel).
  C.seleccionarCarrera = function (id) {
    C.state.planActualId = id;
    C.sincronizarPlanActual();
    C.state.filtroActual = 'todas';
    C.state.panelMenuAbierto = false;
    C.irAPanel();
  };

  // Un tablero nuevo arranca en blanco (sin materias: ver M.crearPlanBase)
  // y pasa a ser el actual; quedamos en Mis Paneles con su formulario
  // abierto para completar carrera/facultad (y opcionalmente importar el
  // PDF de su plan de estudios).
  C.crearCarrera = async function () {
    const nuevoPlan = M.crearPlanBase({});
    C.state.planes.push(nuevoPlan);
    C.state.planActualId = nuevoPlan.id;
    C.sincronizarPlanActual();
    C.descartarFotoBorrador();
    C.state.creandoTablero = true;
    C.state.editandoTableroId = null;
    C.state.datosCursadaGuardado = false;
    C.state.pantalla = 'mispaneles';
    C.state.panelMenuAbierto = false;
    await M.guardarPlanes(C.state.planes, C.state.planActualId);
    C.render();
    const input = document.getElementById('input-carrera');
    if (input) input.focus();
  };

  // La navbar invita a "Nuevo Tablero" desde su dropdown; es el mismo flujo.
  C.crearPanel = C.crearCarrera;

  // Abre el formulario de datos de un tablero existente, en Mis Paneles.
  C.editarTablero = function (id) {
    C.descartarFotoBorrador();
    C.state.editandoTableroId = id;
    C.state.creandoTablero = false;
    C.state.datosCursadaGuardado = false;
    C.state.pantalla = 'mispaneles';
    C.render();
  };

  // Cierra el formulario de creación. Si el tablero nuevo quedó en blanco
  // (ni nombre ni materias) y quedan otros, se descarta para no acumular
  // tableros vacíos.
  C.cancelarCreacion = async function () {
    const state = C.state;
    const plan = state.plan;
    const enBlanco = plan && !(plan.carrera || plan.facultad || (plan.materias && plan.materias.length > 0));
    if (enBlanco && state.planes.length > 1) {
      state.planes = state.planes.filter(p => p.id !== plan.id);
      if (state.planActualId === plan.id) state.planActualId = state.planes[0].id;
      C.sincronizarPlanActual();
      await M.guardarPlanes(state.planes, state.planActualId);
    }
    state.creandoTablero = false;
    state.editandoTableroId = null;
    C.descartarFotoBorrador();
    C.render();
  };

  // Nunca deja la colección sin ningún tablero: si el que se borra es el
  // actual, el actual pasa a ser otro que quede.
  C.eliminarCarrera = async function (id) {
    if (C.state.planes.length <= 1) {
      alert('No podés eliminar tu único tablero. Si querés reiniciarlo, usá "Vaciar Plan" desde el Panel.');
      return;
    }
    const plan = C.state.planes.find(p => p.id === id);
    const nombre = (plan && (plan.carrera || plan.titulo)) || 'este tablero';
    if (!confirm(`¿Eliminar "${nombre}"? Se van a perder todas sus materias y su historial.`)) return;

    C.state.planes = C.state.planes.filter(p => p.id !== id);
    if (C.state.planActualId === id) C.state.planActualId = C.state.planes[0].id;
    if (C.state.editandoTableroId === id) C.state.editandoTableroId = null;
    C.state.creandoTablero = false;
    C.sincronizarPlanActual();
    await M.guardarPlanes(C.state.planes, C.state.planActualId);
    C.render();
  };

  // Guarda carrera y facultad del tablero — el actual si es creación, o el
  // que esté en edición — y con esos datos deriva el título de su Panel (ver
  // M.construirTitulo). Se llama al enviar el formulario de datos que vive
  // en Mis Paneles (antes estaba al fondo de Inicio).
  C.guardarDatosCursada = async function (e) {
    e.preventDefault();
    const f = e.target;
    const estado = C.state;
    const plan = (estado.editandoTableroId && estado.planes.find(p => p.id === estado.editandoTableroId)) || estado.plan;
    plan.carrera = C.campoForm(f, 'carrera').trim();
    plan.facultad = C.campoForm(f, 'facultad').trim();
    const fotoPrevia = plan.foto;
    C.aplicarFotoBorrador(plan);

    const tituloGenerado = M.construirTitulo(plan.carrera, plan.facultad);
    if (tituloGenerado) plan.titulo = tituloGenerado; // si borraron ambos campos, no pisa el título existente

    const ok = await M.guardarPlanes(estado.planes, estado.planActualId);
    if (!ok) {
      // Casi seguro: la foto no entró en el almacenamiento del navegador.
      if (fotoPrevia) plan.foto = fotoPrevia; else delete plan.foto;
      alert('No se pudo guardar: no hay espacio suficiente en el navegador. Probá sin la foto o con una más chica.');
      return;
    }
    estado.datosCursadaGuardado = true;

    if (estado.creandoTablero) {
      // Primer armado del tablero: el formulario ya cumplió su parte; se
      // entra directo al Panel del tablero recién creado.
      estado.creandoTablero = false;
      estado.editandoTableroId = null;
      C.irAPanel();
      return;
    }
    if (estado.editandoTableroId) estado.editandoTableroId = null;
    C.render();
  };

  // Ata los eventos del formulario de datos de tablero (vive en Mis
  // Paneles). La llama bindEvents() (uiController.js) después de cada
  // render, como con el resto de la app.
  C.bindEventsInicio = function () {
    const formDatos = document.getElementById('form-datos-cursada');
    if (formDatos) formDatos.addEventListener('submit', C.guardarDatosCursada);
    C.bindEventsFoto();

    // Reutiliza el mismo <input type="file"> oculto que usa el Panel: el
    // disparador (este botón) vive dentro de #app y se recrea en cada
    // render, así que atarle un listener nuevo cada vez es seguro.
    const btnPdfInicio = document.getElementById('btn-pdf-inicio');
    const pdfInput = document.getElementById('pdf-input');
    if (btnPdfInicio && pdfInput) btnPdfInicio.addEventListener('click', () => pdfInput.click());
  };

})(window.App = window.App || {});
