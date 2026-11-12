/**
 * MODELO — Semilla de datos
 * Plan de ejemplo que se usa la primera vez que se abre la app (sin datos
 * guardados todavía). Se define en formato legado a propósito: al pasar por
 * normalizarPlan() se ejerce el mismo camino de migración que usa un usuario
 * real con datos viejos, en vez de mantener dos formatos distintos a mano.
 */
(function (App) {
  'use strict';

  App.Model = App.Model || {};
  const M = App.Model;

  function materiaSemilla(datos) {
    return Object.assign({
      req: [], reqCreds: 0, estado: 'Pendiente',
      p1: null, p2: null, p3: null, rec1: null, rec2: null, rec3: null,
      fechaP1: '', fechaP2: '', fechaP3: '', fechaRec1: '', fechaRec2: '', fechaRec3: '',
      notasP1: '', notasP2: '', notasP3: '', notasRec1: '', notasRec2: '', notasRec3: '',
      finalNota: null, notaCierre: null, fechaCierre: '', avances: '', porcentajeAvance: 0
    }, datos);
  }

  const CARRERA_SEMILLA = 'Ingeniería Informática';
  const FACULTAD_SEMILLA = 'FIUBA';

  M.planSemilla = M.normalizarPlan({
    titulo: M.construirTitulo(CARRERA_SEMILLA, FACULTAD_SEMILLA),
    carrera: CARRERA_SEMILLA,
    facultad: FACULTAD_SEMILLA,
    materias: [
      materiaSemilla({ id: 'cbc-1', nombre: 'Introducción al Conocimiento de la Sociedad y el Estado', nivel: 'CBC', creditos: 4 }),
      materiaSemilla({ id: 'cbc-2', nombre: 'Introducción al Pensamiento Científico', nivel: 'CBC', creditos: 4 }),
      materiaSemilla({ id: 'cbc-3', nombre: 'Análisis Matemático A', nivel: 'CBC', creditos: 9 }),
      materiaSemilla({ id: 'cbc-4', nombre: 'Álgebra A', nivel: 'CBC', creditos: 9 }),
      materiaSemilla({ id: 'cbc-5', nombre: 'Física', nivel: 'CBC', creditos: 6 }),
      materiaSemilla({ id: 'cbc-6', nombre: 'Pensamiento Computacional', nivel: 'CBC', creditos: 6 }),
      materiaSemilla({ id: 'm-3', nombre: 'Análisis Matemático II', nivel: '3º Cuatrimestre', creditos: 8, req: ['cbc-3', 'cbc-4'] }),
      materiaSemilla({ id: 'm-4', nombre: 'Fundamentos de Programación', nivel: '3º Cuatrimestre', creditos: 6, req: ['cbc-6'] }),
      materiaSemilla({ id: 'm-5', nombre: 'Introducción al Desarrollo de Software', nivel: '3º Cuatrimestre', creditos: 6, req: ['cbc-6'] })
    ]
  });

})(window.App = window.App || {});
