/**
 * ===== MÓDULO DE FINANZAS =====
 * Gestión de ingresos, gastos, gastos fijos, deudas e historial
 */

import { 
  appState, 
  saveData, 
  saveCurrentMonth,
  loadMonthDataFromStorage,
  initializeMonthWithPreviousBalance,
  addTransaction, 
  updateTransaction, 
  deleteTransaction,
  addFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  addDebt,
  updateDebt,
  deleteDebt,
  addCreditCard,
  deleteCreditCard,
  archiveMonth
} from './storage.js';
import { 
  formatCurrency, 
  formatNumber, 
  parseNumber, 
  formatDate, 
  escapeHtml, 
  generateId,
  addThousandsSeparator,
  digitsOnly,
  createEmptyState,
  getMonthName
} from './utils.js';

// ==================== CALCULATIONS ====================

export function calculateIncome() {
  return appState.transactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateExpense() {
  return appState.transactions
    .filter(t => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateBalance() {
  return calculateIncome() - calculateExpense();
}

export function calculateFixedExpensesTotal() {
  return appState.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
}

export function calculateDebtsTotal() {
  return appState.debts.reduce((sum, d) => sum + d.totalAmount, 0);
}

export function calculateDebtsMonthly() {
  return appState.debts.reduce((sum, d) => sum + d.installmentAmount, 0);
}

export function calculateTotalCuentas() {
  return calculateFixedExpensesTotal() + calculateDebtsMonthly();
}

// ==================== MONTH MANAGEMENT ====================

// Limpiar el estado visual antes de cargar nuevos datos
function cleanUI() {
  // Limpiar cualquier estado residual de la UI
  const main = document.querySelector('.main');
  if (main) {
    main.innerHTML = '';
  }
  
  // Limpiar modales abiertos
  document.querySelectorAll('.modal.visible').forEach(modal => {
    modal.classList.remove('visible');
  });
  
  // Resetear contadores visuales si los hay
  appState.currentSubsection = 'billetera';
}

// Función principal para cargar datos de un mes específico
export async function cargarDatosDelMes(yearMonth) {
  // Limpiar UI antes de cargar
  cleanUI();
  
  const monthData = await loadMonthDataFromStorage(yearMonth);
  
  if (monthData) {
    // El mes existe, cargar sus datos
    appState.transactions = monthData.transactions || [];
    appState.saldoInicial = monthData.saldoInicial || 0;
    appState.lastPaymentMonth = monthData.lastPaymentMonth || null;
  } else {
    // El mes no existe, inicializar con saldo del mes anterior
    await initializeMonthWithPreviousBalance(yearMonth);
  }
  
  appState.currentMonth = yearMonth;
  saveData();
}

export function changeMonth(direction) {
  const [year, month] = appState.currentMonth.split('-').map(Number);
  let newYear = year;
  let newMonth = month + direction;
  
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  } else if (newMonth < 1) {
    newMonth = 12;
    newYear--;
  }
  
  const newYearMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
  
  // Carga forzada del nuevo mes (async pero no esperamos)
  cargarDatosDelMes(newYearMonth).then(() => {
    window.dispatchEvent(new CustomEvent('app:render'));
  });
}

// Función legacy para compatibilidad
export function loadMonthData() {
  if (appState.history[appState.currentMonth]) {
    appState.transactions = [...appState.history[appState.currentMonth].transactions];
  } else {
    appState.transactions = [];
  }
}

export async function archiveCurrentMonth() {
  const income = calculateIncome();
  const expense = calculateExpense();
  const balance = income - expense;
  
  // Guardar en historial local
  archiveMonth(appState.currentMonth, income, expense, appState.transactions, balance);
  
  // Guardar el mes actual en Firestore con saldoFinal
  appState.previousMonthBalance = balance;
  await saveCurrentMonth();
  
  // Crear nuevo mes
  const [year, month] = appState.currentMonth.split('-').map(Number);
  let newYear = year;
  let newMonth = month + 1;
  
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  }
  
  const newMonthKey = `${newYear}-${String(newMonth).padStart(2, '0')}`;
  
  // Inicializar el nuevo mes con el saldo del mes anterior (persistente)
  await initializeMonthWithPreviousBalance(newMonthKey);
  
  appState.currentMonth = newMonthKey;
  
  saveData();
}

// ==================== PAY ALL CUENTAS ====================

export function payAllCuentas() {
  const fixedTotal = calculateFixedExpensesTotal();
  const debtsMonthly = calculateDebtsMonthly();
  const total = fixedTotal + debtsMonthly;
  
  if (total === 0) {
    return { success: false, message: 'No hay cuentas por pagar' };
  }
  
  if (appState.lastPaymentMonth === appState.currentMonth) {
    return { success: false, message: 'Las cuentas de este mes ya fueron pagadas' };
  }
  
  // Agregar movimiento de fijos
  if (fixedTotal > 0) {
    appState.transactions.unshift({
      id: generateId(),
      amount: fixedTotal,
      description: `📅 Pagos Fijos (${appState.fixedExpenses.length})`,
      type: 'gasto',
      date: new Date().toISOString(),
      details: appState.fixedExpenses.map(e => ({ name: e.name, amount: e.amount }))
    });
  }
  
  // Agregar movimiento de deudas
  if (debtsMonthly > 0) {
    const activeDebts = appState.debts.filter(d => d.paidInstallments < d.totalInstallments);
    appState.transactions.unshift({
      id: generateId(),
      amount: debtsMonthly,
      description: `💳 Cuotas Deudas (${activeDebts.length})`,
      type: 'gasto',
      date: new Date().toISOString(),
      details: activeDebts.map(d => ({ 
        product: d.product, 
        amount: d.installmentAmount,
        cuota: d.paidInstallments + 1,
        total: d.totalInstallments
      }))
    });
    
    // Actualizar cuotas pagadas
    appState.debts.forEach(debt => {
      if (debt.paidInstallments < debt.totalInstallments) {
        debt.paidInstallments++;
      }
    });
  }
  
  appState.lastPaymentMonth = appState.currentMonth;
  saveData();
  
  return { success: true, message: 'Cuentas pagadas correctamente' };
}

// ==================== RENDER FUNCTIONS ====================

// Títulos de secciones
const subsectionTitles = {
  billetera: 'Billetera',
  fijos: 'Fijos',
  deudas: 'Deudas',
  historial: 'Historial'
};

export function getSubsectionTitles() {
  return subsectionTitles;
}

export function getCurrentSubsection() {
  return appState.currentSubsection;
}

export function setCurrentSubsection(subsection) {
  appState.currentSubsection = subsection;
}

// ==================== RENDER BILLETERA ====================

export function renderBilletera() {
  const main = document.querySelector('.main');
  const balance = calculateBalance();
  const income = calculateIncome();
  const expense = calculateExpense();
  const fixedTotal = calculateFixedExpensesTotal();
  const debtsMonthly = calculateDebtsMonthly();
  
  main.innerHTML = `
    <!-- Month Selector -->
    <div class="month-selector">
      <button class="month-btn" id="prevMonth">◀</button>
      <span class="month-label">${getMonthName(appState.currentMonth)}</span>
      <button class="month-btn" id="nextMonth">▶</button>
    </div>
    
    <!-- Balance Card -->
    <div class="balance-card">
      <div class="balance-card__label">Saldo del Mes</div>
      <div class="balance-card__amount ${balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(balance)}</div>
      <div class="balance-card__info">
        <span class="balance-card__income">📈 ${formatCurrency(income)}</span>
        <span class="balance-card__expense">📉 ${formatCurrency(expense)}</span>
      </div>
      ${fixedTotal > 0 || debtsMonthly > 0 ? `
        <div class="balance-card__extras">
          <span>📅 Fijos: ${formatCurrency(fixedTotal)}</span>
          <span>💳 Cuotas: ${formatCurrency(debtsMonthly)}</span>
        </div>
      ` : ''}
    </div>
    
    ${appState.history[appState.currentMonth] ? `
      <div class="archive-notice">
        📦 Este mes está en historial
      </div>
    ` : ''}
    
    <!-- Add Transaction Form -->
    <div class="card">
      <h3 class="card__title mb-2">Agregar Movimiento</h3>
      <form id="transactionForm">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <div class="type-selector">
            <button type="button" class="type-btn active" data-type="gasto" id="typeGasto">📉 Gasto</button>
            <button type="button" class="type-btn" data-type="ingreso" id="typeIngreso">📈 Ingreso</button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="amount">Monto</label>
          <input type="text" id="amount" class="form-input" placeholder="0" inputmode="numeric">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="description">Descripción</label>
          <input type="text" id="description" class="form-input" placeholder="Ej: Supermercado" maxlength="100" required>
        </div>
        
        <button type="submit" class="btn btn--primary btn--block">➕ Agregar</button>
      </form>
    </div>
    
    <!-- Recent Transactions -->
    <div class="card">
      <div class="card__header">
        <h3 class="card__title">Movimientos</h3>
        <span class="card__badge">${appState.transactions.length}</span>
      </div>
      
      <div class="transaction-list" id="transactionList">
        ${appState.transactions.length === 0 ? 
          createEmptyState('📝', 'Sin movimientos') : 
          appState.transactions.slice(0, 20).map(t => `
            <div class="transaction-item ${t.details ? 'has-details' : ''}" data-id="${t.id}" data-edit="${t.id}" ${t.details ? 'data-details="' + encodeURIComponent(JSON.stringify(t.details)) + '"' : ''}>
              <div class="transaction-item__icon transaction-item__icon--${t.type}">
                ${t.type === 'gasto' ? '📉' : '📈'}
              </div>
              <div class="transaction-item__content">
                <div class="transaction-item__desc">${escapeHtml(t.description)}</div>
                <div class="transaction-item__date">${formatDate(t.date)}</div>
              </div>
              <div class="transaction-item__amount transaction-item__amount--${t.type}">
                ${t.type === 'gasto' ? '-' : '+'}${formatCurrency(t.amount)}
              </div>
            </div>
          `).join('')}
      </div>
    </div>
    
    <!-- Pagar Cuentas Button -->
    <div class="card">
      ${appState.lastPaymentMonth === appState.currentMonth ? `
        <button class="btn btn--secondary btn--block" disabled>
          ✓ Cuentas Pagadas Este Mes
        </button>
      ` : `
        <button class="btn btn--primary btn--block" id="payCuentasBtn">
          💸 Pagar Cuentas (Fijos + Cuotas)
        </button>
      `}
    </div>
    
    <!-- Actions -->
    <div class="card">
      <button class="btn btn--secondary btn--block" id="archiveMonthBtn">
        📦 Archivar Mes y Nuevo
      </button>
    </div>
    
    <!-- Modal Editar Movimiento -->
    <div class="modal" id="editTransactionModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Editar Movimiento</h3>
        <form id="editTransactionForm">
          <input type="hidden" id="editTransactionId">
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <div class="type-selector">
              <button type="button" class="type-btn" data-type="gasto" id="editTypeGasto">📉 Gasto</button>
              <button type="button" class="type-btn" data-type="ingreso" id="editTypeIngreso">📈 Ingreso</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="editTransactionAmount">Monto</label>
            <input type="text" id="editTransactionAmount" class="form-input" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="editTransactionDesc">Descripción</label>
            <input type="text" id="editTransactionDesc" class="form-input" required>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--danger" id="deleteTransactionBtn">🗑️ Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelEditTransactionBtn">Cancelar</button>
        </form>
      </div>
    </div>
  `;
  
  // Event listeners
  setupBilleteraEvents();
}

function setupBilleteraEvents() {
  setTimeout(() => {
    // Month navigation
    document.getElementById('prevMonth')?.addEventListener('click', () => {
      changeMonth(-1);
      window.dispatchEvent(new CustomEvent('app:render'));
    });
    
    document.getElementById('nextMonth')?.addEventListener('click', () => {
      changeMonth(1);
      window.dispatchEvent(new CustomEvent('app:render'));
    });
    
    // Type buttons
    document.getElementById('typeGasto')?.addEventListener('click', () => handleTypeChange('gasto'));
    document.getElementById('typeIngreso')?.addEventListener('click', () => handleTypeChange('ingreso'));
    
    // Format inputs
    addThousandsSeparator(document.getElementById('amount'));
    addThousandsSeparator(document.getElementById('editTransactionAmount'));
    
    // Form submit
    document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
    
    // Edit transaction
    document.querySelectorAll('#transactionList [data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const transaction = appState.transactions.find(t => t.id === btn.dataset.edit);
        if (transaction?.details) {
          // Show details modal
          showTransactionDetails(transaction);
          return;
        }
        openEditTransactionModal(transaction);
      });
    });
    
    // Modal handlers
    document.getElementById('cancelEditTransactionBtn')?.addEventListener('click', () => {
      document.getElementById('editTransactionModal')?.classList.remove('visible');
    });
    
    document.querySelector('#editTransactionModal .modal__backdrop')?.addEventListener('click', () => {
      document.getElementById('editTransactionModal')?.classList.remove('visible');
    });
    
    // Edit type buttons
    document.getElementById('editTypeGasto')?.addEventListener('click', () => {
      document.getElementById('editTypeGasto')?.classList.add('active');
      document.getElementById('editTypeIngreso')?.classList.remove('active');
    });
    
    document.getElementById('editTypeIngreso')?.addEventListener('click', () => {
      document.getElementById('editTypeIngreso')?.classList.add('active');
      document.getElementById('editTypeGasto')?.classList.remove('active');
    });
    
    // Save edit form
    document.getElementById('editTransactionForm')?.addEventListener('submit', handleEditTransactionSubmit);
    
    // Delete transaction
    document.getElementById('deleteTransactionBtn')?.addEventListener('click', handleDeleteTransaction);
    
    // Archive month
    document.getElementById('archiveMonthBtn')?.addEventListener('click', handleArchiveMonth);
    
    // Pay cuentas
    document.getElementById('payCuentasBtn')?.addEventListener('click', handlePayCuentas);
  }, 100);
}

