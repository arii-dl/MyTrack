/**
 * PWA — registro del service worker, estado de conexión e instalación.
 * Vive FUERA de #app (los elementos están en index.html), así que no se
 * pierde en cada render() de la app.
 *
 *  - Registra ./sw.js (necesita HTTPS o localhost; GitHub Pages es HTTPS).
 *  - Muestra "Sin conexión" cuando no hay Internet.
 *  - Muestra un botón "Instalar app" cuando el navegador lo permite
 *    (Chrome/Edge/Android). En iPhone/Safari se instala desde Compartir →
 *    "Agregar a pantalla de inicio", así que se muestra esa pista.
 */
(function () {
  'use strict';

  const barra = document.getElementById('pwa-barra');
  const btnInstalar = document.getElementById('pwa-instalar');
  const msg = document.getElementById('pwa-msg');
  const btnCerrar = document.getElementById('pwa-cerrar');
  if (!barra) return;

  let eventoInstalar = null;
  const estaInstalada = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  function mostrar(texto, conBoton) {
    msg.textContent = texto;
    btnInstalar.hidden = !conBoton;
    barra.hidden = false;
  }
  function ocultar() { barra.hidden = true; }

  // -- Conexión ---------------------------------------------------------------
  function actualizarConexion() {
    document.body.classList.toggle('sin-conexion', !navigator.onLine);
    if (!navigator.onLine) mostrar('Sin conexión — podés seguir usando MyTrack, tus datos están en este dispositivo.', false);
    else if (barra.dataset.tipo === 'offline') ocultar();
    barra.dataset.tipo = navigator.onLine ? '' : 'offline';
  }
  window.addEventListener('online', actualizarConexion);
  window.addEventListener('offline', actualizarConexion);

  // -- Instalación ------------------------------------------------------------
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();               // guardamos el aviso para dispararlo con nuestro botón
    eventoInstalar = e;
    if (navigator.onLine && !sessionStorageGet('pwa-cerrada')) mostrar('Instalá MyTrack en tu dispositivo para abrirla como una app.', true);
  });

  btnInstalar.addEventListener('click', async () => {
    if (!eventoInstalar) return;
    eventoInstalar.prompt();
    await eventoInstalar.userChoice;
    eventoInstalar = null;
    ocultar();
  });

  window.addEventListener('appinstalled', () => { eventoInstalar = null; ocultar(); });

  btnCerrar.addEventListener('click', () => { sessionStoragePut('pwa-cerrada', '1'); ocultar(); });

  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sessionStoragePut(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* modo privado */ } }

  // Pista para iPhone/iPad: Safari no dispara beforeinstallprompt.
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (esIOS && !estaInstalada() && !sessionStorageGet('pwa-cerrada')) {
    mostrar('Para instalar: tocá Compartir y elegí "Agregar a pantalla de inicio".', false);
  }

  // -- Service worker ---------------------------------------------------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try { await navigator.serviceWorker.register('./sw.js'); }
      catch (e) { console.warn('No se pudo registrar el service worker (¿sin HTTPS?).', e); }
    });
  } else {
    console.warn('Este navegador no admite service workers.');
  }

  actualizarConexion();
})();
