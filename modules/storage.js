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
  isFirebaseReady,
  saveMonthToFirestore,
  loadMonthFromFirestore,
  getPreviousMonthBalance,
  getAuthState
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
  
  // Saldo inicial del mes actual (persistente en Firestore)
  saldoInicial: 0,
  
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
        appState.saldoInicial = data.saldoInicial || 0;
        
        // Sincronizar cambios en tiempo real (solo datos globales, NO saldoInicial que es específico del mes)
        subscribeToChanges('appData', (cloudData) => {
          // NO sincronizar saldoInicial ya que es específico del mes actual
          // Solo sincronizar datos globales que no cambian entre meses
          if (cloudData) {
            // Solo actualizar estos datos globales
            appState.fixedExpenses = cloudData.fixedExpenses || appState.fixedExpenses;
            appState.debts = cloudData.debts || appState.debts;
            appState.creditCards = cloudData.creditCards || appState.creditCards;
            appState.savingsAccounts = cloudData.savingsAccounts || appState.savingsAccounts;
            appState.savingsGoals = cloudData.savingsGoals || appState.savingsGoals;
            appState.importantDates = cloudData.importantDates || appState.importantDates;
            
            // Re-renderizar la UI
            window.dispatchEvent(new CustomEvent('app:render'));
            console.log('Datos globales sincronizados desde la nube');
          }
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

// Inicializar el mes actual al cargar la app
export async function initializeCurrentMonth() {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // SIEMPRE usar el mes actual del sistema
  appState.currentMonth = currentMonthKey;
  
  // Si hay un mes anterior sin archivar, archivar automáticamente
  // Solo si ya había un mes configurado y es diferente al actual
  const previousStoredMonth = localStorage.getItem('currentMonth');
  if (previousStoredMonth && previousStoredMonth !== currentMonthKey) {
    // Obtener el mes anterior al actual
    const [year, month] = currentMonthKey.split('-');
    const prevDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Si el mes anterior no está archivado, archivar automáticamente
    if (!appState.history[prevMonthKey] && (appState.transactions.length > 0 || appState.saldoInicial > 0)) {
      // Calcular totales del mes anterior
      const income = appState.transactions
        .filter(t => t.type === 'ingreso')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = appState.transactions
        .filter(t => t.type === 'egreso')
        .reduce((sum, t) => sum + t.amount, 0);
      const balance = appState.saldoInicial + income - expense;
      
      // Archivar el mes anterior
      archiveMonth(prevMonthKey, income, expense, appState.transactions, balance);
      console.log(`Mes ${prevMonthKey} archivado automáticamente`);
    }
  }
  
  // Intentar cargar el mes desde Firestore/localStorage
  const monthData = await loadMonthDataFromStorage(appState.currentMonth);
  
  if (monthData) {
    // Cargar datos del mes
    appState.transactions = monthData.transactions || [];
    appState.saldoInicial = monthData.saldoInicial || 0;
    appState.lastPaymentMonth = monthData.lastPaymentMonth || null;
  } else {
    // Nuevo mes, inicializar
    await initializeMonthWithPreviousBalance(appState.currentMonth);
  }
  
  saveData();
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
      appState.saldoInicial = parsed.saldoInicial || 0;
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
  appState.saldoInicial = 0;
}

// ==================== SAVE DATA ====================

export function saveData() {
  // Datos para localStorage (incluye saldoInicial porque es específico del mes)
  const localDataToSave = {
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
    news: appState.news,
    saldoInicial: appState.saldoInicial
  };
  
  // Siempre guardar en localStorage como backup
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localDataToSave));
  } catch (error) {
    console.error('Error guardando en localStorage:', error);
  }
  
  // Guardar en Firebase (NO incluir saldoInicial porque es específico de cada mes)
  if (firebaseInitialized) {
    try {
      const authState = getAuthState();
      if (authState.isLoggedIn && !authState.isAnonymous) {
        const firestoreData = {
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
          // NO saldoInicial - es específico del mes
        };
        
        saveToFirestore('appData', firestoreData).catch(err => {
          console.error('Error guardando en Firebase:', err);
        });
      }
    } catch (err) {
      console.error('Error al obtener estado de auth:', err);
    }
  }
}

// ==================== GESTIÓN DE MESES ====================

