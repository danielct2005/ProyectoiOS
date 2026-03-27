/**
 * ===== APP DE FINANZAS PERSONALES =====
 * Almacenamiento: localStorage
 * Sin servidor externo - todo local
 */

// ===== CONSTANTS =====
const STORAGE_KEY = 'finanzas_app_data';
const MAX_TRANSACTIONS = 10;

// ===== STATE =====
let transactions = [];
let currentType = 'gasto';

// ===== DOM ELEMENTS =====
const elements = {
  form: document.getElementById('transactionForm'),
  amount: document.getElementById('amount'),
  description: document.getElementById('description'),
  typeGasto: document.getElementById('typeGasto'),
  typeIngreso: document.getElementById('typeIngreso'),
  totalBalance: document.getElementById('totalBalance'),
  totalIncome: document.getElementById('totalIncome'),
  totalExpense: document.getElementById('totalExpense'),
  transactionList: document.getElementById('transactionList'),
  transactionCount: document.getElementById('transactionCount'),
  emptyState: document.getElementById('emptyState'),
  clearDataBtn: document.getElementById('clearDataBtn')
};

// ===== UTILITY FUNCTIONS =====

/**
 * Formatea un número como moneda (formato Chile)
 * Ej: $10.900 o $1.000.000
 */
function formatCurrency(amount) {
  // Formato chileno: puntos para miles, sin decimales
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
  
  return formatted;
}

/**
 * Formatea una fecha
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  // Menos de 24 horas
  if (diff < 86400000) {
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  
  // Menos de 7 días
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }
  
  // Fecha completa
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

/**
 * Genera un ID único
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== LOCAL STORAGE FUNCTIONS =====

/**
 * Carga los datos desde localStorage
 */
function loadData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      transactions = JSON.parse(data);
    } else {
      transactions = [];
    }
  } catch (error) {
    console.error('Error al cargar datos:', error);
    transactions = [];
  }
}

/**
 * Guarda los datos en localStorage
 */
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Error al guardar datos:', error);
  }
}

// ===== BALANCE CALCULATIONS =====

/**
 * Calcula el total de ingresos
 */
function calculateIncome() {
  return transactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calcula el total de gastos
 */
function calculateExpense() {
  return transactions
    .filter(t => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calcula el saldo total
 */
function calculateBalance() {
  return calculateIncome() - calculateExpense();
}

// ===== UI UPDATE FUNCTIONS =====

/**
 * Actualiza la visualización del balance
 */
function updateBalanceDisplay() {
  const balance = calculateBalance();
  const income = calculateIncome();
  const expense = calculateExpense();
  
  // Actualizar valores
  elements.totalBalance.textContent = formatCurrency(balance);
  elements.totalIncome.textContent = formatCurrency(income);
  elements.totalExpense.textContent = formatCurrency(expense);
  
  // Actualizar color del balance
  elements.totalBalance.classList.remove('positive', 'negative');
  if (balance > 0) {
    elements.totalBalance.classList.add('positive');
  } else if (balance < 0) {
    elements.totalBalance.classList.add('negative');
  }
}

/**
 * Renderiza la lista de transacciones
 */
function renderTransactions() {
  const recentTransactions = transactions.slice(0, MAX_TRANSACTIONS);
  
  // Actualizar contador
  elements.transactionCount.textContent = transactions.length;
  
  // Mostrar estado vacío si no hay transacciones
  if (transactions.length === 0) {
    elements.transactionList.innerHTML = `
      <div class="empty-state" id="emptyState">
        <span class="empty-state__icon">📝</span>
        <p class="empty-state__text">No hay movimientos aún</p>
        <p class="empty-state__hint">Agrega tu primer movimiento arriba</p>
      </div>
    `;
    return;
  }
  
  // Renderizar transacciones
  elements.transactionList.innerHTML = recentTransactions.map(transaction => `
    <div class="transaction-item" data-id="${transaction.id}">
      <div class="transaction-item__icon transaction-item__icon--${transaction.type}">
        ${transaction.type === 'gasto' ? '💸' : '💚'}
      </div>
      <div class="transaction-item__content">
        <div class="transaction-item__desc">${escapeHtml(transaction.description)}</div>
        <div class="transaction-item__date">${formatDate(transaction.date)}</div>
      </div>
      <div class="transaction-item__amount transaction-item__amount--${transaction.type}">
        ${transaction.type === 'gasto' ? '-' : '+'}${formatCurrency(transaction.amount)}
      </div>
      <button class="transaction-item__delete" data-delete="${transaction.id}" title="Eliminar">🗑️</button>
    </div>
  `).join('');
  
  // Agregar event listeners para删除
  elements.transactionList.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTransaction(btn.dataset.delete);
    });
  });
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== TRANSACTION ACTIONS =====

/**
 * Agrega una nueva transacción
 */
function addTransaction(amount, description, type) {
  const transaction = {
    id: generateId(),
    amount: parseFloat(amount),
    description: description.trim(),
    type: type,
    date: new Date().toISOString()
  };
  
  // Agregar al inicio (más recientes primero)
  transactions.unshift(transaction);
  
  // Guardar en localStorage
  saveData();
  
  // Actualizar UI
  updateBalanceDisplay();
  renderTransactions();
}

/**
 * Elimina una transacción
 */
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveData();
  updateBalanceDisplay();
  renderTransactions();
}

/**
 * Limpia todos los datos
 */
function clearAllData() {
  if (confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción no se puede deshacer.')) {
    transactions = [];
    saveData();
    updateBalanceDisplay();
    renderTransactions();
  }
}

// ===== EVENT HANDLERS =====

/**
 * Maneja el cambio de tipo de transacción
 */
function handleTypeChange(type) {
  currentType = type;
  
  // Actualizar clases de botones
  elements.typeGasto.classList.toggle('active', type === 'gasto');
  elements.typeIngreso.classList.toggle('active', type === 'ingreso');
}

/**
 * Maneja el envío del formulario
 */
function handleFormSubmit(e) {
  e.preventDefault();
  
  const amount = parseFloat(elements.amount.value);
  const description = elements.description.value.trim();
  
  // Validaciones
  if (!amount || amount <= 0) {
    alert('Por favor ingresa un monto válido');
    elements.amount.focus();
    return;
  }
  
  if (!description) {
    alert('Por favor ingresa una descripción');
    elements.description.focus();
    return;
  }
  
  // Agregar transacción
  addTransaction(amount, description, currentType);
  
  // Limpiar formulario
  elements.amount.value = '';
  elements.description.value = '';
  elements.amount.focus();
}

// ===== INITIALIZATION =====

/**
 * Inicializa la aplicación
 */
function init() {
  // Cargar datos
  loadData();
  
  // Actualizar UI
  updateBalanceDisplay();
  renderTransactions();
  
  // Event listeners del formulario
  elements.form.addEventListener('submit', handleFormSubmit);
  
  // Event listeners de tipo
  elements.typeGasto.addEventListener('click', () => handleTypeChange('gasto'));
  elements.typeIngreso.addEventListener('click', () => handleTypeChange('ingreso'));
  
  // Event listener de borrar datos
  elements.clearDataBtn.addEventListener('click', clearAllData);
  
  //.prevent form submission on enter in inputs
  elements.amount.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.description.focus();
    }
  });
  
  console.log('💰 App de Finanzas inicializada');
}

// ===== START APP =====
document.addEventListener('DOMContentLoaded', init);
