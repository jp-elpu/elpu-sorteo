// ==========================================================
// state.js — estado único de la app + parser de participantes
// ==========================================================

export const state = {
  config: {
    nombreSorteo: 'GRAN SORTEO DE TELEVISORES ELECTROPUNO - ZONA NORTE',
    descripcion: 'ELECTRO PUNO PREMIA TU PUNTUALIDAD.',
    numPremios: 10,
    numAlAgua: 2,
    numAccesitarios: 2,
    duracionAlAgua: 5,
    duracionPremio: 10,
    duracionAccesitario: 5,
    nombresPremios: ['Premio 1'],
    descripcionesPremios: [''],
    imagenesPremios: ['https://cdn.zyrosite.com/cdn-ecommerce/store_01J5NNH9X7HXZVVMSR18D3SMTC%2Fassets%2F1724167212049-TELEVISOR%20LG%2055UR7800PSB%2055%20PULGADAS.webp'],
  },
  participantesOriginal: [], // nunca se muta, solo referencia informativa
  ultimoParseoInvalidas: 0,  // líneas no vacías que no se pudieron interpretar (o duplicadas) en la última carga
  pool: [],                  // se va reduciendo durante el sorteo real
  cola: [],                  // eventos generados por sorteoEngine.generarColaEventos
  colaIndex: 0,
  registro: [],              // log inmutable: todo lo que fue saliendo (al agua/ganador/accesitario) — SIEMPRE incluye "al agua" para el CSV
};

/**
 * Parsea una línea de participante.
 * Soporta:
 *   "3567890 Perez Perez, Pepito"
 *   "3567890 Perez Perez Pepito"
 */
export function parsearLinea(linea) {
  const texto = linea.trim();
  if (!texto) return null;

  // Formato con separador " - "
  if (texto.includes(' - ')) {
    const idx = texto.indexOf(' - ');
    const codigo = texto.slice(0, idx).trim();
    const nombre = texto.slice(idx + 3).trim();
    if (!codigo || !nombre) return null;
    return { codigo, nombre };
  }

  // Formato "codigo resto-del-nombre" (también admite CSV con coma para separar código,nombre)
  if (texto.includes(',') && !/\s/.test(texto.split(',')[0])) {
    const idx = texto.indexOf(',');
    const codigo = texto.slice(0, idx).trim();
    const nombre = texto.slice(idx + 1).trim();
    if (codigo && nombre) return { codigo, nombre };
  }

  const match = texto.match(/^(\S+)\s+(.+)$/);
  if (!match) return null;
  return { codigo: match[1].trim(), nombre: match[2].trim() };
}

/**
 * Parsea el contenido completo del archivo (.txt o .csv) de participantes.
 * Devuelve tanto los participantes válidos como el conteo de líneas no válidas
 * (líneas no vacías que no se pudieron interpretar, o códigos duplicados).
 */
export function parsearParticipantes(textoArchivo) {
  const lineas = textoArchivo.split(/\r?\n/);
  const participantes = [];
  const codigosVistos = new Set();
  let invalidas = 0;

  for (const linea of lineas) {
    if (!linea.trim()) continue; // líneas vacías: se ignoran, no cuentan como inválidas
    const p = parsearLinea(linea);
    if (!p || codigosVistos.has(p.codigo)) {
      invalidas++;
      continue;
    }
    codigosVistos.add(p.codigo);
    participantes.push(p);
  }
  return { participantes, invalidas };
}

/** Lee un archivo (File) como texto, en Promesa. */
export function leerArchivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsText(file, 'utf-8');
  });
}

/** Genera nombres de premio por defecto según la cantidad, preservando ediciones previas. */
export function generarNombresPremios(cantidad, actuales = []) {
  const nombres = [];
  for (let i = 0; i < cantidad; i++) {
    nombres.push(actuales[i] || `${i + 1}° TELEVISOR LG 55 PULGADAS`);
  }
  return nombres;
}

/** Genera descripciones de premio por defecto (vacías), preservando ediciones previas. */
export function generarDescripcionesPremios(cantidad, actuales = []) {
  const descripciones = [];
  for (let i = 0; i < cantidad; i++) {
    descripciones.push(actuales[i] || 'ELECTRO PREMIA TU PUNTUALIDAD.');
  }
  return descripciones;
}

/** Genera URLs de imagen de premio por defecto (vacías), preservando ediciones previas. */
export function generarImagenesPremios(cantidad, actuales = []) {
  const imagenes = [];
  for (let i = 0; i < cantidad; i++) {
    imagenes.push(actuales[i] || 'https://cdn.zyrosite.com/cdn-ecommerce/store_01J5NNH9X7HXZVVMSR18D3SMTC%2Fassets%2F1724167212049-TELEVISOR%20LG%2055UR7800PSB%2055%20PULGADAS.webp');
  }
  return imagenes;
}

/** Reinicia el estado de ejecución del sorteo (antes de iniciar una ronda). */
export function reiniciarEjecucion() {
  state.pool = [...state.participantesOriginal];
  state.cola = [];
  state.colaIndex = 0;
  state.registro = [];
}
