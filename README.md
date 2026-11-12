# Gestor Académico — Estructura MVC

Aplicación 100% estática (HTML + CSS + JS puro, sin dependencias ni build).
Para usarla, abrí `index.html` con doble clic — no necesita servidor.

## Cómo se organiza el código

```
index.html                  Shell de la app: carga el CSS y todos los scripts en orden.
css/
  styles.css                 Todos los estilos.
js/
  model/                      MODELO — datos y reglas de negocio. No toca el DOM.
    constants.js                Claves de localStorage.
    factories.js                Crea materias, cursadas, parciales, temas y carreras nuevas.
    migration.js                Migra datos de versiones anteriores sin perder información,
                                incluida la migración de una sola carrera a la colección de
                                varias (ver "Multi-carrera" más abajo).
    selectors.js                Cálculos derivados: promedios, habilitación de recuperatorios,
                                estado del final, correlativas, créditos.
    storage.js                  Único lugar que lee/escribe localStorage: guarda y carga la
                                colección completa de carreras, no una carrera suelta.
    seedData.js                 Plan de ejemplo para una instalación nueva.
    pdfImport.js                Reconoce materias en el PDF que sube el usuario: primero
                                intenta un parser de tabla (nombre/créditos/horas/correlativas
                                por cuatrimestre) y, si el documento no tiene esa estructura,
                                cae a una heurística genérica línea por línea. Ver "Importación
                                de PDF" más abajo. Si ninguna encuentra nada confiable, expone
                                aparte un catálogo de ejemplo curado a mano, nunca como si
                                viniera del archivo subido.

  views/                      VISTA — funciones puras: reciben estado, devuelven HTML.
    helpers.js                  escapeHtml, formato de notas.
    inicioView.js               Pantalla de Inicio: landing informativo con nav propio con anclas
                                a cada sección ("Cómo funciona", "Qué es MyTrack") y el CTA hacia
                                Mis Paneles. No aloja formularios ni datos de carrera.
    mispanelesView.js           Pantalla "Mis Paneles": grilla tipo Trello con todos los
                                tableros (carreras) y su avance; alta/edición/baja de tableros y
                                el formulario de datos de cursada (carrera, facultad, importar PDF).
    navbarView.js               Barra superior global (todas las pantallas): marca "MyTrack" +
                                desplegable de carreras con su avance + acceso a "Inicio".
    temasChecklistView.js       Checklist de temas (falta / a repasar / estudiado).
    parcialView.js              Tarjeta de un parcial + su recuperatorio.
    cardView.js                 Tarjeta de materia en la grilla principal, con miniatura de
                                ícono según el estado (aprobada / cursando / bloqueada / pendiente).
    modalFormView.js            Modal "Nueva/Editar materia" (correlativas).
    modalDetalleView.js         Modal de detalle: pestañas General/Parciales/Final/Observaciones.
    appView.js                  Arma la navbar y, según `state.pantalla`
                                (`'inicio'` | `'mispaneles'` | `'panel'`), la pantalla
                                correspondiente: Inicio, Mis Paneles o el Panel de materias
                                (header, KPIs, filtros y grilla) de la carrera activa.

  controllers/                CONTROLADOR — estado de la app + eventos + orquestación.
    core.js                     Estado central (`App.Controller.state`) y `render()`. También
                                `sincronizarPlanActual()`, que mantiene `state.plan` apuntando
                                siempre a la carrera activa dentro de `state.planes`.
    inicioController.js         Navegación entre Inicio, Mis Paneles y el Panel; alta/edición/
                                selección/baja de tableros (carreras); y guardado de sus datos
                                de cursada (carrera y facultad).
    materiaController.js        Crear/editar/eliminar/recursar materia, guardar cursada, importar PDF.
    temasController.js          Alta/edición/borrado de temas del checklist.
    uiController.js             Pestañas, reactividad en vivo, atado de eventos del DOM.
    app.js                      Arranque de la aplicación.
```

## Las tres pantallas

Qué pantalla se muestra vive en `state.pantalla`
(`'inicio'` | `'mispaneles'` | `'panel'`), manejado por
`js/controllers/inicioController.js`. La navbar (`navbarView.js`) es la
única pieza que se renderiza siempre, en las tres pantallas.