let currentType = 'gasto';

function handleTypeChange(type) {
  currentType = type;
  document.getElementById('typeGasto')?.classList.toggle('active', type === 'gasto');
  document.getElementById('typeIngreso')?.classList.toggle('active', type === 'ingreso');
}

async function handleTransactionSubmit(e) {
  e.preventDefault();
  
  const amount = parseNumber(document.getElementById('amount').value);
  const description = document.getElementById('description').value.trim();
  const type = document.getElementById('typeGasto')?.classList.contains('active') ? 'gasto' : 'ingreso';
  
  if (!amount || amount <= 0) {
    Swal.fire({ title: 'Monto inválido', text: 'Por favor ingresa un monto válido', icon: 'error' });
    return;
  }
  
  if (!description) {
    Swal.fire({ title: 'Descripción requerida', text: 'Por favor ingresa una descripción', icon: 'error' });
    return;
  }
  
  const result = addTransaction(amount, description, type);
  
  // Si el mes estaba archivado, mostrar error y no continuar
  if (!result.success && result.archived) {
    Swal.fire({ 
      title: 'Mes archivado', 
      text: result.message, 
      icon: 'error' 
    });
    return;
  }
  
  // Guardar el mes en Firestore después de cada transacción
  await saveCurrentMonth();
  
  document.getElementById('amount').value = '';
  document.getElementById('description').value = '';
  document.getElementById('amount').focus();
  
  window.dispatchEvent(new CustomEvent('app:render'));
}

