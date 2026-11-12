/**
 * MODELO — Importación desde PDF
 * Funciones puras/asincrónicas: solo leen el archivo y devuelven un arreglo
 * de materias. No confirman nada con el usuario ni tocan el plan guardado
 * (esa orquestación vive en el controlador).
 *
 * `extraerMateriasDePdf(file)` prueba dos estrategias, de más a menos
 * específica:
 *
 *   1. `detectarMateriasTabla` — pensada para el formato más común de plan
 *      de estudios argentino: tabla con nombre / créditos / horas /
 *      correlativas, organizada en secciones "X CUATRIMESTRE". Reconstruye
 *      filas lógicas a partir de la posición de cada palabra en la página
 *      (pdf.js no da texto por fila, solo por palabra), agrupa correlativas
 *      y nombres que se cortan en dos líneas, y resuelve cada correlativa a
 *      la materia real comparando contra los nombres ya reconocidos en el
 *      resto del documento. Si el documento no tiene ninguna sección
 *      "X CUATRIMESTRE" reconocible, esta función no se aplica (devuelve []).
 *   2. `detectarMateriasEnLineas` — heurística genérica línea por línea,
 *      sin asumir tabla ni correlativas, para cualquier otro listado simple
 *      de materias. Sirve de resguardo cuando la primera no encuentra nada.
 *
 * Ninguna de las dos inventa datos: si no hay confianza suficiente, ambas
 * devuelven un array vacío en vez de arriesgar un resultado incorrecto — es
 * el llamador (materiaController) quien decide qué mostrarle al usuario
 * cuando eso pasa.
 *
 * `materiasDeEjemplo()` es un catálogo curado (plan de Ingeniería
 * Informática) que existe solo para que quien prueba la app tenga algo
 * para explorar; el controlador la ofrece explícitamente como "plan de
 * ejemplo", nunca como resultado de haber leído el PDF del usuario.
 */