- **Inicio** (`inicioView.js`) es una landing puramente informativa: nav
  propio con anclas a "Cómo funciona" y "Qué es MyTrack" con scroll suave, y
  un CTA hacia Mis Paneles. No contiene formularios ni datos de ninguna
  carrera — es la puerta de entrada, no un panel de control.
- **Mis Paneles** (`mispanelesView.js`) es una grilla tipo Trello con todos
  los tableros (carreras) guardados y su avance (materias aprobadas,
  créditos, barra de progreso). Desde acá se abre un tablero para entrar a
  su Panel, se crea uno nuevo, se edita el nombre/facultad de uno existente
  o se lo elimina. El formulario de **carrera + facultad** (con el que se
  arma el título del Panel vía `M.construirTitulo`, en
  `js/model/selectors.js`) y el botón de **importar PDF** viven acá — es el
  mismo `<input type="file">` oculto del `index.html` que también dispara
  el botón equivalente dentro del Panel.
- **Panel** (`appView.js` → `renderPanel`) es la grilla de materias de la
  carrera activa, con KPIs, filtros por nivel y el botón "Mis Paneles" del
  encabezado para volver a la grilla de tableros.

Además de navegar por esas tres pantallas, la navbar tiene su propio
desplegable ("Cambiar carrera") con el listado de todos los tableros y su
avance, para saltar directo al Panel de cualquiera sin pasar por Mis
Paneles — ver `renderPanelItem` en `navbarView.js`.

## Importación de PDF

El botón "Cargar desde PDF" (en Mis Paneles y en el Panel) prueba dos
estrategias, de más a menos específica (`js/model/pdfImport.js`):

1. **Parser de tabla** (`detectarMateriasTabla`), pensado para el formato
   más común de plan de estudios argentino: una tabla de nombre / créditos
   (u horas) / correlativas, agrupada por año o cuatrimestre. `pdf.js` no
   entrega el texto por fila — entrega cada palabra por separado con su
   posición — así que la función reconstruye las filas agrupando palabras
   por coordenada Y, identifica como "ancla" de cada materia la línea que
   trae nombre + números juntos, y le asigna a esa ancla las líneas sueltas
   de alrededor (nombres o correlativas que se cortan en dos o tres líneas
   por el ancho de la columna). Validado contra 4 planes de estudio reales
   de estructura bien distinta:
   - **UBA, Ingeniería Informática**: nombre + créditos + horas +
     correlativas, por "X Cuatrimestre".
   - **Tecnicatura en Tecnologías de la Información**: sin créditos ni
     correlativas, con 4 columnas de horas por materia (se usa el total
     como valor comparable) y filas donde el nombre queda solo en la línea
     de al lado porque el código y los números ya llenaron la suya.
   - **Licenciatura en Cs. de la Computación**: listado plano sin ninguna
     sección ni encabezado de año — solo nombre + créditos + horas.
   - **Licenciatura en Administración**: el año va pegado al principio de
     cada fila (no en un encabezado aparte) y hay columnas intermedias de
     metadata (régimen de cursada, semestre, carácter) que hay que
     reconocer y descartar sin tocar nombres reales que coinciden en
     alguna palabra (p. ej. "Electiva" puede ser metadata O ser parte del
     nombre real de una materia, según el documento).
   Ninguna de las cuatro estructuras está *hardcodeada*: lo que hace el
   parser es reconocer patrones generales (secciones "X Cuatrimestre"/"X
   Año", un año pegado a cada fila, corridas de 2 o más números, ruido de
   metadata administrativa) y combinarlos según lo que encuentra en cada
   documento — por eso generaliza razonablemente a variaciones de estos
   cuatro formatos sin necesitar una rama de código por universidad. Las
   correlativas no se parsean por posición de coma: se resuelven
   comparando el texto contra los nombres de materia ya reconocidos en el
   resto del mismo documento, que es mucho más robusto que confiar en la
   puntuación o el orden exacto de un PDF con columnas. Si el documento no
   tiene ninguna sección reconocible, ni años pegados a las filas, ni
   vocabulario típico de plan de estudios en ninguna parte del texto
   (cuatrimestre/correlativas/créditos/asignatura/obligatoria/electiva/
   CBC), esta función no arriesga nada: devuelve directamente un array
   vacío.
