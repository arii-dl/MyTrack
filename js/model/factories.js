/**
 * MODELO — Fábricas
 * Funciones puras que construyen las entidades del dominio con sus valores
 * por defecto. Ninguna de estas funciones toca el DOM ni el almacenamiento.
 *
 * Jerarquía de datos:
 *   Materia -> Cursadas[] (historial: la cursada original + cada recursada)
 *              Cursada -> Parciales (p1, p2 fijos + extras opcionales) + Final
 *                         Parcial -> Temas[] (checklist) + Recuperatorio
 */
(function (App) {
  'use strict';

  App.Model = App.Model || {};

  function uid(prefix) {
    return (prefix || 'm') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Un "tema" es un ítem del checklist de estudio de un parcial/recuperatorio.
  // estado: 'falta' (falta estudiar) | 'repasar' (hay que repasar) | 'estudiado'
  function crearTemaVacio(texto) {
    return { id: uid('t'), texto: texto, estado: 'falta' };
  }

  function crearParcialVacio() {
    return {
      fecha: '', temas: [], nota: null,
      recuperatorio: { fecha: '', temas: [], nota: null }
    };
  }

  function crearCursadaVacia(numero) {
    return {
      id: uid('c'),
      numero: numero,
      fechaInicio: new Date().toISOString().slice(0, 10),
      estado: 'En Cursada', // 'Pendiente' | 'En Cursada' | 'Aprobada' | 'Libre'
      notaCierre: null,
      fechaCierre: '',
      observaciones: '',
      parciales: [crearParcialVacio(), crearParcialVacio()], // p1, p2 fijos; los extras se agregan al final
      final: {
        modalidad: 'pendiente', // 'promocion' | 'final' | 'pendiente'
        estado: 'Sin Rendir',   // 'Sin Rendir' | 'Aprobado' | 'Desaprobado'
        fecha: '', nota: null, observaciones: '',
        recuperatorios: [] // hasta 3: [{ fecha, nota, observaciones }]
      }
    };
  }

  function crearMateriaBase(datos) {
    const cursadaInicial = crearCursadaVacia(1);
    cursadaInicial.estado = 'Pendiente';
    return Object.assign({
      id: uid(), nombre: '', nivel: '', creditos: 6, req: [], reqCreds: 0,
      estado: 'Pendiente',
      cursadaActualId: cursadaInicial.id,
      cursadas: [cursadaInicial]
    }, datos || {});
  }

  // Una carrera nueva arranca sin materias: cada carrera es independiente,
  // así que no tiene sentido copiarle el plan de estudios de otra.
  function crearPlanBase(datos) {
    return Object.assign({
      id: uid('plan'), titulo: '', carrera: '', facultad: '', materias: []
    }, datos || {});
  }

  App.Model.uid = uid;
  App.Model.crearTemaVacio = crearTemaVacio;
  App.Model.crearParcialVacio = crearParcialVacio;
  App.Model.crearCursadaVacia = crearCursadaVacia;
  App.Model.crearMateriaBase = crearMateriaBase;
  App.Model.crearPlanBase = crearPlanBase;

})(window.App = window.App || {});
