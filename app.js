/**
 * ===== PUNTO DE ENTRADA DE LA APLICACIÓN =====
 * Inicializa los módulos y coordina la aplicación
 * 
 * Estructura modular:
 * - modules/utils.js: Utilidades helper
 * - modules/storage.js: Gestión de localStorage
 * - modules/finanzas.js: Lógica financiera
 * - modules/agenda.js: Gestión de agenda
 * - modules/ui.js: Interfaz de usuario
 * - modules/api.js: Llamadas a APIs externas
 */

// Importar módulos
import { appState, loadData, saveData } from './modules/storage.js';
import { getCurrentMonthKey } from './modules/utils.js';
import * as UI from './modules/ui.js';

// ==================== INITIALIZATION ====================

/**
 * Inicializa la aplicación
 */
async function init() {
  console.log('🚀 Inicializando App Modular...');
  
  // Inicializar mes actual
  appState.currentMonth = getCurrentMonthKey();
  
  // Cargar datos (desde Firebase o localStorage)
  await loadData();
  
  // Configurar manejadores de eventos de UI
  UI.setupMenuHandlers();
  
  // Renderizar la aplicación
  UI.render();
  
  // Configurar evento de renderizado global
  setupGlobalEvents();
  
  console.log('✅ App inicializada correctamente');
}

/**
 * Configura eventos globales de la aplicación
 */
function setupGlobalEvents() {
  // Evento personalizado para re-renderizar la app
  window.addEventListener('app:render', () => {
    UI.render();
  });
  
  // Evento para navegar a una sección
  window.addEventListener('app:navigate', (e) => {
    const { section, subsection } = e.detail;
    
    if (section) {
      appState.currentSection = section;
    }
    
    if (section === 'finanzas' && subsection) {
      appState.currentSubsection = subsection;
    } else if (section === 'agenda' && subsection) {
      appState.agendaSubsection = subsection;
    }
    
    UI.render();
  });
  
  // Persistir datos antes de cerrar la página
  window.addEventListener('beforeunload', () => {
    saveData();
  });
}

// ==================== INICIAR APP ====================

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

// Exportar para uso global si es necesario
window.App = {
  // Estado
  getState: () => appState,
  
  // Navegación
  navigate: (section, subsection) => {
    window.dispatchEvent(new CustomEvent('app:navigate', { 
      detail: { section, subsection } 
    }));
  },
  
  // Forzar re-render
  refresh: () => {
    window.dispatchEvent(new CustomEvent('app:render'));
  },
  
  // Guardar datos
  save: () => {
    saveData();
  }
};
