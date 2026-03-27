/**
 * ===== MÓDULO DE API =====
 * Gestión de llamadas a APIs externas
 * Incluye integración con mindicador.cl para indicadores económicos de Chile
 */

// ==================== CONSTANTS ====================

const API_BASE_URL = 'https://mindicador.cl/api';

// Cache para evitar llamadas repetidas
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ==================== FETCH HELPERS ====================

/**
 * Realiza una petición fetch con manejo de errores
 */
async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Obtiene datos con caché
 */
async function fetchWithCache(key, fetcher) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  
  return data;
}

// ==================== MINDICADOR API ====================

/**
 * Obtiene todos los indicadores económicos
 */
export async function getAllIndicators() {
  return fetchWithCache('all_indicators', async () => {
    return await fetchWithErrorHandling(API_BASE_URL);
  });
}

/**
 * Obtiene un indicador específico
 * @param {string} indicator - Nombre del indicador (uf, utm, dolar, euro, etc.)
 */
export async function getIndicator(indicator) {
  if (!indicator) {
    throw new Error('Indicator name is required');
  }
  
  return fetchWithCache(`indicator_${indicator}`, async () => {
    return await fetchWithErrorHandling(`${API_BASE_URL}/${indicator}`);
  });
}

/**
 * Obtiene la UF (Unidad de Fomento)
 */
export async function getUF() {
  return getIndicator('uf');
}

/**
 * Obtiene la UTM (Unidad Tributaria Mensual)
 */
export async function getUTM() {
  return getIndicator('utm');
}

/**
 * Obtiene el dólar observado
 */
export async function getDolar() {
  return getIndicator('dolar');
}

/**
 * Obtiene el euro
 */
export async function getEuro() {
  return getIndicator('euro');
}

/**
 * Obtiene el IPC (Índice de Precios al Consumidor)
 */
export async function getIPC() {
  return getIndicator('ipc');
}

/**
 * Obtiene la variación del IPC
 */
export async function getVariacionIPC() {
  return getIndicator('variacion_ipc');
}

/**
 * Obtiene el valor de la UF para una fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 */
export async function getUFByDate(date) {
  if (!date) {
    throw new Error('Date is required');
  }
  
  const cacheKey = `uf_${date}`;
  return fetchWithCache(cacheKey, async () => {
    return await fetchWithErrorHandling(`${API_BASE_URL}/uf/${date}`);
  });
}

/**
 * Obtiene el euro para una fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 */
export async function getEuroByDate(date) {
  if (!date) {
    throw new Error('Date is required');
  }
  
  const cacheKey = `euro_${date}`;
  return fetchWithCache(cacheKey, async () => {
    return await fetchWithErrorHandling(`${API_BASE_URL}/euro/${date}`);
  });
}

/**
 * Obtiene el dólar para una fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 */
export async function getDolarByDate(date) {
  if (!date) {
    throw new Error('Date is required');
  }
  
  const cacheKey = `dolar_${date}`;
  return fetchWithCache(cacheKey, async () => {
    return await fetchWithErrorHandling(`${API_BASE_URL}/dolar/${date}`);
  });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Obtiene el valor actual de un indicador
 * @param {string} indicator - Nombre del indicador
 * @returns {number|null} Valor actual del indicador
 */
export async function getCurrentValue(indicator) {
  try {
    const data = await getIndicator(indicator);
    if (data && data.serie && data.serie.length > 0) {
      return data.serie[0].valor;
    }
    return null;
  } catch (error) {
    console.error(`Error getting current value for ${indicator}:`, error);
    return null;
  }
}

/**
 * Obtiene el valor de la UF actual
 * @returns {number|null}
 */
export async function getCurrentUF() {
  return getCurrentValue('uf');
}

/**
 * Obtiene el valor del dólar actual
 * @returns {number|null}
 */
export async function getCurrentDolar() {
  return getCurrentValue('dolar');
}

/**
 * Obtiene el valor del euro actual
 * @returns {number|null}
 */
export async function getCurrentEuro() {
  return getCurrentValue('euro');
}

/**
 * Obtiene la UTM actual
 * @returns {number|null}
 */
export async function getCurrentUTM() {
  return getCurrentValue('utm');
}

/**
 * Convierte un valor de pesos a UF
 * @param {number} pesos - Valor en pesos chilenos
 * @returns {number} Valor en UF
 */
export async function pesosToUF(pesos) {
  const uf = await getCurrentUF();
  if (!uf) return 0;
  return pesos / uf;
}

/**
 * Convierte un valor de UF a pesos
 * @param {number} uf - Valor en UF
 * @returns {number} Valor en pesos chilenos
 */
export async function ufToPesos(uf) {
  const currentUF = await getCurrentUF();
  if (!currentUF) return 0;
  return uf * currentUF;
}

/**
 * Convierte dólares a pesos chilenos
 * @param {number} dolares - Valor en dólares
 * @returns {number} Valor en pesos chilenos
 */
export async function dolaresToPesos(dolares) {
  const dolar = await getCurrentDolar();
  if (!dolar) return 0;
  return dolares * dolar;
}

/**
 * Convierte pesos chilenos a dólares
 * @param {number} pesos - Valor en pesos chilenos
 * @returns {number} Valor en dólares
 */
export async function pesosToDolares(pesos) {
  const dolar = await getCurrentDolar();
  if (!dolar) return 0;
  return pesos / dolar;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Limpia la caché
 */
export function clearCache() {
  cache.clear();
}

/**
 * Obtiene el tamaño de la caché
 */
export function getCacheSize() {
  return cache.size;
}

/**
 * Obtiene información de la caché
 */
export function getCacheInfo() {
  const info = [];
  for (const [key, value] of cache.entries()) {
    const age = Date.now() - value.timestamp;
    info.push({
      key,
      age: Math.round(age / 1000) + 's ago',
      stale: age > CACHE_DURATION
    });
  }
  return info;
}

// ==================== EXPORTS ====================

export default {
  // Indicadores
  getAllIndicators,
  getIndicator,
  getUF,
  getUTM,
  getDolar,
  getEuro,
  getIPC,
  getVariacionIPC,
  
  // Por fecha
  getUFByDate,
  getEuroByDate,
  getDolarByDate,
  
  // Valores actuales
  getCurrentValue,
  getCurrentUF,
  getCurrentDolar,
  getCurrentEuro,
  getCurrentUTM,
  
  // Conversiones
  pesosToUF,
  ufToPesos,
  dolaresToPesos,
  pesosToDolares,
  
  // Caché
  clearCache,
  getCacheSize,
  getCacheInfo
};
