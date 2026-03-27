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
let currentSubsection = 'billetera';
let agendaSubsection = 'lista';
let currentMonth = getCurrentMonthKey();
let transactions = [];
let fixedExpenses = [];
let debts = [];
let creditCards = [];
let history = {};
let importantDates = [];
let darkMode = localStorage.getItem('darkMode') === 'true';
let lastPaymentMonth = null; // Track last month when cuentas were paid
let previousMonthBalance = 0; // Track balance to transfer to next month

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
 * Formatea un número con separador de miles
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Limpia un número eliminando separadores de miles
 */
function parseNumber(str) {
  if (typeof str === 'number') return str;
  return parseInt(str.replace(/\./g, '')) || 0;
}

/**
 * Formatea un número como moneda (formato Chile)
 */
function formatCurrency(amount) {
  return '$' + formatNumber(amount);
}

/**
 * Agrega separador de miles mientras escribe
 */
function addThousandsSeparator(input) {
  input.addEventListener('input', function(e) {
    // Guardar posición del cursor
    const cursorPos = this.selectionStart;
    const oldLength = this.value.length;
    
    // Remover todo excepto dígitos
    let value = this.value.replace(/[^\d]/g, '');
    
    if (value) {
      // Formatear con puntos usando regex
      this.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    } else {
      this.value = '';
    }
    
    // Ajustar posición del cursor
    const newLength = this.value.length;
    const newPos = cursorPos + (newLength - oldLength);
    this.setSelectionRange(newPos, newPos);
  });
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
      importantDates = parsed.importantDates || [];
      previousMonthBalance = parsed.previousMonthBalance || 0;
    } else {
      transactions = [];
      fixedExpenses = [];
      debts = [];
      creditCards = [];
      history = {};
      lastPaymentMonth = null;
      importantDates = [];
      previousMonthBalance = 0;
    }
  } catch (error) {
    console.error('Error al cargar datos:', error);
    transactions = [];
    fixedExpenses = [];
    debts = [];
    creditCards = [];
    history = {};
    lastPaymentMonth = null;
    importantDates = [];
    previousMonthBalance = 0;
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
      lastPaymentMonth,
      importantDates,
      previousMonthBalance
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
    
    // Agregar movimiento de gasto por cada cuota de deuda
    debts.forEach(debt => {
      if (debt.paidInstallments < debt.totalInstallments) {
        // Agregar gasto de la cuota
        transactions.unshift({
          id: generateId(),
          amount: debt.installmentAmount,
          description: `Cuota ${debt.paidInstallments + 1}/${debt.totalInstallments} - ${debt.product}`,
          type: 'gasto',
          date: new Date().toISOString()
        });
        
        // Actualizar cuotas pagadas
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
  const balance = income - expense;
  
  if (income > 0 || expense > 0) {
    history[currentMonth] = {
      income,
      expense,
      balance: balance,
      transactions: [...transactions],
      date: new Date().toISOString()
    };
  }
  
  // Guardar el balance para transferir al siguiente mes
  previousMonthBalance = balance;
  
  // Crear el nuevo mes automáticamente
  const [year, month] = currentMonth.split('-').map(Number);
  let newYear = year;
  let newMonth = month + 1;
  
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  }
  
  const newMonthKey = `${newYear}-${String(newMonth).padStart(2, '0')}`;
  
  // Agregar el balance transferido como ingreso inicial del nuevo mes
  if (previousMonthBalance > 0) {
    transactions = [{
      id: generateId(),
      amount: previousMonthBalance,
      description: '💰 Saldo anterior transferido',
      type: 'ingreso',
      date: new Date().toISOString()
    }];
  } else {
    transactions = [];
  }
  
  currentMonth = newMonthKey;
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

// Section titles
const sectionTitles = {
  finanzas: 'Finanzas',
  agenda: 'Agenda',
  ajustes: 'Ajustes'
};

// Subsection titles (within Finanzas)
const subsectionTitles = {
  billetera: 'Billetera',
  fijos: 'Fijos',
  deudas: 'Deudas',
  historial: 'Historial'
};

// Agenda subsection titles
const agendaTitles = {
  calendario: 'Calendario',
  agregar: 'Agregar Fecha',
  lista: 'Lista Fechas'
};

function render() {
  renderMenu();
  
  // Update header title
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    if (currentSection === 'finanzas') {
      headerTitle.textContent = subsectionTitles[currentSubsection] || 'Billetera';
    } else if (currentSection === 'agenda') {
      headerTitle.textContent = agendaTitles[agendaSubsection] || 'Agenda';
    } else {
      headerTitle.textContent = sectionTitles[currentSection] || 'Finanzas';
    }
  }
  
  try {
    switch (currentSection) {
      case 'finanzas':
        renderFinanzasContainer();
        break;
      case 'agenda':
        renderAgendaContainer();
        break;
      case 'ajustes':
        renderAjustes();
        break;
    }
  } catch (error) {
    console.error('Error rendering section:', error);
    document.querySelector('.main').innerHTML = '<div class="card"><p>Error: ' + error.message + '</p></div>';
  }
}

function renderFinanzasContainer() {
  const main = document.querySelector('.main');
  
  // Render sub-navigation
  main.innerHTML = `
    <div id="subsectionContent"></div>
  `;
  
  // Render current subsection
  switchToSubsection(currentSubsection);
}

function renderAgendaContainer() {
  const main = document.querySelector('.main');
  
  // Render based on agenda subsection
  main.innerHTML = `<div id="agendaContent"></div>`;
  switchAgendaSubsection(agendaSubsection);
}

function switchAgendaSubsection(subsection) {
  agendaSubsection = subsection;
  
  const contentEl = document.getElementById('agendaContent');
  if (!contentEl) {
    render();
    return;
  }
  
  switch (subsection) {
    case 'calendario':
      renderAgendaCalendario(contentEl);
      break;
    case 'lista':
      renderAgendaLista(contentEl);
      break;
  }
}

function renderAgendaLista(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Fechas Importantes</h2>
      <button class="btn btn--sm btn--primary" id="addDateBtn">➕ Agregar</button>
    </div>
    
    <div class="card">
      <div class="transaction-list" id="datesList">
        ${importantDates.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">📅</span>
            <p class="empty-state__text">Sin fechas importantes</p>
            <p class="empty-state__hint">Agrega cumpleaños, pagos, etc.</p>
          </div>
        ` : importantDates.map(d => `
          <div class="transaction-item" data-id="${d.id}" data-edit="${d.id}">
            <div class="transaction-item__icon transaction-item__icon--gasto">🎉</div>
            <div class="transaction-item__content">
              <div class="transaction-item__desc">${escapeHtml(d.title)}</div>
              <div class="transaction-item__date">${d.date} ${d.notes ? '- ' + d.notes : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Modal Agregar/Editar Fecha -->
    <div class="modal" id="dateModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title" id="dateModalTitle">Agregar Fecha</h3>
        <form id="dateForm">
          <input type="hidden" id="dateEditId">
          <div class="form-group">
            <label class="form-label" for="dateTitle">Título</label>
            <input type="text" id="dateTitle" class="form-input" placeholder="Ej: Cumpleaños Juan" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="dateDesc">Fecha</label>
            <input type="text" id="dateDesc" class="form-input" placeholder="Ej: 15 de Marzo" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="dateNotes">Notas (opcional)</label>
            <input type="text" id="dateNotes" class="form-input" placeholder="Ej: Regalo $20.000">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--danger" id="deleteDateBtn" style="display:none;">🗑️ Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelDateBtn">Cancelar</button>
        </form>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const addBtn = document.getElementById('addDateBtn');
    if (addBtn) {
      addBtn.onclick = () => {
        document.getElementById('dateEditId').value = '';
        document.getElementById('dateTitle').value = '';
        document.getElementById('dateDesc').value = '';
        document.getElementById('dateNotes').value = '';
        document.getElementById('dateModalTitle').textContent = 'Agregar Fecha';
        document.getElementById('deleteDateBtn').style.display = 'none';
        document.getElementById('dateModal').classList.add('visible');
      };
    }
    
    const cancelBtn = document.getElementById('cancelDateBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => document.getElementById('dateModal').classList.remove('visible');
    }
    
    const backdrop = document.querySelector('#dateModal .modal__backdrop');
    if (backdrop) {
      backdrop.onclick = () => document.getElementById('dateModal').classList.remove('visible');
    }
    
    const form = document.getElementById('dateForm');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const editId = document.getElementById('dateEditId').value;
        const title = document.getElementById('dateTitle').value.trim();
        const date = document.getElementById('dateDesc').value.trim();
        const notes = document.getElementById('dateNotes').value.trim();
        
        // Validar campos requeridos
        if (!title) {
          Swal.fire({ title: 'Título requerido', text: 'Por favor ingresa un título', icon: 'error' });
          return;
        }
        if (!date) {
          Swal.fire({ title: 'Fecha requerida', text: 'Por favor ingresa una fecha', icon: 'error' });
          return;
        }
        
        if (editId) {
          const idx = importantDates.findIndex(d => d.id === editId);
          if (idx >= 0) importantDates[idx] = { ...importantDates[idx], title, date, notes };
        } else {
          importantDates.push({ id: generateId(), title, date, notes });
        }
        
        saveData();
        document.getElementById('dateModal').classList.remove('visible');
        render();
      };
    }
    
    const deleteBtn = document.getElementById('deleteDateBtn');
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        const editId = document.getElementById('dateEditId').value;
        Swal.fire({
          title: '¿Eliminar fecha?',
          text: 'Esta acción no se puede deshacer',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#ff3b30'
        }).then((result) => {
          if (result.isConfirmed && editId) {
            importantDates = importantDates.filter(d => d.id !== editId);
            saveData();
            document.getElementById('dateModal').classList.remove('visible');
            render();
          }
        });
      };
    }
    
    document.querySelectorAll('#datesList [data-edit]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const date = importantDates.find(d => d.id === btn.dataset.edit);
        if (date) {
          document.getElementById('dateEditId').value = date.id;
          document.getElementById('dateTitle').value = date.title;
          document.getElementById('dateDesc').value = date.date;
          document.getElementById('dateNotes').value = date.notes || '';
          document.getElementById('dateModalTitle').textContent = 'Editar Fecha';
          document.getElementById('deleteDateBtn').style.display = 'block';
          document.getElementById('dateModal').classList.add('visible');
        }
      };
    });
  }, 100);
}

