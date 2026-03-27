/**
 * ===== MÓDULO DE UTILIDADES =====
 * Funciones helper reutilizables en toda la aplicación
 */

// ==================== DATE UTILITIES ====================

/**
 * Obtiene la clave del mes actual (YYYY-MM)
 */
export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Obtiene el nombre del mes
 */
export function getMonthName(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

// ==================== CURRENCY UTILITIES ====================

/**
 * Formatea un número con separador de miles
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Limpia un número eliminando separadores de miles
 */
export function parseNumber(str) {
  if (typeof str === 'number') return str;
  return parseInt(str.replace(/\./g, '')) || 0;
}

/**
 * Formatea un número como moneda (formato Chile)
 */
export function formatCurrency(amount) {
  return '$' + formatNumber(amount);
}

// ==================== INPUT UTILITIES ====================

/**
 * Agrega separador de miles mientras escribe
 */
export function addThousandsSeparator(input) {
  if (!input) return;
  
  input.addEventListener('input', function(e) {
    // Guardar posición del cursor
    const cursorPos = this.selectionStart;
    const oldLength = this.value.length;
    
    // Remover todo excepto dígitos
    let value = this.value.replace(/[^\d]/g, '');
    
    if (value) {
      // Formatear con puntos usando regex
      this.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    } else {
      this.value = '';
    }
    
    // Ajustar posición del cursor
    const newLength = this.value.length;
    const newPos = cursorPos + (newLength - oldLength);
    this.setSelectionRange(newPos, newPos);
  });
}

/**
 * Solo permite dígitos
 */
export function digitsOnly(input) {
  if (!input) return;
  
  input.addEventListener('input', function(e) {
    this.value = this.value.replace(/[^\d]/g, '');
  });
}

// ==================== DATE FORMATTING ====================

/**
 * Formatea una fecha
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 86400000) {
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }
  
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }
  
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

// ==================== GENERAL UTILITIES ====================

/**
 * Genera un ID único
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Escapa HTML para prevenir XSS
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Crea un elemento de estado vacío reutilizable
 */
export function createEmptyState(icon, text, hint = '') {
  return `
    <div class="empty-state">
      <span class="empty-state__icon">${icon}</span>
      <p class="empty-state__text">${text}</p>
      ${hint ? `<p class="empty-state__hint">${hint}</p>` : ''}
    </div>
  `;
}

/**
 * Wait for DOM element to be available
 */
export function waitForElement(selector, timeout = 100) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const element = document.querySelector(selector);
      resolve(element);
    }, timeout);
  });
}