function showTransactionDetails(transaction) {
  let detailsHtml = '';
  if (transaction.details[0].name) {
    // Es un gasto fijo
    detailsHtml = transaction.details.map(d => 
      `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
        <span>${d.name}</span><span>${formatCurrency(d.amount)}</span>
      </div>`
    ).join('');
  } else {
    // Es una cuota de deuda
    detailsHtml = transaction.details.map(d => 
      `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
        <span>${d.product} (Cuota ${d.cuota}/${d.total})</span><span>${formatCurrency(d.amount)}</span>
      </div>`
    ).join('');
  }
  
  Swal.fire({
    title: transaction.description,
    html: `<div style="text-align:left;">${detailsHtml}</div>
           <div style="margin-top:15px;font-weight:bold;text-align:right;">Total: ${formatCurrency(transaction.amount)}</div>`,
    icon: 'info'
  });
}

function openEditTransactionModal(transaction) {
  if (!transaction) return;
  
  document.getElementById('editTransactionId').value = transaction.id;
  document.getElementById('editTransactionAmount').value = transaction.amount;
  document.getElementById('editTransactionDesc').value = transaction.description;
  
  document.getElementById('editTypeGasto')?.classList.toggle('active', transaction.type === 'gasto');
  document.getElementById('editTypeIngreso')?.classList.toggle('active', transaction.type === 'ingreso');
  
  document.getElementById('editTransactionModal')?.classList.add('visible');
}

function handleEditTransactionSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('editTransactionId').value;
  const amount = parseNumber(document.getElementById('editTransactionAmount').value);
  const description = document.getElementById('editTransactionDesc').value.trim();
  const type = document.getElementById('editTypeGasto')?.classList.contains('active') ? 'gasto' : 'ingreso';
  
  if (!amount || amount <= 0) {
    Swal.fire({ title: 'Monto inválido', text: 'Por favor ingresa un monto válido', icon: 'error' });
    return;
  }
  
  if (!description) {
    Swal.fire({ title: 'Descripción requerida', text: 'Por favor ingresa una descripción', icon: 'error' });
    return;
  }
  
  updateTransaction(id, amount, description, type);
  document.getElementById('editTransactionModal')?.classList.remove('visible');
  window.dispatchEvent(new CustomEvent('app:render'));
  
  Swal.fire({ title: '¡Guardado!', text: 'Movimiento actualizado', icon: 'success' });
}

function handleDeleteTransaction() {
  const id = document.getElementById('editTransactionId').value;
  
  Swal.fire({
    title: '¿Eliminar movimiento?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ff3b30'
  }).then((result) => {
    if (result.isConfirmed) {
      deleteTransaction(id);
      document.getElementById('editTransactionModal')?.classList.remove('visible');
      window.dispatchEvent(new CustomEvent('app:render'));
    }
  });
}

async function handleArchiveMonth() {
  const now = new Date();
  const [year, month] = appState.currentMonth.split('-').map(Number);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
const isEndOfMonth = now.getDate() >= lastDayOfMonth - 1;
   
  if (appState.history[appState.currentMonth]) {
    Swal.fire({ title: '¡Ya archivado!', text: 'Este mes ya está en el historial', icon: 'warning' });
    return;
  }
  
  if (appState.transactions.length === 0) {
    Swal.fire({ title: 'Sin movimientos', text: 'No hay movimientos para archivar', icon: 'info' });
    return;
  }
  
  if (!isEndOfMonth) {
    Swal.fire({
      title: 'Aún no puedes archivar',
      text: `Solo puedes archivar el mes a partir del día ${lastDayOfMonth - 1} (un día antes de que termine el mes)`,
      icon: 'warning'
    });
    return;
  }
  
  Swal.fire({
    title: '¿Archivar mes?',
    text: 'Los movimientos se guardarán en historial y comenzarás un nuevo mes',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, archivar',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      await archiveCurrentMonth();
      window.dispatchEvent(new CustomEvent('app:render'));
      Swal.fire({ title: '¡Archivado!', text: 'El mes ha sido guardado en historial', icon: 'success' });
    }
  });
}

async function handlePayCuentas() {
  const result = payAllCuentas();
  
  if (!result.success) {
    Swal.fire({
      title: result.message.includes('ya') ? '¡Ya pagaste!' : 'Sin cuentas',
      text: result.message,
      icon: result.message.includes('ya') ? 'warning' : 'info'
    });
    return;
  }
  
  // Guardar el mes en Firestore después de pagar cuentas
  await saveCurrentMonth();
  
  window.dispatchEvent(new CustomEvent('app:render'));
  Swal.fire({ title: '¡Pagado!', text: 'Las cuentas han sido pagadas', icon: 'success' });
}

// ==================== RENDER FIJOS ====================