function renderAgendaCalendario(container) {
  container.innerHTML = `
    <div class="card">
      <h3 class="card__title mb-2">Calendario</h3>
      <p class="text-muted">Vista de calendariocoming soon...</p>
      <p class="text-muted">Por ahora usa la vista Lista</p>
    </div>
    <div class="card">
      <button class="btn btn--primary btn--block" id="goToListaBtn">📋 Ver Lista de Fechas</button>
    </div>
  `;
  
  setTimeout(() => {
    const btn = document.getElementById('goToListaBtn');
    if (btn) {
      btn.onclick = () => {
        currentSection = 'agenda';
        agendaSubsection = 'lista';
        render();
      };
    }
  }, 100);
}

function switchToSubsection(subsection) {
  currentSubsection = subsection;
  
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
    // If container doesn't exist yet, re-render
    render();
    return;
  }
  
  // Clear content and render new subsection
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

function renderMenu() {
  // Update menu items active state
  document.querySelectorAll('.menu-item').forEach(item => {
    const section = item.dataset.section;
    item.classList.toggle('active', section === currentSection);
  });
  
  // Also update sub-nav items if in finanzas section
  document.querySelectorAll('.sub-nav__item').forEach(item => {
    item.classList.toggle('active', item.dataset.subsection === currentSubsection);
  });
  
  // Render bottom sub-nav based on current section
  const subNavBottom = document.getElementById('subNavBottom');
  if (subNavBottom) {
    if (currentSection === 'finanzas') {
      subNavBottom.innerHTML = `
        <button class="nav__item ${currentSubsection === 'billetera' ? 'active' : ''}" data-section="finanzas" data-subsection="billetera">
          <span>👛</span>
          <span>Billetera</span>
        </button>
        <button class="nav__item ${currentSubsection === 'fijos' ? 'active' : ''}" data-section="finanzas" data-subsection="fijos">
          <span>📅</span>
          <span>Fijos</span>
        </button>
        <button class="nav__item ${currentSubsection === 'deudas' ? 'active' : ''}" data-section="finanzas" data-subsection="deudas">
          <span>💳</span>
          <span>Deudas</span>
        </button>
        <button class="nav__item ${currentSubsection === 'historial' ? 'active' : ''}" data-section="finanzas" data-subsection="historial">
          <span>📦</span>
          <span>Historial</span>
        </button>
      `;
    } else if (currentSection === 'agenda') {
      subNavBottom.innerHTML = `
        <button class="nav__item ${agendaSubsection === 'calendario' ? 'active' : ''}" data-section="agenda" data-subsection="calendario">
          <span>📆</span>
          <span>Calendario</span>
        </button>
        <button class="nav__item ${agendaSubsection === 'lista' ? 'active' : ''}" data-section="agenda" data-subsection="lista">
          <span>📋</span>
          <span>Lista</span>
        </button>
      `;
    } else {
      subNavBottom.innerHTML = '';
    }
    
    // Add click handlers for bottom sub-nav
    subNavBottom.querySelectorAll('.nav__item').forEach(item => {
      item.onclick = () => {
        const section = item.dataset.section;
        const subsection = item.dataset.subsection;
        if (section === 'finanzas') {
          currentSection = 'finanzas';
          currentSubsection = subsection;
        } else if (section === 'agenda') {
          currentSection = 'agenda';
          agendaSubsection = subsection;
        }
        render();
      };
    });
  }
}

