/**
 * ===== SERVICES: FINANCES =====
 * Lógica de cálculo financiero (sin UI)
 * Solo operaciones matemáticas y de datos
 */

import { getState, setHistory, getCurrentMonth } from '../core/state.js';
import { generateId } from '../utils/dom.js';

/**
 * Calcula ingresos del mes actual
 * @returns {number}
 */
export function calculateIncome() {
  const state = getState();
  return state.transactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calcula gastos del mes actual
 * @returns {number}
 */
export function calculateExpense() {
  const state = getState();
  return state.transactions
    .filter(t => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calcula balance del mes (ingresos - gastos)
 * @returns {number}
 */
export function calculateBalance() {
  return calculateIncome() - calculateExpense();
}

/**
 * Calcula balance acumulado (balance + saldo inicial)
 * @returns {number}
 */
export function calculateAccumulatedBalance() {
  const state = getState();
  return calculateBalance() + state.saldoInicial;
}

/**
 * Calcula deuda total de tarjetas
 * @returns {number}
 */
export function calculateCreditCardDebt() {
  const state = getState();
  return state.debts.reduce((sum, d) => sum + d.totalAmount, 0);
}

/**
 * Calcula deuda restante (total - pagado)
 * @returns {number}
 */
export function calculateRemainingDebt() {
  const state = getState();
  return state.debts.reduce((sum, d) => {
    const paid = d.paidInstallments * d.installmentAmount;
    return sum + (d.totalAmount - paid);
  }, 0);
}

/**
 * Calcula cuota actual del mes
 * @returns {number}
 */
export function calculateMonthlyPayment() {
  const state = getState();
  return state.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Calcula disponibilidad (balance - gastos fijos)
 * @returns {number}
 */
export function calculateAvailable() {
  return calculateBalance() - calculateMonthlyPayment();
}

/**
 * Calcula transacciones agrupadas por tipo
 * @returns {Object}
 */
export function getTransactionsByType() {
  const state = getState();
  return {
    ingresos: state.transactions.filter(t => t.type === 'ingreso'),
    gastos: state.transactions.filter(t => t.type === 'gasto')
  };
}

/**
 * Calcula total de una categoría específica
 * @param {string} category 
 * @returns {number}
 */
export function calculateCategoryTotal(category) {
  const state = getState();
  return state.transactions
    .filter(t => t.category === category && t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calcula promedio de gasto diarios
 * @param {number} days 
 * @returns {number}
 */
export function calculateDailyAverage(days = 30) {
  const total = calculateExpense();
  return Math.round(total / days);
}

/**
 * Calcula proyección de gasto al final del mes
 * @returns {number}
 */
export function calculateProjectedExpense() {
  const state = getState();
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const dailyAvg = calculateExpense() / currentDay;
  return Math.round(dailyAvg * daysInMonth);
}

/**
 * Calcula ahorro potencial
 * @returns {number}
 */
export function calculatePotentialSavings() {
  const available = calculateAvailable();
  return available > 0 ? available : 0;
}

/**
 * Obtiene Transactions filtradas por rango de fechas
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Array}
 */
export function getTransactionsByDateRange(startDate, endDate) {
  const state = getState();
  return state.transactions.filter(t => {
    const date = new Date(t.date);
    return date >= startDate && date <= endDate;
  });
}

/**
 * Obtiene Transactions de hoy
 * @returns {Array}
 */
export function getTodayTransactions() {
  const state = getState();
  const today = new Date().toISOString().split('T')[0];
  return state.transactions.filter(t => t.date.startsWith(today));
}

/**
 * Obtiene Transactions de la semana actual
 * @returns {Array}
 */
export function getWeekTransactions() {
  const state = getState();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return state.transactions.filter(t => new Date(t.date) >= weekAgo);
}

/**
 * Obtiene Transactions del mes actual
 * @returns {Array}
 */
export function getCurrentMonthTransactions() {
  const state = getState();
  const month = getCurrentMonth();
  return state.transactions.filter(t => t.date.startsWith(month));
}

/**
 * Calcula resumen mensual
 * @returns {Object}
 */
export function getMonthlySummary() {
  return {
    income: calculateIncome(),
    expense: calculateExpense(),
    balance: calculateBalance(),
    initialBalance: getState().saldoInicial,
    accumulated: calculateAccumulatedBalance(),
    fixedExpenses: calculateMonthlyPayment(),
    available: calculateAvailable(),
    transactionCount: getState().transactions.length
  };
}

/**
 * Obtiene top categorías de gasto
 * @param {number} limit 
 * @returns {Array}
 */
export function getTopCategories(limit = 5) {
  const state = getState();
  const categoryTotals = {};
  
  state.transactions
    .filter(t => t.type === 'gasto')
    .forEach(t => {
      const cat = t.category || 'Otros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });
  
  return Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, amount]) => ({ category, amount }));
}

/**
 * Guarda el mes actual en history
 */
export function archiveCurrentMonth() {
  const state = getState();
  const month = getCurrentMonth();
  
  if (!month) return;
  
  setHistory(month, {
    income: calculateIncome(),
    expense: calculateExpense(),
    balance: calculateBalance(),
    initialBalance: state.saldoInicial,
    accumulated: calculateAccumulatedBalance(),
    transactionCount: state.transactions.length,
    savedAt: new Date().toISOString()
  });
}