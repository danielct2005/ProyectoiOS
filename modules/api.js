/**
 * ===== MÓDULO DE API =====
 * Gestión de llamadas a APIs externas
 * Incluye integración con mindicador.cl para indicadores económicos de Chile
 */

// ==================== CONSTANTS ====================

// URL de la serverless function en Vercel (proxy propio)
const API_PROXY_URL = '/api/indicators';

// URL original de mindicador (usar solo si el proxy local falla)
const API_BASE_URL = 'https://mindicador.cl/api';

// Fallback: proxies públicos
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://proxy.corsplus.io/'
];

// Cache para evitar llamadas repetidas
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ==================== FETCH HELPERS ====================

/**
 * Realiza una petición fetch usando el proxy local de Vercel
 * Falls back a proxies públicos si el proxy local no está disponible
 */
async function fetchWithErrorHandling(url, options = {}) {
  const timeoutMs = 8000; // 8 segundos de timeout
  
  // 1. Primero intentar con el proxy local de Vercel
  try {
    // Extraer el indicador de la URL (ej: "uf" de "/api/uf")
    const indicator = url.split('/').pop();
    const proxyUrl = `${API_PROXY_URL}?indicator=${indicator}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(proxyUrl, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.value) {
        // Transformar al formato esperado por la app
        return {
          serie: [{ valor: data.value, fecha: data.fecha }]
        };
      }
    }
  } catch (error) {
    console.warn('Proxy local (Vercel) falló, intentando proxies públicos:', error.message);
  }
  
  // 2. Si el proxy local falla, intentar con proxies públicos
  for (const proxy of CORS_PROXIES) {
    const proxyUrl = proxy + encodeURIComponent(url);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(proxyUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verificar que los datos son válidos
      if (data && data.serie && data.serie.length > 0) {
        return data;
      }
      
      console.warn('Datos inválidos del proxy, intentando siguiente...');
      continue;
      
    } catch (error) {
      console.warn(`Proxy ${proxy} falló:`, error.message);
      continue;
    }
  }
  
  // Si todos los proxies fallan, lanzar error
  throw new Error('Todos los proxies CORS fallaron');
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