(function (App) {
  'use strict';

  App.Model = App.Model || {};
  const M = App.Model;

  // ============================================================
  // Lectura del PDF y reconstrucción de líneas con posición
  // ============================================================

  // pdf.js devuelve el texto de una página como una lista plana de items con
  // posición (`item.transform`: transform[4]=x, transform[5]=y — el eje Y
  // de un PDF crece hacia ARRIBA, al revés que en pantalla), sin conservar
  // saltos de línea. Agrupamos los items cuya Y es prácticamente la misma en
  // una "línea", y les asignamos un orden de lectura continuo a lo largo de
  // TODO el documento (`orden`), no solo dentro de una página, para poder
  // comparar distancias entre líneas de páginas distintas sin ambigüedad.
  const OFFSET_PAGINA = 100000; // mayor a cualquier alto de página real (~850pt)

  function agruparEnLineasConPosicion(items, numPagina) {
    const grupos = []; // [{ y, items: [{x, str}] }]
    items.forEach(it => {
      const texto = (it.str || '').trim();
      if (!texto) return;
      const y = it.transform[5];
      let grupo = grupos.find(g => Math.abs(g.y - y) <= 2);
      if (!grupo) { grupo = { y, items: [] }; grupos.push(grupo); }
      grupo.items.push({ x: it.transform[4], str: texto });
    });
    return grupos
      .sort((a, b) => b.y - a.y) // de arriba hacia abajo dentro de la página
      .map(g => {
        const ordenados = g.items.slice().sort((a, b) => a.x - b.x);
        return {
          texto: ordenados.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim(),
          x0min: Math.min(...g.items.map(i => i.x)),
          orden: numPagina * OFFSET_PAGINA - g.y
        };
      })
      .filter(l => l.texto);
  }

  async function extraerLineasDelPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let lineas = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      lineas = lineas.concat(agruparEnLineasConPosicion(textContent.items, i));
    }
    return lineas;
  }

  // ============================================================
  // Estrategia 1: tabla de cuatrimestres con créditos y correlativas
  // ============================================================

  const ORDINALES = {
    PRIMER: '1º', SEGUNDO: '2º', TERCER: '3º', CUARTO: '4º', QUINTO: '5º',
    SEXTO: '6º', 'SÉPTIMO': '7º', SEPTIMO: '7º', OCTAVO: '8º', NOVENO: '9º',
    'DÉCIMO': '10º', DECIMO: '10º', 'UNDÉCIMO': '11º', 'DUODÉCIMO': '12º'
  };
  // "TERCER CUATRIMESTRE" / "Primer Cuatrimestre" (case-insensitive: cubre
  // ambos estilos de mayúsculas que aparecen en la práctica).
  const RE_SECCION = /^(PRIMER|SEGUNDO|TERCER|CUARTO|QUINTO|SEXTO|S[EÉ]PTIMO|OCTAVO|NOVENO|D[EÉ]CIMO|UND[EÉ]CIMO|DUOD[EÉ]CIMO)\s+CUATRIMESTRE/i;
  const RE_CBC = /^(Primer y segundo cuatrimestre|Ciclo B[aá]sico Com[uú]n)/i;
  // Un renglón que es SOLO un numeral romano (I, II, III...) suele ser un
  // encabezado de "Nivel"/"Año" más grueso que el cuatrimestre — nunca el
  // nombre de una materia. Ancla completa (^...$) a propósito: no debe
  // tocar nombres reales que solo CONTIENEN un numeral, como
  // "Administración I" o "Organizaciones II".
  const RE_NUMERAL_ROMANO_SOLO = /^[IVXLCDM]{1,4}$/;
  // Ruido de encabezados/pies de tabla que no es ninguna materia.
  const RE_SKIP_TABLA = /^(C[oó]digo|Asignaturas( obligatorias)?$|Total\b|Carga horaria total|ASIGNATURAS OBLIGATORIAS|ASIGNATURAS$|CR[EÉ]DIT|HORAS$|CORRELATIVAS$|OS \(Carga|\(Carga|horaria$|semanal\)|total\)|PRIMER CICLO|SEGUNDO CICLO|Ciclo B[aá]sico|Horaria Horaria|Semanal Total|ASIGNATURAS CR[EÉ]DIT|^[oó]$|Ordenanza\b|CARGA\s+HORARIA\s+TOTAL|M[ií]nimo requerido|Diferencia\s*\(a favor\)|Evaluaci[oó]n$|Desarrollo$|Actividades$|Laboratorio$|te[oó]rico$|laboratorio$|Hs\.?$|Hs\s*x\s*Sem$|^Plan de Estudio|^CARRERA:|^TITULO:|^\d+\.\s+Tabla de|^A[ñn]o\s+Nombre|^Nombre de la Asignatura|^R[eé]gimen|^CBC\s+Hs\b|^final$)/i;
  // OJO: sin flag /i a propósito. "TOTAL CRÉDITOS DEL PLAN" (mayúsculas) es
  // el cierre real del documento; "Total Créditos" (con minúsculas, el
  // subtotal que aparece al final de cada cuatrimestre/sección) NO debe
  // disparar esto — a ese lo filtra RE_SKIP_TABLA por separado.
  const RE_FIN_TABLA = /^TOTAL\s+(CR[EÉ]DITOS|HORAS|MATERIAS)/;
  // Metadata administrativa que puede aparecer INTERCALADA entre el nombre
  // y los números (régimen de cursada, carácter de la materia, número de
  // semestre) en formatos de tabla más ricos que el de créditos/horas
  // simple. Se retira antes de buscar el ancla: no aporta nada al modelo
  // de datos de la app y, si no se saca, contamina el nombre reconocido.
  // "Obligatoria"/"Electiva"/"Optativa" SOLO se tratan como ruido cuando
  // aparecen pegadas a una palabra de régimen (con o sin el número de
  // semestre en el medio) — igual que en la tabla de Administración. Sin
  // esa condición no se tocan, porque en otros formatos "Electiva" es
  // parte real del nombre de la materia (p. ej. "Electiva Programación").
  const RE_RUIDO_REGIMEN_CARACTER = /\b(Mensual|Semestral|Cuatrimestral|Anual)\s+(?:\d{1,2}°\s+)?(Obligatoria|Electiva|Optativa)\b/gi;
  const RE_RUIDO_REGIMEN = /\b(Mensual|Semestral|Cuatrimestral|Anual)\b/gi;
  // Un ordinal + símbolo de grado suelto en medio de la línea (semestre:
  // "1°", "2°") es ruido; el mismo patrón al PRINCIPIO de la línea es otra
  // cosa (el año de la materia — se extrae aparte, ver más abajo) y no debe
  // tocarse acá.
  // (el "N°" del PRINCIPIO de la línea ya se extrajo y se sacó de `t` antes
  // de llegar acá — ver RE_ANIO_INICIAL — así que cualquier "N°" que quede
  // en este punto es, con seguridad, ruido de semestre, no el año).
  const RE_RUIDO_SEMESTRE_MEDIO = /\s\d{1,2}°(?=\s|$)/g;
  // Año/nivel pegado como primer token de cada fila (formato "1° Materia
  // ...", en vez de un encabezado de sección aparte). "N°" usa el símbolo
  // de grado (°) tal como lo escriben estos PDF, no el ordinal "º".
  const RE_ANIO_INICIAL = /^(\d{1,2})°\s+/;
  // nombre (puede faltar del todo si quedó en una línea aparte) + una
  // corrida de 2 o más números (créditos/horas o el desglose de horas por
  // columna) + lo que sobre en la línea. Acepta separador decimal "." o ","
  // (algunos planes usan créditos fraccionarios, p. ej. "3.5").
  const NUM = '\\d+(?:[.,]\\d+)?';
  const RE_ANCHOR = new RegExp(`^(.*?)\\s*((?:${NUM}\\s+){1,}${NUM})\\s*(.*)$`);
  // Resguardo para filas con un solo número al final (p. ej. "Práctica
  // supervisada 150", sin desglose ni créditos separados de horas).
  const RE_ANCHOR_UN_NUMERO = new RegExp(`^(.+?[^\\d.,])\\s(${NUM})\\s*$`);

  // "6 de 12" (créditos variables según la opción elegida, común en
  // materias de tesis/trabajo final) → nos quedamos con el valor nominal
  // pleno (12) y evitamos que "de" ensucie el nombre reconocido.
  function normalizarFraccionCreditos(t) {
    return t.replace(/(\d+)\s+de\s+(\d+)/i, '$2');
  }

  function limpiarRuidoAdministrativo(t) {
    return t
      .replace(RE_RUIDO_REGIMEN_CARACTER, ' ')
      .replace(RE_RUIDO_REGIMEN, ' ')
      .replace(RE_RUIDO_SEMESTRE_MEDIO, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function limpiarNombre(n) {
    return n
      .replace(/^[-–:\s]+|[-–:\s]+$/g, '')
      .replace(/^\d{1,4}\s+/, '')  // código numérico inicial (p. ej. "24 Introducción...")
      .replace(/\s*\*+\s*$/, '')  // asterisco de nota al pie pegado al final del nombre
      .trim();
  }

  // Intenta reconocer nombre + créditos en una línea ya limpia de ruido.
  // Devuelve null si no encuentra números en absoluto. El nombre puede
  // volver VACÍO a propósito (no se rechaza acá): pasa cuando una fila trae
  // el código y los números pero el nombre, por ser largo, quedó solo en la
  // línea de al lado — el llamador lo completa después con las líneas
  // huérfanas cercanas, y recién ahí se descarta si sigue vacío.
  function intentarAncla(texto) {
    let m = RE_ANCHOR.exec(texto);
    if (m) {
      const nombre = limpiarNombre(m[1].trim());
      let resto = m[3].trim();
      let numeros = m[2].trim().split(/\s+/).map(s => parseFloat(s.replace(',', '.')));

      // "Se pasó de largo": si lo que sigue es una palabra de unidad SIN su
      // número (porque ese número quedó absorbido por la corrida, p. ej.
      // "140 Créditos" se partió en "...140" + "Créditos" suelto), el
      // último número en realidad pertenece a esa unidad, no a esta
      // materia — se lo devolvemos antes de decidir los créditos.
      if (numeros.length > 2 && /^(Cr[eé]ditos?|Horas?)\b/i.test(resto)) {
        const devuelto = numeros.pop();
        resto = `${devuelto} ${resto}`.trim();
      }
      if (numeros.length === 0) return null;

      // Con 2 números (el caso más común: créditos + horas, o dos columnas
      // de horas) el primero es el valor comparable entre materias. Con más
      // de 2 (una tabla con el desglose de horas por tipo de actividad,
      // p. ej. "80 40 40 160") el último es el total — el número que de
      // verdad representa el peso de la materia cuando hay desglose.
      let creditos;
      if (numeros.length === 2) creditos = numeros[0];
      else creditos = numeros[numeros.length - 1];

      if (creditos < 1 || creditos > 999) return null;
      return { nombre, creditos, resto };
    }

    m = RE_ANCHOR_UN_NUMERO.exec(texto);
    if (m) {
      const nombre = limpiarNombre(m[1].trim());
      const creditos = parseFloat(m[2].replace(',', '.'));
      if (!nombre || creditos < 1 || creditos > 999) return null;
      return { nombre, creditos, resto: '' };
    }
    return null;
  }

  function detectarMateriasTabla(lineas) {
    let nivelActual = null;
    let huboSeccion = false;
    const utiles = [];
    for (const l of lineas) {
      let t = l.texto.trim();
      if (!t) continue;
      const mSec = RE_SECCION.exec(t);
      if (mSec) {
        nivelActual = ORDINALES[mSec[1].toUpperCase()] || mSec[1];
        huboSeccion = true;
        continue;
      }
      if (RE_CBC.test(t)) { nivelActual = 'CBC'; continue; }
      if (RE_FIN_TABLA.test(t)) break; // totales finales: fin del listado de materias
      if (RE_SKIP_TABLA.test(t)) continue;
      if (RE_NUMERAL_ROMANO_SOLO.test(t)) continue; // "I" / "II" sueltos: nivel grueso, no es materia

      // Año pegado al principio de la fila (en vez de encabezado de
      // sección): se extrae como nivel PROPIO de esta línea, con prioridad
      // sobre nivelActual — no todos los documentos usan sección aparte.
      let nivelDeFila = null;
      const mAnio = RE_ANIO_INICIAL.exec(t);
      if (mAnio) {
        nivelDeFila = `${mAnio[1]}º Año`;
        t = t.slice(mAnio[0].length);
      }

      t = limpiarRuidoAdministrativo(normalizarFraccionCreditos(t));
      if (!t) continue;
      utiles.push({ texto: t, x0min: l.x0min, orden: l.orden, nivel: nivelDeFila || nivelActual });
    }
    // Confianza de que este documento es, en efecto, un plan de estudios en
    // tabla — no cualquier PDF con números y texto (una lista de precios
    // también tiene "nombre + un par de números" por renglón). Alcanza con
    // UNA sola señal: una sección reconocida, un año pegado a alguna fila,
    // o vocabulario típico de plan de estudios en cualquier parte del
    // texto. Sin ninguna de las tres, se lo dejamos a la heurística
    // genérica en vez de arriesgar materias inventadas de la nada.
    const huboVocabularioAcademico = /cuatrimestre|correlativ|cr[eé]ditos?|asignatura|plan de estudio|obligatoria|electiva|\bCBC\b/i
      .test(lineas.map(l => l.texto).join(' '));
    if (!huboSeccion && !utiles.some(l => l.nivel) && !huboVocabularioAcademico) return [];

    // "Anchors": líneas que sí traen nombre (si entraba en el ancho de la
    // columna) + los números de créditos/horas — cada una ancla una
    // materia. El resto de las líneas (nombres o correlativas que se
    // cortaron en dos, o quedaron solas cuando el nombre no entraba junto
    // a los números) se les asigna después.
    const anchors = [];
    const otras = [];
    utiles.forEach(l => {
      // Cualquier parseo exitoso se acepta como ancla, incluso con nombre
      // vacío (fila de solo código + números, con el nombre en la línea de
      // al lado — ver comentario de intentarAncla). El filtro por longitud
      // de nombre se aplica más abajo, DESPUÉS de fusionar las líneas
      // huérfanas de nombre, no acá.
      const intento = intentarAncla(l.texto);
      if (intento) {
        anchors.push({
          orden: l.orden, x0min: l.x0min, nombre: intento.nombre, creditos: intento.creditos,
          nivel: l.nivel, extraNombre: [], correlativasRaw: intento.resto ? [intento.resto] : [],
          extentTop: l.orden, extentBottom: l.orden
        });
      } else {
        otras.push(l);
      }
    });
    if (anchors.length === 0) return [];

    // ¿Esta tabla tiene una columna de correlativas de verdad? Lo sabemos
    // por evidencia, no por adivinar: si NINGÚN ancla trajo texto después
    // de sus números, no hay tal columna (caso Tecnicatura/Cs. Computación/
    // Administración, que no tienen correlativas) y toda línea huérfana que
    // arranque más a la derecha es, con total probabilidad, la continuación
    // de un nombre largo que se cortó en dos — no correlativas fantasma.
    const hayColumnaCorrelativas = anchors.some(a => a.correlativasRaw.some(r => r.trim()));

    // Nombre vs. correlativas: el nombre de materia siempre arranca pegado
    // al margen izquierdo de la tabla (igual que todos los anchors);
    // cualquier línea huérfana que empiece bastante más a la derecha de eso
    // es correlativas, no nombre — pero solo tiene sentido aplicar este
    // criterio si esta tabla en particular tiene esa columna.
    const umbralXNombre = hayColumnaCorrelativas ? Math.max(...anchors.map(a => a.x0min)) + 40 : Infinity;
    // Si dos materias quedan muy cerca verticalmente, una línea huérfana de
    // correlativas puede quedar casi empatada entre sus dos anchors. En vez
    // de apostar a una sola (y arriesgarse a perder una correlativa real),
    // se la ofrece a ambas: la resolución por nombre conocido, más abajo,
    // es la que en la práctica termina discriminando cuál la necesitaba.
    const MARGEN_EMPATE = 8;
    // Techo de distancia: una línea huérfana a más de esto de CUALQUIER
    // ancla (encabezados de página, títulos, numeración de página suelta
    // que ningún patrón de arriba llegó a reconocer) no es continuación de
    // nada — mejor perderla que pegarla a la materia más cercana por
    // descarte. Calibrado contra los casos reales: la continuación más
    // larga observada (nombre partido en tres líneas) quedó bastante por
    // debajo de esto; el ruido de encabezado quedó bastante por encima.
    const MAX_DISTANCIA_HUERFANA = 45;
    // Todo lo que aparece ANTES que la primerísima ancla del documento es,
    // con altísima probabilidad, encabezado de tabla (título, columnas
    // "Régimen / Semestre / Carácter..." que se cortan en 2-3 líneas) y no
    // el contenido de una celda que arranca un poco más arriba de su fila
    // — ESE caso (el que sí es legítimo, ver Tecnicatura) nunca se da
    // relativo a la primera ancla del documento entero, solo relativo a la
    // ancla PROPIA de cada materia. Por eso acá el techo es mucho más
    // chico que el general.
    const primerAnchorOrden = Math.min(...anchors.map(a => a.orden));
    const MAX_DISTANCIA_PRE_TABLA = 15;

    otras.slice().sort((x, y) => x.orden - y.orden).forEach(l => {
      // Un huérfano sin ninguna letra (numeración de página suelta, algún
      // símbolo aislado) no puede ser continuación de un nombre ni de una
      // correlativa real — se descarta directo.
      if (!/[a-záéíóúñ]/i.test(l.texto)) return;
      // Cuando el nivel viene pegado a cada fila (en vez de un encabezado
      // de sección que alcance a TODAS las líneas de esa sección), una
      // línea de continuación no lleva año propio — no tiene con qué
      // filtrar por nivel, así que se buscan candidatos entre TODAS las
      // anclas y se confía en la distancia (con su techo) para no cruzar
      // de año por error.
      const candidatos = l.nivel != null ? anchors.filter(a => a.nivel === l.nivel) : anchors;
      if (candidatos.length === 0) return;
      const techo = (l.orden < primerAnchorOrden) ? MAX_DISTANCIA_PRE_TABLA : MAX_DISTANCIA_HUERFANA;

      if (l.x0min < umbralXNombre) {
        // Nombre: un wrap de nombre casi siempre continúa DESPUÉS de su
        // ancla (se lee de izquierda a derecha y se corta hacia abajo).
        // Se mide contra el BORDE acumulado de cada ancla (extentTop/
        // extentBottom, que va creciendo a medida que se le van pegando
        // líneas), no contra su posición original: un nombre de 3 líneas
        // de largo va alejando ese borde de la posición original del
        // ancla, y medir siempre contra la posición original terminaría
        // pegando la ÚLTIMA línea del wrap a la materia SIGUIENTE por
        // pura cercanía geométrica, aunque en realidad sea la cola de la
        // anterior. Entre dos anclas, se prefiere la de ANTES salvo que
        // la de después esté CLARAMENTE más cerca (nunca por un margen
        // chico, que es la zona de ambigüedad real).
        const antes = candidatos
          .filter(a => l.orden > a.extentBottom)
          .map(a => ({ a, d: l.orden - a.extentBottom }))
          .sort((x, y) => x.d - y.d);
        const despues = candidatos
          .filter(a => l.orden < a.extentTop)
          .map(a => ({ a, d: a.extentTop - l.orden }))
          .sort((x, y) => x.d - y.d);
        const dAntes = antes.length ? antes[0].d : Infinity;
        const dDespues = despues.length ? despues[0].d : Infinity;
        let elegido = null;
        if (dDespues < Infinity && dDespues <= dAntes - MARGEN_EMPATE) elegido = despues[0].a;
        else if (dAntes < Infinity) elegido = antes[0].a;
        else if (dDespues < Infinity) elegido = despues[0].a;
        if (elegido && Math.min(dAntes, dDespues) <= techo) {
          elegido.extraNombre.push({ orden: l.orden, texto: l.texto });
          elegido.extentTop = Math.min(elegido.extentTop, l.orden);
          elegido.extentBottom = Math.max(elegido.extentBottom, l.orden);
        }
      } else {
        // Correlativas: acá sí conviene ofrecer el huérfano a todas las
        // anclas casi empatadas (ver comentario de MARGEN_EMPATE) — la
        // resolución por nombre conocido, más abajo, discrimina cuál la
        // necesitaba de verdad, algo que no existe para nombres.
        const distancias = candidatos.map(a => ({ a, d: Math.abs(a.orden - l.orden) })).sort((x, y) => x.d - y.d);
        const dMin = distancias[0].d;
        if (dMin > techo) return;
        distancias.filter(x => x.d <= dMin + MARGEN_EMPATE).forEach(x => x.a.correlativasRaw.push(l.texto));
      }
    });

    anchors.forEach(a => {
      const partesNombre = [{ orden: a.orden, texto: a.nombre }].concat(a.extraNombre)
        .sort((x, y) => x.orden - y.orden);
      a.nombreFinal = partesNombre.map(p => p.texto).join(' ').replace(/\s+/g, ' ').trim()
        .replace(/\s*\*+\s*$/, ''); // nota al pie ("*") que puede haber caído en la última línea de continuación
      a.correlativasTexto = a.correlativasRaw.filter(Boolean).join(' ').trim();
    });

    // Resolución de correlativas: no confiamos en el orden/puntuación del
    // texto (se degrada fácil en el wrap de una tabla), sino en buscar,
    // dentro de ese texto, los nombres de materia que YA reconocimos en
    // otra parte del documento. "CBC" y "NNN Créditos" son casos especiales
    // (correlativa por ciclo completo / por créditos acumulados, no por
    // una materia puntual).
    const nombresConocidos = Array.from(new Set(anchors.map(a => a.nombreFinal)))
      .filter(n => n.length >= 3)
      .sort((a, b) => b.length - a.length); // más largos primero: evita matches parciales

    function resolverCorrelativas(raw) {
      const limpio = raw.replace(/[,\n]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!limpio) return { reqCreds: 0, reqNombres: [] };
      const mCred = limpio.match(/^(\d{1,3})\s*Cr[eé]ditos?$/i);
      if (mCred) return { reqCreds: parseInt(mCred[1], 10), reqNombres: [] };
      if (/^CBC$/i.test(limpio)) return { reqCreds: 0, reqNombres: ['CBC'] };
      if (/^Contin[uú]a$/i.test(limpio)) return { reqCreds: 0, reqNombres: [] }; // referencia al cuatrimestre anterior, no a una materia puntual
      let resto = ' ' + limpio + ' ';
      const encontrados = [];
      nombresConocidos.forEach(nombre => {
        const patron = ' ' + nombre + ' ';
        const idx = resto.toLowerCase().indexOf(patron.toLowerCase());
        if (idx !== -1) {
          encontrados.push(nombre);
          resto = resto.slice(0, idx) + ' ' + resto.slice(idx + patron.length);
        }
      });
      return { reqCreds: 0, reqNombres: encontrados };
    }

    const materias = anchors
      .filter(a => a.nombreFinal.length >= 3)
      .map(a => {
        const { reqCreds, reqNombres } = resolverCorrelativas(a.correlativasTexto);
        return M.crearMateriaBase({
          nombre: a.nombreFinal, nivel: a.nivel || '', creditos: a.creditos,
          reqCreds, reqNombresTemp: reqNombres, req: []
        });
      });

    materias.forEach(mat => {
      (mat.reqNombresTemp || []).forEach(nombreReq => {
        if (nombreReq === 'CBC') {
          materias.filter(x => x.nivel === 'CBC').forEach(x => mat.req.push(x.id));
        } else {
          const objetivo = materias.find(x => x.nombre.toLowerCase().trim() === nombreReq.toLowerCase().trim());
          if (objetivo) mat.req.push(objetivo.id);
        }
      });
      delete mat.reqNombresTemp;
    });

    return materias;
  }

  // ============================================================
  // Estrategia 2: heurística genérica línea por línea (resguardo)
  // ============================================================
  // Para listados simples que no tienen la estructura de tabla de arriba
  // (sin créditos/horas en columnas, sin secciones "X Cuatrimestre"). No
  // intenta reconocer correlativas: el formato es demasiado variable como
  // para inferirlas de forma confiable sin la estructura de tabla.

  const PALABRAS_ENCABEZADO = /^(p[aá]gina|pag\.?|plan de estudios|universidad|facultad|departamento|carrera de|total|resoluci[oó]n|anexo|[ií]ndice)\b/i;

  function pareceNombreDeMateria(linea) {
    const l = linea.trim();
    if (l.length < 4 || l.length > 90) return false;
    if (/^\d+([.,]\d+)?$/.test(l)) return false;
    if (PALABRAS_ENCABEZADO.test(l)) return false;
    const palabrasConLetras = l.split(/\s+/).filter(p => /[a-záéíóúñ]/i.test(p));
    return palabrasConLetras.length >= 2;
  }

  function extraerNombreYCreditosGenerico(linea) {
    let texto = linea.trim();
    texto = texto.replace(/^[\dA-Z]{1,8}[.\-–:)]+\s*/, '');
    texto = texto.replace(/^\d{1,6}\s+(?=[A-ZÁÉÍÓÚÑ])/, '');
    let creditos = 6;
    const mCred = texto.match(/(\d{1,3})\s*(cr[eé]ditos?|cr\.?|hs\.?|horas?)\b/i);
    if (mCred) {
      const n = parseInt(mCred[1], 10);
      if (n > 0 && n <= 20) creditos = n;
    }
    texto = texto.replace(/[\d.,]+\s*(cr[eé]ditos?|cr\.?|hs\.?|horas?)\b.*$/i, '').trim();
    texto = texto.replace(/[\s\-–—:.]+$/, '').trim();
    return { nombre: texto, creditos };
  }

  function detectarMateriasEnLineas(lineasTexto) {
    const candidatas = lineasTexto.filter(pareceNombreDeMateria);
    if (candidatas.length < 3) return [];
    const vistos = new Set();
    const materias = [];
    candidatas.forEach(linea => {
      const { nombre, creditos } = extraerNombreYCreditosGenerico(linea);
      if (nombre.length < 3) return;
      const clave = nombre.toLowerCase();
      if (vistos.has(clave)) return;
      vistos.add(clave);
      materias.push(M.crearMateriaBase({ nombre, nivel: '', creditos, reqCreds: 0, req: [] }));
    });
    return (materias.length > 0 && materias.length <= 120) ? materias : [];
  }

  // ============================================================
  // Punto de entrada
  // ============================================================

  async function extraerMateriasDePdf(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('No se pudo cargar la librería para leer PDFs (revisá tu conexión a internet e intentá de nuevo).');
    }
    const lineas = await extraerLineasDelPdf(file);

    const porTabla = detectarMateriasTabla(lineas);
    if (porTabla.length >= 3) return porTabla;

    return detectarMateriasEnLineas(lineas.map(l => l.texto));
  }

  // -- Catálogo de ejemplo (Ingeniería Informática) -----------------------------
  // No proviene de ningún PDF: es contenido curado a mano para que quien
  // recién llega tenga un plan de estudios completo para explorar la app.
  // El controlador lo ofrece siempre de forma explícita, nunca como
  // resultado de "haber leído" el archivo del usuario.
  function materiasDeEjemplo() {
    const listaCatalogada = [
      { nombre: "Introducción al Conocimiento de la Sociedad y el Estado", nivel: "CBC", creditos: 4, reqNombres: [] },
      { nombre: "Introducción al Pensamiento Científico", nivel: "CBC", creditos: 4, reqNombres: [] },
      { nombre: "Análisis Matemático A", nivel: "CBC", creditos: 9, reqNombres: [] },
      { nombre: "Álgebra A", nivel: "CBC", creditos: 9, reqNombres: [] },
      { nombre: "Física", nivel: "CBC", creditos: 6, reqNombres: [] },
      { nombre: "Pensamiento Computacional", nivel: "CBC", creditos: 6, reqNombres: [] },
      { nombre: "Análisis Matemático II", nivel: "3º Cuatrimestre", creditos: 8, reqNombres: ["CBC"] },
      { nombre: "Fundamentos de Programación", nivel: "3º Cuatrimestre", creditos: 6, reqNombres: ["CBC"] },
      { nombre: "Introducción al Desarrollo de Software", nivel: "3º Cuatrimestre", creditos: 6, reqNombres: ["CBC"] },
      { nombre: "Álgebra Lineal", nivel: "4º Cuatrimestre", creditos: 8, reqNombres: ["CBC"] },
      { nombre: "Organización del Computador", nivel: "4º Cuatrimestre", creditos: 6, reqNombres: ["Introducción al Desarrollo de Software", "Fundamentos de Programación"] },
      { nombre: "Algoritmos y Estructuras de Datos", nivel: "4º Cuatrimestre", creditos: 6, reqNombres: ["Fundamentos de Programación"] },
      { nombre: "Probabilidad y Estadística", nivel: "5º Cuatrimestre", creditos: 6, reqNombres: ["Análisis Matemático II", "Álgebra Lineal"] },
      { nombre: "Teoría de Algoritmos", nivel: "5º Cuatrimestre", creditos: 6, reqNombres: ["Algoritmos y Estructuras de Datos", "Introducción al Desarrollo de Software"] },
      { nombre: "Sistemas Operativos", nivel: "5º Cuatrimestre", creditos: 6, reqNombres: ["Organización del Computador"] },
      { nombre: "Paradigmas de Programación", nivel: "5º Cuatrimestre", creditos: 6, reqNombres: ["Algoritmos y Estructuras de Datos", "Introducción al Desarrollo de Software"] },
      { nombre: "Base de Datos", nivel: "6º Cuatrimestre", creditos: 6, reqNombres: ["Organización del Computador", "Paradigmas de Programación"] },
      { nombre: "Modelación Numérica", nivel: "6º Cuatrimestre", creditos: 4, reqNombres: ["Análisis Matemático II", "Álgebra Lineal", "Algoritmos y Estructuras de Datos"] },
      { nombre: "Taller de Programación", nivel: "6º Cuatrimestre", creditos: 8, reqNombres: ["Organización del Computador", "Paradigmas de Programación"] },
      { nombre: "Ingeniería de Software I", nivel: "6º Cuatrimestre", creditos: 8, reqNombres: ["Paradigmas de Programación"] },
      { nombre: "Ciencia de Datos", nivel: "7º Cuatrimestre", creditos: 6, reqNombres: ["Probabilidad y Estadística", "Base de Datos", "Modelación Numérica", "Teoría de Algoritmos"] },
      { nombre: "Gestión del Desarrollo de Sistemas Informáticos", nivel: "7º Cuatrimestre", creditos: 6, reqNombres: ["Ingeniería de Software I"] },
      { nombre: "Programación Concurrente", nivel: "7º Cuatrimestre", creditos: 6, reqNombres: ["Sistemas Operativos", "Taller de Programación"] },
      { nombre: "Redes", nivel: "7º Cuatrimestre", creditos: 6, reqNombres: ["Sistemas Operativos"] },
      { nombre: "Física para Informática", nivel: "8º Cuatrimestre", creditos: 4, reqCreds: 120, reqNombres: [] },
      { nombre: "Empresas de Base Tecnológica I", nivel: "8º Cuatrimestre", creditos: 6, reqCreds: 120, reqNombres: [] },
      { nombre: "Ingeniería de Software II", nivel: "8º Cuatrimestre", creditos: 8, reqNombres: ["Base de Datos", "Ingeniería de Software I", "Taller de Programación"] },
      { nombre: "Sistemas Distribuidos I", nivel: "8º Cuatrimestre", creditos: 6, reqNombres: ["Programación Concurrente", "Redes"] },
      { nombre: "Taller de Seguridad Informática", nivel: "9º Cuatrimestre", creditos: 8, reqNombres: ["Redes"] },
      { nombre: "Trabajo Profesional de Ingeniería Informática", nivel: "9º Cuatrimestre", creditos: 12, reqCreds: 140, reqNombres: [] },
      { nombre: "Empresas de Base Tecnológica II", nivel: "10º Cuatrimestre", creditos: 6, reqNombres: ["Empresas de Base Tecnológica I"] }
    ];

    const nuevasMaterias = listaCatalogada.map(m => M.crearMateriaBase({
      nombre: m.nombre, nivel: m.nivel, creditos: m.creditos, reqCreds: m.reqCreds || 0,
      reqNombresTemp: m.reqNombres || [], req: []
    }));

    nuevasMaterias.forEach(mat => {
      (mat.reqNombresTemp || []).forEach(nombreReq => {
        if (nombreReq === "CBC") {
          const cbcs = nuevasMaterias.filter(x => x.nivel === "CBC").map(x => x.id);
          mat.req.push(...cbcs);
        } else {
          const objetivo = nuevasMaterias.find(x => x.nombre.toLowerCase().trim() === nombreReq.toLowerCase().trim());
          if (objetivo) mat.req.push(objetivo.id);
        }
      });
      delete mat.reqNombresTemp;
    });

    return nuevasMaterias;
  }

  M.extraerMateriasDePdf = extraerMateriasDePdf;
  M.materiasDeEjemplo = materiasDeEjemplo;

})(window.App = window.App || {});
