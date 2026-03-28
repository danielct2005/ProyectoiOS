/**
 * ===== MÓDULO DE AHORROS =====
 * Cuentas de ahorro y metas de ahorro
 */

import { 
  appState, 
  saveData,
  addSavingsAccount,
  updateSavingsAccount,
  deleteSavingsAccount,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  contributeToGoal,
  addToAccount,
  withdrawFromAccount,
  getTotalSavings,
  getActiveGoals,
  getCompletedGoals
} from './storage.js';
import { 
  formatCurrency, 
  parseNumber, 
  escapeHtml,
  addThousandsSeparator,
  generateId 
} from './utils.js';

// ==================== COLORS FOR ACCOUNTS ====================

const accountColors = [
  '#007aff', '#34c759', '#ff9500', '#ff3b30', 
  '#5856d6', '#af52de', '#ff2d55', '#00c7be'
];

// ==================== MAIN RENDER ====================

export function renderAhorrosContainer() {
  const main = document.querySelector('.main');
  main.innerHTML = renderAhorrosHTML();
  setupAhorrosEvents();
}

function renderAhorrosHTML() {
  const totalSavings = getTotalSavings();
  const activeGoals = getActiveGoals();
  const completedGoals = getCompletedGoals();
  
  return `
    <div class="section-header">
      <h2 class="section-title">🐷 Ahorros</h2>
    </div>
    
    <!-- Total Savings Card -->
    <div class="balance-card balance-card--green">
      <div class="balance-card__label">Total Ahorrado</div>
      <div class="balance-card__amount">${formatCurrency(totalSavings)}</div>
      <div class="balance-card__info">
        <span>🏦 ${appState.savingsAccounts.length} cuentas</span>
        <span>🎯 ${activeGoals.length} metas</span>
      </div>
    </div>
    
    <!-- Savings Accounts -->
    <div class="card">
      <div class="card__header">
        <h3 class="card__title">🏦 Mis Cuentas</h3>
        <button class="btn btn--sm btn--primary" id="addAccountBtn">➕</button>
      </div>
      
      <div class="accounts-list" id="accountsList">
        ${appState.savingsAccounts.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">🏦</span>
            <p class="empty-state__text">Sin cuentas de ahorro</p>
            <p class="empty-state__hint">Agrega tus cuentas para controlar</p>
          </div>
        ` : appState.savingsAccounts.map((account, index) => `
          <div class="account-item" data-id="${account.id}">
            <div class="account-item__color" style="background: ${account.color}"></div>
            <div class="account-item__content">
              <span class="account-item__name">${escapeHtml(account.name)}</span>
              <span class="account-item__balance">${formatCurrency(account.balance)}</span>
            </div>
            <div class="account-item__actions">
              <button class="btn-action" data-action="add" data-id="${account.id}" title="Agregar">➕</button>
              <button class="btn-action" data-action="withdraw" data-id="${account.id}" title="Retirar">➖</button>
              <button class="btn-action" data-action="edit" data-id="${account.id}" title="Editar">✏️</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Active Goals -->
    <div class="card">
      <div class="card__header">
        <h3 class="card__title">🎯 Metas Activas</h3>
        <button class="btn btn--sm btn--primary" id="addGoalBtn">➕</button>
      </div>
      
      <div class="goals-list" id="goalsList">
        ${activeGoals.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state__icon">🎯</span>
            <p class="empty-state__text">Sin metas activas</p>
            <p class="empty-state__hint">Crea una meta para motivarte</p>
          </div>
        ` : activeGoals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          return `
            <div class="goal-item" data-id="${goal.id}">
              <div class="goal-item__header">
                <span class="goal-item__icon">${goal.icon}</span>
                <span class="goal-item__name">${escapeHtml(goal.name)}</span>
                <button class="btn-action" data-action="contribute" data-id="${goal.id}" title="Aportar">💰</button>
              </div>
              <div class="goal-item__progress">
                <div class="progress-bar">
                  <div class="progress-bar__fill" style="width: ${progress}%"></div>
                </div>
                <div class="goal-item__amounts">
                  <span>${formatCurrency(goal.currentAmount)}</span>
                  <span>${formatCurrency(goal.targetAmount)}</span>
                </div>
              </div>
              <div class="goal-item__percentage">${progress.toFixed(1)}%</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    
    <!-- Completed Goals -->
    ${completedGoals.length > 0 ? `
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">✅ Metas Completadas</h3>
          <span class="card__badge">${completedGoals.length}</span>
        </div>
        <div class="goals-list">
          ${completedGoals.map(goal => `
            <div class="goal-item goal-item--completed" data-id="${goal.id}" data-completed="true">
              <div class="goal-item__header">
                <span class="goal-item__icon">${goal.icon}</span>
                <span class="goal-item__name">${escapeHtml(goal.name)}</span>
                <span class="goal-item__completed-badge">✓</span>
                <button class="btn-action btn-action--delete" data-action="deleteCompleted" data-id="${goal.id}" title="Eliminar">🗑️</button>
              </div>
              <div class="goal-item__amounts">
                <span>${formatCurrency(goal.targetAmount)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <!-- Modal: Add/Edit Account -->
    <div class="modal" id="accountModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title" id="accountModalTitle">Agregar Cuenta</h3>
        <form id="accountForm">
          <input type="hidden" id="accountEditId">
          <div class="form-group">
            <label class="form-label" for="accountName">Nombre</label>
            <input type="text" id="accountName" class="form-input" placeholder="Ej: Banco Estado" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="accountBalance">Saldo Inicial</label>
            <input type="text" id="accountBalance" class="form-input" placeholder="0" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <div class="color-picker" id="colorPicker">
              ${accountColors.map((color, i) => `
                <button type="button" class="color-option ${i === 0 ? 'active' : ''}" data-color="${color}" style="background: ${color}"></button>
              `).join('')}
            </div>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--danger" id="deleteAccountBtn" style="display:none;">🗑️ Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelAccountBtn">Cancelar</button>
        </form>
      </div>
    </div>
    
    <!-- Modal: Add/Edit Goal -->
    <div class="modal" id="goalModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title" id="goalModalTitle">Agregar Meta</h3>
        <form id="goalForm">
          <input type="hidden" id="goalEditId">
          <div class="form-group">
            <label class="form-label" for="goalName">Nombre de la Meta</label>
            <input type="text" id="goalName" class="form-input" placeholder="Ej: Viaje a México" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="goalTarget">Monto Objetivo</label>
            <input type="text" id="goalTarget" class="form-input" placeholder="0" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label" for="goalIcon">Icono</label>
            <div class="icon-picker" id="iconPicker">
              ${['🎯', '✈️', '🚗', '🏠', '💻', '📱', '💍', '🎓', '🏥', '🎁'].map(icon => `
                <button type="button" class="icon-option" data-icon="${icon}">${icon}</button>
              `).join('')}
            </div>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--danger" id="deleteGoalBtn" style="display:none;">🗑️ Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelGoalBtn">Cancelar</button>
        </form>
      </div>
    </div>
    
    <!-- Modal: Add/Withdraw from Account -->
    <div class="modal" id="transactionModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title" id="transactionModalTitle">Agregar Dinero</h3>
        <form id="transactionForm">
          <input type="hidden" id="transactionAccountId">
          <input type="hidden" id="transactionType" value="add">
          <div class="form-group">
            <label class="form-label" for="transactionAmount">Monto</label>
            <input type="text" id="transactionAmount" class="form-input" placeholder="0" inputmode="numeric">
          </div>
          <button type="submit" class="btn btn--primary btn--block">Confirmar</button>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelTransactionBtn">Cancelar</button>
        </form>
      </div>
    </div>
    
    <!-- Modal: Contribute to Goal -->
    <div class="modal" id="contributeModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Aportar a Meta</h3>
        <form id="contributeForm">
          <input type="hidden" id="contributeGoalId">
          <div class="form-group">
            <label class="form-label" for="contributeAmount">Monto a ahorrar</label>
            <input type="text" id="contributeAmount" class="form-input" placeholder="0" inputmode="numeric">
          </div>
          <button type="submit" class="btn btn--primary btn--block">Aportar</button>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelContributeBtn">Cancelar</button>
        </form>
      </div>
    </div>
  `;
}

// ==================== EVENT HANDLERS ====================

function setupAhorrosEvents() {
  setTimeout(() => {
    // Add Account Button
    document.getElementById('addAccountBtn')?.addEventListener('click', () => {
      openAccountModal();
    });
    
    // Add Goal Button
    document.getElementById('addGoalBtn')?.addEventListener('click', () => {
      openGoalModal();
    });
    
    // Account actions
    document.querySelectorAll('.account-item .btn-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        
        if (action === 'edit') {
          const account = appState.savingsAccounts.find(a => a.id === id);
          openAccountModal(account);
        } else if (action === 'add') {
          openTransactionModal(id, 'add');
        } else if (action === 'withdraw') {
          openTransactionModal(id, 'withdraw');
        }
      });
    });
    
    // Goal actions (active goals - contribute)
    document.querySelectorAll('.goal-item:not(.goal-item--completed) .btn-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        openContributeModal(id);
      });
    });
    
    // Delete completed goals
    document.querySelectorAll('[data-action="deleteCompleted"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const goal = appState.savingsGoals.find(g => g.id === id);
        
        Swal.fire({
          title: '¿Eliminar meta completada?',
          text: `"${goal?.name}" se eliminará permanentemente`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#ff3b30'
        }).then(result => {
          if (result.isConfirmed) {
            deleteSavingsGoal(id);
            renderAhorrosContainer();
          }
        });
      });
    });
    
    // Account modal
    setupAccountModal();
    
    // Goal modal
    setupGoalModal();
    
    // Transaction modal
    setupTransactionModal();
    
    // Contribute modal
    setupContributeModal();
  }, 100);
}

