/**
 * ===== CORE: STATE =====
 * Estado global de la aplicación
 * Centraliza todo el estado en un solo lugar
 */

import { 
  initFirebase, 
  saveToFirestore, 
  loadFromFirestore, 
  subscribeToChanges,
  isFirebaseReady,
  saveMonthToFirestore,
  loadMonthFromFirestore,
  getPreviousMonthBalance,
  getAuthState
} from './firebase.js';

// ==================== STATE ====================

export const appState = {
  // Sección actual
  currentSection: 'finanzas',
  currentSubsection: 'billetera',
  agendaSubsection: 'lista',
  currentMonth: null,
  
  // Datos financieros
  transactions: [],
  fixedExpenses: [],
  debts: [],
  cobros: [],
  creditCards: [],
  history: {},
  
  // Datos de agenda
  importantDates: [],
  
  // Estado de pagos
  lastPaymentMonth: null,
  previousMonthBalance: 0,
  
  // Datos de ahorros
  savingsAccounts: [],
  savingsGoals: [],
  
  // Datos de noticias
  news: [],
  
  // Saldo inicial del mes actual
  saldoInicial: 0,
  
  // Preferencias
  darkMode: false
};

// ==================== GETTERS ====================

export function getState() {
  return appState;
}

export function getSection() {
  return appState.currentSection;
}

export function getSubsection() {
  return appState.currentSubsection;
}

export function getCurrentMonth() {
  return appState.currentMonth;
}

export function getTransactions() {
  return appState.transactions;
}

export function getFixedExpenses() {
  return appState.fixedExpenses;
}

export function getDebts() {
  return appState.debts;
}

export function getCobros() {
  return appState.cobros;
}

export function getCreditCards() {
  return appState.creditCards;
}

export function getHistory() {
  return appState.history;
}

export function getSavingsAccounts() {
  return appState.savingsAccounts;
}

export function getSavingsGoals() {
  return appState.savingsGoals;
}

export function getImportantDates() {
  return appState.importantDates;
}

export function getInitialBalance() {
  return appState.saldoInicial;
}

export function isDarkMode() {
  return appState.darkMode;
}

// ==================== SETTERS ====================

export function setSection(section) {
  appState.currentSection = section;
}

export function setSubsection(subsection) {
  appState.currentSubsection = subsection;
}

export function setCurrentMonth(month) {
  appState.currentMonth = month;
}

export function toggleDarkMode() {
  appState.darkMode = !appState.darkMode;
  localStorage.setItem('darkMode', appState.darkMode);
}

// ==================== DATA OPERATIONS ====================

export function addTransaction(transaction) {
  appState.transactions.push(transaction);
}

export function updateTransaction(id, data) {
  const idx = appState.transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    appState.transactions[idx] = { ...appState.transactions[idx], ...data };
  }
}

export function deleteTransaction(id) {
  appState.transactions = appState.transactions.filter(t => t.id !== id);
}

export function addFixedExpense(expense) {
  appState.fixedExpenses.push(expense);
}

export function updateFixedExpense(id, data) {
  const idx = appState.fixedExpenses.findIndex(e => e.id === id);
  if (idx !== -1) {
    appState.fixedExpenses[idx] = { ...appState.fixedExpenses[idx], ...data };
  }
}

export function deleteFixedExpense(id) {
  appState.fixedExpenses = appState.fixedExpenses.filter(e => e.id !== id);
}

export function addDebt(debt) {
  appState.debts.push(debt);
}

export function updateDebt(id, data) {
  const idx = appState.debts.findIndex(d => d.id === id);
  if (idx !== -1) {
    appState.debts[idx] = { ...appState.debts[idx], ...data };
  }
}

export function deleteDebt(id) {
  appState.debts = appState.debts.filter(d => d.id !== id);
}

export function addCobro(cobro) {
  appState.cobros.unshift(cobro);
}

export function updateCobro(id, data) {
  const idx = appState.cobros.findIndex(c => c.id === id);
  if (idx !== -1) {
    appState.cobros[idx] = { ...appState.cobros[idx], ...data };
  }
}

export function deleteCobro(id) {
  appState.cobros = appState.cobros.filter(c => c.id !== id);
}

export function addCreditCard(card) {
  appState.creditCards.push(card);
}

export function deleteCreditCard(id) {
  appState.creditCards = appState.creditCards.filter(c => c.id !== id);
}

export function addSavingsAccount(account) {
  appState.savingsAccounts.push(account);
}

export function updateSavingsAccount(id, data) {
  const idx = appState.savingsAccounts.findIndex(a => a.id === id);
  if (idx !== -1) {
    appState.savingsAccounts[idx] = { ...appState.savingsAccounts[idx], ...data };
  }
}

export function deleteSavingsAccount(id) {
  appState.savingsAccounts = appState.savingsAccounts.filter(a => a.id !== id);
}

export function addSavingsGoal(goal) {
  appState.savingsGoals.push(goal);
}

export function updateSavingsGoal(id, data) {
  const idx = appState.savingsGoals.findIndex(g => g.id === id);
  if (idx !== -1) {
    appState.savingsGoals[idx] = { ...appState.savingsGoals[idx], ...data };
  }
}

export function deleteSavingsGoal(id) {
  appState.savingsGoals = appState.savingsGoals.filter(g => g.id !== id);
}

export function addImportantDate(date) {
  appState.importantDates.push(date);
}

export function updateImportantDate(id, data) {
  const idx = appState.importantDates.findIndex(d => d.id === id);
  if (idx !== -1) {
    appState.importantDates[idx] = { ...appState.importantDates[idx], ...data };
  }
}

export function deleteImportantDate(id) {
  appState.importantDates = appState.importantDates.filter(d => d.id !== id);
}

export function setInitialBalance(amount) {
  appState.saldoInicial = amount;
}

export function setHistory(month, data) {
  appState.history[month] = data;
}

// ==================== SYNC ====================

export async function loadData() {
  const firebaseOk = await initFirebase();
  
  if (firebaseOk) {
    try {
      const data = await loadFromFirestore('appData');
      if (data) {
        appState.fixedExpenses = data.fixedExpenses || [];
        appState.debts = data.debts || [];
        appState.cobros = data.cobros || [];
        appState.creditCards = data.creditCards || [];
        appState.history = data.history || {};
        appState.lastPaymentMonth = data.lastPaymentMonth || null;
        appState.importantDates = data.importantDates || [];
        appState.previousMonthBalance = data.previousMonthBalance || 0;
        appState.savingsAccounts = data.savingsAccounts || [];
        appState.savingsGoals = data.savingsGoals || [];
        appState.news = data.news || [];
        
        subscribeToChanges('appData', (cloudData) => {
          if (cloudData) {
            appState.fixedExpenses = cloudData.fixedExpenses || appState.fixedExpenses;
            appState.debts = cloudData.debts || appState.debts;
            appState.cobros = cloudData.cobros || appState.cobros;
            appState.creditCards = cloudData.creditCards || appState.creditCards;
            appState.savingsAccounts = cloudData.savingsAccounts || appState.savingsAccounts;
            appState.savingsGoals = cloudData.savingsGoals || appState.savingsGoals;
            appState.importantDates = cloudData.importantDates || appState.importantDates;
          }
        });
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }
  
  // Cargar darkMode desde localStorage
  const storedDarkMode = localStorage.getItem('darkMode');
  if (storedDarkMode !== null) {
    appState.darkMode = storedDarkMode === 'true';
  }
}