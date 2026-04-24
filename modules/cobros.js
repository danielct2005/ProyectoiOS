// ==================== COBROS - MÓDULO DE COBROS A TERCEROS ====================
// Gestiona préstamos a terceros o compras que otros deben pagar

import { appState, saveData, generateId, addCreditCard, deleteCreditCard } from './storage.js';
import { formatCurrency, formatNumber, addThousandsSeparator, digitsOnly, escapeHtml, createEmptyState } from './utils.js';

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
export function addCobro(deudor, concepto, totalAmount, totalInstallments, installmentAmount) {
  const cobro = {
    id: generateId(),
    deudor: deudor.trim(),
    concepto: concepto.trim(),
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
    
    <!-- Modal Agregar Cobro -->
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
            <div class="form-group">
              <label class="form-label" for="cobroMontoCuota">Monto por Cuota</label>
              <input type="text" id="cobroMontoCuota" class="form-input" placeholder="Se calcula solo" inputmode="numeric" readonly style="background: var(--gray-100); cursor: not-allowed;">
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
    
    <!-- Modal Editar Cobro -->
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
              <label class="form-label" for="editCobroMontoCuota">Monto por Cuota</label>
              <input type="text" id="editCobroMontoCuota" class="form-input" inputmode="numeric" readonly style="background: var(--gray-100); cursor: not-allowed;">
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
  
  setupCobrosEvents();
}

// ==================== EVENT SETUP ====================

function setupCobrosEvents() {
  setTimeout(() => {
    // Add cobro button
    document.getElementById('addCobroBtn')?.addEventListener('click', () => {
      document.getElementById('cobroModal')?.classList.add('visible');
    });
    
    // Format inputs
    addThousandsSeparator(document.getElementById('cobroTotal'));
    addThousandsSeparator(document.getElementById('cobroMontoCuota'));
    addThousandsSeparator(document.getElementById('cobroMontoUnico'));
    addThousandsSeparator(document.getElementById('editCobroTotal'));
    addThousandsSeparator(document.getElementById('editCobroMontoCuota'));
    addThousandsSeparator(document.getElementById('editCobroMontoUnico'));
    digitsOnly(document.getElementById('cobroCuotas'));
    digitsOnly(document.getElementById('editCobroCuotas'));
    digitsOnly(document.getElementById('editCobroPaid'));
    
    // Toggle tipo de cobro
    document.querySelectorAll('input[name="cobroTipo"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const camposCuotas = document.getElementById('camposCuotas');
        const camposUnico = document.getElementById('camposUnico');
        const labelConCuotas = document.getElementById('labelConCuotas');
        const labelSinCuotas = document.getElementById('labelSinCuotas');
        
        if (e.target.value === 'cuotas') {
          camposCuotas.style.display = 'block';
          camposUnico.style.display = 'none';
          labelConCuotas.style.borderColor = 'var(--primary)';
          labelSinCuotas.style.borderColor = 'var(--gray-200)';
        } else {
          camposCuotas.style.display = 'none';
          camposUnico.style.display = 'block';
          labelConCuotas.style.borderColor = 'var(--gray-200)';
          labelSinCuotas.style.borderColor = 'var(--primary)';
        }
      });
    });
    
    // Auto-calculate cuota
    const totalInput = document.getElementById('cobroTotal');
    const cuotasInput = document.getElementById('cobroCuotas');
    const montoCuotaInput = document.getElementById('cobroMontoCuota');
    
    const autoCalculate = () => {
      const total = parseNumber(totalInput?.value) || 0;
      const cuotas = parseInt(cuotasInput?.value) || 1;
      if (total > 0 && cuotas > 0 && montoCuotaInput && !montoCuotaInput.value) {
        montoCuotaInput.value = Math.round(total / cuotas).toLocaleString();
      }
    };
    
    totalInput?.addEventListener('input', autoCalculate);
    cuotasInput?.addEventListener('input', autoCalculate);
    
    // Close modals
    document.getElementById('cancelCobroBtn')?.addEventListener('click', () => {
      document.getElementById('cobroModal')?.classList.remove('visible');
    });
    
    document.getElementById('cancelEditCobroBtn')?.addEventListener('click', () => {
      document.getElementById('editCobroModal')?.classList.remove('visible');
    });
    
    // Backdrops
    document.querySelectorAll('#cobroModal .modal__backdrop, #editCobroModal .modal__backdrop').forEach(el => {
      el?.addEventListener('click', () => {
        document.getElementById('cobroModal')?.classList.remove('visible');
        document.getElementById('editCobroModal')?.classList.remove('visible');
      });
    });
    
    // Add cobro form
    document.getElementById('cobroForm')?.addEventListener('submit', handleAddCobro);
    
    // Edit cobro
    document.querySelectorAll('.cobro-item').forEach(item => {
      item?.addEventListener('click', () => {
        const cobro = appState.cobros.find(c => c.id === item.dataset.id);
        if (cobro) {
          document.getElementById('editCobroId').value = cobro.id;
          document.getElementById('editCobroDeudor').value = cobro.deudor;
          document.getElementById('editCobroConcepto').value = cobro.concepto;
          
          const isCuotas = cobro.totalInstallments > 1;
          document.querySelectorAll('input[name="editCobroTipo"]').forEach(r => {
            r.checked = (r.value === 'cuotas') === isCuotas;
          });
          
          const editCamposCuotas = document.getElementById('editCamposCuotas');
          const editCamposUnico = document.getElementById('editCamposUnico');
          const editLabelCuotas = document.getElementById('editLabelCuotas');
          const editLabelUnico = document.getElementById('editLabelUnico');
          
          if (isCuotas) {
            editCamposCuotas.style.display = 'block';
            editCamposUnico.style.display = 'none';
            editLabelCuotas.style.borderColor = 'var(--primary)';
            editLabelUnico.style.borderColor = 'var(--gray-200)';
            document.getElementById('editCobroTotal').value = cobro.totalAmount;
            document.getElementById('editCobroCuotas').value = cobro.totalInstallments;
            document.getElementById('editCobroMontoCuota').value = cobro.installmentAmount;
            document.getElementById('editCobroPaid').value = cobro.paidInstallments || 0;
          } else {
            editCamposCuotas.style.display = 'none';
            editCamposUnico.style.display = 'block';
            editLabelCuotas.style.borderColor = 'var(--gray-200)';
            editLabelUnico.style.borderColor = 'var(--primary)';
            document.getElementById('editCobroMontoUnico').value = cobro.totalAmount;
          }
          
          document.getElementById('editCobroModal')?.classList.add('visible');
        }
      });
    });
    
    // Toggle edit tipo de cobro
    document.querySelectorAll('input[name="editCobroTipo"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const editCamposCuotas = document.getElementById('editCamposCuotas');
        const editCamposUnico = document.getElementById('editCamposUnico');
        const editLabelCuotas = document.getElementById('editLabelCuotas');
        const editLabelUnico = document.getElementById('editLabelUnico');
        
        if (e.target.value === 'cuotas') {
          editCamposCuotas.style.display = 'block';
          editCamposUnico.style.display = 'none';
          editLabelCuotas.style.borderColor = 'var(--primary)';
          editLabelUnico.style.borderColor = 'var(--gray-200)';
        } else {
          editCamposCuotas.style.display = 'none';
          editCamposUnico.style.display = 'block';
          editLabelCuotas.style.borderColor = 'var(--gray-200)';
          editLabelUnico.style.borderColor = 'var(--primary)';
        }
      });
    });
    
    // Auto-calculate edit cuota
    const editTotalInput = document.getElementById('editCobroTotal');
    const editCuotasInput = document.getElementById('editCobroCuotas');
    const editMontoCuotaInput = document.getElementById('editCobroMontoCuota');
    
    const editAutoCalculate = () => {
      const total = parseNumber(editTotalInput?.value) || 0;
      const cuotas = parseInt(editCuotasInput?.value) || 1;
      if (total > 0 && cuotas > 0 && editMontoCuotaInput && !editMontoCuotaInput.value) {
        editMontoCuotaInput.value = Math.round(total / cuotas).toLocaleString();
      }
    };
    
    editTotalInput?.addEventListener('input', editAutoCalculate);
    editCuotasInput?.addEventListener('input', editAutoCalculate);
    
    // Save edit cobro
    document.getElementById('editCobroForm')?.addEventListener('submit', handleEditCobro);
    
    // Delete cobro
    document.getElementById('deleteEditCobroBtn')?.addEventListener('click', handleDeleteCobro);
    
    // Mark paid buttons
    document.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = markInstallmentPaid(btn.dataset.id);
        if (result.success) {
          renderCobros();
          window.dispatchEvent(new CustomEvent('app:render'));
        }
      });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-cobro-btn').forEach(btn => {
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('¿Estás seguro de eliminar este cobro?')) {
          deleteCobro(btn.dataset.id);
          renderCobros();
          window.dispatchEvent(new CustomEvent('app:render'));
        }
      });
    });
  }, 100);
}

