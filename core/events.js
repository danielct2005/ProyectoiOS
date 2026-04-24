/**
 * ===== CORE: EVENTS =====
 * Sistema centralizado de Event Delegation
 * Elimina todos los addEventListener duplicados en cada render
 */

// Mapping de eventos para evitar duplicación
const boundHandlers = new Map();

/**
 * Inicializa todos los event listeners de la app
 * Se llama UNA sola vez al inicio
 */
export function initEvents() {
  initGlobalEvents();
  initNavigationEvents();
  initModalEvents();
  initFormEvents();
  initActionEvents();
}

/**
 * Eventos globales (app:render, app:navigate)
 */
function initGlobalEvents() {
  // Remover listeners anteriores para evitar duplicación
  window.removeEventListener('app:render', handleAppRender);
  window.removeEventListener('app:navigate', handleAppNavigate);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  
  window.addEventListener('app:render', handleAppRender);
  window.addEventListener('app:navigate', handleAppNavigate);
  window.addEventListener('beforeunload', handleBeforeUnload);
}

function handleAppRender() {
  import('./ui.js').then(({ default: UI }) => UI.render());
}

function handleAppNavigate(e) {
  const { section, subsection } = e.detail;
  import('./core/state.js').then(({ setSection, setSubsection }) => {
    if (section) setSection(section);
    if (section === 'finanzas' && subsection) setSubsection(subsection);
  });
  import('./ui.js').then(({ default: UI }) => UI.render());
}

function handleBeforeUnload() {
  import('./core/storage.js').then(({ saveData }) => saveData());
}

/**
 * Eventos de navegación (hamburger menu)
 */
function initNavigationEvents() {
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('hamburgerMenu');
  const overlay = document.getElementById('menuOverlay');
  
  if (!menuBtn || !menu) return;
  
  // Usar once para que no se dupliquen
  menuBtn.replaceWith(menuBtn.cloneNode(true));
  const newMenuBtn = document.getElementById('menuBtn');
  
  newMenuBtn?.addEventListener('click', () => {
    menu.classList.add('visible');
    overlay?.classList.add('visible');
  });
  
  // Delegation para menu items
  document.body.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.menu-item');
    if (menuItem) {
      import('./core/state.js').then(({ setSection }) => {
        setSection(menuItem.dataset.section);
        menu.classList.remove('visible');
        overlay?.classList.remove('visible');
        window.dispatchEvent(new CustomEvent('app:render'));
      });
    }
    
    const closeBtn = e.target.closest('.menu-close-btn');
    if (closeBtn || e.target === overlay) {
      menu.classList.remove('visible');
      overlay?.classList.remove('visible');
    }
  }, { once: true }); // Solo una vez
}

/**
 * Eventos de modales (cancelar, backdrop, close)
 */
function initModalEvents() {
  document.body.addEventListener('click', (e) => {
    // Backdrop clicks
    if (e.target.classList.contains('modal__backdrop')) {
      const modal = e.target.closest('.modal');
      modal?.classList.remove('visible');
    }
    
    // Cancel buttons
    const cancelBtn = e.target.closest('[id$="CancelBtn"]');
    if (cancelBtn) {
      const modal = cancelBtn.closest('.modal');
      modal?.classList.remove('visible');
    }
  }, { once: true });
}

/**
 * Eventos de formularios (submit)
 */
