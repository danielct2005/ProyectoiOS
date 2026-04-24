/**
 * ===== SERVICES: INDICATORS =====
 * Lógica para obtener indicadores económicos
 */

let cachedIndicators = {
  uf: null,
  utm: null,
  dolar: null,
  euro: null,
  ipc: null,
  imacec: null
};

let lastFetch = null;

/**
 * Obtiene indicadores desde API del Banco Central
 * @returns {Object}
 */
export async function fetchIndicators() {
  const now = new Date();
  
  // Cache por 1 hora
  if (lastFetch && (now - lastFetch) < 3600000) {
    return cachedIndicators;
  }
  
  try {
    // API Banco Central Chile - Cámara de Comercio de Santiago
    const response = await fetch('https://si3.bcentral.cl/IndicadoresWS/api/Indicadores');
    
    if (!response.ok) throw new Error('API error');
    
    const data = await response.json();
    
    cachedIndicators = {
      uf: { value: data.UF?.valor, date: data.UF?.Fecha },
      utm: { value: data.UTM?.valor, date: data.UTM?.Fecha },
      dolar: { value: data.DOLAR?.valor, date: data.DOLAR?.Fecha },
      euro: { value: data.EURO?.valor, date: data.EURO?.Fecha },
      ipc: { value: data.IPC?.valor, date: data.IPC?.Fecha },
      imacec: { value: data.IMACEC?.valor, date: data.IMACEC?.Fecha }
    };
    
    lastFetch = now;
    return cachedIndicators;
  } catch (e) {
    console.error('Error fetching indicators:', e);
    return cachedIndicators;
  }
}

/**
 * Obtiene valor de indicador específico
 * @param {string} indicator 
 * @returns {number|null}
 */
export function getIndicator(indicator) {
  return cachedIndicators[indicator]?.value || null;
}

/**
 * Fuerza actualización de indicadores
 * @returns {Object}
 */
export async function refreshIndicators() {
  lastFetch = null;
  return fetchIndicators();
}