function handleAddCobro(e) {
  e.preventDefault();
  
  const deudor = document.getElementById('cobroDeudor').value.trim();
  const concepto = document.getElementById('cobroConcepto').value.trim();
  const tipo = document.querySelector('input[name="cobroTipo"]:checked').value;
  
  if (!deudor || !concepto) {
    alert('Por favor completá todos los campos');
    return;
  }
  
  let result;
  
  if (tipo === 'cuotas') {
    const totalAmount = parseNumber(document.getElementById('cobroTotal').value);
    const totalInstallments = parseNumber(document.getElementById('cobroCuotas').value) || 1;
    const installmentAmount = parseNumber(document.getElementById('cobroMontoCuota').value) || (totalAmount / totalInstallments);
    
    if (!totalAmount || totalAmount <= 0) {
      alert('Por favor ingresá el monto total');
      return;
    }
    
    result = addCobro(deudor, concepto, totalAmount, totalInstallments, installmentAmount);
  } else {
    const montoUnico = parseNumber(document.getElementById('cobroMontoUnico').value);
    
    if (!montoUnico || montoUnico <= 0) {
      alert('Por favor ingresá el monto a cobrar');
      return;
    }
    
    result = addCobro(deudor, concepto, montoUnico, 1, montoUnico, categoria);
  }
  
  if (result.success) {
    document.getElementById('cobroModal')?.classList.remove('visible');
    renderCobros();
    window.dispatchEvent(new CustomEvent('app:render'));
  }
}

