/**
 * ===== MÓDULO DE INTERFAZ =====
 * Gestión de UI, navegación, modo oscuro y renderizado común
 */

import { 
  appState, 
  saveData, 
  exportAllData, 
  importData, 
  clearAllData 
} from './storage.js';
import * as Finanzas from './finanzas.js';
import * as Agenda from './agenda.js';
import * as Economia from './economia.js';
import * as Ahorros from './ahorros.js';
import * as Noticias from './noticias.js';

// ==================== CONSTANTS ====================

const sectionTitles = {
  finanzas: 'Finanzas',
  economia: 'Economía',
  ahorros: 'Ahorros',
  noticias: 'Noticias',
  agenda: 'Agenda',
  ajustes: 'Ajustes'
};

// ==================== DARK MODE ====================

export function updateDarkMode() {
  const body = document.body;
  const btn = document.getElementById('darkModeBtn');
  
  if (appState.darkMode) {
    body.classList.add('dark-mode');
    if (btn) btn.textContent = '☀️';
  } else {
    body.classList.remove('dark-mode');
    if (btn) btn.textContent = '🌙';
  }
}

export function toggleDarkMode() {
  appState.darkMode = !appState.darkMode;
  localStorage.setItem('darkMode', appState.darkMode);
  updateDarkMode();
}

// ==================== MENU HANDLING ====================

export function setupMenuHandlers() {
  // Hamburger menu toggle
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('hamburgerMenu');
  const overlay = document.getElementById('menuOverlay');
  
  menuBtn?.addEventListener('click', () => {
    menu?.classList.add('visible');
    overlay?.classList.add('visible');
  });
  
  overlay?.addEventListener('click', () => {
    menu?.classList.remove('visible');
    overlay?.classList.remove('visible');
  });
  
  // Menu item clicks
  document.querySelectorAll('.menu-item').forEach(item => {
    item?.addEventListener('click', () => {
      appState.currentSection = item.dataset.section;
      menu?.classList.remove('visible');
      overlay?.classList.remove('visible');
      window.dispatchEvent(new CustomEvent('app:render'));
    });
  });
  
  // Dark mode button
  document.getElementById('darkModeBtn')?.addEventListener('click', toggleDarkMode);
  
  // Initialize dark mode
  updateDarkMode();
}

// ==================== RENDER MENU ====================

export function renderMenu() {
  // Update menu items active state
  document.querySelectorAll('.menu-item').forEach(item => {
    const section = item.dataset.section;
    item.classList.toggle('active', section === appState.currentSection);
  });
  
  // Update sub-nav items if in finanzas section
  document.querySelectorAll('.sub-nav__item').forEach(item => {
    item.classList.toggle('active', item.dataset.subsection === appState.currentSubsection);
  });
  
  // Render bottom sub-nav based on current section
  const subNavBottom = document.getElementById('subNavBottom');
  if (!subNavBottom) return;
  
  if (appState.currentSection === 'finanzas') {
    subNavBottom.innerHTML = `
      <button class="nav__item ${appState.currentSubsection === 'billetera' ? 'active' : ''}" data-section="finanzas" data-subsection="billetera">
        <span>👛</span>
        <span>Billetera</span>
      </button>
      <button class="nav__item ${appState.currentSubsection === 'fijos' ? 'active' : ''}" data-section="finanzas" data-subsection="fijos">
        <span>📅</span>
        <span>Fijos</span>
      </button>
      <button class="nav__item ${appState.currentSubsection === 'deudas' ? 'active' : ''}" data-section="finanzas" data-subsection="deudas">
        <span>💳</span>
        <span>Deudas</span>
      </button>
      <button class="nav__item ${appState.currentSubsection === 'historial' ? 'active' : ''}" data-section="finanzas" data-subsection="historial">
        <span>📦</span>
        <span>Historial</span>
      </button>
    `;
  } else if (appState.currentSection === 'agenda') {
    subNavBottom.innerHTML = `
      <button class="nav__item ${appState.agendaSubsection === 'calendario' ? 'active' : ''}" data-section="agenda" data-subsection="calendario">
        <span>📆</span>
        <span>Calendario</span>
      </button>
      <button class="nav__item ${appState.agendaSubsection === 'lista' ? 'active' : ''}" data-section="agenda" data-subsection="lista">
        <span>📋</span>
        <span>Lista</span>
      </button>
    `;
  } else {
    subNavBottom.innerHTML = '';
  }
  
  // Add click handlers for bottom sub-nav
  subNavBottom.querySelectorAll('.nav__item').forEach(item => {
    item?.addEventListener('click', () => {
      const section = item.dataset.section;
      const subsection = item.dataset.subsection;
      
      if (section === 'finanzas') {
        appState.currentSection = 'finanzas';
        appState.currentSubsection = subsection;
      } else if (section === 'agenda') {
        appState.currentSection = 'agenda';
        appState.agendaSubsection = subsection;
      }
      
      window.dispatchEvent(new CustomEvent('app:render'));
    });
  });
}