export function renderFijos() {
  const main = document.querySelector('.main');
  const total = calculateFixedExpensesTotal();
  const sortedExpenses = [...appState.fixedExpenses].sort((a, b) => b.amount - a.amount);
  
  main.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Gastos Fijos</h2>
      <button class="btn btn--sm btn--primary" id="addFixedBtn">➕ Agregar</button>
    </div>
    
    <div class="balance-card balance-card--mini">
      <div class="balance-card__label">Total Mensual</div>
      <div class="balance-card__amount">${formatCurrency(total)}</div>
    </div>
    
    <div class="card">
      <div class="transaction-list" id="fijosList">
        ${sortedExpenses.length === 0 ? 
          createEmptyState('📅', 'Sin gastos fijos', 'Agrega Spotify, bencina, celular, etc.') : 
          sortedExpenses.map(e => `
            <div class="transaction-item" data-id="${e.id}" data-edit="${e.id}">
              <div class="transaction-item__icon transaction-item__icon--gasto">📅</div>
              <div class="transaction-item__content">
                <div class="transaction-item__desc">${escapeHtml(e.name)}</div>
                <div class="transaction-item__date">${e.category}${e.dueDate ? ' • Vence: ' + e.dueDate : ''}</div>
              </div>
              <div class="transaction-item__amount transaction-item__amount--gasto">${formatCurrency(e.amount)}</div>
            </div>
          `).join('')}
      </div>
    </div>
    
    <!-- Modal Agregar/Editar Fijo -->
    <div class="modal" id="fixedModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title" id="fixedModalTitle">Agregar Gasto Fijo</h3>
        <form id="fixedForm">
          <input type="hidden" id="fixedEditId">
          <div class="form-group">
            <label class="form-label" for="fixedName">Nombre</label>
            <input type="text" id="fixedName" class="form-input" placeholder="Ej: Spotify" maxlength="50" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="fixedAmount">Monto</label>
            <input type="text" id="fixedAmount" class="form-input" placeholder="0" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="fixedCategory">Categoría</label>
            <input type="text" id="fixedCategory" class="form-input" placeholder="Ej: Streaming" maxlength="30">
          </div>
          <div class="form-group">
            <label class="form-label" for="fixedDueDate">Fecha de vencimiento (opcional)</label>
            <input type="text" id="fixedDueDate" class="form-input" placeholder="Ej: 15 de cada mes">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--danger" id="deleteFixedBtn" style="display:none;">🗑️ Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelFixedBtn">Cancelar</button>
        </form>
      </div>
    </div>
  `;
  
  setupFijosEvents();
}

function setupFijosEvents() {
  setTimeout(() => {
    addThousandsSeparator(document.getElementById('fixedAmount'));
    
    // Add button
    document.getElementById('addFixedBtn')?.addEventListener('click', () => {
      document.getElementById('fixedEditId').value = '';
      document.getElementById('fixedName').value = '';
      document.getElementById('fixedAmount').value = '';
      document.getElementById('fixedCategory').value = '';
      document.getElementById('fixedDueDate').value = '';
      document.getElementById('fixedModalTitle').textContent = 'Agregar Gasto Fijo';
      document.getElementById('deleteFixedBtn').style.display = 'none';
      document.getElementById('fixedModal')?.classList.add('visible');
    });
    
    // Cancel button
    document.getElementById('cancelFixedBtn')?.addEventListener('click', () => {
      document.getElementById('fixedModal')?.classList.remove('visible');
    });
    
    // Backdrop
    document.querySelector('#fixedModal .modal__backdrop')?.addEventListener('click', () => {
      document.getElementById('fixedModal')?.classList.remove('visible');
    });
    
    // Form submit
    document.getElementById('fixedForm')?.addEventListener('submit', handleFixedFormSubmit);
    
    // Delete button
    document.getElementById('deleteFixedBtn')?.addEventListener('click', handleDeleteFixed);
    
    // Edit buttons
    document.querySelectorAll('#fijosList [data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expense = appState.fixedExpenses.find(f => f.id === btn.dataset.edit);
        if (expense) {
          document.getElementById('fixedEditId').value = expense.id;
          document.getElementById('fixedName').value = expense.name;
          document.getElementById('fixedAmount').value = expense.amount;
          document.getElementById('fixedCategory').value = expense.category || '';
          document.getElementById('fixedDueDate').value = expense.dueDate || '';
          document.getElementById('fixedModalTitle').textContent = 'Editar Gasto Fijo';
          document.getElementById('deleteFixedBtn').style.display = 'block';
          document.getElementById('fixedModal')?.classList.add('visible');
        }
      });
    });
  }, 100);
}

function handleFixedFormSubmit(e) {
  e.preventDefault();
  
  const editId = document.getElementById('fixedEditId').value;
  const name = document.getElementById('fixedName').value.trim();
  const amount = parseNumber(document.getElementById('fixedAmount').value);
  const category = document.getElementById('fixedCategory').value.trim() || 'General';
  const dueDate = document.getElementById('fixedDueDate').value.trim();
  
  if (!name) {
    Swal.fire({ title: 'Nombre requerido', text: 'Por favor ingresa un nombre', icon: 'error' });
    return;
  }
  
  if (!amount || amount <= 0) {
    Swal.fire({ title: 'Monto inválido', text: 'Por favor ingresa un monto válido', icon: 'error' });
    return;
  }
  
  if (editId) {
    updateFixedExpense(editId, name, amount, category, dueDate);
  } else {
    addFixedExpense(name, amount, category, dueDate);
  }
  
  document.getElementById('fixedModal')?.classList.remove('visible');
  window.dispatchEvent(new CustomEvent('app:render'));
}

function handleDeleteFixed() {
  const editId = document.getElementById('fixedEditId').value;
  
  Swal.fire({
    title: '¿Eliminar gasto fijo?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ff3b30'
  }).then((result) => {
    if (result.isConfirmed && editId) {
      deleteFixedExpense(editId);
      document.getElementById('fixedModal')?.classList.remove('visible');
      window.dispatchEvent(new CustomEvent('app:render'));
    }
  });
}

// ==================== RENDER DEUDAS ====================

export function renderDeudas() {
  const main = document.querySelector('.main');
  const totalDebt = calculateDebtsTotal();
  const monthlyInstallments = calculateDebtsMonthly();
  
  const getCardName = (cardId) => {
    const card = appState.creditCards.find(c => c.id === cardId);
    return card ? card.name : 'Sin tarjeta';
  };
  
  // Group debts by card
  const debtsByCard = {};
  appState.debts.forEach(d => {
    const cardId = d.cardId || 'none';
    if (!debtsByCard[cardId]) debtsByCard[cardId] = [];
    debtsByCard[cardId].push(d);
  });
  
  // Card totals for sorting
  const cardTotals = appState.creditCards.map(card => ({
    id: card.id,
    name: card.name,
    total: debtsByCard[card.id] ? debtsByCard[card.id].reduce((sum, d) => sum + d.totalAmount, 0) : 0
  })).sort((a, b) => b.total - a.total);
  
  const sortByProgress = (a, b) => (b.paidInstallments / b.totalInstallments) - (a.paidInstallments / a.totalInstallments);
  
  let cardsHtml = '';
  
  // Sin tarjeta
  if (debtsByCard['none']?.length > 0) {
    const sortedDebts = [...debtsByCard['none']].sort(sortByProgress);
    cardsHtml += `
      <div class="debt-group">
        <div class="debt-group__header">💳 Sin Tarjeta</div>
        <div class="transaction-list">
          ${sortedDebts.map(d => buildDebtItemHtml(d)).join('')}
        </div>
      </div>
    `;
  }
  
  // Credit cards
  cardTotals.forEach(cardData => {
    if (debtsByCard[cardData.id]?.length > 0) {
      const sortedDebts = [...debtsByCard[cardData.id]].sort(sortByProgress);
      cardsHtml += `
        <div class="debt-group">
          <div class="debt-group__header">
            <span>💳 ${escapeHtml(cardData.name)}</span>
            <span class="debt-group__total" style="font-size: 0.75rem; opacity: 0.8;">Total: ${formatCurrency(cardData.total)}</span>
          </div>
          <div class="transaction-list">
            ${sortedDebts.map(d => buildDebtItemHtml(d)).join('')}
          </div>
        </div>
      `;
    }
  });
  
  if (appState.debts.length === 0) {
    cardsHtml = createEmptyState('💳', 'Sin deudas registradas', 'Agrega tus compras en cuotas');
  }
  
  main.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Deudas Tarjetas</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--ghost" id="manageCardsBtn">💳 Mis Tarjetas</button>
        <button class="btn btn--sm btn--primary" id="addDebtBtn">➕ Agregar</button>
      </div>
    </div>
    
    <div class="balance-card balance-card--purple">
      <div class="balance-card__label">Cuotas Mensuales</div>
      <div class="balance-card__amount">${formatCurrency(monthlyInstallments)}</div>
      <div class="balance-card__info balance-card__info--secondary">
        <span>Deuda Total: ${formatCurrency(totalDebt)}</span>
      </div>
    </div>
    
    <div class="card">
      ${cardsHtml}
    </div>
    
    <!-- Modal Agregar Deuda -->
    <div class="modal" id="debtModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Deuda</h3>
        <form id="debtForm">
          <div class="form-group">
            <label class="form-label" for="debtCard">Tarjeta</label>
            <select id="debtCard" class="form-input" required>
              <option value="">Seleccionar tarjeta</option>
              ${appState.creditCards.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              <option value="none">Sin tarjeta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="debtProduct">Producto</label>
            <input type="text" id="debtProduct" class="form-input" placeholder="Ej: iPhone 15" maxlength="50" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="debtTotal">Precio Total</label>
            <input type="text" id="debtTotal" class="form-input" placeholder="0" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="debtInstallments">Cantidad de Cuotas</label>
            <input type="text" id="debtInstallments" class="form-input" placeholder="12" inputmode="numeric">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelDebtBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal Gestionar Tarjetas -->
    <div class="modal" id="cardsModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Mis Tarjetas</h3>
        <div class="card-list" id="cardList">
          ${appState.creditCards.length === 0 ? '<p class="text-muted">No hay tarjetas</p>' : 
            appState.creditCards.map(c => `
              <div class="card-item">
                <span>💳 ${escapeHtml(c.name)}</span>
                <button class="delete-card-btn" data-delete="${c.id}">🗑️</button>
              </div>
            `).join('')}
        </div>
        <form id="addCardForm" class="mt-2">
          <div class="form-group">
            <input type="text" id="newCardName" class="form-input" placeholder="Nombre del banco" required>
          </div>
          <button type="submit" class="btn btn--primary btn--block">➕ Agregar Tarjeta</button>
        </form>
        <button class="btn btn--secondary btn--block mt-1" id="closeCardsModal">Cerrar</button>
      </div>
    </div>
    
    <!-- Modal Editar Deuda -->
    <div class="modal" id="editDebtModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Editar Deuda</h3>
        <form id="editDebtForm">
          <input type="hidden" id="editDebtId">
          <div class="form-group">
            <label class="form-label" for="editDebtCard">Tarjeta</label>
            <select id="editDebtCard" class="form-input" required>
              ${appState.creditCards.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              <option value="none">Sin tarjeta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtProduct">Producto</label>
            <input type="text" id="editDebtProduct" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtTotal">Precio Total</label>
            <input type="text" id="editDebtTotal" class="form-input" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtInstallments">Total de Cuotas</label>
            <input type="text" id="editDebtInstallments" class="form-input" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtPaidInstallments">Cuotas Pagadas</label>
            <input type="number" id="editDebtPaidInstallments" class="form-input" min="0" required inputmode="numeric">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--danger" id="deleteDebtBtn">🗑️ Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelEditDebtBtn">Cancelar</button>
        </form>
      </div>
    </div>
  `;
  
  setupDeudasEvents();
}