// ==================== ACCOUNT MODAL ====================

let selectedColor = accountColors[0];

function openAccountModal(account = null) {
  const modal = document.getElementById('accountModal');
  const title = document.getElementById('accountModalTitle');
  const form = document.getElementById('accountForm');
  const deleteBtn = document.getElementById('deleteAccountBtn');
  
  if (account) {
    title.textContent = 'Editar Cuenta';
    document.getElementById('accountEditId').value = account.id;
    document.getElementById('accountName').value = account.name;
    document.getElementById('accountBalance').value = account.balance;
    selectedColor = account.color;
    deleteBtn.style.display = 'block';
  } else {
    title.textContent = 'Agregar Cuenta';
    form.reset();
    document.getElementById('accountEditId').value = '';
    selectedColor = accountColors[0];
    deleteBtn.style.display = 'none';
  }
  
  updateColorPicker();
  modal?.classList.add('visible');
}

function setupAccountModal() {
  const modal = document.getElementById('accountModal');
  const form = document.getElementById('accountForm');
  const cancelBtn = document.getElementById('cancelAccountBtn');
  const deleteBtn = document.getElementById('deleteAccountBtn');
  
  addThousandsSeparator(document.getElementById('accountBalance'));
  
  // Color picker
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      updateColorPicker();
    });
  });
  
  // Cancel
  cancelBtn?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.querySelector('.modal__backdrop')?.addEventListener('click', () => modal.classList.remove('visible'));
  
  // Submit
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('accountEditId').value;
    const name = document.getElementById('accountName').value.trim();
    const balance = parseNumber(document.getElementById('accountBalance').value);
    
    if (!name) {
      Swal.fire({ title: 'Nombre requerido', icon: 'error' });
      return;
    }
    
    if (editId) {
      updateSavingsAccount(editId, name, balance, selectedColor);
    } else {
      addSavingsAccount(name, balance, selectedColor);
    }
    
    modal?.classList.remove('visible');
    renderAhorrosContainer();
  });
  
  // Delete
  deleteBtn?.addEventListener('click', () => {
    const editId = document.getElementById('accountEditId').value;
    Swal.fire({
      title: '¿Eliminar cuenta?',
      text: 'El saldo se perderá',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#ff3b30'
    }).then(result => {
      if (result.isConfirmed) {
        deleteSavingsAccount(editId);
        modal?.classList.remove('visible');
        renderAhorrosContainer();
      }
    });
  });
}

