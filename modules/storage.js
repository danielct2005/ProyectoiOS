/**
 * ===== MÓDULO DE ALMACENAMIENTO =====
 * Gestión de datos con Firebase + localStorage como fallback
 */

import { generateId } from './utils.js';
import { 
  initFirebase, 
  saveToFirestore, 
  loadFromFirestore, 
  subscribeToChanges,
  isFirebaseReady 
} from './firebase.js';

// ==================== CONSTANTS ====================

const STORAGE_KEY = 'finanzas_app_data';
let firebaseInitialized = false;

// ==================== STATE ====================

// Estado global de la aplicación
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
  
  // Preferencias (se inicializa en false, se carga correctamente en loadData)
  darkMode: false
};

// ==================== LOAD DATA ====================

export async function loadData() {
  // Primero intentar con Firebase
  const firebaseOk = await initFirebase();
  firebaseInitialized = firebaseOk;
  
  if (firebaseOk) {
    try {
      // Cargar datos de Firestore
      const data = await loadFromFirestore('appData');
      if (data) {
        appState.transactions = data.transactions || [];
        appState.fixedExpenses = data.fixedExpenses || [];
        appState.debts = data.debts || [];
        appState.creditCards = data.creditCards || [];
        appState.history = data.history || {};
        appState.lastPaymentMonth = data.lastPaymentMonth || null;
        appState.importantDates = data.importantDates || [];
        appState.previousMonthBalance = data.previousMonthBalance || 0;
        appState.savingsAccounts = data.savingsAccounts || [];
        appState.savingsGoals = data.savingsGoals || [];
        appState.news = data.news || [];
        
        // Sincronizar cambios en tiempo real
        subscribeToChanges('appData', (cloudData) => {
          // Actualizar solo si hay cambios远程
          console.log('Datos sincronizados desde la nube');
        });
        
        // Guardar en localStorage como backup
        saveData();
        
        console.log('Datos cargados desde Firebase');
        return;
      }
    } catch (error) {
      console.error('Error cargando desde Firebase:', error);
    }
  }
  
  // Fallback: localStorage
  console.log('Usando localStorage como fallback');
  loadFromLocalStorage();
}

function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      appState.transactions = parsed.transactions || [];
      appState.fixedExpenses = parsed.fixedExpenses || [];
      appState.debts = parsed.debts || [];
      appState.creditCards = parsed.creditCards || [];
      appState.history = parsed.history || {};
      appState.lastPaymentMonth = parsed.lastPaymentMonth || null;
      appState.importantDates = parsed.importantDates || [];
      appState.previousMonthBalance = parsed.previousMonthBalance || 0;
      appState.savingsAccounts = parsed.savingsAccounts || [];
      appState.savingsGoals = parsed.savingsGoals || [];
      appState.news = parsed.news || [];
    } else {
      resetState();
    }
    
    // Cargar preferencia de modo oscuro
    appState.darkMode = localStorage.getItem('darkMode') === 'true';
  } catch (error) {
    console.error('Error al cargar datos:', error);
    resetState();
  }
}

function resetState() {
  appState.transactions = [];
  appState.fixedExpenses = [];
  appState.debts = [];
  appState.creditCards = [];
  appState.history = {};
  appState.lastPaymentMonth = null;
  appState.importantDates = [];
  appState.previousMonthBalance = 0;
  appState.savingsAccounts = [];
  appState.savingsGoals = [];
  appState.news = [];
}

// ==================== SAVE DATA ====================

export function saveData() {
  const dataToSave = {
    transactions: appState.transactions,
    fixedExpenses: appState.fixedExpenses,
    debts: appState.debts,
    creditCards: appState.creditCards,
    history: appState.history,
    lastPaymentMonth: appState.lastPaymentMonth,
    importantDates: appState.importantDates,
    previousMonthBalance: appState.previousMonthBalance,
    savingsAccounts: appState.savingsAccounts,
    savingsGoals: appState.savingsGoals,
    news: appState.news
  };
  
  // Siempre guardar en localStorage como backup
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Error guardando en localStorage:', error);
  }
  
  // Tambien guardar en Firebase si esta disponible
  if (firebaseInitialized) {
    saveToFirestore('appData', dataToSave).catch(err => {
      console.error('Error guardando en Firebase:', err);
    });
  }
}

// ==================== DATA OPERATIONS ====================

// --- Transacciones ---

export function addTransaction(amount, description, type) {
  appState.transactions.unshift({
    id: generateId(),
    amount,
    description,
    type,
    date: new Date().toISOString()
  });
  saveData();
}

