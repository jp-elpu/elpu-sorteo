// ==========================================================
// utils.js — helpers cortos reutilizables (sin lógica de negocio)
// ==========================================================

/** Crea un elemento DOM con atributos y contenido de forma compacta. */
export function crearElemento(tag, opts = {}, hijos = []) {
  const el = document.createElement(tag);
  if (opts.class) el.className = opts.class;
  if (opts.text !== undefined) el.textContent = opts.text;
  if (opts.html !== undefined) el.innerHTML = opts.html;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) el.setAttribute(k, v);
  }
  for (const hijo of hijos) el.appendChild(hijo);
  return el;
}

/** Escapa un valor para que sea seguro dentro de una celda CSV. */
function escaparCSV(valor) {
  const str = String(valor ?? '');
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Genera y descarga un CSV a partir de un array de objetos (registro del sorteo).
 * columnas: [{ key, label }]
 */
export function descargarCSV(nombreArchivo, filas, columnas) {
  const encabezado = columnas.map(c => escaparCSV(c.label)).join(',');
  const lineas = filas.map(fila =>
    columnas.map(c => escaparCSV(fila[c.key])).join(',')
  );
  const contenido = [encabezado, ...lineas].join('\n');

  // BOM para que Excel abra bien los acentos en UTF-8
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Slugifica un nombre de sorteo para usarlo como nombre de archivo. */
export function slugify(texto) {
  return String(texto || 'sorteo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'sorteo';
}

/** Espera N milisegundos (para las animaciones controladas por JS). */
export function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ------------------------------------------------------------------
// Confeti + serpentinas decorativos (solo visual — no participan en el
// sorteo real). Se usan únicamente para celebrar el momento del GANADOR
// y el resumen final.
// ------------------------------------------------------------------
const COLORES_CONFETI = [
  'var(--confeti-1)', 'var(--confeti-2)', 'var(--confeti-3)',
  'var(--confeti-4)', 'var(--confeti-5)', 'var(--confeti-6)',
];

/**
 * Crea un contenedor de confeti + serpentinas infinito, cubriendo TODA la
 * pantalla (fijo respecto al viewport, no al elemento de la vista actual),
 * y lo devuelve. Se detiene y limpia llamando a detenerConfeti(contenedor).
 *
 * `padre` se mantiene por compatibilidad de firma pero ya no determina el
 * área de la animación: el contenedor siempre se ancla a document.body con
 * posición fija, así el efecto se ve en TODA la pantalla y no solo dentro
 * de la columna central de la vista.
 */
export function iniciarConfeti(padre, cantidad = 130) {
  const contenedor = crearElemento('div', { class: 'confeti-contenedor' });
  document.body.appendChild(contenedor);

  // ---- Confeti: cuadrados, círculos y tiras cortas ----
  for (let i = 0; i < cantidad; i++) {
    const forma = Math.random();
    const esCirculo = forma < 0.4;
    const esTira = !esCirculo && forma < 0.6; // rectángulo alargado, tipo cinta
    const tam = 5 + Math.random() * 12;
    const izquierda = Math.random() * 100;
    const duracion = 2.4 + Math.random() * 3.2; // más rápido en promedio = más movimiento en pantalla
    // delay negativo: la pieza ya está "a mitad de camino" desde el primer frame,
    // así el confeti se ve continuo y abundante desde el instante en que aparece.
    const delay = -(Math.random() * (duracion + 3));
    const color = COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)];
    const rotacion = Math.floor(Math.random() * 360);
    const deriva = Math.round((Math.random() - 0.5) * 140); // vaivén lateral al caer

    let clase = 'confeti-pieza';
    if (esCirculo) clase += ' es-circulo';
    else if (esTira) clase += ' es-tira';

    const pieza = crearElemento('span', { class: clase });
    pieza.style.setProperty('--izq', `${izquierda}%`);
    pieza.style.setProperty('--dur', `${duracion}s`);
    pieza.style.setProperty('--del', `${delay}s`);
    pieza.style.setProperty('--w', `${tam}px`);
    pieza.style.setProperty('--h', `${tam * (esCirculo ? 1 : esTira ? 2.6 : 1.5)}px`);
    pieza.style.setProperty('--color', color);
    pieza.style.setProperty('--rot', `${rotacion}deg`);
    pieza.style.setProperty('--deriva', `${deriva}px`);
    contenedor.appendChild(pieza);
  }

  // ---- Serpentinas: tiras largas que ondulan al caer (más variedad visual) ----
  const cantidadSerpentinas = Math.round(cantidad * 0.3);
  for (let i = 0; i < cantidadSerpentinas; i++) {
    const ancho = 4 + Math.random() * 5;
    const alto = 46 + Math.random() * 64;
    const izquierda = Math.random() * 100;
    const duracion = 3.4 + Math.random() * 4;
    const delay = -(Math.random() * (duracion + 3));
    const color = COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)];
    const deriva = Math.round((Math.random() - 0.5) * 220); // vaivén más amplio que el confeti

    const pieza = crearElemento('span', { class: 'confeti-pieza es-serpentina' });
    pieza.style.setProperty('--izq', `${izquierda}%`);
    pieza.style.setProperty('--dur', `${duracion}s`);
    pieza.style.setProperty('--del', `${delay}s`);
    pieza.style.setProperty('--w', `${ancho}px`);
    pieza.style.setProperty('--h', `${alto}px`);
    pieza.style.setProperty('--color', color);
    pieza.style.setProperty('--deriva', `${deriva}px`);
    contenedor.appendChild(pieza);
  }

  return contenedor;
}

/** Quita el confeti de la pantalla (al continuar o al iniciar un nuevo revelado). */
export function detenerConfeti(contenedor) {
  if (contenedor && contenedor.remove) contenedor.remove();
}