function updateColorPicker() {
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === selectedColor);
  });
}

// ==================== GOAL MODAL ====================

let selectedIcon = '🎯';

function openGoalModal(goal = null) {
  const modal = document.getElementById('goalModal');
  const title = document.getElementById('goalModalTitle');
  const form = document.getElementById('goalForm');
  const deleteBtn = document.getElementById('deleteGoalBtn');
  
  if (goal) {
    title.textContent = 'Editar Meta';
    document.getElementById('goalEditId').value = goal.id;
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalTarget').value = goal.targetAmount;
    selectedIcon = goal.icon;
    deleteBtn.style.display = 'block';
  } else {
    title.textContent = 'Agregar Meta';
    form.reset();
    document.getElementById('goalEditId').value = '';
    selectedIcon = '🎯';
    deleteBtn.style.display = 'none';
  }
  
  updateIconPicker();
  modal?.classList.add('visible');
}

function setupGoalModal() {
  const modal = document.getElementById('goalModal');
  const form = document.getElementById('goalForm');
  const cancelBtn = document.getElementById('cancelGoalBtn');
  const deleteBtn = document.getElementById('deleteGoalBtn');
  
  addThousandsSeparator(document.getElementById('goalTarget'));
  
  // Icon picker
  document.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedIcon = btn.dataset.icon;
      updateIconPicker();
    });
  });
  
  // Cancel
  cancelBtn?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.querySelector('.modal__backdrop')?.addEventListener('click', () => modal.classList.remove('visible'));
  
  // Submit
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('goalEditId').value;
    const name = document.getElementById('goalName').value.trim();
    const targetAmount = parseNumber(document.getElementById('goalTarget').value);
    
    if (!name) {
      Swal.fire({ title: 'Nombre requerido', icon: 'error' });
      return;
    }
    
    if (!targetAmount || targetAmount <= 0) {
      Swal.fire({ title: 'Monto inválido', icon: 'error' });
      return;
    }
    
    if (editId) {
      updateSavingsGoal(editId, name, targetAmount, selectedIcon);
    } else {
      addSavingsGoal(name, targetAmount, selectedIcon);
    }
    
    modal?.classList.remove('visible');
    renderAhorrosContainer();
  });
  
  // Delete
  deleteBtn?.addEventListener('click', () => {
    const editId = document.getElementById('goalEditId').value;
    Swal.fire({
      title: '¿Eliminar meta?',
      text: 'Se perderá el progreso',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#ff3b30'
    }).then(result => {
      if (result.isConfirmed) {
        deleteSavingsGoal(editId);
        modal?.classList.remove('visible');
        renderAhorrosContainer();
      }
    });
  });
}

