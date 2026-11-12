/**
 * VISTA — Helpers de formateo
 * Funciones puras de texto usadas por el resto de las vistas.
 */
(function (App) {
  'use strict';

  App.View = App.View || {};

  App.View.escapeHtml = function (s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  App.View.fmtNota = function (n) {
    return (n === null || n === undefined || n === '') ? '—' : Number(n).toFixed(1);
  };

})(window.App = window.App || {});
