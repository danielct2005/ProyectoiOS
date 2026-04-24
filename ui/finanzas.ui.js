/**
 * ===== UI: FINANCES =====
 * Renderizado de HTML para Finanzas (Billetera, Fijos, Deudas)
 * Solo retorna strings HTML, sin lógica de negocio
 */

import { formatCurrency, escapeHtml, createEmptyState } from '../utils/index.js';

/**
 * Renderiza la vista completa de Finanzas
 * @param {Object} data 
 * @returns {string}
 */
export function renderFinanzasView(data) {
  const { subsection, balance, income, expense, fixedExpenses } = data;
  
  if (subsection === 'billetera') {
    return renderBilletera(data);
  } else if (subsection === 'fijos') {
    return renderFijos(fixedExpenses);
  } else if (subsection === 'deudas') {
    return renderDeudas(data);
  }
  
  return renderBilletera(data);
}

/**
 * Renderiza Billetera
 * @returns {string}
 */
export function renderBilletera(data) {
  const { 
    balance, 
    income, 
    expense, 
    transactions, 
    saldoInicial,
    creditCards 
  } = data;
  
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  let transactionsHtml = '';
  
  if (sortedTransactions.length > 0) {
    transactionsHtml = `
      <div class="transaction-list">
        ${sortedTransactions.map(t => renderTransactionItem(t)).join('')}
      </div>
    `;
  } else {
    transactionsHtml = createEmptyState('💸', 'Sin transacciones', 'Agrega tu primera transacción');
  }
  
  return `
    <div class="section-header">
      <h2 class="section-title">Billetera</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--primary" id="addTransactionBtn">➕ Agregar</button>
      </div>
    </div>
    
    <div class="balance-card">
      <div class="balance-card__label">Balance</div>
      <div class="balance-card__amount">${formatCurrency(balance)}</div>
      <div class="balance-card__info">
        <span>Ingresos: ${formatCurrency(income)}</span>
        <span>Gastos: ${formatCurrency(expense)}</span>
      </div>
    </div>
    
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card__label">Saldo Inicial</div>
        <div class="summary-card__value">${formatCurrency(saldoInicial)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">Fijos</div>
        <div class="summary-card__value">${formatCurrency(data.fixedTotal || 0)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">Disp.</div>
        <div class="summary-card__value">${formatCurrency((income - expense - (data.fixedTotal || 0)))}</div>
      </div>
    </div>
    
    ${transactionsHtml}
    
    ${renderAddTransactionModal()}
    ${renderEditTransactionModal()}
  `;
}

/**
 * Renderiza un item de transacción
 * @param {Object} t 
 * @returns {string}
 */