2. **Heurística genérica línea por línea** (`detectarMateriasEnLineas`),
   de resguardo para cualquier otro listado simple de materias que no siga
   ese formato de tabla. No intenta reconocer correlativas — el formato
   varía demasiado entre facultades para inferirlas sin la estructura de
   tabla de la primera estrategia.

Sigue siendo *best-effort*: ninguna heurística posicional va a acertar el
100% de los layouts de tabla que existen (documentos con muchísimas más
columnas, con las materias en dos bloques lado a lado en la misma página,
con nomenclatura de sección completamente distinta, todavía pueden
confundirla), así que si ninguna de las dos estrategias encuentra
suficiente texto reconocible como para confiar en el resultado, **no
inventa nada** — el controlador (`materiaController.js`) se lo informa al
usuario y, aparte, le ofrece como alternativa explícita un catálogo de
ejemplo curado a mano (un plan de Ingeniería Informática), siempre
identificado como tal y nunca presentado como si viniera de su archivo.

## Un solo sistema de diseño para las tres pantallas

Inicio, Mis Paneles y el Panel toman los colores y tipografías de las
mismas variables CSS (definidas una sola vez en `:root`, arriba de
`css/styles.css`) — no hay una paleta por pantalla. Los botones de
Inicio/Mis Paneles son literalmente `.btn` / `.btn-primary` (las mismas
clases que "+ Nueva Materia" o "Guardar Cambios" en el Panel), así que un
cambio de color o de radio de borde en un solo lugar actualiza las tres
pantallas por igual.

**La paleta actual es un sistema estilo "Canva"**: claro y colorido, con
azul relajado (`--accent: #4d7ea8`) como color principal — elegido a
propósito para no confundirse con el verde de "Aprobada" — y rosa
(`--pink`) y teal (`--peach` / `--sage`, que hoy comparten el mismo valor
turquesa) como familias de apoyo. Cada familia tiene su variante "-dark"
(`--accent-dark`, `--pink-dark`, `--peach-dark`, `--sage-dark`) para cuando
ese color necesita funcionar como ícono o texto legible sobre fondo claro.
El comentario al inicio de `styles.css` documenta esta intención con más
detalle.

**El logo es la excepción a propósito.** El wordmark "MyTrack" (navbar +
título del hero) usa su propia tipografía (`--font-logo`, **Lora**) y su
propio color (`--logo-color`) en vez del resto del sistema — así se
distingue como marca en lugar de mezclarse con el resto de la interfaz.
Todo lo demás (títulos de sección, `#plan-titulo`, encabezados de modal,
cuerpo de texto) usa **Nunito Sans** (`--font-serif` y `--font-sans`
apuntan a la misma familia), la tipografía redondeada y amigable del
sistema "Canva".

**Los estados de la materia usan colores plenos a propósito.** A
diferencia del resto de la paleta (tonos suaves, pensados para convivir),
los badges y las miniaturas de ícono de "Aprobada" / "En Cursada" /
"Bloqueada" / "Desaprobada" llevan fondo sólido y texto blanco — para que
el estado se reconozca de un vistazo sin tener que leer el texto. Solo
"Pendiente" queda con el tratamiento suave, porque es el estado por
defecto (todavía no pasó nada digno de resaltar).

La tipografía (Lora + Nunito Sans) se carga desde Google Fonts; si no hay
conexión a internet, cae a las fuentes de sistema del `font-family` de cada
variable (`Georgia`/serif para el logo, `Segoe UI`/sans para el resto) sin
romper nada. El resto de la app tampoco depende de la red salvo por
`pdf.js` (importar PDF) — y aun así, si `pdf.js` no llega a cargar, el
arranque lo tolera con un `try/catch` en `js/controllers/app.js`: se pierde
únicamente la función de importar PDF, no la app entera (ver el comentario
en ese archivo). Como los botones e inputs no heredan `font-family` por
defecto en los navegadores, hay un
`button, input, select, textarea { font-family: inherit; }` explícito cerca
del principio de `styles.css` para que la tipografía sea pareja en toda la
app.

## Múltiples carreras en simultáneo