function updateIconPicker() {
  document.querySelectorAll('.icon-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.icon === selectedIcon);
  });
}

// ==================== TRANSACTION MODAL ====================

function openTransactionModal(accountId, type) {
  const modal = document.getElementById('transactionModal');
  const title = document.getElementById('transactionModalTitle');
  
  document.getElementById('transactionAccountId').value = accountId;
  document.getElementById('transactionType').value = type;
  
  title.textContent = type === 'add' ? 'Agregar Dinero' : 'Retirar Dinero';
  
  const account = appState.savingsAccounts.find(a => a.id === accountId);
  title.innerHTML = `${type === 'add' ? 'Agregar' : 'Retirar'} a <strong>${account?.name}</strong>`;
  
  document.getElementById('transactionAmount').value = '';
  modal?.classList.add('visible');
}

function setupTransactionModal() {
  const modal = document.getElementById('transactionModal');
  const form = document.getElementById('transactionForm');
  const cancelBtn = document.getElementById('cancelTransactionBtn');
  
  addThousandsSeparator(document.getElementById('transactionAmount'));
  
  cancelBtn?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.querySelector('.modal__backdrop')?.addEventListener('click', () => modal.classList.remove('visible'));
  
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const accountId = document.getElementById('transactionAccountId').value;
    const type = document.getElementById('transactionType').value;
    const amount = parseNumber(document.getElementById('transactionAmount').value);
    
    if (!amount || amount <= 0) {
      Swal.fire({ title: 'Monto inválido', icon: 'error' });
      return;
    }
    
    let success;
    if (type === 'add') {
      success = addToAccount(accountId, amount);
    } else {
      success = withdrawFromAccount(accountId, amount);
    }
    
    if (success) {
      modal?.classList.remove('visible');
      renderAhorrosContainer();
    } else {
      Swal.fire({ 
        title: 'Saldo insuficiente', 
        text: 'No tienes suficiente saldo en esta cuenta',
        icon: 'error' 
      });
    }
  });
}

// ==================== CONTRIBUTE MODAL ====================

function openContributeModal(goalId) {
  const modal = document.getElementById('contributeModal');
  const goal = appState.savingsGoals.find(g => g.id === goalId);
  
  document.getElementById('contributeGoalId').value = goalId;
  document.getElementById('contributeAmount').value = '';
  
  const title = document.querySelector('#contributeModal .modal__title');
  title.innerHTML = `Ahorrar para <strong>${goal?.name}</strong>`;
  
  modal?.classList.add('visible');
}

function setupContributeModal() {
  const modal = document.getElementById('contributeModal');
  const form = document.getElementById('contributeForm');
  const cancelBtn = document.getElementById('cancelContributeBtn');
  
  addThousandsSeparator(document.getElementById('contributeAmount'));
  
  cancelBtn?.addEventListener('click', () => modal?.classList.remove('visible'));
  modal?.querySelector('.modal__backdrop')?.addEventListener('click', () => modal.classList.remove('visible'));
  
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const goalId = document.getElementById('contributeGoalId').value;
    const amount = parseNumber(document.getElementById('contributeAmount').value);
    
    if (!amount || amount <= 0) {
      Swal.fire({ title: 'Monto inválido', icon: 'error' });
      return;
    }
    
    contributeToGoal(goalId, amount);
    modal?.classList.remove('visible');
    renderAhorrosContainer();
  });
}

// ==================== EXPORTS ====================

export function getSectionTitle() {
  return 'Ahorros';
}