export function renderTransactionItem(t) {
  const isIncome = t.type === 'ingreso';
  const icon = isIncome ? '⬆️' : '⬇️';
  const amountClass = isIncome ? 'text-success' : 'text-danger';
  
  return `
    <div class="transaction-item" data-id="${t.id}" data-type="transaction">
      <div class="transaction-item__icon">${icon}</div>
      <div class="transaction-item__details">
        <div class="transaction-item__description">${escapeHtml(t.description)}</div>
        <div class="transaction-item__date">${t.date.split('T')[0]}</div>
      </div>
      <div class="transaction-item__amount ${amountClass}">
        ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
      </div>
      <div class="transaction-item__actions">
        <button class="btn btn--sm btn--ghost edit-btn" data-id="${t.id}">✏️</button>
        <button class="btn btn--sm btn--ghost delete-btn" data-id="${t.id}">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Renderiza sección de Gastos Fijos
 * @param {Array} fixedExpenses 
 * @returns {string}
 */
export function renderFijos(fixedExpenses) {
  let fijoHtml = '';
  
  if (fixedExpenses && fixedExpenses.length > 0) {
    fijoHtml = `
      <div class=" fijo-list">
        ${fixedExpenses.map(f => renderFixedExpenseItem(f)).join('')}
      </div>
    `;
  } else {
    fijoHtml = createEmptyState('📋', 'Sin gastos fijos', 'Agrega tus gastos fijos mensuales');
  }
  
  const totalFijo = fixedExpenses?.reduce((sum, f) => sum + f.amount, 0) || 0;
  
  return `
    <div class="section-header">
      <h2 class="section-title">Gastos Fijos</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--primary" id="addFixedExpenseBtn">➕ Agregar</button>
      </div>
    </div>
    
    <div class="balance-card balance-card--orange">
      <div class="balance-card__label">Total Fijos</div>
      <div class="balance-card__amount">${formatCurrency(totalFijo)}</j
      </div>
    </div>
    
    ${fijoHtml}
    
    ${renderAddFixedExpenseModal()}
    ${renderEditFixedExpenseModal()}
  `;
}

/**
 * Renderiza item de gasto fijo
 * @param {Object} f 
 * @returns {string}
 */
export function renderFixedExpenseItem(f) {
  return `
    <div class="fixed-expense-item" data-id="${f.id}" data-type="fixedExpense">
      <div class="fixed-expense-item__name">${escapeHtml(f.name)}</div>
      <div class="fixed-expense-item__amount">${formatCurrency(f.amount)}</div>
      <div class="fixed-expense-item__due">Día ${f.dueDay}</div>
      <div class="fixed-expense-item__actions">
        <button class="btn btn--sm btn--ghost edit-btn" data-id="${f.id}">✏️</button>
        <button class="btn btn--sm btn--ghost delete-btn" data-id="${f.id}">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Renderiza sección Deudas
 * @returns {string}
 */
export function renderDeudas(data) {
  const { debts } = data;
  
  let debtsHtml = '';
  
  if (debts && debts.length > 0) {
    debtsHtml = `
      <div class="debt-list">
        ${debts.map(d => renderDebtItem(d)).join('')}
      </div>
    `;
  } else {
    debtsHtml = createEmptyState('💳', 'Sin deudas', 'Agrega tus deudas o\n tarjetas');
  }
  
  const totalDeuda = debts?.reduce((sum, d) => {
    const paid = d.paidInstallments * d.installmentAmount;
    return sum + (d.totalAmount - paid);
  }, 0) || 0;
  
  return `
    <div class="section-header">
      <h2 class="section-title">Deudas</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--primary" id="addDebtBtn">➕ Agregar</button>
      </div>
    </div>
    
    <div class="balance-card balance-card--red">
      <div class="balance-card__label">Deuda Pendiente</div>
      <div class="balance-card__amount">${formatCurrency(totalDeuda)}</div>
    </div>
    
    ${debtsHtml}
    
    ${renderAddDebtModal()}
    ${renderEditDebtModal()}
  `;
}

/**
 * Renderiza item de deuda
 * @param {Object} d 
 * @returns {string}
 */
export function renderDebtItem(d) {
  const progress = Math.round((d.paidInstallments / d.totalInstallments) * 100);
  const isComplete = d.paidInstallments >= d.totalInstallments;
  
  return `
    <div class="debt-item" data-id="${d.id}" data-type="debt">
      <div class="debt-item__header">
        <span class="debt-item__name">${escapeHtml(d.product)}</span>
        <button class="btn btn--sm btn--success mark-paid-btn" data-id="${d.id}" ${isComplete ? 'disabled' : ''}>
          ✓
        </button>
      </div>
      <div class="debt-item__details">
        <span>${d.paidInstallments}/${d.totalInstallments} cuotas</span>
        <span>${formatCurrency(d.installmentAmount)}/mes</span>
      </div>
      <div class="debt-item__progress">
        <div class="progress-bar" style="width: ${progress}%"></div>
      </div>
      <div class="debt-item__actions">
        <button class="btn btn--sm btn--ghost edit-btn" data-id="${d.id}">✏️</button>
        <button class="btn btn--sm btn--ghost delete-btn" data-id="${d.id}">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Modal agregar transacción
 * @returns {string}
 */
function renderAddTransactionModal() {
  return `
    <div class="modal" id="transactionModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Transacción</h3>
        <form id="transactionForm">
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <div style="display: flex; gap: 10px;">
              <label style="flex: 1;">
                <input type="radio" name="transactionType" value="ingreso" checked>
                Ingreso
              </label>
              <label style="flex: 1;">
                <input type="radio" name="transactionType" value="gasto">
                Gasto
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="transactionAmount">Monto</label>
            <input type="text" id="transactionAmount" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="transactionDescription">Descripción</label>
            <input type="text" id="transactionDescription" class="form-input" required>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelTransactionBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Modal editar transacción
 * @returns {string}
 */
function renderEditTransactionModal() {
  return `
    <div class="modal" id="editTransactionModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Editar Transacción</h3>
        <form id="editTransactionForm">
          <input type="hidden" id="editTransactionId">
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <div style="display: flex; gap: 10px;">
              <label style="flex: 1;">
                <input type="radio" name="editTransactionType" value="ingreso">
                Ingreso
              </label>
              <label style="flex: 1;">
                <input type="radio" name="editTransactionType" value="gasto">
                Gasto
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="editTransactionAmount">Monto</label>
            <input type="text" id="editTransactionAmount" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editTransactionDescription">Descripción</label>
            <input type="text" id="editTransactionDescription" class="form-input" required>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelEditTransactionBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Modal agregar gasto fijo
 * @returns {string}
 */
function renderAddFixedExpenseModal() {
  return `
    <div class="modal" id="fixedExpenseModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Gasto Fijo</h3>
        <form id="fixedExpenseForm">
          <div class="form-group">
            <label class="form-label" for="fixedExpenseName">Nombre</label>
            <input type="text" id="fixedExpenseName" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="fixedExpenseAmount">Monto</label>
            <input type="text" id="fixedExpenseAmount" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="fixedExpenseDueDay">Día de pago</label>
            <input type="number" id="fixedExpenseDueDay" class="form-input" min="1" max="31" required>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelFixedExpenseBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Modal editar gasto fijo
 * @returns {string}
 */
function renderEditFixedExpenseModal() {
  return `
    <div class="modal" id="editFixedExpenseModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Editar Gasto Fijo</h3>
        <form id="editFixedExpenseForm">
          <input type="hidden" id="editFixedExpenseId">
          <div class="form-group">
            <label class="form-label" for="editFixedExpenseName">Nombre</label>
            <input type="text" id="editFixedExpenseName" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editFixedExpenseAmount">Monto</label>
            <input type="text" id="editFixedExpenseAmount" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editFixedExpenseDueDay">Día de pago</label>
            <input type="number" id="editFixedExpenseDueDay" class="form-input" min="1" max="31">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelEditFixedExpenseBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Modal agregar deuda
 * @returns {string}
 */
function renderAddDebtModal() {
  return `
    <div class="modal" id="debtModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Deuda</h3>
        <form id="debtForm">
          <div class="form-group">
            <label class="form-label" for="debtProduct">Producto/Tarjeta</label>
            <input type="text" id="debtProduct" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="debtTotal">Monto Total</label>
            <input type="text" id="debtTotal" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="debtInstallments">Cuotas</label>
            <input type="text" id="debtInstallments" class="form-input" required>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelDebtBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Modal editar deuda
 * @returns {string}
 */
function renderEditDebtModal() {
  return `
    <div class="modal" id="editDebtModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Editar Deuda</h3>
        <form id="editDebtForm">
          <input type="hidden" id="editDebtId">
          <div class="form-group">
            <label class="form-label" for="editDebtProduct">Producto/Tarjeta</label>
            <input type="text" id="editDebtProduct" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtTotal">Monto Total</label>
            <input type="text" id="editDebtTotal" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtInstallments">Cuotas</label>
            <input type="text" id="editDebtInstallments" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editDebtPaidInstallments">Cuotas Pagadas</label>
            <input type="number" id="editDebtPaidInstallments" class="form-input" min="0">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelEditDebtBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}