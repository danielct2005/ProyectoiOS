/**
 * ===== SAVINGS: UI =====
 * Renderizado de HTML para Ahorros/Metas
 */

import { formatCurrency, escapeHtml, createEmptyState, formatDate } from '../utils/index.js';

/**
 * Renderiza la vista de Ahorros
 * @returns {string}
 */
export function renderSavingsView() {
  return `
    <div class="section-header">
      <h2 class="section-title">Ahorros</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--primary" id="addSavingsBtn">➕ Agregar</button>
      </div>
    </div>
    
    <div class="balance-card balance-card--green">
      <div class="balance-card__label">Total Ahorrado</div>
      <div class="balance-card__amount balance-card__amount--total"></div>
    </div>
    
    <div class="goals-section"></div>
    <div class="accounts-section"></div>
    
    ${renderAddSavingsModal()}
    ${renderAddGoalModal()}
  `;
}

/**
 * Renderiza cuenta de ahorro
 * @param {Object} a 
 * @returns {string}
 */
export function renderSavingsAccountItem(a) {
  return `
    <div class="savings-item" data-id="${a.id}">
      <div class="savings-item__name">${escapeHtml(a.name)}</div>
      <div class="savings-item__balance">${formatCurrency(a.balance)}</div>
      <div class="savings-item__actions">
        <button class="btn btn--sm btn--ghost" onclick="App.savings.deposit('${a.id}')">➕</button>
        <button class="btn btn--sm btn--ghost" onclick="App.savings.withdraw('${a.id}')">➖</button>
        <button class="btn btn--sm btn--ghost delete-savings-btn" data-id="${a.id}">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Renderiza meta de ahorro
 * @param {Object} g 
 * @returns {string}
 */
export function renderSavingsGoalItem(g) {
  const progress = Math.min(100, Math.round((g.current / g.target) * 100));
  const isComplete = g.completed || g.current >= g.target;
  
  return `
    <div class="goal-item ${isComplete ? 'goal-item--complete' : ''}" data-id="${g.id}">
      <div class="goal-item__header">
        <span class="goal-item__name">${escapeHtml(g.name)}</span>
        <span class="goal-item__progress">${progress}%</span>
      </div>
      <div class="goal-item__progress-bar">
        <div class="goal-item__progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="goal-item__details">
        <span>${formatCurrency(g.current)} / ${formatCurrency(g.target)}</span>
        ${g.deadline ? `<span>${formatDate(g.deadline)}</span>` : ''}
      </div>
      <div class="goal-item__actions">
        <button class="btn btn--sm btn--success" onclick="App.savings.addToGoal('${g.id}')">➕</button>
        <button class="btn btn--sm btn--ghost edit-goal-btn" data-id="${g.id}">✏️</button>
        <button class="btn btn--sm btn--ghost delete-goal-btn" data-id="${g.id}">🗑️</button>
      </div>
    </div>
  `;
}

function renderAddSavingsModal() {
  return `
    <div class="modal" id="savingsModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Cuenta</h3>
        <form id="savingsForm">
          <div class="form-group">
            <label class="form-label" for="savingsName">Nombre</label>
            <input type="text" id="savingsName" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="savingsInitial">Saldo inicial</label>
            <input type="text" id="savingsInitial" class="form-input">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelSavingsBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderAddGoalModal() {
  return `
    <div class="modal" id="goalModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Nueva Meta</h3>
        <form id="goalForm">
          <div class="form-group">
            <label class="form-label" for="goalName">Nombre</label>
            <input type="text" id="goalName" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="goalTarget">Meta</label>
            <input type="text" id="goalTarget" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="goalDeadline">Fecha límite (opcional)</label>
            <input type="date" id="goalDeadline" class="form-input">
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelGoalBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}