function buildDebtItemHtml(d) {
  const isComplete = (d.paidInstallments || 0) >= d.totalInstallments;
  return `
    <div class="transaction-item ${isComplete ? 'transaction-item--complete' : ''}" data-id="${d.id}" data-edit="${d.id}" data-delete="${d.id}">
      <div class="transaction-item__icon transaction-item__icon--gasto">💳</div>
      <div class="transaction-item__content">
        <div class="transaction-item__desc">${escapeHtml(d.product)}</div>
        <div class="transaction-item__date ${isComplete ? 'text-success' : ''}" style="font-size: 0.75rem; opacity: 0.8;">Total: ${formatCurrency(d.totalAmount)}${isComplete ? ' ✓ Pagado' : ''}</div>
      </div>
      <div class="transaction-item__amount transaction-item__amount--gasto" style="font-size: 1.1rem;">${formatCurrency(d.installmentAmount)} <span style="font-size: 0.7rem; opacity: 0.7;">/cuota</span></div>
    </div>
  `;
}

function setupDeudasEvents() {
  setTimeout(() => {
    // Add debt button
    document.getElementById('addDebtBtn')?.addEventListener('click', () => {
      document.getElementById('debtModal')?.classList.add('visible');
    });
    
    // Format inputs
    addThousandsSeparator(document.getElementById('debtTotal'));
    addThousandsSeparator(document.getElementById('editDebtTotal'));
    digitsOnly(document.getElementById('debtInstallments'));
    digitsOnly(document.getElementById('editDebtInstallments'));
    digitsOnly(document.getElementById('editDebtPaidInstallments'));
    
    // Manage cards
    document.getElementById('manageCardsBtn')?.addEventListener('click', () => {
      document.getElementById('cardsModal')?.classList.add('visible');
    });
    
    // Close modals
    document.getElementById('cancelDebtBtn')?.addEventListener('click', () => {
      document.getElementById('debtModal')?.classList.remove('visible');
    });
    
    document.getElementById('closeCardsModal')?.addEventListener('click', () => {
      document.getElementById('cardsModal')?.classList.remove('visible');
    });
    
    document.getElementById('cancelEditDebtBtn')?.addEventListener('click', () => {
      document.getElementById('editDebtModal')?.classList.remove('visible');
    });
    
    // Backdrops
    document.querySelectorAll('#debtModal .modal__backdrop, #cardsModal .modal__backdrop, #editDebtModal .modal__backdrop').forEach(el => {
      el?.addEventListener('click', () => {
        document.getElementById('debtModal')?.classList.remove('visible');
        document.getElementById('cardsModal')?.classList.remove('visible');
        document.getElementById('editDebtModal')?.classList.remove('visible');
      });
    });
    
    // Add debt form
    document.getElementById('debtForm')?.addEventListener('submit', handleAddDebt);
    
    // Add card form
    document.getElementById('addCardForm')?.addEventListener('submit', handleAddCard);
    
    // Delete card
    document.querySelectorAll('.delete-card-btn').forEach(btn => {
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        Swal.fire({
          title: '¿Eliminar tarjeta?',
          text: 'Las deudas asociadas se moverán a "Sin tarjeta"',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (result.isConfirmed) {
            deleteCreditCard(btn.dataset.delete);
            window.dispatchEvent(new CustomEvent('app:render'));
          }
        });
      });
    });
    
    // Edit debt
    document.querySelectorAll('.debt-group .transaction-item').forEach(item => {
      item?.addEventListener('click', () => {
        const debt = appState.debts.find(d => d.id === item.dataset.edit);
        if (debt) {
          document.getElementById('editDebtId').value = debt.id;
          document.getElementById('editDebtCard').value = debt.cardId || 'none';
          document.getElementById('editDebtProduct').value = debt.product;
          document.getElementById('editDebtTotal').value = debt.totalAmount;
          document.getElementById('editDebtInstallments').value = debt.totalInstallments;
          document.getElementById('editDebtPaidInstallments').value = debt.paidInstallments || 0;
          document.getElementById('editDebtModal')?.classList.add('visible');
        }
      });
    });
    
    // Save edit debt
    document.getElementById('editDebtForm')?.addEventListener('submit', handleEditDebt);
    
    // Delete debt
    document.getElementById('deleteDebtBtn')?.addEventListener('click', handleDeleteDebt);
  }, 100);
}