export function updateTransaction(id, amount, description, type) {
  const idx = appState.transactions.findIndex(t => t.id === id);
  if (idx >= 0) {
    appState.transactions[idx] = { 
      ...appState.transactions[idx], 
      amount, 
      description, 
      type 
    };
    saveData();
  }
}

export function deleteTransaction(id) {
  appState.transactions = appState.transactions.filter(t => t.id !== id);
  saveData();
}

// --- Gastos Fijos ---

export function addFixedExpense(name, amount, category, dueDate) {
  appState.fixedExpenses.push({
    id: generateId(),
    name,
    amount,
    category: category || 'General',
    dueDate
  });
  saveData();
}

export function updateFixedExpense(id, name, amount, category, dueDate) {
  const idx = appState.fixedExpenses.findIndex(f => f.id === id);
  if (idx >= 0) {
    appState.fixedExpenses[idx] = {
      ...appState.fixedExpenses[idx],
      name,
      amount,
      category,
      dueDate
    };
    saveData();
  }
}

export function deleteFixedExpense(id) {
  appState.fixedExpenses = appState.fixedExpenses.filter(f => f.id !== id);
  saveData();
}

// --- Deudas ---

export function addDebt(product, totalAmount, totalInstallments, cardId) {
  const installmentAmount = Math.round(totalAmount / totalInstallments);
  appState.debts.push({
    id: generateId(),
    product,
    totalAmount,
    totalInstallments,
    installmentAmount,
    paidInstallments: 0,
    cardId: cardId || 'none'
  });
  saveData();
}

export function updateDebt(id, product, totalAmount, totalInstallments, paidInstallments, cardId) {
  const idx = appState.debts.findIndex(d => d.id === id);
  if (idx >= 0) {
    appState.debts[idx] = {
      ...appState.debts[idx],
      cardId,
      product,
      totalAmount,
      totalInstallments,
      paidInstallments,
      installmentAmount: Math.round(totalAmount / totalInstallments)
    };
    saveData();
  }
}

export function deleteDebt(id) {
  appState.debts = appState.debts.filter(d => d.id !== id);
  saveData();
}

// --- Tarjetas ---

export function addCreditCard(name) {
  appState.creditCards.push({ id: generateId(), name });
  saveData();
}

export function deleteCreditCard(id) {
  // Mover deudas asociadas a "sin tarjeta"
  appState.debts.forEach(d => {
    if (d.cardId === id) d.cardId = 'none';
  });
  appState.creditCards = appState.creditCards.filter(c => c.id !== id);
  saveData();
}

// --- Fechas Importantes ---

export function addImportantDate(title, date, notes) {
  appState.importantDates.push({
    id: generateId(),
    title,
    date,
    notes
  });
  saveData();
}

export function updateImportantDate(id, title, date, notes) {
  const idx = appState.importantDates.findIndex(d => d.id === id);
  if (idx >= 0) {
    appState.importantDates[idx] = { ...appState.importantDates[idx], title, date, notes };
    saveData();
  }
}

export function deleteImportantDate(id) {
  appState.importantDates = appState.importantDates.filter(d => d.id !== id);
  saveData();
}

// --- Historial ---

export function archiveMonth(monthKey, income, expense, transactions, balance) {
  if (income > 0 || expense > 0) {
    appState.history[monthKey] = {
      income,
      expense,
      balance,
      transactions: [...transactions],
      date: new Date().toISOString()
    };
  }
  saveData();
}

// ==================== AHORROS - CUENTAS ====================

export function addSavingsAccount(name, initialBalance = 0, color = '#007aff') {
  appState.savingsAccounts.push({
    id: generateId(),
    name,
    balance: initialBalance,
    color,
    createdAt: new Date().toISOString()
  });
  saveData();
}

export function updateSavingsAccount(id, name, balance, color) {
  const idx = appState.savingsAccounts.findIndex(a => a.id === id);
  if (idx >= 0) {
    appState.savingsAccounts[idx] = {
      ...appState.savingsAccounts[idx],
      name,
      balance,
      color
    };
    saveData();
  }
}

export function deleteSavingsAccount(id) {
  appState.savingsAccounts = appState.savingsAccounts.filter(a => a.id !== id);
  saveData();
}

export function transferBetweenAccounts(fromId, toId, amount) {
  const fromAccount = appState.savingsAccounts.find(a => a.id === fromId);
  const toAccount = appState.savingsAccounts.find(a => a.id === toId);
  
  if (fromAccount && toAccount && fromAccount.balance >= amount) {
    fromAccount.balance -= amount;
    toAccount.balance += amount;
    saveData();
    return true;
  }
  return false;
}

