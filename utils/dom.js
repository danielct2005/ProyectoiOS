/**
 * ===== UTILS: DOM =====
 * Helpers para manipulación del DOM
 */

/**
 * Escapa HTML para prevenir XSS
 * @param {string} html 
 * @returns {string}
 */
export function escapeHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Crea un elemento con atributos e hijos
 * @param {string} tag 
 * @param {Object} attrs 
 * @param {Array|string} children 
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  
  for (const key in attrs) {
    if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
    } else if (key === 'class') {
      el.className = attrs[key];
    } else if (key === 'dataset') {
      Object.assign(el.dataset, attrs[key]);
    } else if (key === 'style' && typeof attrs[key] === 'object') {
      Object.assign(el.style, attrs[key]);
    } else {
      el.setAttribute(key, attrs[key]);
    }
  }
  
  if (typeof children === 'string') {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        el.appendChild(child);
      }
    });
  }
  
  return el;
}

/**
 * Crea estado vacío (empty state)
 * @param {string} icon 
 * @param {string} title 
 * @param {string} message 
 * @returns {string}
 */
export function createEmptyState(icon, title, message) {
  return `
    <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
      <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
      <h3 style="margin: 0 0 8px; color: var(--gray-700);">${title}</h3>
      <p style="margin: 0; font-size: 14px;">${message}</p>
    </div>
  `;
}

/**
 * Query selecto con fallback
 * @param {string} selector 
 * @param {ParentNode} parent 
 * @returns {Element|null}
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Query selecto todos
 * @param {string} selector 
 * @param {ParentNode} parent 
 * @returns {NodeList}
 */
export function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * Toggle clase en elemento
 * @param {string|Element} element 
 * @param {string} className 
 * @param {boolean} force 
 */
export function toggleClass(element, className, force) {
  if (typeof element === 'string') {
    element = document.querySelector(element);
  }
  if (!element) return;
  
  element.classList.toggle(className, force);
}

/**
 * Muestra u oculta elemento
 * @param {string|Element} element 
 * @param {boolean} visible 
 * @param {string} display 
 */
export function show(element, visible = true, display = 'block') {
  if (typeof element === 'string') {
    element = document.querySelector(element);
  }
  if (!element) return;
  
  element.style.display = visible ? display : 'none';
}

/**
 * Agrega estilos temporales
 * @param {string|Element} element 
 * @param {Object} styles 
 */
export function setStyles(element, styles) {
  if (typeof element === 'string') {
    element = document.querySelector(element);
  }
  if (!element) return;
  
  Object.assign(element.style, styles);
}

/**
 * Espera a que el DOM esté listo
 * @param {Function} callback 
 */
export function domReady(callback) {
  if (document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

/**
 * Debounce de funciones
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle de funciones
 * @param {Function} func 
 * @param {number} limit 
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Genera ID único
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}