// ==========================================================
// sorteoEngine.js — lógica PURA del sorteo (sin DOM)
// Usa crypto.getRandomValues con rejection sampling para
// eliminar el sesgo de módulo.
// ==========================================================

/**
 * Devuelve un entero aleatorio criptográficamente seguro en [0, maxExclusivo).
 */
export function randomInt(maxExclusivo) {
  if (!Number.isInteger(maxExclusivo) || maxExclusivo <= 0) {
    throw new Error('randomInt: maxExclusivo debe ser un entero positivo');
  }
  if (maxExclusivo === 1) return 0;

  const bitsNecesarios = Math.ceil(Math.log2(maxExclusivo));
  const bytesNecesarios = Math.max(1, Math.ceil(bitsNecesarios / 8));
  const techoTotal = 256 ** bytesNecesarios;
  const maxValido = Math.floor(techoTotal / maxExclusivo) * maxExclusivo;

  let valor;
  do {
    const buffer = new Uint8Array(bytesNecesarios);
    crypto.getRandomValues(buffer);
    valor = 0;
    for (let i = 0; i < bytesNecesarios; i++) {
      valor += buffer[i] * (256 ** i);
    }
  } while (valor >= maxValido); // rechaza para no sesgar el módulo

  return valor % maxExclusivo;
}

/**
 * Extrae UNA persona al azar del pool (mutando el array: la remueve).
 * Se usa una sola vez por cada "Revelar" en la UI.
 */
export function extraerAleatorio(pool) {
  if (pool.length === 0) {
    throw new Error('extraerAleatorio: el pool está vacío');
  }
  const idx = randomInt(pool.length);
  return pool.splice(idx, 1)[0];
}

/**
 * Construye la cola de eventos del sorteo completo a partir de la config.
 * No ejecuta el sorteo todavía (eso pasa evento por evento en la UI,
 * al presionar "Revelar", para permitir el flujo manual).
 *
 * Tipos de evento: 'premio_intro' | 'al_agua' | 'ganador' | 'accesitario' | 'resumen_premio' | 'resumen_final'
 */
export function generarColaEventos(config) {
  const cola = [];

  for (let p = 0; p < config.numPremios; p++) {
    cola.push({ tipo: 'premio_intro', premioIndex: p });
    for (let i = 0; i < config.numAlAgua; i++) {
      cola.push({ tipo: 'al_agua', premioIndex: p, numero: i + 1 });
    }
    cola.push({ tipo: 'ganador', premioIndex: p, numero: 1 });
    for (let i = 0; i < config.numAccesitarios; i++) {
      cola.push({ tipo: 'accesitario', premioIndex: p, numero: i + 1 });
    }
    cola.push({ tipo: 'resumen_premio', premioIndex: p });
  }
  cola.push({ tipo: 'resumen_final' });

  return cola;
}

export const ETIQUETAS_TIPO = {
  al_agua: 'Al agua',
  ganador: 'Ganador',
  accesitario: 'Accesitario',
};
