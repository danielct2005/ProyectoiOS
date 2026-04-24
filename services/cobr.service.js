/**
 * ===== SERVICES: COBR =====
 * Lógica de cobros a terceros (sin UI)
 */

import { getState, addCobro, updateCobro, deleteCobro } from '../core/state.js';
import { generateId } from '../utils/dom.js';

/**
 * Calcula total por cobrar (suma de cuotas pendientes)
 * @returns {number}
 */
export function calculateCobrosTotal() {
  const state = getState();
  return state.cobros.reduce((sum, c) => {
    const paidAmount = (c.paidInstallments || 0) * (c.installmentAmount || c.totalAmount / c.totalInstallments);
    return sum + (c.totalAmount - paidAmount);
  }, 0);
}

/**
 * Calcula total de este mes (próximas cuotas)
 * @returns {number}
 */
export function calculateCobrosMonthly() {
  const state = getState();
  return state.cobros.reduce((sum, c) => {
    const currentInstallment = (c.paidInstallments || 0) + 1;
    if (currentInstallment <= c.totalInstallments && c.currentPending) {
      return sum + (c.installmentAmount || c.totalAmount / c.totalInstallments);
    }
    return sum;
  }, 0);
}

/**
 * Calcula monto de cuota individual
 * @param {number} totalAmount 
 * @param {number} totalInstallments 
 * @returns {number}
 */
export function calculateInstallmentAmount(totalAmount, totalInstallments) {
  return Math.round(totalAmount / totalInstallments);
}

/**
 * Crea un nuevo cobro
 * @param {string} deudor 
 * @param {string} concepto 
 * @param {number} totalAmount 
 * @param {number} totalInstallments 
 * @returns {Object}
 */
export function createCobro(deudor, concepto, totalAmount, totalInstallments) {
  const state = getState();
  const installmentAmount = calculateInstallmentAmount(totalAmount, totalInstallments);
  
  const cobro = {
    id: generateId(),
    deudor: deudor.trim(),
    concepto: concepto.trim(),
    totalAmount: parseFloat(totalAmount),
    totalInstallments: parseInt(totalInstallments),
    installmentAmount,
    paidInstallments: 0,
    currentPending: true,
    createdAt: new Date().toISOString(),
    history: []
  };
  
  addCobro(cobro);
  return { success: true, cobro };
}

/**
 * Marca una cuota como pagada
 * @param {string} cobroId 
 * @returns {Object}
 */
export function markInstallmentPaid(cobroId) {
  const state = getState();
  const cobro = state.cobros.find(c => c.id === cobroId);
  
  if (!cobro) {
    return { success: false, message: 'Cobro no encontrado' };
  }
  
  if (cobro.paidInstallments >= cobro.totalInstallments) {
    return { success: false, message: 'Todas las cuotas ya están pagadas' };
  }
  
  const payment = {
    date: new Date().toISOString(),
    amount: cobro.installmentAmount,
    installmentNumber: cobro.paidInstallments + 1
  };
  
  if (!cobro.history) cobro.history = [];
  cobro.history.push(payment);
  
  cobro.paidInstallments++;
  
  if (cobro.paidInstallments >= cobro.totalInstallments) {
    cobro.currentPending = false;
  } else {
    cobro.currentPending = true;
  }
  
  return { success: true, cobro };
}

/**
 * Marca una cuota como impaga (revierte)
 * @param {string} cobroId 
 * @returns {Object}
 */
export function revertLastPayment(cobroId) {
  const state = getState();
  const cobro = state.cobros.find(c => c.id ===cobroId);
  
  if (!cobro) {
    return { success: false, message: 'Cobro no encontrado' };
  }
  
  if (cobro.paidInstallments <= 0) {
    return { success: false, message: 'No hay pagos para revertir' };
  }
  
  if (cobro.history &&cobro.history.length > 0) {
    cobro.history.pop();
  }
  
  cobro.paidInstallments--;
  cobro.currentPending = true;
  
  return { success: true, cobro };
}

/**
 * Actualiza un cobro
 * @param {string} cobroId 
 * @param {Object} updates 
 * @returns {Object}
 */
export function updateCobroData(cobroId, updates) {
  const state = getState();
  const cobro = state.cobros.find(c => c.id ===cobroId);
  
  if (!cobro) {
    return { success: false, message: 'Cobro no encontrado' };
  }
  
  // Recalcular installmentAmount si cambian totales
  if (updates.totalAmount !== undefined && updates.totalInstallments !== undefined) {
    updates.installmentAmount = calculateInstallmentAmount(
      updates.totalAmount,
      updates.totalInstallments
    );
  }
  
  updateCobro(cobroId, updates);
  return { success: true };
}

/**
 * Elimina un cobro
 * @param {string} cobroId 
 * @returns {Object}
 */
export function removeCobro(cobroId) {
  deleteCobro(cobroId);
  return { success: true };
}

/**
 * Obtiene cobros pendientes
 * @returns {Array}
 */
export function getPendingCobros() {
  const state = getState();
  return state.cobros.filter(c => c.currentPending);
}

/**
 * Obtiene cobros completados
 * @returns {Array}
 */
export function getCompletedCobros() {
  const state = getState();
  return state.cobros.filter(c => !c.currentPending);
}

/**
 * Obtiene cobros de un deudor específico
 * @param {string} deudor 
 * @returns {Array}
 */
export function getCobrosByDeudor(deudor) {
  const state = getState();
  return state.cobros.filter(c => c.deudor.toLowerCase().includes(deudor.toLowerCase()));
}

/**
 * Calcula progreso de un cobro específico
 * @param {string} cobroId 
 * @returns {number}
 */
export function getCobroProgress(cobroId) {
  const state = getState();
  const cobro = state.cobros.find(c => c.id ===cobroId);
  if (!cobro) return 0;
  return Math.round((cobro.paidInstallments / cobro.totalInstallments) * 100);
}