// ==================== MAIN RENDER ====================

export function render() {
  // Render menu
  renderMenu();
  
  // Update header title
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    if (appState.currentSection === 'finanzas') {
      const titles = Finanzas.getSubsectionTitles();
      headerTitle.textContent = titles[appState.currentSubsection] || 'Billetera';
    } else if (appState.currentSection === 'agenda') {
      const titles = Agenda.getAgendaTitles();
      headerTitle.textContent = titles[appState.agendaSubsection] || 'Agenda';
    } else {
      headerTitle.textContent = sectionTitles[appState.currentSection] || 'Finanzas';
    }
  }
  
  // Render current section
  try {
    switch (appState.currentSection) {
      case 'finanzas':
        Finanzas.renderFinanzasContainer();
        break;
      case 'economia':
        Economia.renderEconomiaContainer();
        break;
      case 'ahorros':
        Ahorros.renderAhorrosContainer();
        break;
      case 'noticias':
        Noticias.renderNoticiasContainer();
        break;
      case 'agenda':
        Agenda.renderAgendaContainer();
        break;
      case 'ajustes':
        renderAjustes();
        break;
    }
  } catch (error) {
    console.error('Error rendering section:', error);
    document.querySelector('.main').innerHTML = `<div class="card"><p>Error: ${error.message}</p></div>`;
  }
}

// ==================== AJUSTES SECTION ====================

export function renderAjustes() {
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
      <p class="text-muted mb-1">Versión 2.0.0 (Modular)</p>
      <p class="text-muted" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--gray-200);">
        Creado por Daniel CT
      </p>
    </div>
  `;
  
  setupAjustesEvents();
}

function setupAjustesEvents() {
  setTimeout(() => {
    // Export data
    document.getElementById('exportDataBtn')?.addEventListener('click', () => {
      const data = exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mis-finanzas-backup.json';
      a.click();
      URL.revokeObjectURL(url);
      Swal.fire({ title: '¡Exportado!', text: 'Datos exportados correctamente', icon: 'success' });
    });
    
    // Import data
    document.getElementById('importDataBtn')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const success = importData(event.target.result);
          if (success) {
            window.dispatchEvent(new CustomEvent('app:render'));
            Swal.fire({ title: '¡Importado!', text: 'Datos importados correctamente', icon: 'success' });
          } else {
            Swal.fire({ title: 'Error', text: 'Archivo inválido', icon: 'error' });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
    
    // Clear all data
    document.getElementById('clearAllDataBtn')?.addEventListener('click', handleClearAllData);
  }, 100);
}

function handleClearAllData() {
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
      clearAllData();
      window.dispatchEvent(new CustomEvent('app:render'));
      Swal.fire({ title: '¡Borrado!', text: 'Todos los datos han sido eliminados', icon: 'success' });
    }
  });
}