function handleEditCobro(e) {
  e.preventDefault();
  
  const cobroId = document.getElementById('editCobroId').value;
  const deudor = document.getElementById('editCobroDeudor').value.trim();
  const concepto = document.getElementById('editCobroConcepto').value.trim();
  const tipo = document.querySelector('input[name="editCobroTipo"]:checked').value;
  
  let result;
  
  if (tipo === 'cuotas') {
    const totalAmount = parseNumber(document.getElementById('editCobroTotal').value);
    const totalInstallments = parseNumber(document.getElementById('editCobroCuotas').value) || 1;
    const installmentAmount = parseNumber(document.getElementById('editCobroMontoCuota').value) || (totalAmount / totalInstallments);
    const paidInstallments = parseInt(document.getElementById('editCobroPaid').value) || 0;
    
    result = updateCobro(cobroId, {
      deudor,
      concepto,
      totalAmount,
      totalInstallments,
      installmentAmount,
      paidInstallments,
      currentPending: paidInstallments < totalInstallments
    });
  } else {
    const montoUnico = parseNumber(document.getElementById('editCobroMontoUnico').value);
    
    result = updateCobro(cobroId, {
      deudor,
      concepto,
      totalAmount: montoUnico,
      totalInstallments: 1,
      installmentAmount: montoUnico,
      paidInstallments: 0,
      currentPending: true
    });
  }
  
  if (result.success) {
    document.getElementById('editCobroModal')?.classList.remove('visible');
    renderCobros();
    window.dispatchEvent(new CustomEvent('app:render'));
  }
}

function handleDeleteCobro() {
  const cobroId = document.getElementById('editCobroId').value;
  if (confirm('¿Estás seguro de eliminar este cobro?')) {
    deleteCobro(cobroId);
    document.getElementById('editCobroModal')?.classList.remove('visible');
    renderCobros();
    window.dispatchEvent(new CustomEvent('app:render'));
  }
}

// ==================== HELPER ====================

function parseNumber(str) {
  if (typeof str === 'number') return str;
  return parseInt(str.replace(/\./g, '')) || 0;
}