// Rename renderFinanzas to renderBilletera
function renderBilletera() {
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
        <span class="card__badge">${transactions.length}</span>
      </div>
      
      <div class="transaction-list" id="transactionList">
        ${transactions.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">📝</span>
            <p class="empty-state__text">Sin movimientos</p>
          </div>
        ` : transactions.slice(0, MAX_TRANSACTIONS).map(t => `
          <div class="transaction-item" data-id="${t.id}" data-edit="${t.id}">
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
  
  // Event listeners with setTimeout to ensure DOM is ready
  setTimeout(() => {
    document.getElementById('prevMonth').onclick = () => changeMonth(-1);
    document.getElementById('nextMonth').onclick = () => changeMonth(1);
    document.getElementById('typeGasto').onclick = () => handleTypeChange('gasto');
    document.getElementById('typeIngreso').onclick = () => handleTypeChange('ingreso');
    
    // Formatear input de monto con separador de miles

    
    // Separador de miles en inputs
    addThousandsSeparator(document.getElementById('amount'));
    addThousandsSeparator(document.getElementById('editTransactionAmount'));
    
    document.getElementById('transactionForm').onsubmit = handleFormSubmit;
    
    // Edit transaction button - open modal
    document.querySelectorAll('#transactionList [data-edit]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const transaction = transactions.find(t => t.id === btn.dataset.edit);
        if (transaction) {
          document.getElementById('editTransactionId').value = transaction.id;
          document.getElementById('editTransactionAmount').value = transaction.amount;
          document.getElementById('editTransactionDesc').value = transaction.description;
          
          // Set type buttons
          document.getElementById('editTypeGasto').classList.toggle('active', transaction.type === 'gasto');
          document.getElementById('editTypeIngreso').classList.toggle('active', transaction.type === 'ingreso');
          
          document.getElementById('editTransactionModal').classList.add('visible');
        }
      };
    });
    
    // Close modal handlers
    document.getElementById('cancelEditTransactionBtn').onclick = () => {
      document.getElementById('editTransactionModal').classList.remove('visible');
    };
    
    document.querySelector('#editTransactionModal .modal__backdrop').onclick = () => {
      document.getElementById('editTransactionModal').classList.remove('visible');
    };
    
    // Edit type buttons in modal
    document.getElementById('editTypeGasto').onclick = () => {
      document.getElementById('editTypeGasto').classList.add('active');
      document.getElementById('editTypeIngreso').classList.remove('active');
    };
    
    document.getElementById('editTypeIngreso').onclick = () => {
      document.getElementById('editTypeIngreso').classList.add('active');
      document.getElementById('editTypeGasto').classList.remove('active');
    };
    
    // Save edited transaction
    document.getElementById('editTransactionForm').onsubmit = (e) => {
      e.preventDefault();
      const id = document.getElementById('editTransactionId').value;
      const amount = parseNumber(document.getElementById('editTransactionAmount').value);
      const description = document.getElementById('editTransactionDesc').value.trim();
      
      // Validar monto
      if (!amount || amount <= 0) {
        Swal.fire({ title: 'Monto inválido', text: 'Por favor ingresa un monto válido', icon: 'error' });
        return;
      }
      if (!description) {
        Swal.fire({ title: 'Descripción requerida', text: 'Por favor ingresa una descripción', icon: 'error' });
        return;
      }
      
      const idx = transactions.findIndex(t => t.id === id);
      if (idx >= 0 && amount > 0 && description) {
        transactions[idx] = { ...transactions[idx], amount, description, type: document.getElementById('editTypeGasto').classList.contains('active') ? 'gasto' : 'ingreso' };
        saveData();
        document.getElementById('editTransactionModal').classList.remove('visible');
        render();
        Swal.fire({ title: '¡Guardado!', text: 'Movimiento actualizado', icon: 'success' });
      }
    };
    
    // Delete transaction from modal
    document.getElementById('deleteTransactionBtn').onclick = () => {
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
          document.getElementById('editTransactionModal').classList.remove('visible');
          render();
        }
      });
    };
    
    document.getElementById('archiveMonthBtn').onclick = () => {
      // Verificar si es fin de mes real
      const now = new Date();
      const [year, month] = currentMonth.split('-').map(Number);
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const isEndOfMonth = now.getDate() >= lastDayOfMonth - 3; // Permitir 3 días antes del fin
      
      // Check if already archived
      if (history[currentMonth]) {
        Swal.fire({
          title: '¡Ya archivado!',
          text: 'Este mes ya está en el historial',
          icon: 'warning'
        });
        return;
      }
      
      // Check if there are transactions to archive
      if (transactions.length === 0) {
        Swal.fire({
          title: 'Sin movimientos',
          text: 'No hay movimientos para archivar',
          icon: 'info'
        });
        return;
      }
      
      // Validar que sea fin de mes
      if (!isEndOfMonth) {
        Swal.fire({
          title: 'Aún no puedes archivar',
          text: `Solo puedes archivar el mes los últimos días del mes (desde el día ${lastDayOfMonth - 3})`,
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
  
  // Ordenar gastos fijos de mayor a menor monto
  const sortedExpenses = [...fixedExpenses].sort((a, b) => b.amount - a.amount);
  
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
        ${sortedExpenses.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">📅</span>
            <p class="empty-state__text">Sin gastos fijos</p>
            <p class="empty-state__hint">Agrega Spotify, bencina, celular, etc.</p>
          </div>
        ` : sortedExpenses.map(e => `
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
  
  // Event listeners - usar setTimeout para asegurar DOM actualizado
  setTimeout(() => {
    // Separador de miles en inputs
    addThousandsSeparator(document.getElementById('fixedAmount'));
    
    const addBtn = document.getElementById('addFixedBtn');
    const cancelBtn = document.getElementById('cancelFixedBtn');
    const backdrop = document.querySelector('#fixedModal .modal__backdrop');
    const form = document.getElementById('fixedForm');
    const deleteBtn = document.getElementById('deleteFixedBtn');
    const modalTitle = document.getElementById('fixedModalTitle');
    
    // Formatear input con separador de miles

    
    if (addBtn) {
      addBtn.onclick = () => {
        // Reset form for new entry
        document.getElementById('fixedEditId').value = '';
        document.getElementById('fixedName').value = '';
        document.getElementById('fixedAmount').value = '';
        document.getElementById('fixedCategory').value = '';
        document.getElementById('fixedDueDate').value = '';
        modalTitle.textContent = 'Agregar Gasto Fijo';
        deleteBtn.style.display = 'none';
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
        const editId = document.getElementById('fixedEditId').value;
        const name = document.getElementById('fixedName').value.trim();
        const amount = parseNumber(document.getElementById('fixedAmount').value);
        
        // Validar nombre
        if (!name) {
          Swal.fire({ title: 'Nombre requerido', text: 'Por favor ingresa un nombre', icon: 'error' });
          return;
        }
        
        // Validar monto
        if (!amount || amount <= 0) {
          Swal.fire({
            title: 'Monto inválido',
            text: 'Por favor ingresa un monto válido',
            icon: 'error'
          });
          return;
        }
        
        const category = document.getElementById('fixedCategory').value.trim() || 'General';
        const dueDate = document.getElementById('fixedDueDate').value.trim();
        
        if (editId) {
          // Update existing
          const idx = fixedExpenses.findIndex(f => f.id === editId);
          if (idx >= 0) {
            fixedExpenses[idx] = { ...fixedExpenses[idx], name, amount, category, dueDate };
          }
        } else {
          // Add new
          fixedExpenses.push({ id: generateId(), name, amount, category, dueDate });
        }
        
        saveData();
        document.getElementById('fixedModal').classList.remove('visible');
        render();
      };
    }
    
    // Delete button in modal
    if (deleteBtn) {
      deleteBtn.onclick = () => {
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
            fixedExpenses = fixedExpenses.filter(f => f.id !== editId);
            saveData();
            document.getElementById('fixedModal').classList.remove('visible');
            render();
          }
        });
      };
    }
    
    // Edit buttons - open modal for editing
    document.querySelectorAll('#fijosList [data-edit]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const expense = fixedExpenses.find(f => f.id === btn.dataset.edit);
        if (expense) {
          document.getElementById('fixedEditId').value = expense.id;
          document.getElementById('fixedName').value = expense.name;
          document.getElementById('fixedAmount').value = expense.amount;
          document.getElementById('fixedCategory').value = expense.category || '';
          document.getElementById('fixedDueDate').value = expense.dueDate || '';
          modalTitle.textContent = 'Editar Gasto Fijo';
          deleteBtn.style.display = 'block';
          document.getElementById('fixedModal').classList.add('visible');
        }
      };
    });
  }, 100);
}