export function addToAccount(accountId, amount) {
  const account = appState.savingsAccounts.find(a => a.id === accountId);
  if (account) {
    account.balance += amount;
    saveData();
    return true;
  }
  return false;
}

export function withdrawFromAccount(accountId, amount) {
  const account = appState.savingsAccounts.find(a => a.id === accountId);
  if (account && account.balance >= amount) {
    account.balance -= amount;
    saveData();
    return true;
  }
  return false;
}

export function getTotalSavings() {
  return appState.savingsAccounts.reduce((sum, a) => sum + a.balance, 0);
}

// ==================== AHORROS - METAS ====================

export function addSavingsGoal(name, targetAmount, icon = '🎯') {
  const goal = {
    id: generateId(),
    name,
    targetAmount,
    currentAmount: 0,
    icon,
    createdAt: new Date().toISOString(),
    completedAt: null,
    notificationsEnabled: true
  };
  appState.savingsGoals.push(goal);
  saveData();
  return goal;
}

export function updateSavingsGoal(id, name, targetAmount, icon) {
  const idx = appState.savingsGoals.findIndex(g => g.id === id);
  if (idx >= 0) {
    appState.savingsGoals[idx] = {
      ...appState.savingsGoals[idx],
      name,
      targetAmount,
      icon
    };
    saveData();
  }
}

export function deleteSavingsGoal(id) {
  appState.savingsGoals = appState.savingsGoals.filter(g => g.id !== id);
  saveData();
}

export function contributeToGoal(id, amount) {
  const goal = appState.savingsGoals.find(g => g.id === id);
  if (goal) {
    const wasCompleted = goal.currentAmount >= goal.targetAmount;
    goal.currentAmount += amount;
    
    // Check if goal is now completed
    if (!wasCompleted && goal.currentAmount >= goal.targetAmount) {
      goal.completedAt = new Date().toISOString();
      // Trigger notification
      if (goal.notificationsEnabled) {
        setTimeout(() => {
          Swal.fire({
            title: '🎉 ¡Meta Completada!',
            text: `Has logrado ahorrar ${goal.targetAmount.toLocaleString('es-CL')} para "${goal.name}"`,
            icon: 'success'
          });
        }, 100);
      }
    }
    
    saveData();
    return true;
  }
  return false;
}

export function getActiveGoals() {
  return appState.savingsGoals.filter(g => g.currentAmount < g.targetAmount);
}

export function getCompletedGoals() {
  return appState.savingsGoals.filter(g => g.currentAmount >= g.targetAmount);
}

// ==================== EXPORT/IMPORT ====================

export function exportAllData() {
  return JSON.stringify({
    transactions: appState.transactions,
    fixedExpenses: appState.fixedExpenses,
    debts: appState.debts,
    creditCards: appState.creditCards,
    history: appState.history,
    importantDates: appState.importantDates
  }, null, 2);
}

export function importData(data) {
  try {
    const parsed = JSON.parse(data);
    if (parsed.transactions) appState.transactions = parsed.transactions;
    if (parsed.fixedExpenses) appState.fixedExpenses = parsed.fixedExpenses;
    if (parsed.debts) appState.debts = parsed.debts;
    if (parsed.creditCards) appState.creditCards = parsed.creditCards;
    if (parsed.history) appState.history = parsed.history;
    if (parsed.importantDates) appState.importantDates = parsed.importantDates;
    saveData();
    return true;
  } catch (error) {
    console.error('Error al importar datos:', error);
    return false;
  }
}

export function clearAllData() {
  appState.transactions = [];
  appState.fixedExpenses = [];
  appState.debts = [];
  appState.creditCards = [];
  appState.history = {};
  appState.lastPaymentMonth = null;
  appState.importantDates = [];
  appState.previousMonthBalance = 0;
  appState.savingsAccounts = [];
  appState.savingsGoals = [];
  appState.news = [];
  saveData();
}

// ==================== NOTICIAS ====================

export function addNewsItem(title, source = 'Manual') {
  appState.news.unshift({
    id: generateId(),
    title,
    source,
    url: '',
    timestamp: new Date().toISOString()
  });
  saveData();
}

export function deleteNewsItem(id) {
  appState.news = appState.news.filter(n => n.id !== id);
  saveData();
}

export function clearAllNews() {
  appState.news = [];
  saveData();
}