function handleAddDebt(e) {
  e.preventDefault();
  
  const product = document.getElementById('debtProduct').value.trim();
  const totalAmount = parseNumber(document.getElementById('debtTotal').value);
  const totalInstallments = parseNumber(document.getElementById('debtInstallments').value);
  const cardId = document.getElementById('debtCard').value;
  
  if (!product) {
    Swal.fire({ title: 'Producto requerido', text: 'Por favor ingresa un producto', icon: 'error' });
    return;
  }
  
  if (!totalAmount || totalAmount <= 0) {
    Swal.fire({ title: 'Monto inválido', text: 'Ingresa un monto válido', icon: 'error' });
    return;
  }
  
  if (!totalInstallments || totalInstallments < 1 || totalInstallments > 48) {
    Swal.fire({ title: 'Cuotas inválidas', text: 'Ingresa entre 1 y 48 cuotas', icon: 'error' });
    return;
  }
  
  addDebt(product, totalAmount, totalInstallments, cardId || 'none');
  document.getElementById('debtModal')?.classList.remove('visible');
  document.getElementById('debtForm').reset();
  window.dispatchEvent(new CustomEvent('app:render'));
}

function handleAddCard(e) {
  e.preventDefault();
  const name = document.getElementById('newCardName').value.trim();
  
  if (!name) {
    Swal.fire({ title: 'Nombre requerido', text: 'Por favor ingresa el nombre del banco', icon: 'error' });
    return;
  }
  
  addCreditCard(name);
  document.getElementById('newCardName').value = '';
  window.dispatchEvent(new CustomEvent('app:render'));
}