MyTrack no gestiona una sola carrera: `state.planes` es un array de
carreras, cada una con su propio título, materias y correlativas,
completamente independientes entre sí (agregar o aprobar una materia en una
carrera no toca a las demás). `state.planActualId` dice cuál está activa, y
`state.plan` es siempre esa misma carrera — es una referencia directa a su
entrada dentro de `state.planes`, no una copia — así que el resto del
código (materiaController, temasController, las vistas del Panel y del
modal) sigue leyendo y modificando `state.plan` exactamente como si solo
existiera una carrera, sin enterarse de que puede haber más. Eso mantiene
todo ese código sin cambios: la única pieza nueva de verdad es la
administración de la colección, en `inicioController.js`.

**El selector de carreras vive en dos lugares, cada uno con su propósito.**
La grilla de **Mis Paneles** (`mispanelesView.js`) es la vista completa: una
tarjeta por tablero con su avance, para abrirlo, editar sus datos o
eliminarlo (nunca se puede borrar el último que queda — `C.eliminarCarrera`
lo bloquea con un aviso). El **desplegable de la navbar**
(`navbarView.js`) es el atajo rápido: la misma lista de tableros con su
avance, pero accesible desde cualquier pantalla sin tener que navegar hasta
Mis Paneles primero — pensado para saltar de un tablero a otro sin perder
el lugar en el que estás.

Crear una carrera nueva (`+ Nuevo Tablero`) arranca siempre en blanco — sin
materias — porque cada carrera es su propio plan de estudios; copiarle de
arranque las materias de otra carrera distinta no tendría sentido. El
formulario de carrera/facultad y el botón de importar PDF (ambos en Mis
Paneles) actúan siempre sobre "el tablero que se está creando o editando",
así que después de crear uno nuevo ahí mismo se lo completa.

## Cómo fluyen los datos

1. **Modelo**: define la forma de los datos y las reglas (qué habilita un
   recuperatorio, cómo se calcula un promedio, etc.), y es quien persiste en
   `localStorage`. No sabe nada de HTML.
2. **Vista**: recibe el estado actual (`App.Controller.state`) y devuelve un
   string de HTML. Nunca modifica el estado ni guarda nada.
3. **Controlador**: mantiene el estado, reacciona a los eventos del usuario
   (clicks, submits), llama al Modelo para leer/mutar/guardar datos, y le
   pide a la Vista que vuelva a dibujar la pantalla.

Todo vive bajo el namespace global `App` (`App.Model`, `App.View`,
`App.Controller`) para no ensuciar `window` y para que los atributos
`onclick="..."` de las plantillas puedan llamar directamente a
`App.Controller.algo(...)`.

## Por qué scripts clásicos y no ES Modules

Los navegadores bloquean `import`/`export` (ES Modules) cuando la página se
abre directamente desde el disco (`file://`), por motivos de seguridad
(CORS). Los `<script src="...">` clásicos sí funcionan sin problema en ese
caso, así que la app se puede seguir abriendo con doble clic, sin depender
de un servidor local.

## Compatibilidad de datos

Si ya usabas una versión anterior de esta app (guardada en el navegador), tus
datos se migran automáticamente la primera vez que abrís `index.html`: no se
pierde ningún parcial, nota, recuperatorio ni observación.

Esto incluye la migración al formato multi-carrera: si tenías una sola
carrera guardada (el formato de antes), se convierte en la primera —y por
ahora única— carrera de tu colección, sin que tengas que hacer nada. La
clave vieja de localStorage no se borra (queda como respaldo, sin usarse);
la colección de carreras vive en una clave nueva, separada
(`plan-academico-planes-v7`).

## PWA (instalable y offline)

La app es una PWA, inspirada en el ejemplo de referencia (manifest + service worker + registro):

- `manifest.webmanifest` — nombre, colores e íconos de la app instalada.
- `sw.js` — guarda todos los archivos (y pdf.js / tipografías) en caché para abrir sin Internet.
- `js/pwa.js` — registra el service worker, muestra "Sin conexión" y el botón "Instalar app".
- `img/icon-*.png` — íconos 192, 512 y maskable.

**Publicar en GitHub Pages:** subí el contenido de esta carpeta a un repo y activá Pages (Settings → Pages → rama `main`, carpeta `/root`). Todas las rutas son relativas, así que funciona en `usuario.github.io/repo/`.

**Importante:** cada vez que cambies un archivo de la app, subí `VERSION` en `sw.js` (`v1` → `v2`…); si no, los usuarios siguen viendo la versión guardada.

**Probar local:** el service worker no corre con doble clic (`file://`). Usá `python3 -m http.server` y abrí `http://localhost:8000`.
