/**
 * ===== UTILS: FORMAT =====
 * Formateo de currencies, números, fechas
 */

/**
 * Formatea un número como moneda chilena (CLP)
 * @param {number} value 
 * @returns {string}
 */
export function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Formatea un número con separador de miles
 * @param {number|string} value 
 * @returns {string}
 */
export function formatNumber(value) {
  if (value === undefined || value === null) return '0';
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  return new Intl.NumberFormat('es-CL').format(num);
}

/**
 * Agrega separador de miles a un input
 * @param {HTMLInputElement} input 
 */
export function addThousandsSeparator(input) {
  if (!input) return;
  
  input.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value) {
      value = parseInt(value).toLocaleString('es-CL');
    }
    e.target.value = value;
  });
  
  // Formatear valor inicial
  const initialValue = input.value.replace(/\D/g, '');
  if (initialValue) {
    input.value = parseInt(initialValue).toLocaleString('es-CL');
  }
}

/**
 * Convierte string con formato CLP a número
 * @param {string} value 
 * @returns {number}
 */
export function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return parseInt(value.replace(/\./g, '')) || 0;
}

/**
 * Restringe input a solo dígitos
 * @param {HTMLInputElement} input 
 */
export function digitsOnly(input) {
  if (!input) return;
  
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
  });
  
  // Limpiar valor inicial
  input.value = input.value.replace(/\D/g, '');
}

/**
 * Formatea una fecha
 * @param {string|Date} date 
 * @param {string} format 
 * @returns {string}
 */
export function formatDate(date, format = 'short') {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  if (format === 'month') {
    return d.toLocaleDateString('es-CL', {
      month: 'long',
      year: 'numeric'
    });
  }
  
  return d.toLocaleDateString('es-CL');
}

/**
 * Obtiene el nombre del mes
 * @param {number} monthIndex 
 * @returns {string}
 */
export function getMonthName(monthIndex) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthIndex] || '';
}

/**
 * Obtiene la key del mes actual (YYYY-MM)
 * @returns {string}
 */
export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')`;
}

/**
 * Formatea un porcentaje
 * @param {number} value 
 * @returns {string}
 */
export function formatPercent(value) {
  if (value === undefined || value === null) return '0%';
  return `${value.toFixed(1)}%`;
}

/**
 * Trunca texto con ellipsis
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
export function truncate(text, maxLength = 30) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}