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
import { appState, loadData, saveData, initializeCurrentMonth } from './modules/storage.js';
import { getCurrentMonthKey } from './modules/utils.js';
import * as UI from './modules/ui.js';
import { 
  initFirebase, 
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously, 
  signOut,
  getAuthState
} from './modules/firebase.js';

// ==================== LOGIN UI ====================

function setupLoginScreen() {
  // Solo ejecutar si el elemento loginScreen existe
  const loginScreen = document.getElementById('loginScreen');
  if (!loginScreen) {
    console.log('No login screen found');
    return;
  }
  
  const loginEmailBtn = document.getElementById('loginEmailBtn');
  const loginAnonBtn = document.getElementById('loginAnonBtn');
  const loginEmailForm = document.getElementById('loginEmailForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const registerBtn = document.getElementById('registerBtn');
  const loginBtn = document.getElementById('loginBtn');
  const backToLoginBtn = document.getElementById('backToLoginBtn');
  
  console.log('Login elements:', { loginEmailBtn, loginAnonBtn, loginEmailForm });
  
  // Mostrar formulario de email
  if (loginEmailBtn) {
    loginEmailBtn.addEventListener('click', () => {
      const buttonsEl = document.querySelector('.login-buttons');
      const noteEl = document.querySelector('.login-note');
      if (buttonsEl) buttonsEl.style.display = 'none';
      if (noteEl) noteEl.style.display = 'none';
      if (loginEmailForm) loginEmailForm.style.display = 'flex';
    });
  }
  
  // Volver a los botones de login
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', () => {
      const buttonsEl = document.querySelector('.login-buttons');
      const noteEl = document.querySelector('.login-note');
      if (loginEmailForm) loginEmailForm.style.display = 'none';
      if (buttonsEl) buttonsEl.style.display = 'flex';
      if (noteEl) noteEl.style.display = 'block';
    });
  }
  
  // Validar formato de email
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Registrarse con email
  registerBtn?.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validar campos vacíos
    if (!email || !password) {
      alert('Por favor ingresa email y contraseña');
      return;
    }
    
    // Validar formato de email
    if (!isValidEmail(email)) {
      alert('Por favor ingresa un email válido');
      return;
    }
    
    // Validar contraseña mínima
    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    registerBtn.disabled = true;
    registerBtn.textContent = 'Registrando...';
    
    const result = await signUpWithEmail(email, password);
    
    if (!result.success) {
      // Manejar error específico
      if (result.error === 'auth/email-already-in-use') {
        alert('Este correo ya está registrado. Por favor, inicia sesión.');
        // Cambiar a modo login
        registerBtn.style.display = 'none';
        loginBtn.style.display = 'block';
        loginBtn.textContent = 'Iniciar Sesión';
        loginBtn.disabled = false;
      } else {
        alert('Error al registrarse: ' + result.error);
        registerBtn.disabled = false;
        registerBtn.textContent = 'Registrarse';
      }
    }
  });
  
  // Iniciar sesión con email
  loginBtn?.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validar campos vacíos
    if (!email || !password) {
      alert('Por favor ingresa email y contraseña');
      return;
    }
    
    // Validar formato de email
    if (!isValidEmail(email)) {
      alert('Por favor ingresa un email válido');
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Iniciando...';
    
    const result = await signInWithEmail(email, password);
    
    if (!result.success) {
      // Firebase ahora devuelve "auth/invalid-login-credentials" para ambos casos
      if (result.error === 'auth/invalid-login-credentials' || result.error === 'auth/user-not-found' || result.error === 'auth/wrong-password') {
        alert('Email o contraseña incorrectos. Si no tienes cuenta, regístrate.');
        // Cambiar a modo registro para que pueda crear cuenta
        if (loginBtn && registerBtn) {
          loginBtn.style.display = 'none';
          registerBtn.style.display = 'block';
          registerBtn.textContent = 'Registrarse';
          registerBtn.disabled = false;
        }
      } else {
        alert('Error al iniciar sesión: ' + result.error);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
      }
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
  
  // Pequeno delay para asegurar que el estado de auth esté listo
  setTimeout(() => {
    checkAuthAndShowLogin();
  }, 500);
  
  // Inicializar mes actual
  appState.currentMonth = getCurrentMonthKey();
  
  // Cargar datos (desde Firebase o localStorage)
  await loadData();
  
  // Inicializar el mes actual (cargar desde Firestore si existe)
  await initializeCurrentMonth();
  
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
