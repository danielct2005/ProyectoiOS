/**
 * ===== SERVICES: SAVINGS =====
 * Lógica de ahorros y metas (sin UI)
 */

import { getState, addSavingsAccount, addSavingsGoal, updateSavingsAccount, updateSavingsGoal, deleteSavingsAccount, deleteSavingsGoal } from '../core/state.js';
import { generateId } from '../utils/dom.js';

/**
 * Calcula total en cuentas de ahorro
 * @returns {number}
 */
export function calculateTotalSavings() {
  const state = getState();
  return state.savingsAccounts.reduce((sum, a) => sum + a.balance, 0);
}

/**
 * Calcula progreso total de metas
 * @returns {number}
 */
export function calculateGoalsProgress() {
  const state = getState();
  const totalTarget = state.savingsGoals.reduce((sum, g) => sum + g.target, 0);
  const totalCurrent = state.savingsGoals.reduce((sum, g) => sum + g.current, 0);
  
  if (totalTarget === 0) return 0;
  return Math.round((totalCurrent / totalTarget) * 100);
}

/**
 * Crea cuenta de ahorro
 * @param {string} name 
 * @param {number} initialBalance 
 * @returns {Object}
 */
export function createSavingsAccount(name, initialBalance = 0) {
  const account = {
    id: generateId(),
    name: name.trim(),
    balance: parseFloat(initialBalance),
    createdAt: new Date().toISOString()
  };
  
  addSavingsAccount(account);
  return { success: true, account };
}

/**
 * Crea meta de ahorro
 * @param {string} name 
 * @param {number} target 
 * @param {string} deadline 
 * @returns {Object}
 */
export function createSavingsGoal(name, target, deadline = null) {
  const goal = {
    id: generateId(),
    name: name.trim(),
    target: parseFloat(target),
    current: 0,
    deadline,
    createdAt: new Date().toISOString()
  };
  
  addSavingsGoal(goal);
  return { success: true, goal };
}

/**
 * Aporta a una cuenta
 * @param {string} accountId 
 * @param {number} amount 
 * @returns {Object}
 */
export function depositToAccount(accountId, amount) {
  const state = getState();
  const account = state.savingsAccounts.find(a => a.id === accountId);
  
  if (!account) {
    return { success: false, message: 'Cuenta no encontrada' };
  }
  
  const deposit = {
    id: generateId(),
    type: 'deposit',
    amount: parseFloat(amount),
    date: new Date().toISOString()
  };
  
  if (!account.history) account.history = [];
  account.history.push(deposit);
  account.balance += parseFloat(amount);
  
  return { success: true, account };
}

/**
 * Retira de una cuenta
 * @param {string} accountId 
 * @param {number} amount 
 * @returns {Object}
 */
export function withdrawFromAccount(accountId, amount) {
  const state = getState();
  const account = state.savingsAccounts.find(a => a.id === accountId);
  
  if (!account) {
    return { success: false, message: 'Cuenta no encontrada' };
  }
  
  if (account.balance < amount) {
    return { success: false, message: 'Saldo insuficiente' };
  }
  
  const withdrawal = {
    id: generateId(),
    type: 'withdrawal',
    amount: parseFloat(amount),
    date: new Date().toISOString()
  };
  
  if (!account.history) account.history = [];
  account.history.push(withdrawal);
  account.balance -= parseFloat(amount);
  
  return { success: true, account };
}

/**
 * Aporta a una meta
 * @param {string} goalId 
 * @param {number} amount 
 * @returns {Object}
 */
export function depositToGoal(goalId, amount) {
  const state = getState();
  const goal = state.savingsGoals.find(g => g.id === goalId);
  
  if (!goal) {
    return { success: false, message: 'Meta no encontrada' };
  }
  
  goal.current += parseFloat(amount);
  
  if (goal.current >= goal.target) {
    goal.completed = true;
    goal.completedAt = new Date().toISOString();
  }
  
  return { success: true, goal };
}

/**
 * Elimina cuenta
 * @param {string} accountId 
 */
export function removeAccount(accountId) {
  deleteSavingsAccount(accountId);
}

/**
 * Elimina meta
 * @param {string} goalId 
 */
export function removeGoal(goalId) {
  deleteSavingsGoal(goalId);
}

/**
 * Obtiene metas activas
 * @returns {Array}
 */
export function getActiveGoals() {
  const state = getState();
  return state.savingsGoals.filter(g => !g.completed);
}

/**
 * Obtiene metas completadas
 * @returns {Array}
 */
export function getCompletedGoals() {
  const state = getState();
  return state.savingsGoals.filter(g => g.completed);
}

/**
 * Calcula progreso de una meta
 * @param {string} goalId 
 * @returns {number}
 */
export function getGoalProgress(goalId) {
  const state = getState();
  const goal = state.savingsGoals.find(g => g.id === goalId);
  if (!goal) return 0;
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}