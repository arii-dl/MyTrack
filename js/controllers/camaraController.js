/**
 * CONTROLADOR — Foto del plan de estudios (cámara)
 * Maneja la foto opcional de un tablero. Mientras el formulario está
 * abierto la foto es un BORRADOR (`state.fotoBorrador`) y recién se aplica
 * al tablero cuando se guarda el formulario:
 *    undefined -> sin cambios | null -> quitar la foto | 'data:...' -> nueva
 * La vista previa se actualiza directo en el DOM (sin render completo) para
 * no perder lo que el usuario ya escribió en Carrera/Facultad.
 */
(function (App) {
  'use strict';

  App.Controller = App.Controller || {};
  const C = App.Controller;
  const M = App.Model;

  let stream = null;
  let facing = 'environment';

  function fotoVigente() {
    const s = C.state;
    if (s.fotoBorrador !== undefined) return s.fotoBorrador;
    const plan = (s.editandoTableroId && s.planes.find(p => p.id === s.editandoTableroId)) || s.plan;
    return (plan && plan.foto) || null;
  }

  // Actualiza solo el bloque de la foto en el formulario.
  function pintarFoto() {
    const foto = fotoVigente();
    const box = document.getElementById('foto-preview');
    if (box) {
      box.classList.toggle('con-foto', !!foto);
      box.innerHTML = foto
        ? `<img src="${foto}" alt="Foto del plan de estudios">`
        : '<span class="foto-vacia">Sin foto</span>';
    }
    const quitar = document.getElementById('btn-foto-quitar');
    if (quitar) quitar.classList.toggle('hidden', !foto);
    const tomar = document.getElementById('btn-foto-camara');
    if (tomar) tomar.textContent = foto ? 'Volver a tomar' : 'Tomar foto';
  }

  function setBorrador(dataUrl) {
    C.state.fotoBorrador = dataUrl;
    pintarFoto();
  }

  C.quitarFoto = function () { setBorrador(null); };

  // Foto elegida de la galería o tomada con la cámara nativa del celular.
  C.onFotoArchivo = async function (e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { setBorrador(await M.imagenArchivoADataUrl(file)); }
    catch (err) { alert('No se pudo cargar la foto: ' + err.message); }
  };

  // -- Cámara en vivo ---------------------------------------------------------
  function cerrarVisor() {
    M.detenerStream(stream);
    stream = null;
    const el = document.getElementById('camara-overlay');
    if (el) el.remove();
  }

  async function iniciarStream(video, estado) {
    M.detenerStream(stream);
    stream = null;
    estado.textContent = 'Pidiendo acceso a la cámara…';
    try {
      stream = await M.abrirCamara(facing);
      video.srcObject = stream;
      await video.play();
      estado.textContent = '';
    } catch (err) {
      const negado = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      estado.textContent = negado
        ? 'Permiso de cámara denegado. Habilitalo en los ajustes del navegador o elegí una foto de la galería.'
        : 'No se pudo abrir la cámara (' + ((err && err.name) || 'error') + '). Probá con la galería.';
    }
  }

  C.abrirCamara = function () {
    // Sin getUserMedia (p. ej. archivo abierto con file://): cae al selector nativo.
    if (!M.camaraDisponible()) {
      const nativo = document.getElementById('foto-input-camara');
      if (nativo) nativo.click();
      return;
    }
    cerrarVisor();
    const overlay = document.createElement('div');
    overlay.className = 'overlay camara-overlay';
    overlay.id = 'camara-overlay';
    overlay.innerHTML = `
      <div class="camara-modal" role="dialog" aria-label="Tomar foto">
        <div class="camara-visor">
          <video id="camara-video" playsinline muted autoplay></video>
          <div class="camara-estado" id="camara-estado"></div>
        </div>
        <div class="camara-botonera">
          <button type="button" class="btn" id="camara-cancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" id="camara-capturar">Capturar</button>
          <button type="button" class="btn" id="camara-girar" title="Cambiar de cámara">Girar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const video = overlay.querySelector('#camara-video');
    const estado = overlay.querySelector('#camara-estado');
    overlay.querySelector('#camara-cancelar').onclick = cerrarVisor;
    overlay.addEventListener('click', ev => { if (ev.target === overlay) cerrarVisor(); });
    overlay.querySelector('#camara-girar').onclick = () => {
      facing = facing === 'environment' ? 'user' : 'environment';
      iniciarStream(video, estado);
    };
    overlay.querySelector('#camara-capturar').onclick = () => {
      try {
        setBorrador(M.capturarFrame(video));
        cerrarVisor();
      } catch (err) { estado.textContent = err.message; }
    };
    iniciarStream(video, estado);
  };

  // Ata los eventos del bloque de foto (se llama tras cada render).
  C.bindEventsFoto = function () {
    const q = id => document.getElementById(id);
    if (q('btn-foto-camara')) q('btn-foto-camara').addEventListener('click', C.abrirCamara);
    if (q('btn-foto-galeria')) q('btn-foto-galeria').addEventListener('click', () => q('foto-input-galeria').click());
    if (q('btn-foto-quitar')) q('btn-foto-quitar').addEventListener('click', C.quitarFoto);
    if (q('foto-input-galeria')) q('foto-input-galeria').addEventListener('change', C.onFotoArchivo);
    if (q('foto-input-camara')) q('foto-input-camara').addEventListener('change', C.onFotoArchivo);
  };

  // Aplica el borrador al tablero (lo llama guardarDatosCursada). Devuelve
  // false si no entró en el almacenamiento, para avisar al usuario.
  C.aplicarFotoBorrador = function (plan) {
    const s = C.state;
    if (s.fotoBorrador === undefined) return;
    if (s.fotoBorrador) plan.foto = s.fotoBorrador; else delete plan.foto;
    s.fotoBorrador = undefined;
  };

  C.descartarFotoBorrador = function () {
    C.state.fotoBorrador = undefined;
    cerrarVisor();
  };

})(window.App = window.App || {});
