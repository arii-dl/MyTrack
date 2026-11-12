/**
 * MODELO — Almacenamiento
 * Única capa que toca localStorage. Guarda la colección completa de
 * carreras (`{ planes, planActualId }`) bajo una sola clave.
 *
 * Al cargar intenta, en orden: el formato vigente (v7, colección), luego el
 * formato anterior de una sola carrera (v6, v5, v4 — migrando
 * automáticamente esa carrera como la única de la colección), y por último
 * la semilla de datos por defecto para una instalación nueva.
 */
(function (App) {
  'use strict';

  App.Model = App.Model || {};
  const M = App.Model;

  async function cargarPlanes() {
    try {
      const res = localStorage.getItem(M.STORAGE_KEY_PLANES);
      if (res) return M.normalizarColeccion(JSON.parse(res));
    } catch (e) { console.warn('Error leyendo almacenamiento v7', e); }

    // Compatibilidad: instalaciones de antes de multi-carrera tenían UNA
    // sola carrera guardada suelta (sin envolver en colección). La migra
    // como la única carrera de una colección nueva.
    for (const key of [M.STORAGE_KEY, M.STORAGE_KEY_V5, M.STORAGE_KEY_LEGACY]) {
      try {
        const previo = localStorage.getItem(key);
        if (previo) {
          const planMigrado = M.normalizarPlan(JSON.parse(previo));
          const coleccion = { planes: [planMigrado], planActualId: planMigrado.id };
          await guardarPlanes(coleccion.planes, coleccion.planActualId);
          return coleccion;
        }
      } catch (e) { console.warn('Error migrando almacenamiento ' + key, e); }
    }

    const semilla = JSON.parse(JSON.stringify(M.planSemilla));
    return { planes: [semilla], planActualId: semilla.id };
  }

  async function guardarPlanes(planes, planActualId) {
    try { localStorage.setItem(M.STORAGE_KEY_PLANES, JSON.stringify({ planes, planActualId })); return true; }
    catch (e) { console.error('Error al guardar datos:', e); return false; }
  }

  M.cargarPlanes = cargarPlanes;
  M.guardarPlanes = guardarPlanes;

})(window.App = window.App || {});
