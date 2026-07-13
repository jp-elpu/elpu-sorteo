// ==========================================================
// ui.js — vistas de la app (config, ruleta, revelado, resumen)
// ==========================================================

import { state, parsearParticipantes, leerArchivoComoTexto, generarNombresPremios, generarDescripcionesPremios, generarImagenesPremios, reiniciarEjecucion } from './state.js';
import { extraerAleatorio, generarColaEventos, ETIQUETAS_TIPO } from './sorteoEngine.js';
import { crearElemento, descargarCSV, slugify, esperar, iniciarConfeti, detenerConfeti } from './utils.js';

// Referencia al confeti activo (si lo hay), para poder limpiarlo al cambiar de vista.
let confetiActivo = null;

// ------------------------------------------------------------------
// PÁGINA 1: CONFIGURACIÓN
// ------------------------------------------------------------------

export function initConfigPage() {
  const form = document.getElementById('form-config');
  const inputNumPremios = document.getElementById('input-num-premios');
  const inputNumAlAgua = document.getElementById('input-num-al-agua');
  const inputNumAccesitarios = document.getElementById('input-num-accesitarios');
  const listaNombresPremios = document.getElementById('lista-nombres-premios');
  const inputArchivo = document.getElementById('input-archivo');
  const previewBox = document.getElementById('preview-participantes');
  const previewCount = document.getElementById('preview-count');
  const previewLista = document.getElementById('preview-lista');
  const errorArchivo = document.getElementById('error-archivo');

  renderNombresPremios(Number(inputNumPremios.value));
  actualizarResumenPrevio();

  inputNumPremios.addEventListener('input', () => {
    const n = Math.max(1, Math.min(50, Number(inputNumPremios.value) || 1));
    renderNombresPremios(n);
    actualizarResumenPrevio();
  });

  inputNumAlAgua.addEventListener('change', actualizarResumenPrevio);
  inputNumAccesitarios.addEventListener('change', actualizarResumenPrevio);

  inputArchivo.addEventListener('change', async () => {
    errorArchivo.classList.add('hidden');
    previewBox.classList.add('hidden');
    const file = inputArchivo.files[0];
    if (!file) return;

    try {
      const texto = await leerArchivoComoTexto(file);
      const { participantes, invalidas } = parsearParticipantes(texto);

      state.participantesOriginal = participantes;
      state.ultimoParseoInvalidas = invalidas;
      actualizarResumenPrevio();

      if (participantes.length === 0) {
        errorArchivo.textContent = 'No se pudo reconocer ningún participante en el archivo. Revisa el formato.';
        errorArchivo.classList.remove('hidden');
        return;
      }

      previewCount.textContent = participantes.length.toLocaleString('es-PE');
      previewLista.textContent = participantes
        .slice(0, 8)
        .map(p => `${p.codigo} - ${p.nombre}`)
        .join('\n') + (participantes.length > 8 ? `\n… y ${participantes.length - 8} más` : '');
      previewBox.classList.remove('hidden');
    } catch (err) {
      errorArchivo.textContent = 'Error leyendo el archivo: ' + err.message;
      errorArchivo.classList.remove('hidden');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (state.participantesOriginal.length === 0) {
      errorArchivo.textContent = 'Debes cargar un archivo de participantes antes de iniciar.';
      errorArchivo.classList.remove('hidden');
      return;
    }

    const numPremios = Math.max(1, Number(inputNumPremios.value) || 1);
    const numAlAgua = Number(inputNumAlAgua.value);
    const numAccesitarios = Number(inputNumAccesitarios.value);
    const duracionAlAgua = Number(document.getElementById('input-dur-al-agua').value) || 4;
    const duracionPremio = Number(document.getElementById('input-dur-premio').value) || 6;
    const duracionAccesitario = Number(document.getElementById('input-dur-accesitario').value) || 4;

    const nombresPremios = Array.from(listaNombresPremios.querySelectorAll('[data-campo="nombre"]'))
      .map(i => i.value.trim() || i.placeholder);
    const descripcionesPremios = Array.from(listaNombresPremios.querySelectorAll('[data-campo="descripcion"]'))
      .map(i => i.value.trim());
    const imagenesPremios = Array.from(listaNombresPremios.querySelectorAll('[data-campo="imagen"]'))
      .map(i => i.value.trim());

    const requeridosPorPremio = numAlAgua + 1 + numAccesitarios;
    const totalRequerido = requeridosPorPremio * numPremios;
    if (totalRequerido > state.participantesOriginal.length) {
      errorArchivo.textContent = `No hay suficientes participantes (${state.participantesOriginal.length}) para ${numPremios} premio(s) con ${numAlAgua} al agua + 1 ganador + ${numAccesitarios} accesitario(s) cada uno (se requieren ${totalRequerido}).`;
      errorArchivo.classList.remove('hidden');
      return;
    }

    state.config = {
      nombreSorteo: document.getElementById('input-nombre').value.trim() || 'Sorteo',
      descripcion: document.getElementById('input-descripcion').value.trim(),
      numPremios,
      numAlAgua,
      numAccesitarios,
      duracionAlAgua,
      duracionPremio,
      duracionAccesitario,
      nombresPremios,
      descripcionesPremios,
      imagenesPremios,
    };

    iniciarSorteo();
  });
}

/** Actualiza la caja "Resumen antes de iniciar" con los valores actuales del formulario. */
function actualizarResumenPrevio() {
  document.getElementById('rp-participantes').textContent =
    state.participantesOriginal.length.toLocaleString('es-PE');
  document.getElementById('rp-invalidas').textContent =
    (state.ultimoParseoInvalidas || 0).toLocaleString('es-PE');
  document.getElementById('rp-premios').textContent =
    Math.max(1, Number(document.getElementById('input-num-premios').value) || 1);
  document.getElementById('rp-al-agua').textContent =
    document.getElementById('input-num-al-agua').value;
  document.getElementById('rp-accesitarios').textContent =
    document.getElementById('input-num-accesitarios').value;
}

function renderNombresPremios(cantidad) {
  const contenedor = document.getElementById('lista-nombres-premios');
  const actualesNombres = Array.from(contenedor.querySelectorAll('[data-campo="nombre"]')).map(i => i.value);
  const actualesDescripciones = Array.from(contenedor.querySelectorAll('[data-campo="descripcion"]')).map(i => i.value);
  const actualesImagenes = Array.from(contenedor.querySelectorAll('[data-campo="imagen"]')).map(i => i.value);
  const nombres = generarNombresPremios(cantidad, actualesNombres);
  const descripciones = generarDescripcionesPremios(cantidad, actualesDescripciones);
  const imagenes = generarImagenesPremios(cantidad, actualesImagenes);

  contenedor.innerHTML = '';
  nombres.forEach((nombre, i) => {
    const item = crearElemento('div', { class: 'premio-item' });

    const inputNombre = crearElemento('input', {
      attrs: { type: 'text', 'data-idx': i, 'data-campo': 'nombre', placeholder: `Premio ${i + 1}` },
    });
    inputNombre.value = nombre;

    const inputDescripcion = crearElemento('input', {
      attrs: { type: 'text', 'data-idx': i, 'data-campo': 'descripcion', placeholder: 'Ej. Premiado tu puntualidad (opcional)' },
    });
    inputDescripcion.value = descripciones[i];

    const inputImagen = crearElemento('input', {
      attrs: { type: 'text', 'data-idx': i, 'data-campo': 'imagen', placeholder: 'Ruta local, ej. assets/premios/premio1.png (opcional)' },
    });
    inputImagen.value = imagenes[i];

    item.appendChild(inputNombre);
    item.appendChild(inputDescripcion);
    item.appendChild(inputImagen);
    contenedor.appendChild(item);
  });
}

// ------------------------------------------------------------------
// TRANSICIÓN A LA PÁGINA DE SORTEO
// ------------------------------------------------------------------

function iniciarSorteo() {
  reiniciarEjecucion();
  state.cola = generarColaEventos(state.config);
  state.colaIndex = 0;

  document.getElementById('page-config').classList.remove('active');

  // Portada del sorteo en vivo: nombre + descripción, antes de cualquier premio
  const portadaNombre = document.getElementById('portada-nombre');
  const portadaDescripcion = document.getElementById('portada-descripcion');
  portadaNombre.textContent = state.config.nombreSorteo;
  portadaNombre.dataset.text = state.config.nombreSorteo;
  portadaDescripcion.textContent = state.config.descripcion;
  portadaDescripcion.classList.toggle('hidden', !state.config.descripcion);

  document.getElementById('page-intro').classList.remove('hidden');

  const btnComenzar = document.getElementById('btn-comenzar-transmision');
  const nuevoBtn = btnComenzar.cloneNode(true);
  btnComenzar.replaceWith(nuevoBtn);
  nuevoBtn.addEventListener('click', () => {
    document.getElementById('page-intro').classList.add('hidden');
    document.getElementById('page-sorteo').classList.remove('hidden');
    document.getElementById('sorteo-nombre-evento').textContent = state.config.nombreSorteo;
    avanzarEvento();
  });
}

// ------------------------------------------------------------------
// MÁQUINA DE ESTADOS DEL SORTEO: avanza evento por evento
// ------------------------------------------------------------------

function avanzarEvento() {
  const evento = state.cola[state.colaIndex];
  if (!evento) return;

  if (evento.tipo === 'premio_intro') {
    mostrarPremioIntro(evento.premioIndex);
  } else if (evento.tipo === 'resumen_premio') {
    mostrarResumenPremio(evento.premioIndex);
  } else if (evento.tipo === 'resumen_final') {
    mostrarResumenFinal();
  } else {
    mostrarVistaReveal(evento);
  }
}

function irAVista(nombreVista) {
  // Punto único de limpieza: cualquier confeti de la vista anterior se retira
  // antes de mostrar la siguiente (el ganador vuelve a lanzar el suyo si aplica).
  if (confetiActivo) {
    detenerConfeti(confetiActivo);
    confetiActivo = null;
  }
  document.getElementById('vista-premio-intro').classList.toggle('hidden', nombreVista !== 'premio-intro');
  document.getElementById('vista-reveal').classList.toggle('hidden', nombreVista !== 'reveal');
  document.getElementById('vista-resumen').classList.toggle('hidden', nombreVista !== 'resumen');
}

/** Presentación del premio: nombre grande + descripción, antes de sortear "al agua"/ganador/accesitarios. */
function mostrarPremioIntro(premioIndex) {
  irAVista('premio-intro');
  actualizarProgreso(premioIndex);

  const numero = premioIndex + 1;
  const total = state.config.numPremios;
  document.getElementById('premio-intro-numero').textContent = numero;
  document.getElementById('premio-intro-total').textContent = total;
  document.getElementById('premio-intro-eyebrow').dataset.text = `Premio ${numero} de ${total}`;

  const nombrePremio = state.config.nombresPremios[premioIndex];
  const nombreEl = document.getElementById('premio-intro-nombre');
  nombreEl.textContent = nombrePremio;
  nombreEl.dataset.text = nombrePremio;

  const descripcion = state.config.descripcionesPremios[premioIndex] || '';
  const descEl = document.getElementById('premio-intro-descripcion');
  descEl.textContent = descripcion;
  descEl.classList.toggle('hidden', !descripcion);

  const urlImagen = (state.config.imagenesPremios && state.config.imagenesPremios[premioIndex]) || '';
  const imgEl = document.getElementById('premio-imagen-foto');
  const iconoEl = document.getElementById('premio-imagen-generica');
  const frameEl = document.getElementById('premio-imagen-frame');
  frameEl.classList.toggle('sin-imagen', !urlImagen);
  if (urlImagen) {
    imgEl.src = urlImagen;
    imgEl.classList.remove('hidden');
    iconoEl.classList.add('hidden');
  } else {
    imgEl.removeAttribute('src');
    imgEl.classList.add('hidden');
    iconoEl.classList.remove('hidden');
  }

  const btn = document.getElementById('btn-comenzar-premio');
  const nuevoBtn = btn.cloneNode(true);
  btn.replaceWith(nuevoBtn);
  nuevoBtn.addEventListener('click', () => {
    state.colaIndex++;
    avanzarEvento();
  });
}

function actualizarProgreso(premioIndex) {
  const nombrePremio = state.config.nombresPremios[premioIndex];
  document.getElementById('sorteo-progreso').textContent =
    `Premio ${premioIndex + 1} de ${state.config.numPremios} · ${nombrePremio}`;
}

// ------------------------------------------------------------------
// VISTA: REVELADO CON RULETA
// ------------------------------------------------------------------

function mostrarVistaReveal(evento) {
  irAVista('reveal');
  actualizarProgreso(evento.premioIndex);

  const esGanador = evento.tipo === 'ganador';
  const nombrePremio = state.config.nombresPremios[evento.premioIndex];

  const etiqueta = document.getElementById('etiqueta-evento');
  if (evento.tipo === 'al_agua') {
    etiqueta.textContent = `Al agua #${evento.numero} · ${nombrePremio}`;
  } else if (esGanador) {
    etiqueta.textContent = `Ganador · ${nombrePremio}`;
  } else {
    etiqueta.textContent = `Accesitario #${evento.numero} · ${nombrePremio}`;
  }

  document.getElementById('escena-ganador').classList.toggle('hidden', !esGanador);
  document.getElementById('escena-simple').classList.toggle('hidden', esGanador);

  if (esGanador) {
    prepararEscenaGanador(evento);
  } else {
    prepararEscenaSimple();
  }

  const btnRevelar = document.getElementById('btn-revelar');
  const btnContinuar = document.getElementById('btn-continuar');
  btnContinuar.classList.add('hidden');
  btnRevelar.classList.remove('hidden');
  btnRevelar.disabled = false;

  // Reemplazamos el botón para limpiar listeners previos (evita acumulación)
  const nuevoBtnRevelar = btnRevelar.cloneNode(true);
  btnRevelar.replaceWith(nuevoBtnRevelar);

  nuevoBtnRevelar.addEventListener('click', () => {
    nuevoBtnRevelar.disabled = true;
    if (esGanador) {
      ejecutarReveladoGanador(evento);
    } else {
      ejecutarReveladoSimple(evento);
    }
  });

  const nuevoBtnContinuar = btnContinuar.cloneNode(true);
  btnContinuar.replaceWith(nuevoBtnContinuar);
  nuevoBtnContinuar.addEventListener('click', () => {
    state.colaIndex++;
    avanzarEvento();
  });
}

/** Deja lista la escena simple (al agua / accesitario): ruleta en reposo. */
function prepararEscenaSimple() {
  const cinta = document.getElementById('ruleta-cinta');
  cinta.innerHTML = '';
  cinta.appendChild(crearElemento('div', { class: 'ruleta-item ruleta-placeholder', text: 'Presiona "Revelar" para comenzar' }));
  document.getElementById('ruleta-timer').classList.add('hidden');
  document.getElementById('ruleta-timer-progreso').style.strokeDashoffset = '0';
  document.getElementById('resultado-final').classList.add('hidden');
  const mensajeEl = document.getElementById('resultado-mensaje');
  mensajeEl.classList.add('hidden');
  mensajeEl.innerHTML = '';
}

/** Deja lista la escena del ganador: título, imagen del premio y ruleta en reposo. */
function prepararEscenaGanador(evento) {
  const premioIndex = evento.premioIndex;
  const nombrePremio = state.config.nombresPremios[premioIndex];

  const badge = document.getElementById('ganador-nombre-premio');
  badge.textContent = nombrePremio;
  badge.dataset.text = nombrePremio;

  const urlImagen = (state.config.imagenesPremios && state.config.imagenesPremios[premioIndex]) || '';
  const imgEl = document.getElementById('ganador-imagen-foto');
  const iconoEl = document.getElementById('ganador-imagen-generica');
  const frameEl = document.getElementById('ganador-imagen-frame');
  frameEl.classList.toggle('sin-imagen', !urlImagen);
  if (urlImagen) {
    imgEl.src = urlImagen;
    imgEl.classList.remove('hidden');
    iconoEl.classList.add('hidden');
  } else {
    imgEl.removeAttribute('src');
    imgEl.classList.add('hidden');
    iconoEl.classList.remove('hidden');
  }

  const cinta = document.getElementById('ruleta-cinta-ganador');
  cinta.innerHTML = '';
  cinta.appendChild(crearElemento('div', { class: 'ruleta-item ruleta-placeholder', text: 'Presiona "Revelar" para comenzar' }));
  document.getElementById('ruleta-timer-ganador').classList.add('hidden');
  document.getElementById('ruleta-timer-progreso-ganador').style.strokeDashoffset = '0';
  document.getElementById('resultado-final-ganador').classList.add('hidden');
  document.getElementById('ganador-congrats').classList.add('hidden');
  document.getElementById('ganador-imagen-wrap').classList.remove('girando');
}

function duracionSegunTipo(tipo) {
  if (tipo === 'al_agua') return state.config.duracionAlAgua;
  if (tipo === 'ganador') return state.config.duracionPremio;
  return state.config.duracionAccesitario;
}

/** Ordinal en español para el mensaje del accesitario (1er, 2do, 3er...). */
const ORDINALES_ES = { 1: '1er', 2: '2do', 3: '3er', 4: '4to', 5: '5to' };
function ordinalEs(numero) {
  return ORDINALES_ES[numero] || `${numero}°`;
}

/** Escapa texto antes de insertarlo con innerHTML (nombres de participantes). */
function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/* Circunferencia del anillo del temporizador circular: 2 * PI * r, con r=28 (ver reveal.css). */
const CIRCUNFERENCIA_TIMER = 2 * Math.PI * 28;

/**
 * Ruleta reutilizable (al agua / accesitario): gira nombres del pool restante,
 * muestra temporizador, y al finalizar usa el motor criptográfico para sacar
 * a la persona real, mostrando nombre y código EN ELEMENTOS SEPARADOS.
 */
async function ejecutarReveladoSimple(evento) {
  const cinta = document.getElementById('ruleta-cinta');
  const timerWrap = document.getElementById('ruleta-timer');
  const timerNumero = document.getElementById('ruleta-timer-numero');
  const timerProgreso = document.getElementById('ruleta-timer-progreso');
  const resultadoBox = document.getElementById('resultado-final');
  const nombreEl = document.getElementById('resultado-nombre');
  const codigoEl = document.getElementById('resultado-codigo');
  const mensajeEl = document.getElementById('resultado-mensaje');

  const duracionMs = duracionSegunTipo(evento.tipo) * 1000;

  timerWrap.classList.remove('hidden');
  timerNumero.textContent = Math.ceil(duracionMs / 1000);
  timerProgreso.style.strokeDashoffset = '0';
  resultadoBox.classList.add('hidden');
  mensajeEl.classList.add('hidden');
  mensajeEl.innerHTML = '';

  cinta.innerHTML = '';
  const item = crearElemento('div', { class: `ruleta-item girando tipo-${evento.tipo}` });
  cinta.appendChild(item);

  await girarNombres(item, { numero: timerNumero, progreso: timerProgreso }, duracionMs);

  // Selección REAL con crypto.getRandomValues, saca a la persona del pool
  const persona = extraerAleatorio(state.pool);

  item.classList.remove('girando');
  item.classList.add('detenido');
  item.textContent = persona.nombre;
  timerWrap.classList.add('hidden');

  nombreEl.textContent = persona.nombre;
  nombreEl.dataset.text = persona.nombre;
  // Al agua / accesitario: letra blanca + contorno VERDE, cada uno con
  // una animación distinta que representa el momento (flotar / destello).
  const claseAnimacion = evento.tipo === 'al_agua' ? 'animar-al-agua' : 'animar-accesitario';
  nombreEl.className = `resultado-nombre texto-contorno verde ${claseAnimacion} tipo-${evento.tipo}`;

  codigoEl.textContent = persona.codigo;

  // Mensaje especial solo para accesitarios: "¡Felicidades, X! Eres el 1er accesitario"
  if (evento.tipo === 'accesitario') {
    mensajeEl.innerHTML =
      `&iexcl;Felicidades, <strong>${escapeHtml(persona.nombre)}</strong>! ` +
      `Eres el <strong>${ordinalEs(evento.numero)} accesitario</strong>`;
    mensajeEl.classList.remove('hidden');
  }

  resultadoBox.classList.remove('hidden');

  registrarResultado(evento, persona);
  document.getElementById('btn-revelar').classList.add('hidden');
  document.getElementById('btn-continuar').classList.remove('hidden');
}

/**
 * Escena especial del GANADOR: misma mecánica de giro criptográfico, pero
 * con el layout de dos columnas (nombre a la izquierda, imagen del premio a
 * la derecha con resplandor), y el mensaje de felicitación + confeti al final.
 */
async function ejecutarReveladoGanador(evento) {
  const cinta = document.getElementById('ruleta-cinta-ganador');
  const timerWrap = document.getElementById('ruleta-timer-ganador');
  const timerNumero = document.getElementById('ruleta-timer-numero-ganador');
  const timerProgreso = document.getElementById('ruleta-timer-progreso-ganador');
  const resultadoBox = document.getElementById('resultado-final-ganador');
  const nombreEl = document.getElementById('resultado-nombre-ganador');
  const codigoEl = document.getElementById('resultado-codigo-ganador');
  const imagenWrap = document.getElementById('ganador-imagen-wrap');

  const duracionMs = duracionSegunTipo('ganador') * 1000;

  timerWrap.classList.remove('hidden');
  timerNumero.textContent = Math.ceil(duracionMs / 1000);
  timerProgreso.style.strokeDashoffset = '0';
  resultadoBox.classList.add('hidden');
  imagenWrap.classList.add('girando');

  cinta.innerHTML = '';
  const item = crearElemento('div', { class: 'ruleta-item girando tipo-ganador' });
  cinta.appendChild(item);

  await girarNombres(item, { numero: timerNumero, progreso: timerProgreso }, duracionMs);

  const persona = extraerAleatorio(state.pool);

  // La ventana de la ruleta se queda del MISMO tamaño de siempre: solo se asienta
  // en el nombre, compacta y sin contorno (igual que en "al agua"/accesitario).
  item.classList.remove('girando');
  item.classList.add('detenido', 'tipo-ganador');
  item.textContent = persona.nombre;
  timerWrap.classList.add('hidden');
  imagenWrap.classList.remove('girando');

  // El nombre grande y legible (blanco + contorno naranja + zoom continuo) vive
  // en un bloque aparte, así es el TEXTO el que se adapta al nombre y nunca se
  // recorta ni pierde legibilidad dentro de la ventana de la ruleta.
  nombreEl.textContent = persona.nombre;
  nombreEl.dataset.text = persona.nombre;
  codigoEl.textContent = persona.codigo;
  resultadoBox.classList.remove('hidden');

  document.getElementById('congrats-premio').textContent = state.config.nombresPremios[evento.premioIndex];
  document.getElementById('congrats-premio').dataset.text = state.config.nombresPremios[evento.premioIndex];
  document.getElementById('ganador-congrats').classList.remove('hidden');

  confetiActivo = iniciarConfeti(document.getElementById('vista-reveal'));

  registrarResultado(evento, persona);
  document.getElementById('btn-revelar').classList.add('hidden');
  document.getElementById('btn-continuar').classList.remove('hidden');
}

/**
 * Animación visual del giro (compartida): nombres al azar del pool + temporizador
 * circular. `timerEls` = { numero, progreso } — el <span> del número entero y el
 * <circle> del anillo (ver .timer-circular en reveal.css).
 */
function girarNombres(item, timerEls, duracionMs) {
  const pool = state.pool;
  const inicio = performance.now();
  let ultimoNumeroMostrado = null;

  return new Promise((resolve) => {
    const intervaloVisual = setInterval(() => {
      const transcurrido = performance.now() - inicio;
      const restante = Math.max(0, duracionMs - transcurrido);

      // Anillo: arranca completo (offset 0) y se vacía hasta 0 al llegar el revelado.
      const fraccionRestante = restante / duracionMs;
      timerEls.progreso.style.strokeDashoffset =
        String(CIRCUNFERENCIA_TIMER * (1 - fraccionRestante));

      // Número entero tipo cuenta regresiva (5, 4, 3, 2, 1...), con una pequeña
      // animación de "pop" cada vez que cambia el segundo mostrado.
      const numeroEntero = Math.max(0, Math.ceil(restante / 1000));
      if (numeroEntero !== ultimoNumeroMostrado) {
        ultimoNumeroMostrado = numeroEntero;
        timerEls.numero.textContent = numeroEntero;
        timerEls.numero.classList.remove('conteo-pop');
        void timerEls.numero.offsetWidth; // fuerza reflow para re-disparar la animación
        timerEls.numero.classList.add('conteo-pop');
      }

      // Solo efecto visual: muestra un nombre al azar del pool (no lo saca)
      if (pool.length > 0) {
        const idxVisual = Math.floor(Math.random() * pool.length);
        item.textContent = pool[idxVisual].nombre;
      }

      if (transcurrido >= duracionMs) {
        clearInterval(intervaloVisual);
        resolve();
      }
    }, 70);
  });
}

/** Registra el resultado en el log inmutable (usado por ambos tipos de revelado). */
function registrarResultado(evento, persona) {
  state.registro.push({
    premioIndex: evento.premioIndex,
    premioNombre: state.config.nombresPremios[evento.premioIndex],
    tipo: evento.tipo,
    numero: evento.numero,
    codigo: persona.codigo,
    nombre: persona.nombre,
  });
}

// ------------------------------------------------------------------
// VISTA: RESUMEN DE PREMIO / RESUMEN FINAL (mismo tema que la ruleta)
// ------------------------------------------------------------------

function filaResumen(entrada) {
  const esGanador = entrada.tipo === 'ganador';
  const etiquetaTipo = entrada.tipo === 'ganador'
    ? ETIQUETAS_TIPO.ganador
    : `${ETIQUETAS_TIPO[entrada.tipo]} #${entrada.numero}`;

  return crearElemento('div', { class: `resumen-fila${esGanador ? ' es-ganador' : ''}` }, [
    crearElemento('span', { class: 'resumen-tipo', text: etiquetaTipo }),
    crearElemento('span', { class: 'resumen-nombre', text: entrada.nombre }),
    crearElemento('span', { class: 'resumen-codigo', text: entrada.codigo }),
  ]);
}

function mostrarResumenPremio(premioIndex) {
  irAVista('resumen');
  actualizarProgreso(premioIndex);

  const titulo = document.getElementById('resumen-titulo');
  const contenido = document.getElementById('resumen-contenido');
  const nombrePremio = state.config.nombresPremios[premioIndex];
  titulo.textContent = `Resumen · ${nombrePremio}`;

  // El "al agua" se guarda igualmente en el registro/CSV, pero no se muestra aquí:
  // en el resumen solo deben verse el ganador y los accesitarios.
  const entradas = state.registro.filter(r => r.premioIndex === premioIndex && r.tipo !== 'al_agua');
  contenido.innerHTML = '';
  const bloque = crearElemento('div', { class: 'resumen-premio-bloque' });
  bloque.appendChild(crearElemento('h4', { text: nombrePremio }));
  entradas.forEach(entrada => bloque.appendChild(filaResumen(entrada)));
  contenido.appendChild(bloque);

  document.getElementById('btn-descargar-csv').classList.add('hidden');
  document.getElementById('btn-volver-config').classList.add('hidden');

  const btnContinuar = document.getElementById('btn-continuar-resumen');
  const esUltimoPremio = premioIndex === state.config.numPremios - 1;
  btnContinuar.textContent = esUltimoPremio ? 'Ver resumen final →' : 'Siguiente premio →';

  const nuevoBtn = btnContinuar.cloneNode(true);
  btnContinuar.replaceWith(nuevoBtn);
  nuevoBtn.addEventListener('click', () => {
    state.colaIndex++;
    avanzarEvento();
  });
}

function mostrarResumenFinal() {
  irAVista('resumen');
  confetiActivo = iniciarConfeti(document.getElementById('vista-resumen'));
  document.getElementById('sorteo-progreso').textContent = 'Sorteo finalizado';
  document.getElementById('resumen-titulo').textContent = `Resumen final · ${state.config.nombreSorteo}`;

  const contenido = document.getElementById('resumen-contenido');
  contenido.innerHTML = '';

  for (let p = 0; p < state.config.numPremios; p++) {
    // Igual que en el resumen por premio: "al agua" queda fuera de la vista, pero sigue en el CSV.
    const entradas = state.registro.filter(r => r.premioIndex === p && r.tipo !== 'al_agua');
    const bloque = crearElemento('div', { class: 'resumen-premio-bloque' });
    bloque.appendChild(crearElemento('h4', { text: state.config.nombresPremios[p] }));
    entradas.forEach(entrada => bloque.appendChild(filaResumen(entrada)));
    contenido.appendChild(bloque);
  }

  const btnDescargar = document.getElementById('btn-descargar-csv');
  btnDescargar.classList.remove('hidden');
  const nuevoBtnDescargar = btnDescargar.cloneNode(true);
  btnDescargar.replaceWith(nuevoBtnDescargar);
  nuevoBtnDescargar.addEventListener('click', () => {
    descargarCSV(
      `${slugify(state.config.nombreSorteo)}_resultados`,
      state.registro,
      [
        { key: 'premioNombre', label: 'Premio' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'numero', label: 'Número' },
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
      ]
    );
  });

  const btnVolver = document.getElementById('btn-volver-config');
  btnVolver.classList.remove('hidden');
  const nuevoBtnVolver = btnVolver.cloneNode(true);
  btnVolver.replaceWith(nuevoBtnVolver);
  nuevoBtnVolver.addEventListener('click', () => {
    // Recarga completa: garantiza estado limpio para un nuevo sorteo desde cero.
    location.reload();
  });

  const btnContinuar = document.getElementById('btn-continuar-resumen');
  btnContinuar.classList.add('hidden');
}