function initFormEvents() {
  document.body.addEventListener('submit', (e) => {
    const formId = e.target.id;
    
    if (formId === 'transactionForm') {
      e.preventDefault();
      import('./modules/finanzas.js').then(({ handleAddTransaction }) => handleAddTransaction(e));
    } else if (formId === 'fixedExpenseForm') {
      e.preventDefault();
      import('./modules/finanzas.js').then(({ handleAddFixedExpense }) => handleAddFixedExpense(e));
    } else if (formId === 'debtForm') {
      e.preventDefault();
      import('./modules/finanzas.js').then(({ handleAddDebt }) => handleAddDebt(e));
    } else if (formId === 'cobroForm') {
      e.preventDefault();
      import('./modules/cobros.js').then(({ handleAddCobro }) => handleAddCobro(e));
    } else if (formId === 'editTransactionForm') {
      e.preventDefault();
      import('./modules/finanzas.js').then(({ handleEditTransaction }) => handleEditTransaction(e));
    } else if (formId === 'editFixedExpenseForm') {
      e.preventDefault();
      import('./modules/finanzas.js').then(({ handleEditFixedExpense }) => handleEditFixedExpense(e));
    } else if (formId === 'editDebtForm') {
      e.preventDefault();
      import('./modules/finanzas.js').then(({ handleEditDebt }) => handleEditDebt(e));
    } else if (formId === 'editCobroForm') {
      e.preventDefault();
      import('./modules/cobros.js').then(({ handleEditCobro }) => handleEditCobro(e));
    }
  }, { once: true });
}

/**
 * Eventos de acciones (botones en el DOM)
 */
function initActionEvents() {
  document.body.addEventListener('click', (e) => {
    // Dark mode toggle
    const darkBtn = e.target.closest('#darkModeBtn');
    if (darkBtn) {
      import('./core/state.js').then(({ toggleDarkMode }) => {
        toggleDarkMode();
        import('./ui.js').then(({ updateDarkMode }) => updateDarkMode());
      });
      return;
    }
    
    // Add buttons
    const addBtn = e.target.closest('[id$="AddBtn"]');
    if (addBtn) {
      const modalId = addBtn.id.replace('AddBtn', 'Modal');
      document.getElementById(modalId)?.classList.add('visible');
      return;
    }
    
    // Delete buttons
    const deleteBtn = e.target.closest('[id$="DeleteBtn"], .delete-btn');
    if (deleteBtn) {
      const item = deleteBtn.closest('[data-id]');
      if (item) {
        const id = item.dataset.id;
        const type = item.dataset.type;
        // Manejar eliminación según el contexto
        handleDelete(id, type);
      }
      return;
    }
    
    // Edit buttons
    const editBtn = e.target.closest('.edit-btn, [id$="EditBtn"]');
    if (editBtn) {
      const item = editBtn.closest('[data-id]');
      if (item) {
        const id = item.dataset.id;
        const type = item.dataset.type;
        handleOpenEdit(id, type);
      }
      return;
    }
  }, { once: true });
}

/**
 * Maneja eliminación de elementos
 */
async function handleDelete(id, type) {
  const confirmMsg = '¿Estás seguro de eliminar este elemento?';
  if (!confirm(confirmMsg)) return;
  
  if (type === 'transaction') {
    const { deleteTransaction } = await import('./modules/finanzas.js');
    deleteTransaction(id);
  } else if (type === 'fixedExpense') {
    const { deleteFixedExpense } = await import('./modules/finanzas.js');
    deleteFixedExpense(id);
  } else if (type === 'debt') {
    const { deleteDebt } = await import('./modules/finanzas.js');
    deleteDebt(id);
  } else if (type === 'cobro') {
    const { deleteCobro } = await import('./modules/cobros.js');
    deleteCobro(id);
  }
  
  window.dispatchEvent(new CustomEvent('app:render'));
}

/**
 * Abre modal de edición
 */
function handleOpenEdit(id, type) {
  const modalId = `edit${type.charAt(0).toUpperCase() + type.slice(1)}Modal`;
  document.getElementById(modalId)?.classList.add('visible');
  // El módulo específico debe populated los datos
  window.dispatchEvent(new CustomEvent('app:edit', { detail: { id, type } }));
}

/**
 * Cleanup de eventos (para testing)
 */
export function cleanupEvents() {
  boundHandlers.forEach((handler, key) => {
    document.body.removeEventListener(key.type, handler);
  });
  boundHandlers.clear();
}