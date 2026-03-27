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
let creditCards = [];
let history = {};
let darkMode = localStorage.getItem('darkMode') === 'true';
let lastPaymentMonth = null; // Track last month when cuentas were paid

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
      creditCards = parsed.creditCards || [];
      history = parsed.history || {};
      lastPaymentMonth = parsed.lastPaymentMonth || null;
    } else {
      transactions = [];
      fixedExpenses = [];
      debts = [];
      creditCards = [];
      history = {};
      lastPaymentMonth = null;
    }
  } catch (error) {
    console.error('Error al cargar datos:', error);
    transactions = [];
    fixedExpenses = [];
    debts = [];
    creditCards = [];
    history = {};
    lastPaymentMonth = null;
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      transactions,
      fixedExpenses,
      debts,
      creditCards,
      history,
      lastPaymentMonth
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
    Swal.fire({
      title: 'Sin cuentas',
      text: 'No hay cuentas por pagar',
      icon: 'info'
    });
    return;
  }
  
  // Check if already paid this month
  if (lastPaymentMonth === currentMonth) {
    Swal.fire({
      title: '¡Ya pagaste!',
      text: 'Las cuentas de este mes ya fueron pagadas',
      icon: 'warning'
    });
    return;
  }
  
  Swal.fire({
    title: '¿Pagar todas las cuentas?',
    html: `📅 Fijos: ${formatCurrency(fixedTotal)}<br>💳 Cuotas: ${formatCurrency(debtsMonthly)}<br><br><strong>Total: ${formatCurrency(total)}</strong>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, pagar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (!result.isConfirmed) return;
    
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
    
    // Mark as paid this month
    lastPaymentMonth = currentMonth;
    
    saveData();
    render();
    
    Swal.fire({
      title: '¡Pagado!',
      text: 'Las cuentas han sido pagadas',
      icon: 'success'
    });
  });
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
  lastPaymentMonth = null;
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
      ${lastPaymentMonth === currentMonth ? `
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
      Swal.fire({
        title: '¿Archivar mes?',
        text: 'Los movimientos se guardarán en historial y comenzarás un nuevo mes',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, archivar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          archiveCurrentMonth();
          render();
          Swal.fire({
            title: '¡Archivado!',
            text: 'El mes ha sido guardado en historial',
            icon: 'success'
          });
        }
      });
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
  
  // Get card name by ID
  const getCardName = (cardId) => {
    const card = creditCards.find(c => c.id === cardId);
    return card ? card.name : 'Sin tarjeta';
  };
  
  // Group debts by card
  const debtsByCard = {};
  debts.forEach(d => {
    const cardId = d.cardId || 'none';
    if (!debtsByCard[cardId]) {
      debtsByCard[cardId] = [];
    }
    debtsByCard[cardId].push(d);
  });
  
  // Build cards HTML
  let cardsHtml = '';
  
  // Card: Sin tarjeta
  if (debtsByCard['none'] && debtsByCard['none'].length > 0) {
    cardsHtml += `
      <div class="debt-group">
        <div class="debt-group__header">💳 Sin Tarjeta</div>
        <div class="transaction-list">
          ${debtsByCard['none'].map(d => buildDebtItemHtml(d)).join('')}
        </div>
      </div>
    `;
  }
  
  // Card: credit cards
  creditCards.forEach(card => {
    if (debtsByCard[card.id] && debtsByCard[card.id].length > 0) {
      const cardTotal = debtsByCard[card.id].reduce((sum, d) => sum + d.totalAmount, 0);
      cardsHtml += `
        <div class="debt-group">
          <div class="debt-group__header">
            <span>💳 ${escapeHtml(card.name)}</span>
            <span class="debt-group__total">${formatCurrency(cardTotal)}</span>
          </div>
          <div class="transaction-list">
            ${debtsByCard[card.id].map(d => buildDebtItemHtml(d)).join('')}
          </div>
        </div>
      `;
    }
  });
  
  if (debts.length === 0) {
    cardsHtml = `
      <div class="empty-state">
        <span class="empty-state__icon">💳</span>
        <p class="empty-state__text">Sin deudas registradas</p>
        <p class="empty-state__hint">Agrega tus compras en cuotas</p>
      </div>
    `;
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
      <div class="balance-card__label">Total Deuda</div>
      <div class="balance-card__amount">${formatCurrency(totalDebt)}</div>
      <div class="balance-card__info">
        <span>💳 Cuotas mensuales: ${formatCurrency(monthlyInstallments)}</span>
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
              ${creditCards.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              <option value="none">Sin tarjeta</option>
            </select>
          </div>
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
    
    <!-- Modal Gestionar Tarjetas -->
    <div class="modal" id="cardsModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Mis Tarjetas</h3>
        <div class="card-list" id="cardList">
          ${creditCards.length === 0 ? '<p class="text-muted">No hay tarjetas</p>' : 
            creditCards.map(c => `
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
              ${creditCards.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              <option value="none">Sin tarjeta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtProduct">Producto</label>
            <input type="text" id="editDebtProduct" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtTotal">Precio Total</label>
            <input type="number" id="editDebtTotal" class="form-input" required inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtInstallments">Cuotas</label>
            <input type="number" id="editDebtInstallments" class="form-input" required inputmode="numeric">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelEditDebtBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Event listeners
  setTimeout(() => {
    // Add debt button
    document.getElementById('addDebtBtn').onclick = () => {
      document.getElementById('debtModal').classList.add('visible');
    };
    
    // Manage cards button
    document.getElementById('manageCardsBtn').onclick = () => {
      document.getElementById('cardsModal').classList.add('visible');
    };
    
    // Close modals
    document.getElementById('cancelDebtBtn').onclick = () => {
      document.getElementById('debtModal').classList.remove('visible');
    };
    
    document.getElementById('closeCardsModal').onclick = () => {
      document.getElementById('cardsModal').classList.remove('visible');
    };
    
    document.getElementById('cancelEditDebtBtn').onclick = () => {
      document.getElementById('editDebtModal').classList.remove('visible');
    };
    
    document.querySelectorAll('#debtModal .modal__backdrop, #cardsModal .modal__backdrop, #editDebtModal .modal__backdrop').forEach(el => {
      el.onclick = () => {
        document.getElementById('debtModal').classList.remove('visible');
        document.getElementById('cardsModal').classList.remove('visible');
        document.getElementById('editDebtModal').classList.remove('visible');
      };
    });
    
    // Add new debt form
    document.getElementById('debtForm').onsubmit = (e) => {
      e.preventDefault();
      const product = document.getElementById('debtProduct').value.trim();
      const totalAmount = parseInt(document.getElementById('debtTotal').value);
      const totalInstallments = parseInt(document.getElementById('debtInstallments').value);
      const cardId = document.getElementById('debtCard').value;
      const installmentAmount = Math.round(totalAmount / totalInstallments);
      
      debts.push({ 
        id: generateId(), 
        product, 
        totalAmount, 
        totalInstallments, 
        installmentAmount,
        paidInstallments: 0,
        cardId: cardId || 'none'
      });
      
      saveData();
      document.getElementById('debtModal').classList.remove('visible');
      document.getElementById('debtForm').reset();
      render();
    };
    
    // Add new card form
    document.getElementById('addCardForm').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('newCardName').value.trim();
      if (name) {
        creditCards.push({ id: generateId(), name });
        saveData();
        document.getElementById('newCardName').value = '';
        render();
      }
    };
    
    // Delete card
    document.querySelectorAll('.delete-card-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        Swal.fire({
          title: '¿Eliminar tarjeta?',
          text: 'Las deudas asociadas se moverán a "Sin tarjeta"',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (!result.isConfirmed) return;
          const cardId = btn.dataset.delete;
          debts.forEach(d => {
            if (d.cardId === cardId) d.cardId = 'none';
          });
          creditCards = creditCards.filter(c => c.id !== cardId);
          saveData();
          render();
        });
      };
    });
    
    // Edit debt buttons
    document.querySelectorAll('.edit-debt-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const debtId = btn.dataset.edit;
        const debt = debts.find(d => d.id === debtId);
        if (debt) {
          document.getElementById('editDebtId').value = debt.id;
          document.getElementById('editDebtCard').value = debt.cardId || 'none';
          document.getElementById('editDebtProduct').value = debt.product;
          document.getElementById('editDebtTotal').value = debt.totalAmount;
          document.getElementById('editDebtInstallments').value = debt.totalInstallments;
          document.getElementById('editDebtModal').classList.add('visible');
        }
      };
    });
    
    // Save edit debt form
    document.getElementById('editDebtForm').onsubmit = (e) => {
      e.preventDefault();
      const debtId = document.getElementById('editDebtId').value;
      const idx = debts.findIndex(d => d.id === debtId);
      if (idx >= 0) {
        const totalAmount = parseInt(document.getElementById('editDebtTotal').value);
        const totalInstallments = parseInt(document.getElementById('editDebtInstallments').value);
        
        debts[idx] = {
          ...debts[idx],
          cardId: document.getElementById('editDebtCard').value,
          product: document.getElementById('editDebtProduct').value.trim(),
          totalAmount,
          totalInstallments,
          installmentAmount: Math.round(totalAmount / totalInstallments)
        };
        saveData();
        document.getElementById('editDebtModal').classList.remove('visible');
        render();
      }
    };
    
    // Delete debt
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

// Helper function to build debt item HTML
function buildDebtItemHtml(d) {
  const isComplete = (d.paidInstallments || 0) >= d.totalInstallments;
  return `
    <div class="transaction-item ${isComplete ? 'transaction-item--complete' : ''}" data-id="${d.id}">
      <div class="transaction-item__icon transaction-item__icon--gasto">💳</div>
      <div class="transaction-item__content">
        <div class="transaction-item__desc">${escapeHtml(d.product)}</div>
        <div class="transaction-item__date ${isComplete ? 'text-success' : ''}">${d.paidInstallments || 0}/${d.totalInstallments} cuotas (${formatCurrency(d.installmentAmount)})${isComplete ? ' ✓ Pagado' : ''}</div>
      </div>
      <div class="transaction-item__amount transaction-item__amount--gasto">${formatCurrency(d.totalAmount)}</div>
      ${!isComplete ? `<button class="edit-debt-btn" data-edit="${d.id}">⋮</button>` : ''}
      <button class="transaction-item__delete" data-delete="${d.id}">🗑️</button>
    </div>
  `;
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
    Swal.fire({
      title: 'Monto inválido',
      text: 'Por favor ingresa un monto válido',
      icon: 'error'
    });
    return;
  }
  
  if (!description) {
    Swal.fire({
      title: 'Descripción requerida',
      text: 'Por favor ingresa una descripción',
      icon: 'error'
    });
    return;
  }
  
  transactions.unshift({
    id: generateId(),
    amount,
    description,
    type: document.getElementById('typeGasto').classList.contains('active') ? 'gasto' : 'ingreso',
    date: new Date().toISOString()
  });
  
  saveData();
  document.getElementById('amount').value = '';
  document.getElementById('description').value = '';
  document.getElementById('amount').focus();
  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveData();
  render();
}

function clearAllData() {
  Swal.fire({
    title: '¿Borrar todos los datos?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, borrar todo',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ff3b30'
  }).then((result) => {
    if (result.isConfirmed) {
      transactions = [];
      fixedExpenses = [];
      debts = [];
      creditCards = [];
      history = {};
      lastPaymentMonth = null;
      saveData();
      render();
      Swal.fire({
        title: '¡Borrado!',
        text: 'Todos los datos han sido eliminados',
        icon: 'success'
      });
    }
  });
}

// ===== INITIALIZATION =====

function init() {
  loadData();
  render();
  
  // Dark mode toggle
  const darkModeBtn = document.getElementById('darkModeBtn');
  if (darkModeBtn) {
    darkModeBtn.onclick = () => {
      darkMode = !darkMode;
      localStorage.setItem('darkMode', darkMode);
      updateDarkMode();
    };
    updateDarkMode();
  }
  
  console.log('💰 App de Finanzas inicializada');
}

function updateDarkMode() {
  const body = document.body;
  const btn = document.getElementById('darkModeBtn');
  
  if (darkMode) {
    body.classList.add('dark-mode');
    if (btn) btn.textContent = '☀️';
  } else {
    body.classList.remove('dark-mode');
    if (btn) btn.textContent = '🌙';
  }
}

document.addEventListener('DOMContentLoaded', init);
