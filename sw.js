// Service worker de MyTrack. Corre aparte de la app: no tiene acceso al DOM
// ni a localStorage. Su trabajo es guardar la app en la caché del navegador
// para que abra sin Internet.
//
// IMPORTANTE: al cambiar cualquier archivo de la app, subí el número de
// VERSION. Así el navegador descarta la caché vieja y baja la nueva.
const VERSION = 'v1';
const CACHE_APP = 'mytrack-app-' + VERSION;
const CACHE_EXTERNO = 'mytrack-externo-' + VERSION;

// Archivos propios (rutas relativas: sirve en GitHub Pages, que publica
// la app en una subcarpeta como usuario.github.io/MyTrack-app/).
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './img/logo.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-maskable-512.png',
  './js/model/constants.js',
  './js/model/factories.js',
  './js/model/migration.js',
  './js/model/selectors.js',
  './js/model/storage.js',
  './js/model/seedData.js',
  './js/model/pdfImport.js',
  './js/model/camera.js',
  './js/views/helpers.js',
  './js/views/inicioView.js',
  './js/views/mispanelesView.js',
  './js/views/navbarView.js',
  './js/views/temasChecklistView.js',
  './js/views/parcialView.js',
  './js/views/cardView.js',
  './js/views/modalFormView.js',
  './js/views/modalDetalleView.js',
  './js/views/appView.js',
  './js/controllers/core.js',
  './js/controllers/inicioController.js',
  './js/controllers/materiaController.js',
  './js/controllers/temasController.js',
  './js/controllers/camaraController.js',
  './js/controllers/uiController.js',
  './js/controllers/app.js',
  './js/pwa.js'
];

// Librerías externas que la app usa: se guardan para poder importar PDF y
// ver las tipografías también sin conexión.
const EXTERNOS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Nunito+Sans:wght@400;600;700;800;900&display=swap'
];

// PASO 1 — instalar: descargar y guardar todo.
async function guardarArchivos() {
  const app = await caches.open(CACHE_APP);
  await app.addAll(ARCHIVOS); // si falta alguno, la instalación falla a propósito
  const ext = await caches.open(CACHE_EXTERNO);
  // Los externos son "mejor esfuerzo": si no hay red, la app igual se instala.
  await Promise.all(EXTERNOS.map(u => ext.add(u).catch(() => {})));
}
self.addEventListener('install', e => e.waitUntil(guardarArchivos()));

// PASO 2 — activar: borrar cachés de versiones anteriores y tomar el control.
async function limpiarCachesViejas() {
  const nombres = await caches.keys();
  await Promise.all(nombres
    .filter(n => n.startsWith('mytrack-') && n !== CACHE_APP && n !== CACHE_EXTERNO)
    .map(n => caches.delete(n)));
  await self.clients.claim();
}
self.addEventListener('activate', e => e.waitUntil(limpiarCachesViejas()));

// PASO 3 — responder: primero la copia guardada (rápido y sin red) y, en
// segundo plano, se actualiza la copia para la próxima vez.
async function copiaYActualiza(pedido, nombreCache, esNavegacion) {
  const cache = await caches.open(nombreCache);
  const copia = await cache.match(pedido, { ignoreSearch: esNavegacion });
  const actualizar = fetch(pedido).then(resp => {
    if (resp && (resp.ok || resp.type === 'opaque')) cache.put(pedido, resp.clone());
    return resp;
  }).catch(() => null);

  if (copia) return copia;
  const resp = await actualizar;
  if (resp) return resp;
  if (esNavegacion) return (await cache.match('./index.html')) || Response.error();
  return Response.error();
}

self.addEventListener('fetch', e => {
  const pedido = e.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);

  if (url.origin === self.location.origin) {
    e.respondWith(copiaYActualiza(pedido, CACHE_APP, pedido.mode === 'navigate'));
  } else if (/(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    e.respondWith(copiaYActualiza(pedido, CACHE_EXTERNO, false));
  }
  // Cualquier otra cosa sigue su camino normal por la red.
});