// Guardar el mes actual en Firestore (documento único por mes)
export async function saveCurrentMonth() {
  if (!appState.currentMonth) return;
  
  const income = appState.transactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expense = appState.transactions
    .filter(t => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const saldoFinal = appState.saldoInicial + income - expense;
  
  const monthData = {
    transactions: appState.transactions,
    saldoInicial: appState.saldoInicial,
    saldoFinal: saldoFinal,
    income: income,
    expense: expense,
    lastPaymentMonth: appState.lastPaymentMonth
  };
  
  // Guardar en Firestore por mes
  if (firebaseInitialized) {
    await saveMonthToFirestore(appState.currentMonth, monthData);
  }
  
  // También guardar en localStorage como backup
  try {
    const monthsData = JSON.parse(localStorage.getItem('finanzas_months_data') || '{}');
    monthsData[appState.currentMonth] = monthData;
    localStorage.setItem('finanzas_months_data', JSON.stringify(monthsData));
  } catch (error) {
    console.error('Error guardando mes en localStorage:', error);
  }
}

// Cargar un mes específico desde Firestore
export async function loadMonthDataFromStorage(yearMonth) {
  let monthData = null;
  
  // Intentar primero desde Firestore
  if (firebaseInitialized) {
    monthData = await loadMonthFromFirestore(yearMonth);
  }
  
  // Fallback a localStorage
  if (!monthData) {
    try {
      const monthsData = JSON.parse(localStorage.getItem('finanzas_months_data') || '{}');
      monthData = monthsData[yearMonth] || null;
    } catch (error) {
      console.error('Error cargando mes desde localStorage:', error);
    }
  }
  
  return monthData;
}

// Inicializar un nuevo mes con el saldo del mes anterior
export async function initializeMonthWithPreviousBalance(yearMonth) {
  // Obtener saldo del mes anterior
  const prevBalanceData = await getPreviousMonthBalance(yearMonth);
  
  if (prevBalanceData) {
    appState.saldoInicial = prevBalanceData.balance;
    appState.transactions = [{
      id: generateId(),
      amount: prevBalanceData.balance,
      description: '💰 Saldo anterior transferido',
      type: 'ingreso',
      date: new Date().toISOString()
    }];
  } else {
    // Primer mes o mes anterior no encontrado
    appState.saldoInicial = 0;
    appState.transactions = [];
  }
  
  appState.lastPaymentMonth = null;
  saveData();
}

// ==================== DATA OPERATIONS ====================

// --- Transacciones ---

// Función para verificar si el mes actual está archivado
function isCurrentMonthArchived() {
  return appState.history && appState.history[appState.currentMonth];
}

export function addTransaction(amount, description, type) {
  // Verificar si el mes está archivado
  if (isCurrentMonthArchived()) {
    return { 
      success: false, 
      archived: true,
      message: 'No puedes realizar movimientos en este mes porque ya está archivado.' 
    };
  }
  
  appState.transactions.unshift({
    id: generateId(),
    amount,
    description,
    type,
    date: new Date().toISOString()
  });
  saveData();
  return { success: true };
}

export function updateTransaction(id, amount, description, type) {
  if (isCurrentMonthArchived()) {
    return { success: false, message: 'No puedes editar transacciones de un mes archivado' };
  }
  
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
  return { success: true };
}

export function deleteTransaction(id) {
  if (isCurrentMonthArchived()) {
    return { success: false, message: 'No puedes eliminar transacciones de un mes archivado' };
  }
  
  appState.transactions = appState.transactions.filter(t => t.id !== id);
  saveData();
  return { success: true };
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
    // Finanzas
    transactions: appState.transactions,
    fixedExpenses: appState.fixedExpenses,
    debts: appState.debts,
    creditCards: appState.creditCards,
    history: appState.history,
    saldoInicial: appState.saldoInicial,
    lastPaymentMonth: appState.lastPaymentMonth,
    
    // Ahorros
    savingsAccounts: appState.savingsAccounts,
    savingsGoals: appState.savingsGoals,
    
    // Agenda
    importantDates: appState.importantDates
  }, null, 2);
}

export function importData(data) {
  try {
    const parsed = JSON.parse(data);
    
    // Finanzas
    if (parsed.transactions) appState.transactions = parsed.transactions;
    if (parsed.fixedExpenses) appState.fixedExpenses = parsed.fixedExpenses;
    if (parsed.debts) appState.debts = parsed.debts;
    if (parsed.creditCards) appState.creditCards = parsed.creditCards;
    if (parsed.history) appState.history = parsed.history;
    if (parsed.saldoInicial) appState.saldoInicial = parsed.saldoInicial;
    if (parsed.lastPaymentMonth) appState.lastPaymentMonth = parsed.lastPaymentMonth;
    
    // Ahorros
    if (parsed.savingsAccounts) appState.savingsAccounts = parsed.savingsAccounts;
    if (parsed.savingsGoals) appState.savingsGoals = parsed.savingsGoals;
    
    // Agenda
    if (parsed.importantDates) appState.importantDates = parsed.importantDates;
    
    saveData();
    return true;
  } catch (error) {
    console.error('Error al importar datos:', error);
    return false;
  }
}

export function clearAllData() {
  // Limpiar todo el estado
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
  appState.saldoInicial = 0;
  appState.currentMonth = null;
  
  // Limpiar TODAS las claves de localStorage relacionadas con la app
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('finanzas') || key.includes('firebase') || key.includes('auth'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // También limpiar explícitamente las claves conocidas
  localStorage.removeItem('finanzas_app_data');
  localStorage.removeItem('finanzas_months_data');
  localStorage.removeItem('currentMonth');
  localStorage.removeItem('darkMode');
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
