/**
 * ===== MÓDULO DE AGENDA =====
 * Gestión de fechas importantes y recordatorios
 */

import { 
  appState, 
  saveData, 
  addImportantDate, 
  updateImportantDate, 
  deleteImportantDate 
} from './storage.js';
import { 
  escapeHtml, 
  createEmptyState 
} from './utils.js';

// ==================== RENDER FUNCTIONS ====================

// Títulos de subsecciones de agenda
const agendaTitles = {
  calendario: 'Calendario',
  lista: 'Lista Fechas'
};

export function getAgendaTitles() {
  return agendaTitles;
}

export function getAgendaSubsection() {
  return appState.agendaSubsection;
}

export function setAgendaSubsection(subsection) {
  appState.agendaSubsection = subsection;
}

// ==================== RENDER AGENDA CONTAINER ====================

export function renderAgendaContainer() {
  const main = document.querySelector('.main');
  main.innerHTML = `<div id="agendaContent"></div>`;
  switchAgendaSubsection(appState.agendaSubsection);
}

export function switchAgendaSubsection(subsection) {
  appState.agendaSubsection = subsection;
  
  const contentEl = document.getElementById('agendaContent');
  if (!contentEl) {
    window.dispatchEvent(new CustomEvent('app:render'));
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

// ==================== RENDER CALENDARIO ====================

export function renderAgendaCalendario(container) {
  container.innerHTML = `
    <div class="card">
      <h3 class="card__title mb-2">Calendario</h3>
      <p class="text-muted">Vista de calendario coming soon...</p>
      <p class="text-muted">Por ahora usa la vista Lista</p>
    </div>
    <div class="card">
      <button class="btn btn--primary btn--block" id="goToListaBtn">📋 Ver Lista de Fechas</button>
    </div>
  `;
  
  setTimeout(() => {
    document.getElementById('goToListaBtn')?.addEventListener('click', () => {
      appState.currentSection = 'agenda';
      appState.agendaSubsection = 'lista';
      window.dispatchEvent(new CustomEvent('app:render'));
    });
  }, 100);
}

// ==================== RENDER LISTA ====================

export function renderAgendaLista(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Fechas Importantes</h2>
      <button class="btn btn--sm btn--primary" id="addDateBtn">➕ Agregar</button>
    </div>
    
    <div class="card">
      <div class="transaction-list" id="datesList">
        ${appState.importantDates.length === 0 ? 
          createEmptyState('📅', 'Sin fechas importantes', 'Agrega cumpleaños, pagos, etc.') : 
          appState.importantDates.map(d => `
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
  
  setupAgendaListaEvents();
}

function setupAgendaListaEvents() {
  setTimeout(() => {
    // Add button
    document.getElementById('addDateBtn')?.addEventListener('click', () => {
      document.getElementById('dateEditId').value = '';
      document.getElementById('dateTitle').value = '';
      document.getElementById('dateDesc').value = '';
      document.getElementById('dateNotes').value = '';
      document.getElementById('dateModalTitle').textContent = 'Agregar Fecha';
      document.getElementById('deleteDateBtn').style.display = 'none';
      document.getElementById('dateModal')?.classList.add('visible');
    });
    
    // Cancel button
    document.getElementById('cancelDateBtn')?.addEventListener('click', () => {
      document.getElementById('dateModal')?.classList.remove('visible');
    });
    
    // Backdrop
    document.querySelector('#dateModal .modal__backdrop')?.addEventListener('click', () => {
      document.getElementById('dateModal')?.classList.remove('visible');
    });
    
    // Form submit
    document.getElementById('dateForm')?.addEventListener('submit', handleDateFormSubmit);
    
    // Delete button
    document.getElementById('deleteDateBtn')?.addEventListener('click', handleDeleteDate);
    
    // Edit items
    document.querySelectorAll('#datesList [data-edit]').forEach(btn => {
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const date = appState.importantDates.find(d => d.id === btn.dataset.edit);
        if (date) {
          document.getElementById('dateEditId').value = date.id;
          document.getElementById('dateTitle').value = date.title;
          document.getElementById('dateDesc').value = date.date;
          document.getElementById('dateNotes').value = date.notes || '';
          document.getElementById('dateModalTitle').textContent = 'Editar Fecha';
          document.getElementById('deleteDateBtn').style.display = 'block';
          document.getElementById('dateModal')?.classList.add('visible');
        }
      });
    });
  }, 100);
}

function handleDateFormSubmit(e) {
  e.preventDefault();
  
  const editId = document.getElementById('dateEditId').value;
  const title = document.getElementById('dateTitle').value.trim();
  const date = document.getElementById('dateDesc').value.trim();
  const notes = document.getElementById('dateNotes').value.trim();
  
  if (!title) {
    Swal.fire({ title: 'Título requerido', text: 'Por favor ingresa un título', icon: 'error' });
    return;
  }
  
  if (!date) {
    Swal.fire({ title: 'Fecha requerida', text: 'Por favor ingresa una fecha', icon: 'error' });
    return;
  }
  
  if (editId) {
    updateImportantDate(editId, title, date, notes);
  } else {
    addImportantDate(title, date, notes);
  }
  
  document.getElementById('dateModal')?.classList.remove('visible');
  window.dispatchEvent(new CustomEvent('app:render'));
}

function handleDeleteDate() {
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
      deleteImportantDate(editId);
      document.getElementById('dateModal')?.classList.remove('visible');
      window.dispatchEvent(new CustomEvent('app:render'));
    }
  });
}