// ===== DEUDAS SECTION =====

function renderDeudas() {
  const main = document.querySelector('.main');
  const totalDebt = calculateDebtsTotal();
  const monthlyInstallments = calculateDebtsMonthly();
  
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
  
  // Función para calcular progreso (0 a 1)
  const getProgress = (d) => {
    return d.paidInstallments / d.totalInstallments;
  };
  
  // Función para ordenar por progreso (más avanzadas primero)
  const sortByProgress = (a, b) => {
    return getProgress(b) - getProgress(a);
  };
  
  // Build cards HTML
  let cardsHtml = '';
  
  // Calcular total por tarjeta para ordenar
  const cardTotals = creditCards.map(card => ({
    id: card.id,
    name: card.name,
    total: debtsByCard[card.id] ? debtsByCard[card.id].reduce((sum, d) => sum + d.totalAmount, 0) : 0
  })).sort((a, b) => b.total - a.total); // Ordenar de mayor a menor
  
  // Card: Sin tarjeta (al final) - ordenado por progreso
  if (debtsByCard['none'] && debtsByCard['none'].length > 0) {
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
  
  // Card: credit cards (ordenados por deuda mayor)
  cardTotals.forEach(cardData => {
    if (debtsByCard[cardData.id] && debtsByCard[cardData.id].length > 0) {
      const sortedDebts = [...debtsByCard[cardData.id]].sort(sortByProgress);
      cardsHtml += `
        <div class="debt-group">
          <div class="debt-group__header">
            <span>💳 ${escapeHtml(cardData.name)}</span>
            <span class="debt-group__total">${formatCurrency(cardData.total)}</span>
          </div>
          <div class="transaction-list">
            ${sortedDebts.map(d => buildDebtItemHtml(d)).join('')}
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
            <input type="text" id="debtTotal" class="form-input" placeholder="0" inputmode="numeric">
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
            <input type="text" id="editDebtTotal" class="form-input" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtInstallments">Total de Cuotas</label>
            <input type="number" id="editDebtInstallments" class="form-input" required inputmode="numeric">
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
  
  // Event listeners
  setTimeout(() => {
    // Add debt button
    document.getElementById('addDebtBtn').onclick = () => {
      document.getElementById('debtModal').classList.add('visible');
    };
    
    // Formatear inputs con separador de miles
    addThousandsSeparator(document.getElementById('debtTotal'));
    addThousandsSeparator(document.getElementById('editDebtTotal'));
    
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
    
    document.getElementById('deleteDebtBtn').onclick = () => {
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
          debts = debts.filter(d => d.id !== debtId);
          saveData();
          document.getElementById('editDebtModal').classList.remove('visible');
          render();
        }
      });
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
      const totalAmount = parseNumber(document.getElementById('debtTotal').value);
      const totalInstallments = parseNumber(document.getElementById('debtInstallments').value);
      
      // Validar producto
      if (!product) {
        Swal.fire({ title: 'Producto requerido', text: 'Por favor ingresa un producto', icon: 'error' });
        return;
      }
      
      // Validaciones
      if (!totalAmount || totalAmount <= 0) {
        Swal.fire({ title: 'Monto inválido', text: 'Ingresa un monto válido', icon: 'error' });
        return;
      }
      if (!totalInstallments || totalInstallments < 1) {
        Swal.fire({ title: 'Cuotas inválidas', text: 'Ingresa al menos 1 cuota', icon: 'error' });
        return;
      }
      
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
      if (!name) {
        Swal.fire({ title: 'Nombre requerido', text: 'Por favor ingresa el nombre del banco', icon: 'error' });
        return;
      }
      creditCards.push({ id: generateId(), name });
      saveData();
      document.getElementById('newCardName').value = '';
      render();
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
    
    // Touch/click on debt item - show edit modal
    document.querySelectorAll('.debt-group .transaction-item').forEach(item => {
      item.onclick = () => {
        const debtId = item.dataset.edit;
        const debt = debts.find(d => d.id === debtId);
        if (debt) {
          document.getElementById('editDebtId').value = debt.id;
          document.getElementById('editDebtCard').value = debt.cardId || 'none';
          document.getElementById('editDebtProduct').value = debt.product;
          document.getElementById('editDebtTotal').value = debt.totalAmount;
          document.getElementById('editDebtInstallments').value = debt.totalInstallments;
          document.getElementById('editDebtPaidInstallments').value = debt.paidInstallments || 0;
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
        const product = document.getElementById('editDebtProduct').value.trim();
        const totalAmount = parseNumber(document.getElementById('editDebtTotal').value);
        const totalInstallments = parseNumber(document.getElementById('editDebtInstallments').value);
        const paidInstallments = parseNumber(document.getElementById('editDebtPaidInstallments').value);
        
        // Validar producto
        if (!product) {
          Swal.fire({ title: 'Producto requerido', text: 'Por favor ingresa un producto', icon: 'error' });
          return;
        }
        
        // Validaciones
        if (!totalAmount || totalAmount <= 0) {
          Swal.fire({ title: 'Monto inválido', text: 'Ingresa un monto válido', icon: 'error' });
          return;
        }
        if (!totalInstallments || totalInstallments < 1) {
          Swal.fire({ title: 'Cuotas inválidas', text: 'Ingresa al menos 1 cuota', icon: 'error' });
          return;
        }
        if (paidInstallments < 0 || paidInstallments > totalInstallments) {
          Swal.fire({ title: 'Cuotas pagadas inválidas', text: 'Las cuotas pagadas deben estar entre 0 y el total de cuotas', icon: 'error' });
          return;
        }
        
        debts[idx] = {
          ...debts[idx],
          cardId: document.getElementById('editDebtCard').value,
          product: product,
          totalAmount,
          totalInstallments,
          paidInstallments,
          installmentAmount: Math.round(totalAmount / totalInstallments)
        };
        saveData();
        document.getElementById('editDebtModal').classList.remove('visible');
        render();
      }
    };
    
    // Delete debt - long press
    let debtLongPressTimer;
    document.querySelectorAll('.debt-group .transaction-item').forEach(item => {
      item.oncontextmenu = (e) => {
        e.preventDefault();
        Swal.fire({
          title: '¿Eliminar deuda?',
          text: 'Esta acción no se puede deshacer',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#ff3b30'
        }).then((result) => {
          if (result.isConfirmed) {
            debts = debts.filter(d => d.id !== item.dataset.delete);
            saveData();
            render();
          }
        });
      };
    });
  }, 100);
}

// Helper function to build debt item HTML
function buildDebtItemHtml(d) {
  const isComplete = (d.paidInstallments || 0) >= d.totalInstallments;
  return `
    <div class="transaction-item ${isComplete ? 'transaction-item--complete' : ''}" data-id="${d.id}" data-edit="${d.id}" data-delete="${d.id}">
      <div class="transaction-item__icon transaction-item__icon--gasto">💳</div>
      <div class="transaction-item__content">
        <div class="transaction-item__desc">${escapeHtml(d.product)}</div>
        <div class="transaction-item__date ${isComplete ? 'text-success' : ''}">${d.paidInstallments || 0}/${d.totalInstallments} cuotas (${formatCurrency(d.installmentAmount)})${isComplete ? ' ✓ Pagado' : ''}</div>
      </div>
      <div class="transaction-item__amount transaction-item__amount--gasto">${formatCurrency(d.totalAmount)}</div>
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
  
  const amount = parseNumber(document.getElementById('amount').value);
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
  
  // Hamburger menu toggle
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('hamburgerMenu');
  const overlay = document.getElementById('menuOverlay');
  
  if (menuBtn && menu && overlay) {
    menuBtn.onclick = () => {
      menu.classList.add('visible');
      overlay.classList.add('visible');
    };
    
    overlay.onclick = () => {
      menu.classList.remove('visible');
      overlay.classList.remove('visible');
    };
  }
  
  // Menu item clicks
  document.querySelectorAll('.menu-item').forEach(item => {
    item.onclick = () => {
      currentSection = item.dataset.section;
      document.getElementById('hamburgerMenu').classList.remove('visible');
      document.getElementById('menuOverlay').classList.remove('visible');
      render();
    };
  });
  
  console.log('App inicializada');
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

// ===== AGENDA SECTION =====

function renderAgenda() {
  const main = document.querySelector('.main');
  
  main.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Fechas Importantes</h2>
      <button class="btn btn--sm btn--primary" id="addDateBtn">➕ Agregar</button>
    </div>
    
    <div class="card">
      <div class="transaction-list" id="datesList">
        ${importantDates.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">📅</span>
            <p class="empty-state__text">Sin fechas importantes</p>
            <p class="empty-state__hint">Agrega cumpleaños, pagos, etc.</p>
          </div>
        ` : importantDates.map(d => `
          <div class="transaction-item" data-id="${d.id}" data-edit="${d.id}">
            <div class="transaction-item__icon transaction-item__icon--gasto">🎉</div>
            <div class="transaction-item__content">
              <div class="transaction-item__desc">${escapeHtml(d.title)}</div>
              <div class="transaction-item__date">${d.date} ${d.notes ? '- ' + d.notes : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Modal Agregar/Editar Fecha -->
    <div class="modal" id="dateModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title" id="dateModalTitle">Agregar Fecha</h3>
        <form id="dateForm">
          <input type="hidden" id="dateEditId">
          <div class="form-group">
            <label class="form-label" for="dateTitle">Título</label>
            <input type="text" id="dateTitle" class="form-input" placeholder="Ej: Cumpleaños Juan" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="dateDesc">Fecha</label>
            <input type="text" id="dateDesc" class="form-input" placeholder="Ej: 15 de Marzo" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="dateNotes">Notas (opcional)</label>
            <input type="text" id="dateNotes" class="form-input" placeholder="Ej: Regalo $20.000">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--danger" id="deleteDateBtn" style="display:none;">🗑️ Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelDateBtn">Cancelar</button>
        </form>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const addBtn = document.getElementById('addDateBtn');
    const form = document.getElementById('dateForm');
    const cancelBtn = document.getElementById('cancelDateBtn');
    const deleteBtn = document.getElementById('deleteDateBtn');
    const modalTitle = document.getElementById('dateModalTitle');
    
    addBtn.onclick = () => {
      document.getElementById('dateEditId').value = '';
      document.getElementById('dateTitle').value = '';
      document.getElementById('dateDesc').value = '';
      document.getElementById('dateNotes').value = '';
      modalTitle.textContent = 'Agregar Fecha';
      deleteBtn.style.display = 'none';
      document.getElementById('dateModal').classList.add('visible');
    };
    
    cancelBtn.onclick = () => document.getElementById('dateModal').classList.remove('visible');
    document.querySelector('#dateModal .modal__backdrop').onclick = () => document.getElementById('dateModal').classList.remove('visible');
    
    form.onsubmit = (e) => {
      e.preventDefault();
      const editId = document.getElementById('dateEditId').value;
      const title = document.getElementById('dateTitle').value.trim();
      const date = document.getElementById('dateDesc').value.trim();
      const notes = document.getElementById('dateNotes').value.trim();
      
      // Validar campos requeridos
      if (!title) {
        Swal.fire({ title: 'Título requerido', text: 'Por favor ingresa un título', icon: 'error' });
        return;
      }
      if (!date) {
        Swal.fire({ title: 'Fecha requerida', text: 'Por favor ingresa una fecha', icon: 'error' });
        return;
      }
      
      if (editId) {
        const idx = importantDates.findIndex(d => d.id === editId);
        if (idx >= 0) importantDates[idx] = { ...importantDates[idx], title, date, notes };
      } else {
        importantDates.push({ id: generateId(), title, date, notes });
      }
      
      saveData();
      document.getElementById('dateModal').classList.remove('visible');
      render();
    };
    
    deleteBtn.onclick = () => {
      const editId = document.getElementById('dateEditId').value;
      Swal.fire({
        title: '¿Eliminar fecha?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ff3b30'
      }).then((result) => {
        if (result.isConfirmed && editId) {
          importantDates = importantDates.filter(d => d.id !== editId);
          saveData();
          document.getElementById('dateModal').classList.remove('visible');
          render();
        }
      });
    };
    
    document.querySelectorAll('#datesList [data-edit]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const date = importantDates.find(d => d.id === btn.dataset.edit);
        if (date) {
          document.getElementById('dateEditId').value = date.id;
          document.getElementById('dateTitle').value = date.title;
          document.getElementById('dateDesc').value = date.date;
          document.getElementById('dateNotes').value = date.notes || '';
          modalTitle.textContent = 'Editar Fecha';
          deleteBtn.style.display = 'block';
          document.getElementById('dateModal').classList.add('visible');
        }
      };
    });
  }, 100);
}

// ===== AJUSTES SECTION =====

function renderAjustes() {
  const main = document.querySelector('.main');
  
  main.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Ajustes</h2>
    </div>
    
    <div class="card">
      <div class="action-list">
        <div class="action-item" id="exportDataBtn">
          <span class="action-item__icon">📤</span>
          <span class="action-item__text">Exportar Datos</span>
          <span class="action-item__arrow">→</span>
        </div>
        <div class="action-item" id="importDataBtn">
          <span class="action-item__icon">📥</span>
          <span class="action-item__text">Importar Datos</span>
          <span class="action-item__arrow">→</span>
        </div>
        <div class="action-item" id="clearAllDataBtn" style="color: var(--danger);">
          <span class="action-item__icon">🗑️</span>
          <span class="action-item__text">Borrar Todos los Datos</span>
          <span class="action-item__arrow">→</span>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h3 class="card__title mb-2">Información</h3>
      <p class="text-muted mb-1" style="font-weight: 600; color: var(--primary);">App Control Finanzas</p>
      <p class="text-muted mb-1">Versión 1.0.0</p>
      <p class="text-muted" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--gray-200);">
        Creado por Daniel CT
      </p>
    </div>
  `;
  
  setTimeout(() => {
    document.getElementById('exportDataBtn').onclick = () => {
      const data = JSON.stringify({ transactions, fixedExpenses, debts, creditCards, history, importantDates }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mis-finanzas-backup.json';
      a.click();
      URL.revokeObjectURL(url);
      Swal.fire({ title: '¡Exportado!', text: 'Datos exportados correctamente', icon: 'success' });
    };
    
    document.getElementById('importDataBtn').onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.transactions) transactions = data.transactions;
            if (data.fixedExpenses) fixedExpenses = data.fixedExpenses;
            if (data.debts) debts = data.debts;
            if (data.creditCards) creditCards = data.creditCards;
            if (data.history) history = data.history;
            if (data.importantDates) importantDates = data.importantDates;
            saveData();
            render();
            Swal.fire({ title: '¡Importado!', text: 'Datos importados correctamente', icon: 'success' });
          } catch (err) {
            Swal.fire({ title: 'Error', text: 'Archivo inválido', icon: 'error' });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };
    
    document.getElementById('clearAllDataBtn').onclick = () => {
      clearAllData();
    };
  }, 100);
}

document.addEventListener('DOMContentLoaded', init);
