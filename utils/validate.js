/**
 * ===== UTILS: VALIDATE =====
 * Validaciones de inputs, emails, etc.
 */

/**
 * Valida que un string no esté vacío
 * @param {string} value 
 * @returns {boolean}
 */
export function isRequired(value) {
  return value && value.trim().length > 0;
}

/**
 * Valida formato de email
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que un número sea positivo
 * @param {number} value 
 * @returns {boolean}
 */
export function isPositive(value) {
  return !isNaN(value) && value > 0;
}

/**
 * Valida rango de números
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {boolean}
 */
export function isInRange(value, min, max) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Valida longitud mínima
 * @param {string} value 
 * @param {number} minLength 
 * @returns {boolean}
 */
export function minLength(value, minLength) {
  return value && value.length >= minLength;
}

/**
 * Valida longitud máxima
 * @param {string} value 
 * @param {number} maxLength 
 * @returns {boolean}
 */
export function maxLength(value, maxLength) {
  return value && value.length <= maxLength;
}

/**
 * Valida que un valor sea un número válido
 * @param {string|number} value 
 * @returns {boolean}
 */
export function isValidNumber(value) {
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
  return !isNaN(num) && isFinite(num);
}

/**
 * Valida fecha
 * @param {string|Date} date 
 * @returns {boolean}
 */
export function isValidDate(date) {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Valida que una fecha no sea en el pasado
 * @param {string|Date} date 
 * @returns {boolean}
 */
export function isFutureDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

/**
 * Valida formato de RUT chileno
 * @param {string} rut 
 * @returns {boolean}
 */
export function isValidRUT(rut) {
  if (!rut) return false;
  rut = rut.replace(/\./g, '').replace('-', '');
  if (rut.length < 2) return false;
  
  const num = parseInt(rut.slice(0, -1));
  const dv = rut.slice(-1).toUpperCase();
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = num.toString().length - 1; i >= 0; i--) {
    sum += (num.toString()[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDV = String(11 - (sum % 11)).replace('10', 'K').replace('11', '0');
  return dv === expectedDV;
}

/**
 * Valida teléfono chileno
 * @param {string} phone 
 * @returns {boolean}
 */
export function isValidChileanPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, '').replace(/+/g, '').replace(/-/g, '');
  // Acepta: +56912345678, 912345678, 56912345678
  return /^(\+?56|569|56)?[9][0-9]{8}$/.test(cleaned);
}

/**
 * Valida patente vehicular
 * @param {string} plate 
 * @returns {boolean}
 */
export function isValidPlate(plate) {
  if (!plate) return false;
  // Formatos: ABCD-12, AB-1234, AAAA-12
  return /^[A-Z]{2,4}[-][0-9]{2,4}$/i.test(plate);
}

/**
 * Crea validador con reglas específicas
 * @param {Object} rules 
 * @returns {Function}
 */
export function validate(rules) {
  return (data) => {
    const errors = {};
    
    for (const field in rules) {
      const rule = rules[field];
      const value = data[field];
      
      if (rule.required && !isRequired(value)) {
        errors[field] = 'Este campo es requerido';
      }
      
      if (rule.email && value && !isValidEmail(value)) {
        errors[field] = 'Email inválido';
      }
      
      if (rule.positive && value && !isPositive(value)) {
        errors[field] = 'Debe ser un número positivo';
      }
      
      if (rule.minLength !== undefined && value && !minLength(value, rule.minLength)) {
        errors[field] = `Mínimo ${rule.minLength} caracteres`;
      }
      
      if (rule.maxLength !== undefined && value && !maxLength(value, rule.maxLength)) {
        errors[field] = `Máximo ${rule.maxLength} caracteres`;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
}