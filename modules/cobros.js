// ==================== COBROS - MÓDULO DE COBROS A TERCEROS ====================
// Gestiona préstamos a terceros o compras que otros deben pagar

import { appState, saveData, generateId } from './storage.js';
import { formatCurrency, getCurrentMonthKey } from './utils.js';
import { openModal, closeModal } from './ui.js';

// ==================== CÁLCULOS ====================

// Total de dinero que me deben (suma de todos los cobros pendientes)
export function calculateCobrosTotal() {
  return appState.cobros.reduce((sum, c) => {
    // Solo contar lo que falta por cobrar (total - cuotas pagadas)
    const paidAmount = (c.paidInstallments || 0) * (c.installmentAmount || c.totalAmount / c.totalInstallments);
    return sum + (c.totalAmount - paidAmount);
  }, 0);
}

// Total de cuotas que me deben pagar este mes
export function calculateCobrosMonthly() {
  return appState.cobros.reduce((sum, c) => {
    // Solo agregar si la cuota actual está pendiente
    const currentInstallment = (c.paidInstallments || 0) + 1;
    if (currentInstallment <= c.totalInstallments && c.currentPending) {
      return sum + (c.installmentAmount || c.totalAmount / c.totalInstallments);
    }
    return sum;
  }, 0);
}

// ==================== CRUD OPERATIONS ====================

// Agregar un nuevo cobro
export function addCobro(deudor, concepto, totalAmount, totalInstallments, installmentAmount, categoria = 'Otro') {
  const cobro = {
    id: generateId(),
    deudor: deudor.trim(),
    concepto: concepto.trim(),
    categoria: categoria.trim() || 'Otro',
    totalAmount: parseFloat(totalAmount),
    totalInstallments: parseInt(totalInstallments),
    installmentAmount: parseFloat(installmentAmount) || (parseFloat(totalAmount) / parseInt(totalInstallments)),
    paidInstallments: 0,
    currentPending: true,
    createdAt: new Date().toISOString(),
    history: [] // Para registrar cada pago
  };
  
  appState.cobros.unshift(cobro);
  saveData();
  return { success: true, cobro };
}

// Eliminar un cobro
export function deleteCobro(cobroId) {
  const index = appState.cobros.findIndex(c => c.id === cobroId);
  if (index !== -1) {
    appState.cobros.splice(index, 1);
    saveData();
    return { success: true };
  }
  return { success: false, message: 'Cobro no encontrado' };
}

// Actualizar un cobro
export function updateCobro(cobroId, updates) {
  const cobro = appState.cobros.find(c => c.id === cobroId);
  if (cobro) {
    Object.assign(cobro, updates);
    saveData();
    return { success: true, cobro };
  }
  return { success: false, message: 'Cobro no encontrado' };
}

// Marcar cuota como pagada
export function markInstallmentPaid(cobroId) {
  const cobro = appState.cobros.find(c => c.id === cobroId);
  if (!cobro) {
    return { success: false, message: 'Cobro no encontrado' };
  }
  
  if (cobro.paidInstallments >= cobro.totalInstallments) {
    return { success: false, message: 'Todas las cuotas ya están pagadas' };
  }
  
  // Registrar el pago en el historial
  const payment = {
    date: new Date().toISOString(),
    amount: cobro.installmentAmount,
    installmentNumber: cobro.paidInstallments + 1
  };
  
  if (!cobro.history) cobro.history = [];
  cobro.history.push(payment);
  
  // Actualizar contadores
  cobro.paidInstallments = (cobro.paidInstallments || 0) + 1;
  
  // Si completó todas las cuotas, marcar como no pendiente
  if (cobro.paidInstallments >= cobro.totalInstallments) {
    cobro.currentPending = false;
  }
  
  // Si hay más cuotas pendientes, la siguiente queda pendiente
  if (cobro.paidInstallments < cobro.totalInstallments) {
    cobro.currentPending = true;
  }
  
  saveData();
  return { success: true, cobro };
}

// Revertir un pago de cuota
export function undoInstallmentPayment(cobroId) {
  const cobro = appState.cobros.find(c => c.id === cobroId);
  if (!cobro) {
    return { success: false, message: 'Cobro no encontrado' };
  }
  
  if (cobro.paidInstallments <= 0) {
    return { success: false, message: 'No hay pagos para revertir' };
  }
  
  // Revertir el último pago del historial
  if (cobro.history && cobro.history.length > 0) {
    cobro.history.pop();
  }
  
  // Actualizar contadores
  cobro.paidInstallments = cobro.paidInstallments - 1;
  cobro.currentPending = true;
  
  saveData();
  return { success: true, cobro };
}

