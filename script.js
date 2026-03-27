/**
 * ===== APP DE FINANZAS PERSONALES =====
 * Almacenamiento: localStorage
 * Sin servidor externo - todo local
 */

// ===== CONSTANTS =====
const STORAGE_KEY = 'finanzas_app_data';
const MAX_TRANSACTIONS = 20;

// ===== STATE =====
let currentSection = 'finanzas';
let currentMonth = getCurrentMonthKey();
let transactions = [];
let fixedExpenses = [];
let debts = [];
let history = {};

// ===== DOM ELEMENTS =====
const elements = {};

// ===== UTILITY FUNCTIONS =====

/**
 * Obtiene la clave del mes actual (YYYY-MM)
 */
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Obtiene el nombre del mes
 */
function getMonthName(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

/**
 * Formatea un número como moneda (formato Chile)
 */
function formatCurrency(amount) {
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
  
  if (diff < 86400000) {
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }
  
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }
  
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

/**
 * Genera un ID único
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Escapa HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== LOCAL STORAGE FUNCTIONS =====

function loadData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      transactions = parsed.transactions || [];
      fixedExpenses = parsed.fixedExpenses || [];
      debts = parsed.debts || [];
      history = parsed.history || {};
    } else {
      transactions = [];
      fixedExpenses = [];
      debts = [];
      history = {};
    }
  } catch (error) {
    console.error('Error al cargar datos:', error);
    transactions = [];
    fixedExpenses = [];
    debts = [];
    history = {};
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      transactions,
      fixedExpenses,
      debts,
      history
    }));
  } catch (error) {
    console.error('Error al guardar datos:', error);
  }
}

// ===== BALANCE CALCULATIONS =====

function calculateIncome() {
  return transactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);
}

function calculateExpense() {
  return transactions
    .filter(t => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);
}

function calculateBalance() {
  return calculateIncome() - calculateExpense();
}

function calculateFixedExpensesTotal() {
  return fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
}

function calculateDebtsTotal() {
  return debts.reduce((sum, d) => sum + d.totalAmount, 0);
}

function calculateDebtsMonthly() {
  return debts.reduce((sum, d) => sum + d.installmentAmount, 0);
}

function calculateTotalCuentas() {
  return calculateFixedExpensesTotal() + calculateDebtsMonthly();
}

// Función para pagar todas las cuentas del mes
function payAllCuentas() {
  const fixedTotal = calculateFixedExpensesTotal();
  const debtsMonthly = calculateDebtsMonthly();
  const total = fixedTotal + debtsMonthly;
  
  if (total === 0) {
    alert('No hay cuentas por pagar');
    return;
  }
  
  if (!confirm(`¿Pagar todas las cuentas?\n\n📅 Fijos: ${formatCurrency(fixedTotal)}\n💳 Cuotas: ${formatCurrency(debtsMonthly)}\n\nTotal: ${formatCurrency(total)}`)) {
    return;
  }
  
  // Agregar movimiento de gasto por cada cuenta fija
  fixedExpenses.forEach(expense => {
    transactions.unshift({
      id: generateId(),
      amount: expense.amount,
      description: `Pago ${expense.name}`,
      type: 'gasto',
      date: new Date().toISOString()
    });
  });
  
  // Actualizar cuotas pagadas en deudas
  debts.forEach(debt => {
    if (debt.paidInstallments < debt.totalInstallments) {
      debt.paidInstallments++;
    }
  });
  
  saveData();
  render();
}

// ===== MONTH MANAGEMENT =====

function archiveCurrentMonth() {
  const income = calculateIncome();
  const expense = calculateExpense();
  
  if (income > 0 || expense > 0) {
    history[currentMonth] = {
      income,
      expense,
      balance: income - expense,
      transactions: [...transactions],
      date: new Date().toISOString()
    };
  }
  
  transactions = [];
  saveData();
}

function changeMonth(direction) {
  const [year, month] = currentMonth.split('-').map(Number);
  let newYear = year;
  let newMonth = month + direction;
  
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  } else if (newMonth < 1) {
    newMonth = 12;
    newYear--;
  }
  
  currentMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
  loadMonthData();
  render();
}

// Cargar datos del mes actual o histórico
function loadMonthData() {
  if (history[currentMonth]) {
    transactions = [...history[currentMonth].transactions];
  } else {
    transactions = [];
  }
}

// ===== RENDER FUNCTIONS =====

function render() {
  renderNavigation();
  
  try {
    switch (currentSection) {
      case 'finanzas':
        renderFinanzas();
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
  } catch (error) {
    console.error('Error rendering section:', error);
    document.querySelector('.main').innerHTML = '<div class="card"><p>Error: ' + error.message + '</p></div>';
  }
}

function renderNavigation() {
  // Agregar event listeners
  document.querySelectorAll('.nav__item').forEach(item => {
    item.onclick = (e) => {
      e.preventDefault();
      console.log('Clicked section:', item.dataset.section);
      currentSection = item.dataset.section;
      render();
    };
  });
  
  // Actualizar navegación activa
  document.querySelectorAll('.nav__item').forEach(item => {
    item.classList.toggle('nav__item--active', item.dataset.section === currentSection);
  });
}

// ===== FINANZAS SECTION =====

function renderFinanzas() {
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
      <span class="month-label">${getMonthName(currentMonth)}</span>
      <button class="month-btn" id="nextMonth">▶</button>
    </div>
    
    <!-- Balance Card -->
    <div class="balance-card">
      <div class="balance-card__label">Saldo del Mes</div>
      <div class="balance-card__amount ${balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(balance)}</div>
      <div class="balance-card__info">
        <span class="balance-card__income">💚 ${formatCurrency(income)}</span>
        <span class="balance-card__expense">💸 ${formatCurrency(expense)}</span>
      </div>
      ${fixedTotal > 0 || debtsMonthly > 0 ? `
        <div class="balance-card__extras">
          <span>📅 Fijos: ${formatCurrency(fixedTotal)}</span>
          <span>💳 Cuotas: ${formatCurrency(debtsMonthly)}</span>
        </div>
      ` : ''}
    </div>
    
    ${history[currentMonth] ? `
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
            <button type="button" class="type-btn active" data-type="gasto" id="typeGasto">💸 Gasto</button>
            <button type="button" class="type-btn" data-type="ingreso" id="typeIngreso">💚 Ingreso</button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="amount">Monto</label>
          <input type="number" id="amount" class="form-input" placeholder="0" min="0" step="1" required inputmode="numeric">
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
        <span class="card__badge">${transactions.length}</span>
      </div>
      
      <div class="transaction-list" id="transactionList">
        ${transactions.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">📝</span>
            <p class="empty-state__text">Sin movimientos</p>
          </div>
        ` : transactions.slice(0, MAX_TRANSACTIONS).map(t => `
          <div class="transaction-item" data-id="${t.id}">
            <div class="transaction-item__icon transaction-item__icon--${t.type}">
              ${t.type === 'gasto' ? '💸' : '💚'}
            </div>
            <div class="transaction-item__content">
              <div class="transaction-item__desc">${escapeHtml(t.description)}</div>
              <div class="transaction-item__date">${formatDate(t.date)}</div>
            </div>
            <div class="transaction-item__amount transaction-item__amount--${t.type}">
              ${t.type === 'gasto' ? '-' : '+'}${formatCurrency(t.amount)}
            </div>
            <button class="transaction-item__delete" data-delete="${t.id}">🗑️</button>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Pagar Cuentas Button -->
    <div class="card">
      <button class="btn btn--primary btn--block" id="payCuentasBtn">
        💸 Pagar Cuentas (Fijos + Cuotas)
      </button>
    </div>
    
    <!-- Actions -->
    <div class="card">
      <button class="btn btn--secondary btn--block" id="archiveMonthBtn">
        📦 Archivar Mes y Nuevo
      </button>
    </div>
  `;
  
  // Event listeners with setTimeout to ensure DOM is ready
  setTimeout(() => {
    document.getElementById('prevMonth').onclick = () => changeMonth(-1);
    document.getElementById('nextMonth').onclick = () => changeMonth(1);
    document.getElementById('typeGasto').onclick = () => handleTypeChange('gasto');
    document.getElementById('typeIngreso').onclick = () => handleTypeChange('ingreso');
    
    document.getElementById('transactionForm').onsubmit = handleFormSubmit;
    
    document.querySelectorAll('[data-delete]').forEach(btn => {
      btn.onclick = (e => {
        e.stopPropagation();
        deleteTransaction(btn.dataset.delete);
      });
    });
    
    document.getElementById('archiveMonthBtn').onclick = () => {
      if (confirm('¿Archivar este mes? Los movimientos se guardarán en historial y começarás un nuevo mes.')) {
        archiveCurrentMonth();
        render();
      }
    };
    
    document.getElementById('payCuentasBtn').onclick = () => {
      payAllCuentas();
    };
  }, 100);
}

// ===== FIJOS SECTION =====

function renderFijos() {
  const main = document.querySelector('.main');
  const total = calculateFixedExpensesTotal();
  console.log('Rendering Fijos, total:', total, 'items:', fixedExpenses.length);
  
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
        ${fixedExpenses.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">📅</span>
            <p class="empty-state__text">Sin gastos fijos</p>
            <p class="empty-state__hint">Agrega Spotify, bencina, celular, etc.</p>
          </div>
        ` : fixedExpenses.map(e => `
          <div class="transaction-item" data-id="${e.id}">
            <div class="transaction-item__icon transaction-item__icon--gasto">📅</div>
            <div class="transaction-item__content">
              <div class="transaction-item__desc">${escapeHtml(e.name)}</div>
              <div class="transaction-item__date">${e.category}</div>
            </div>
            <div class="transaction-item__amount transaction-item__amount--gasto">${formatCurrency(e.amount)}</div>
            <button class="transaction-item__delete" data-delete="${e.id}">🗑️</button>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Modal -->
    <div class="modal" id="fixedModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Gasto Fijo</h3>
        <form id="fixedForm">
          <div class="form-group">
            <label class="form-label" for="fixedName">Nombre</label>
            <input type="text" id="fixedName" class="form-input" placeholder="Ej: Spotify" maxlength="50" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="fixedAmount">Monto</label>
            <input type="number" id="fixedAmount" class="form-input" placeholder="0" min="0" step="1" required inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="fixedCategory">Categoría</label>
            <input type="text" id="fixedCategory" class="form-input" placeholder="Ej: Streaming" maxlength="30">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelFixedBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Event listeners - usar setTimeout para asegurar DOM actualizado
  setTimeout(() => {
    const addBtn = document.getElementById('addFixedBtn');
    const cancelBtn = document.getElementById('cancelFixedBtn');
    const backdrop = document.querySelector('#fixedModal .modal__backdrop');
    const form = document.getElementById('fixedForm');
    
    if (addBtn) {
      addBtn.onclick = () => {
        console.log('Add fixed clicked');
        document.getElementById('fixedModal').classList.add('visible');
      };
    }
    
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        document.getElementById('fixedModal').classList.remove('visible');
      };
    }
    
    if (backdrop) {
      backdrop.onclick = () => {
        document.getElementById('fixedModal').classList.remove('visible');
      };
    }
    
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('fixedName').value.trim();
        const amount = parseInt(document.getElementById('fixedAmount').value);
        const category = document.getElementById('fixedCategory').value.trim() || 'General';
        
        fixedExpenses.push({ id: generateId(), name, amount, category });
        saveData();
        document.getElementById('fixedModal').classList.remove('visible');
        render();
      };
    }
    
    document.querySelectorAll('#fijosList [data-delete]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        fixedExpenses = fixedExpenses.filter(f => f.id !== btn.dataset.delete);
        saveData();
        render();
      };
    });
  }, 100);
}

// ===== DEUDAS SECTION =====

function renderDeudas() {
  const main = document.querySelector('.main');
  const totalDebt = calculateDebtsTotal();
  const monthlyInstallments = calculateDebtsMonthly();
  console.log('Rendering Deudas, total:', totalDebt, 'items:', debts.length);
  
  main.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Deudas Tarjetas</h2>
      <button class="btn btn--sm btn--primary" id="addDebtBtn">➕ Agregar</button>
    </div>
    
    <div class="balance-card balance-card--purple">
      <div class="balance-card__label">Total Deuda</div>
      <div class="balance-card__amount">${formatCurrency(totalDebt)}</div>
      <div class="balance-card__info">
        <span>💳 Cuotas mensuales: ${formatCurrency(monthlyInstallments)}</span>
      </div>
    </div>
    
    <div class="card">
      <div class="transaction-list" id="deudasList">
        ${debts.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">💳</span>
            <p class="empty-state__text">Sin deudas registradas</p>
            <p class="empty-state__hint">Agrega tus compras en cuotas</p>
          </div>
        ` : debts.map(d => `
          <div class="transaction-item" data-id="${d.id}">
            <div class="transaction-item__icon transaction-item__icon--gasto">💳</div>
            <div class="transaction-item__content">
              <div class="transaction-item__desc">${escapeHtml(d.product)}</div>
              <div class="transaction-item__date">${d.paidInstallments || 0}/${d.totalInstallments} cuotas (${formatCurrency(d.installmentAmount)})</div>
            </div>
            <div class="transaction-item__amount transaction-item__amount--gasto">${formatCurrency(d.totalAmount)}</div>
            <button class="transaction-item__delete" data-delete="${d.id}">🗑️</button>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Modal -->
    <div class="modal" id="debtModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Deuda</h3>
        <form id="debtForm">
          <div class="form-group">
            <label class="form-label" for="debtProduct">Producto</label>
            <input type="text" id="debtProduct" class="form-input" placeholder="Ej: iPhone 15" maxlength="50" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="debtTotal">Precio Total</label>
            <input type="number" id="debtTotal" class="form-input" placeholder="0" min="0" step="1" required inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="debtInstallments">Cantidad de Cuotas</label>
            <input type="number" id="debtInstallments" class="form-input" placeholder="12" min="1" max="48" required inputmode="numeric">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelDebtBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Event listeners
  setTimeout(() => {
    const addBtn = document.getElementById('addDebtBtn');
    const cancelBtn = document.getElementById('cancelDebtBtn');
    const backdrop = document.querySelector('#debtModal .modal__backdrop');
    const form = document.getElementById('debtForm');
    
    if (addBtn) {
      addBtn.onclick = () => {
        console.log('Add debt clicked');
        document.getElementById('debtModal').classList.add('visible');
      };
    }
    
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        document.getElementById('debtModal').classList.remove('visible');
      };
    }
    
    if (backdrop) {
      backdrop.onclick = () => {
        document.getElementById('debtModal').classList.remove('visible');
      };
    }
    
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const product = document.getElementById('debtProduct').value.trim();
        const totalAmount = parseInt(document.getElementById('debtTotal').value);
        const totalInstallments = parseInt(document.getElementById('debtInstallments').value);
        const installmentAmount = Math.round(totalAmount / totalInstallments);
        
        debts.push({ 
          id: generateId(), 
          product, 
          totalAmount, 
          totalInstallments, 
          installmentAmount,
          paidInstallments: 0
        });
        
        saveData();
        document.getElementById('debtModal').classList.remove('visible');
        render();
      };
    }
    
    document.querySelectorAll('#deudasList [data-delete]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        debts = debts.filter(d => d.id !== btn.dataset.delete);
        saveData();
        render();
      };
    });
  }, 100);
}

// ===== HISTORIAL SECTION =====

function renderHistorial() {
  const main = document.querySelector('.main');
  const sortedHistory = Object.entries(history).sort((a, b) => b[0].localeCompare(a[0]));
  
  main.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Historial de Meses</h2>
    </div>
    
    <div class="card">
      ${sortedHistory.length === 0 ? `
        <div class="empty-state">
          <span class="empty-state__icon">📦</span>
          <p class="empty-state__text">Sin historial</p>
          <p class="empty-state__hint">Archiva meses para verlos aquí</p>
        </div>
      ` : sortedHistory.map(([month, data]) => `
        <div class="history-item">
          <div class="history-item__header">
            <span class="history-item__month">${getMonthName(month)}</span>
            <span class="history-item__balance ${data.balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.balance)}</span>
          </div>
          <div class="history-item__details">
            <span>💚 Ingresos: ${formatCurrency(data.income)}</span>
            <span>💸 Gastos: ${formatCurrency(data.expense)}</span>
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
  
  document.querySelectorAll('.view-history-btn').forEach(btn => {
    btn.onclick = () => {
      const month = btn.dataset.month;
      const data = history[month];
      
      document.getElementById('historyModalTitle').textContent = getMonthName(month);
      
      const list = document.getElementById('historyTransactionList');
      if (data.transactions && data.transactions.length > 0) {
        list.innerHTML = data.transactions.map(t => `
          <div class="transaction-item">
            <div class="transaction-item__icon transaction-item__icon--${t.type}">
              ${t.type === 'gasto' ? '💸' : '💚'}
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
      
      document.getElementById('historyModal').classList.add('visible');
    };
  });
  
  document.getElementById('closeHistoryModal').onclick = () => {
    document.getElementById('historyModal').classList.remove('visible');
  };
  
  document.querySelector('#historyModal .modal__backdrop').onclick = () => {
    document.getElementById('historyModal').classList.remove('visible');
  };
}

// ===== EVENT HANDLERS =====

let currentType = 'gasto';

function handleTypeChange(type) {
  currentType = type;
  document.getElementById('typeGasto').classList.toggle('active', type === 'gasto');
  document.getElementById('typeIngreso').classList.toggle('active', type === 'ingreso');
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const amount = parseInt(document.getElementById('amount').value);
  const description = document.getElementById('description').value.trim();
  
  if (!amount || amount <= 0) {
    alert('Ingresa un monto válido');
    return;
  }
  
  if (!description) {
    alert('Ingresa una descripción');
    return;
  }
  
  transactions.unshift({
    id: generateId(),
    amount,
    description,
    type: currentType,
    date: new Date().toISOString()
  });
  
  saveData();
  document.getElementById('amount').value = '';
  document.getElementById('description').value = '';
  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveData();
  render();
}

function clearAllData() {
  if (confirm('¿Borrar todos los datos? Esta acción no se puede deshacer.')) {
    transactions = [];
    fixedExpenses = [];
    debts = [];
    history = {};
    saveData();
    render();
  }
}

// ===== INITIALIZATION =====

function init() {
  loadData();
  render();
  
  // Clear data button
  document.getElementById('clearDataBtn').onclick = clearAllData;
  
  console.log('💰 App de Finanzas inicializada');
}

document.addEventListener('DOMContentLoaded', init);
