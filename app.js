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
import { 
  initFirebase, 
  signInWithGoogle, 
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously, 
  signOut,
  getAuthState,
  checkRedirectResult
} from './modules/firebase.js';

// ==================== LOGIN UI ====================

function setupLoginScreen() {
  const loginScreen = document.getElementById('loginScreen');
  const loginGoogleBtn = document.getElementById('loginGoogleBtn');
  const loginEmailBtn = document.getElementById('loginEmailBtn');
  const loginAnonBtn = document.getElementById('loginAnonBtn');
  const loginEmailForm = document.getElementById('loginEmailForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const registerBtn = document.getElementById('registerBtn');
  const loginBtn = document.getElementById('loginBtn');
  const backToLoginBtn = document.getElementById('backToLoginBtn');
  
  if (!loginScreen) return;
  
  // Login con Google
  loginGoogleBtn.addEventListener('click', async () => {
    loginGoogleBtn.disabled = true;
    loginGoogleBtn.textContent = 'Conectando...';
    
    const result = await signInWithGoogle();
    
    if (!result.success) {
      if (result.error && result.error.includes('blocked')) {
        alert('El popup fue bloqueado. Por favor permite popups para este sitio, o usa "Continuar como Invitado".');
      } else {
        alert('Error al iniciar sesión: ' + result.error);
      }
      loginGoogleBtn.disabled = false;
      loginGoogleBtn.innerHTML = '<span class="login-btn-icon"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"></span><span>Continuar con Google</span>';
    }
  });
  
  // Mostrar formulario de email
  loginEmailBtn?.addEventListener('click', () => {
    document.querySelector('.login-buttons').style.display = 'none';
    document.querySelector('.login-note').style.display = 'none';
    loginEmailForm.style.display = 'flex';
  });
  
  // Volver a los botones de login
  backToLoginBtn?.addEventListener('click', () => {
    loginEmailForm.style.display = 'none';
    document.querySelector('.login-buttons').style.display = 'flex';
    document.querySelector('.login-note').style.display = 'block';
  });
  
  // Registrarse con email
  registerBtn?.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
      alert('Por favor ingresa email y contraseña');
      return;
    }
    
    registerBtn.disabled = true;
    registerBtn.textContent = 'Registrando...';
    
    const result = await signUpWithEmail(email, password);
    
    if (!result.success) {
      alert('Error: ' + result.error);
      registerBtn.disabled = false;
      registerBtn.textContent = 'Registrarse';
    }
  });
  
  // Iniciar sesión con email
  loginBtn?.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
      alert('Por favor ingresa email y contraseña');
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Iniciando...';
    
    const result = await signInWithEmail(email, password);
    
    if (!result.success) {
      alert('Error: ' + result.error);
      loginBtn.disabled = false;
      loginBtn.textContent = 'Iniciar Sesión';
    }
  });
  
  // Login anónimo
  loginAnonBtn.addEventListener('click', async () => {
    loginAnonBtn.disabled = true;
    loginAnonBtn.textContent = 'Conectando...';
    
    const result = await signInAnonymously();
    
    if (result.success) {
      loginScreen.classList.add('hidden');
    } else {
      alert('Error: ' + result.error);
      loginAnonBtn.disabled = false;
      loginAnonBtn.innerHTML = '<span class="login-btn-icon">👤</span><span>Continuar como Invitado</span>';
    }
  });
}

function checkAuthAndShowLogin() {
  const loginScreen = document.getElementById('loginScreen');
  if (!loginScreen) return;
  
  const authState = getAuthState();
  
  if (authState.isLoggedIn) {
    loginScreen.classList.add('hidden');
  } else {
    loginScreen.classList.remove('hidden');
  }
}

// ==================== INITIALIZATION ====================

/**
 * Inicializa la aplicación
 */
async function init() {
  console.log('🚀 Inicializando App Modular...');
  
  // Configurar pantalla de login
  setupLoginScreen();
  
  // Inicializar Firebase
  await initFirebase();
  
  // Verificar si volvió de un redirect de Google
  await checkRedirectResult();
  
  // Pequeno delay para asegurar que el estado de auth esté listo
  setTimeout(() => {
    checkAuthAndShowLogin();
  }, 500);
  
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
