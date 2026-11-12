/**
 * MODELO — Constantes
 * Claves de localStorage. STORAGE_KEY_PLANES es el formato vigente (una
 * colección de carreras); las demás se usan solo para migrar
 * automáticamente instalaciones con datos viejos (una sola carrera).
 */
(function (App) {
  'use strict';

  App.Model = App.Model || {};

  App.Model.STORAGE_KEY_PLANES = 'plan-academico-planes-v7';
  App.Model.STORAGE_KEY = 'plan-academico-datos-v6';
  App.Model.STORAGE_KEY_V5 = 'plan-academico-datos-v5';
  App.Model.STORAGE_KEY_LEGACY = 'plan-academico-datos-v4';

})(window.App = window.App || {});