// ==================== RENDER ====================

// Construir HTML de un item de cobro
function buildCobroItemHtml(c) {
  const isComplete = c.paidInstallments >= c.totalInstallments;
  const remainingAmount = c.totalAmount - ((c.paidInstallments || 0) * c.installmentAmount);
  
  return `
    <div class="cobro-item" data-id="${c.id}">
      <div class="cobro-item__header">
        <span class="cobro-item__deudor">${escapeHtml(c.deudor)}</span>
        <span class="cobro-item__categoria">${escapeHtml(c.categoria)}</span>
      </div>
      <div class="cobro-item__concepto">${escapeHtml(c.concepto)}</div>
      <div class="cobro-item__details">
        <span class="cobro-item__cuotas">${c.paidInstallments || 0}/${c.totalInstallments} cuotas</span>
        <span class="cobro-item__monto">${formatCurrency(c.installmentAmount)}/mes</span>
      </div>
      <div class="cobro-item__status ${isComplete ? 'cobro-item__status--complete' : ''}">
        ${isComplete 
          ? '✓ Completado' 
          : `Pendiente: ${formatCurrency(remainingAmount)}`
        }
      </div>
      <div class="cobro-item__actions">
        ${!isComplete ? `
          <button class="btn btn--sm btn--success mark-paid-btn" data-id="${c.id}">
            ✓ Cobrar Cuota
          </button>
        ` : ''}
        <button class="btn btn--sm btn--ghost delete-cobro-btn" data-id="${c.id}">
          🗑️
        </button>
      </div>
    </div>
  `;
}

