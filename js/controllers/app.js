/**
 * CONTROLADOR — Arranque
 * Carga las carreras guardadas (o la semilla si es la primera vez) y
 * dispara el primer render. Es el único punto de entrada de la aplicación.
 */
(function (App) {
  'use strict';

  App.Controller = App.Controller || {};
  const C = App.Controller;
  const M = App.Model;

  C.init = async function () {
    const coleccion = await M.cargarPlanes();
    C.state.planes = coleccion.planes;
    C.state.planActualId = coleccion.planActualId;
    C.sincronizarPlanActual();
    C.render();
  };

  // La configuración de pdf.js se protege con try/catch a propósito: si el
  // CDN no cargó (sin conexión, red que lo bloquea, etc.) `pdfjsLib` no
  // existe y esta línea tiraría una excepción. Sin el try/catch, esa
  // excepción corta el script ANTES de llegar a C.init(), y toda la app se
  // queda trabada en el "Cargando aplicación…" del index.html — no solo la
  // importación de PDF, que es la única función que en verdad depende de
  // esa librería (ver M.extraerMateriasDePdf, que valida esto mismo antes
  // de usarla).
  (function bootstrap() {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } catch (e) {
      console.warn('pdf.js no se pudo inicializar (¿sin conexión?). El resto de la app funciona normalmente; solo "Cargar desde PDF" no va a estar disponible.', e);
    }
    C.init();
  })();

})(window.App = window.App || {});
