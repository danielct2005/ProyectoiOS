/**
 * ===== COBROS: UI =====
 * Renderizado de HTML para Por Cobrar
 */

import { formatCurrency, escapeHtml, createEmptyState } from '../utils/index.js';
import { calculateInstallmentAmount } from '../services/cobr.service.js';

/**
 * Renderiza la vista de Cobros
 * @returns {string}
 */
export function renderCobrosView() {
  return `
    <div class="section-header">
      <h2 class="section-title">Por Cobrar</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--primary" id="addCobroBtn">➕ Agregar</button>
      </div>
    </div>
    
    <div class="balance-card balance-card--purple">
      <div class="balance-card__label">Total por Cobrar</div>
      <div class="balance-card__amount balance-card__amount--pending"></div>
      <div class="balance-card__info balance-card__info--secondary">
        <span>Este Mes: <span class="balance-card__amount--monthly"></span></span>
      </div>
    </div>
    
    <div class="cobro-list"></div>
    
    ${renderAddCobroModal()}
    ${renderEditCobroModal()}
  `;
}

/**
 * Renderiza un item de cobro
 * @param {Object} c 
 * @returns {string}
 */
export function renderCobroItem(c) {
  const isComplete = c.paidInstallments >= c.totalInstallments;
  const isCuotas = c.totalInstallments > 1;
  const remainingAmount = c.totalAmount - ((c.paidInstallments || 0) * c.installmentAmount);
  
  return `
    <div class="cobro-item" data-id="${c.id}">
      <div class="cobro-item__header">
        <span class="cobro-item__deudor">${escapeHtml(c.deudor)}</span>
      </div>
      <div class="cobro-item__concepto">${escapeHtml(c.concepto)}</div>
      <div class="cobro-item__details">
        ${isCuotas 
          ? `<span class="cobro-item__cuotas">${c.paidInstallments || 0}/${c.totalInstallments} cuotas</span>
             <span class="cobro-item__monto">${formatCurrency(c.installmentAmount)}/mes</span>`
          : `<span class="cobro-item__monto">${formatCurrency(c.totalAmount)}</span>`
        }
      </div>
      <div class="cobro-item__status ${isComplete ? 'cobro-item__status--complete' : ''}">
        ${isComplete 
          ? '✓ Completado' 
          : `Pendiente: ${formatCurrency(remainingAmount)}`
        }
      </div>
      <div class="cobro-item__actions">
        <button class="btn btn--sm btn--ghost edit-cobro-btn" data-id="${c.id}">✏️</button>
        ${!isComplete && isCuotas ? `
          <button class="btn btn--sm btn--success mark-paid-btn" data-id="${c.id}">
            ✓
          </button>
        ` : ''}
        <button class="btn btn--sm btn--ghost delete-cobro-btn" data-id="${c.id}">
          🗑️
        </button>
      </div>
    </div>
  `;
}

/**
 * Modal agregar cobro
 * @returns {string}
 */
function renderAddCobroModal() {
  return `
    <div class="modal" id="cobroModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Agregar Cobro</h3>
        <form id="cobroForm">
          <div class="form-group">
            <label class="form-label" for="cobroDeudor">Deudor</label>
            <input type="text" id="cobroDeudor" class="form-input" placeholder="Ej: Jacqueline, Fer" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="cobroConcepto">Concepto</label>
            <input type="text" id="cobroConcepto" class="form-input" placeholder="Ej: Préstamo, Compra compartida" required>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Cobro</label>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <label style="flex: 1; display: flex; align-items: center; gap: 5px; padding: 10px; border: 2px solid var(--gray-200); border-radius: var(--radius); cursor: pointer;" id="labelConCuotas">
                <input type="radio" name="cobroTipo" value="cuotas" checked style="width: 18px; height: 18px;">
                Con Cuotas
              </label>
              <label style="flex: 1; display: flex; align-items: center; gap: 5px; padding: 10px; border: 2px solid var(--gray-200); border-radius: var(--radius); cursor: pointer;" id="labelSinCuotas">
                <input type="radio" name="cobroTipo" value="unico" style="width: 18px; height: 18px;">
                Monto Único
              </label>
            </div>
          </div>
          <div id="camposCuotas">
            <div class="form-group">
              <label class="form-label" for="cobroTotal">Monto Total</label>
              <input type="text" id="cobroTotal" class="form-input" placeholder="0" inputmode="numeric">
            </div>
            <div class="form-group">
              <label class="form-label" for="cobroCuotas">Cantidad de Cuotas</label>
              <input type="text" id="cobroCuotas" class="form-input" placeholder="12" inputmode="numeric">
            </div>
          </div>
          <div id="camposUnico" style="display: none;">
            <div class="form-group">
              <label class="form-label" for="cobroMontoUnico">Monto a Cobrar</label>
              <input type="text" id="cobroMontoUnico" class="form-input" placeholder="0" inputmode="numeric">
            </div>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" id="cancelCobroBtn">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Modal editar cobro
 * @returns {string}
 */
function renderEditCobroModal() {
  return `
    <div class="modal" id="editCobroModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h3 class="modal__title">Editar Cobro</h3>
        <form id="editCobroForm">
          <input type="hidden" id="editCobroId">
          <div class="form-group">
            <label class="form-label" for="editCobroDeudor">Deudor</label>
            <input type="text" id="editCobroDeudor" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editCobroConcepto">Concepto</label>
            <input type="text" id="editCobroConcepto" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Cobro</label>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <label style="flex: 1; display: flex; align-items: center; gap: 5px; padding: 10px; border: 2px solid var(--gray-200); border-radius: var(--radius); cursor: pointer;" id="editLabelCuotas">
                <input type="radio" name="editCobroTipo" value="cuotas" style="width: 18px; height: 18px;">
                Con Cuotas
              </label>
              <label style="flex: 1; display: flex; align-items: center; gap: 5px; padding: 10px; border: 2px solid var(--gray-200); border-radius: var(--radius); cursor: pointer;" id="editLabelUnico">
                <input type="radio" name="editCobroTipo" value="unico" style="width: 18px; height: 18px;">
                Monto Único
              </label>
            </div>
          </div>
          <div id="editCamposCuotas">
            <div class="form-group">
              <label class="form-label" for="editCobroTotal">Monto Total</label>
              <input type="text" id="editCobroTotal" class="form-input" inputmode="numeric">
            </div>
            <div class="form-group">
              <label class="form-label" for="editCobroCuotas">Cantidad de Cuotas</label>
              <input type="text" id="editCobroCuotas" class="form-input" inputmode="numeric">
            </div>
            <div class="form-group">
              <label class="form-label" for="editCobroPaid">Cuotas Pagadas</label>
              <input type="number" id="editCobroPaid" class="form-input" min="0" required>
            </div>
          </div>
          <div id="editCamposUnico" style="display: none;">
            <div class="form-group">
              <label class="form-label" for="editCobroMontoUnico">Monto a Cobrar</label>
              <input type="text" id="editCobroMontoUnico" class="form-input" inputmode="numeric">
            </div>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--danger" id="deleteEditCobroBtn">🗑️ Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
          <button type="button" class="btn btn--secondary btn--block mt-1" id="cancelEditCobroBtn">Cancelar</button>
        </form>
      </div>
    </div>
  `;
}