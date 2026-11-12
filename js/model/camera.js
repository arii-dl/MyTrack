/**
 * MODELO — Cámara (sensor)
 * Acceso al sensor de cámara del dispositivo y procesamiento de imágenes.
 * No toca el DOM de la app: solo ofrece utilidades.
 *
 *  - M.camaraDisponible(): ¿el navegador permite getUserMedia? (requiere
 *    HTTPS o localhost; GitHub Pages sirve por HTTPS, así que funciona).
 *  - M.abrirCamara(facing): pide permiso y devuelve un MediaStream.
 *  - M.detenerStream(stream): apaga la cámara (apaga la luz del sensor).
 *  - M.capturarFrame(video): saca una foto del <video> en vivo.
 *  - M.imagenArchivoADataUrl(file): procesa una foto elegida de la galería
 *    o tomada con la cámara nativa (fallback).
 *
 * Todas las fotos se reducen (máx. 800 px) y se comprimen a JPEG para que
 * quepan en localStorage (~5 MB de cuota por sitio).
 */
(function (App) {
  'use strict';

  App.Model = App.Model || {};
  const M = App.Model;

  const MAX_LADO = 800;
  const CALIDAD_JPEG = 0.75;

  M.camaraDisponible = function () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  // facing: 'environment' (trasera) | 'user' (frontal)
  M.abrirCamara = function (facing) {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing || 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
  };

  M.detenerStream = function (stream) {
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  // Dibuja `fuente` (video o imagen) en un canvas reducido y lo exporta como JPEG.
  function aDataUrl(fuente, ancho, alto) {
    const escala = Math.min(1, MAX_LADO / Math.max(ancho, alto));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(ancho * escala);
    canvas.height = Math.round(alto * escala);
    canvas.getContext('2d').drawImage(fuente, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', CALIDAD_JPEG);
  }

  M.capturarFrame = function (video) {
    if (!video.videoWidth) throw new Error('La cámara todavía no está lista.');
    return aDataUrl(video, video.videoWidth, video.videoHeight);
  };

  M.imagenArchivoADataUrl = function (file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('El archivo no es una imagen.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try { resolve(aDataUrl(img, img.naturalWidth, img.naturalHeight)); }
        catch (e) { reject(e); }
        finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  };

})(window.App = window.App || {});