// Renderizar la vista de cobros
export function renderCobros() {
  const main = document.querySelector('.main');
  const totalCobrar = calculateCobrosTotal();
  const monthlyCobrar = calculateCobrosMonthly();
  
  // Ordenar: primero los pendientes, luego los completados
  const sortedCobros = [...appState.cobros].sort((a, b) => {
    if (a.currentPending && !b.currentPending) return -1;
    if (!a.currentPending && b.currentPending) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  let cobrosHtml = '';
  
  if (sortedCobros.length > 0) {
    cobrosHtml = `
      <div class="transaction-list">
        ${sortedCobros.map(c => buildCobroItemHtml(c)).join('')}
      </div>
    `;
  } else {
    cobrosHtml = createEmptyState('💰', 'Sin cobros registrados', 'Agrega préstamos a terceros o compras que te deben');
  }
  
  main.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Por Cobrar</h2>
      <div class="section-header__actions">
        <button class="btn btn--sm btn--primary" id="addCobroBtn">➕ Agregar</button>
      </div>
    </div>
    
    <div class="balance-card balance-card--purple">
      <div class="balance-card__label">Total por Cobrar</div>
      <div class="balance-card__amount">${formatCurrency(totalCobrar)}</div>
      <div class="balance-card__info balance-card__info--secondary">
        <span>Este Mes: ${formatCurrency(monthlyCobrar)}</span>
      </div>
    </div>
    
    ${cobrosHtml}
  `;
  
  // Event listeners
  const addBtn = document.getElementById('addCobroBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      console.log('Click en agregar cobro');
      showAddCobroModal();
    });
  } else {
    console.error('No se encontró el botón addCobroBtn');
  }
  
  // Botones de marcar cuota pagada
  document.querySelectorAll('.mark-paid-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const cobroId = e.target.dataset.id;
      const result = markInstallmentPaid(cobroId);
      if (result.success) {
        renderCobros();
        window.dispatchEvent(new CustomEvent('app:render'));
      }
    });
  });
  
  // Botones de eliminar
  document.querySelectorAll('.delete-cobro-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const cobroId = e.target.dataset.id;
      if (confirm('¿Estás seguro de eliminar este cobro?')) {
        const result = deleteCobro(cobroId);
        if (result.success) {
          renderCobros();
          window.dispatchEvent(new CustomEvent('app:render'));
        }
      }
    });
  });
}

// ==================== MODAL ====================

export function showAddCobroModal() {
  // Crear el modal en el body
  const modalContainer = document.getElementById('cobroModalContainer') || document.createElement('div');
  modalContainer.id = 'cobroModalContainer';
  
  modalContainer.innerHTML = `
    <div class="modal visible" id="cobroModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content" style="background: var(--white); border-radius: var(--radius); max-width: 400px; margin: auto; width: 100%;">
        <div class="modal__header" style="padding: var(--space-md); border-bottom: 1px solid var(--gray-200);">
          <h3 style="margin: 0; font-size: 1.1rem;">Agregar Cobro</h3>
          <button id="closeCobroModal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div style="padding: var(--space-md);">
          <form id="cobroForm">
            <div style="margin-bottom: var(--space-md);">
              <label style="display: block; margin-bottom: 4px; font-weight: 600;">Deudor / Categoría</label>
              <input type="text" id="deudor" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: var(--radius);">
            </div>
            <div style="margin-bottom: var(--space-md);">
              <label style="display: block; margin-bottom: 4px; font-weight: 600;">Categoría</label>
              <input type="text" id="categoria" value="Otro" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: var(--radius);">
            </div>
            <div style="margin-bottom: var(--space-md);">
              <label style="display: block; margin-bottom: 4px; font-weight: 600;">Concepto / Producto</label>
              <input type="text" id="concepto" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: var(--radius);">
            </div>
            <div style="margin-bottom: var(--space-md);">
              <label style="display: block; margin-bottom: 4px; font-weight: 600;">Monto Total</label>
              <input type="number" id="totalAmount" required min="0" step="100" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: var(--radius);">
            </div>
            <div style="margin-bottom: var(--space-md);">
              <label style="display: block; margin-bottom: 4px; font-weight: 600;">Total de Cuotas</label>
              <input type="number" id="totalInstallments" required min="1" max="60" value="1" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: var(--radius);">
            </div>
            <div style="margin-bottom: var(--space-md);">
              <label style="display: block; margin-bottom: 4px; font-weight: 600;">Monto Cuota Mensual</label>
              <input type="number" id="installmentAmount" min="0" step="100" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: var(--radius);">
              <small style="color: var(--gray-500);">Dejar vacío para calcular automáticamente</small>
            </div>
            <button type="submit" style="width: 100%; padding: 12px; background: var(--primary); color: white; border: none; border-radius: var(--radius); font-weight: 600; cursor: pointer;">Agregar Cobro</button>
          </form>
        </div>
      </div>
    </div>
  `;
  
  if (!document.getElementById('cobroModalContainer')) {
    document.body.appendChild(modalContainer);
  }
  
  // Auto-calcular cuota
  const totalAmountInput = document.getElementById('totalAmount');
  const totalInstallmentsInput = document.getElementById('totalInstallments');
  const installmentAmountInput = document.getElementById('installmentAmount');
  
  const autoCalculate = () => {
    const total = parseFloat(totalAmountInput?.value) || 0;
    const cuotas = parseInt(totalInstallmentsInput?.value) || 1;
    if (total > 0 && cuotas > 0 && installmentAmountInput && !installmentAmountInput.value) {
      installmentAmountInput.value = Math.round(total / cuotas);
    }
  };
  
  totalAmountInput?.addEventListener('input', autoCalculate);
  totalInstallmentsInput?.addEventListener('input', autoCalculate);
  
  // Cerrar modal
  document.getElementById('closeCobroModal')?.addEventListener('click', () => {
    modalContainer.remove();
  });
  
  document.querySelector('#cobroModal .modal__backdrop')?.addEventListener('click', () => {
    modalContainer.remove();
  });
  
  // Submit form
  document.getElementById('cobroForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const deudor = document.getElementById('deudor').value;
    const categoria = document.getElementById('categoria').value;
    const concepto = document.getElementById('concepto').value;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value);
    const totalInstallments = parseInt(document.getElementById('totalInstallments').value);
    const installmentAmount = parseFloat(document.getElementById('installmentAmount').value) || (totalAmount / totalInstallments);
    
    const result = addCobro(deudor, concepto, totalAmount, totalInstallments, installmentAmount, categoria);
    
    if (result.success) {
      modalContainer.remove();
      renderCobros();
      window.dispatchEvent(new CustomEvent('app:render'));
    }
  });
}
    
    if (result.success) {
      modalContainer.innerHTML = '';
      renderCobros();
      window.dispatchEvent(new CustomEvent('app:render'));
    }
  });
}

// ==================== HELPER ====================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createEmptyState(icon, title, subtitle) {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${icon}</div>
      <div class="empty-state__title">${title}</div>
      <div class="empty-state__subtitle">${subtitle}</div>
    </div>
  `;
}