function handleEditDebt(e) {
  e.preventDefault();
  
  const debtId = document.getElementById('editDebtId').value;
  const product = document.getElementById('editDebtProduct').value.trim();
  const totalAmount = parseNumber(document.getElementById('editDebtTotal').value);
  const totalInstallments = parseNumber(document.getElementById('editDebtInstallments').value);
  const paidInstallments = parseNumber(document.getElementById('editDebtPaidInstallments').value);
  const cardId = document.getElementById('editDebtCard').value;
  
  if (!product) {
    Swal.fire({ title: 'Producto requerido', text: 'Por favor ingresa un producto', icon: 'error' });
    return;
  }
  
  if (!totalAmount || totalAmount <= 0) {
    Swal.fire({ title: 'Monto inválido', text: 'Ingresa un monto válido', icon: 'error' });
    return;
  }
  
  if (!totalInstallments || totalInstallments < 1 || totalInstallments > 48) {
    Swal.fire({ title: 'Cuotas inválidas', text: 'Ingresa entre 1 y 48 cuotas', icon: 'error' });
    return;
  }
  
  if (paidInstallments < 0 || paidInstallments > totalInstallments) {
    Swal.fire({ title: 'Cuotas pagadas inválidas', text: 'Las cuotas pagadas deben estar entre 0 y el total', icon: 'error' });
    return;
  }
  
  updateDebt(debtId, product, totalAmount, totalInstallments, paidInstallments, cardId);
  document.getElementById('editDebtModal')?.classList.remove('visible');
  window.dispatchEvent(new CustomEvent('app:render'));
}

function handleDeleteDebt() {
  const debtId = document.getElementById('editDebtId').value;
  
  Swal.fire({
    title: '¿Eliminar deuda?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ff3b30'
  }).then((result) => {
    if (result.isConfirmed && debtId) {
      deleteDebt(debtId);
      document.getElementById('editDebtModal')?.classList.remove('visible');
      window.dispatchEvent(new CustomEvent('app:render'));
    }
  });
}

// ==================== RENDER HISTORIAL ====================

export function renderHistorial() {
  const main = document.querySelector('.main');
  const sortedHistory = Object.entries(appState.history).sort((a, b) => b[0].localeCompare(a[0]));
  
  main.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Historial de Meses</h2>
    </div>
    
    <div class="card">
      ${sortedHistory.length === 0 ? 
        createEmptyState('📦', 'Sin historial', 'Archiva meses para verlos aquí') : 
        sortedHistory.map(([month, data]) => `
          <div class="history-item">
            <div class="history-item__header">
              <span class="history-item__month">${getMonthName(month)}</span>
              <span class="history-item__balance ${data.balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.balance)}</span>
            </div>
            <div class="history-item__details">
              <span>📈 Ingresos: ${formatCurrency(data.income)}</span>
              <span>📉 Gastos: ${formatCurrency(data.expense)}</span>
              <span>📝 ${data.transactions?.length || 0} movimientos</span>
            </div>
            <button class="btn btn--sm btn--ghost view-history-btn" data-month="${month}">Ver movimientos</button>
          </div>
        `).join('')}
    </div>
    
    <!-- Modal to view historical transactions -->
    <div class="modal" id="historyModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title" id="historyModalTitle">Movimientos</h3>
        <div class="transaction-list" id="historyTransactionList"></div>
        <button class="btn btn--secondary btn--block mt-2" id="closeHistoryModal">Cerrar</button>
      </div>
    </div>
  `;
  
  setupHistorialEvents();
}

function setupHistorialEvents() {
  // View history button
  document.querySelectorAll('.view-history-btn').forEach(btn => {
    btn?.addEventListener('click', () => {
      const month = btn.dataset.month;
      const data = appState.history[month];
      
      document.getElementById('historyModalTitle').textContent = getMonthName(month);
      
      const list = document.getElementById('historyTransactionList');
      if (data?.transactions?.length > 0) {
        list.innerHTML = data.transactions.map(t => `
          <div class="transaction-item">
            <div class="transaction-item__icon transaction-item__icon--${t.type}">
              ${t.type === 'gasto' ? '📉' : '📈'}
            </div>
            <div class="transaction-item__content">
              <div class="transaction-item__desc">${escapeHtml(t.description)}</div>
              <div class="transaction-item__date">${formatDate(t.date)}</div>
            </div>
            <div class="transaction-item__amount transaction-item__amount--${t.type}">
              ${t.type === 'gasto' ? '-' : '+'}${formatCurrency(t.amount)}
            </div>
          </div>
        `).join('');
      } else {
        list.innerHTML = '<div class="empty-state"><p>Sin movimientos</p></div>';
      }
      
      document.getElementById('historyModal')?.classList.add('visible');
    });
  });
  
  // Close modal
  document.getElementById('closeHistoryModal')?.addEventListener('click', () => {
    document.getElementById('historyModal')?.classList.remove('visible');
  });
  
  document.querySelector('#historyModal .modal__backdrop')?.addEventListener('click', () => {
    document.getElementById('historyModal')?.classList.remove('visible');
  });
}

// ==================== MAIN RENDER ====================

export function renderFinanzasContainer() {
  const main = document.querySelector('.main');
  main.innerHTML = `<div id="subsectionContent"></div>`;
  switchToSubsection(appState.currentSubsection);
}

export function switchToSubsection(subsection) {
  appState.currentSubsection = subsection;
  
  // Update active state in submenu
  document.querySelectorAll('.sub-nav__item').forEach(item => {
    item.classList.toggle('active', item.dataset.subsection === subsection);
  });
  
  // Update header title
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    headerTitle.textContent = subsectionTitles[subsection] || 'Billetera';
  }
  
  // Render the subsection content
  const contentEl = document.getElementById('subsectionContent');
  if (!contentEl) {
    window.dispatchEvent(new CustomEvent('app:render'));
    return;
  }
  
  contentEl.innerHTML = '<div class="subsection-content"></div>';
  const subsectionContainer = contentEl.querySelector('.subsection-content');
  
  switch (subsection) {
    case 'billetera':
      renderBilletera();
      break;
    case 'fijos':
      renderFijos();
      break;
    case 'deudas':
      renderDeudas();
      break;
    case 'historial':
      renderHistorial();
      break;
  }
}
