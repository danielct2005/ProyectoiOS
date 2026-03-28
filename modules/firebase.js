/**
 * ===== MODULO DE FIREBASE =====
 * Configuracion, autenticacion y sincronizacion con Firestore
 */

// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Firebase
// Obtlos en: Firebase Console > Configuracion del proyecto > Tus apps > Web app

const firebaseConfig = {
  apiKey: "AIzaSyCUnWsDNu1FuoJ0CECAS5ReSbkkbXU_Y6Q",
  authDomain: "misfinanzas-e0813.firebaseapp.com",
  projectId: "misfinanzas-e0813",
  storageBucket: "misfinanzas-e0813.firebasestorage.app",
  messagingSenderId: "689243140150",
  appId: "1:689243140150:web:e7c45d78b8cf5f137e2897",
  measurementId: "G-2MKSHZE5ME",
  // OAuth Client ID para Google Auth
  oauthClientId: "689243140150-ffj2ei4r7k7f7g744je638lgamud5buo.apps.googleusercontent.com"
};

// Estado de sincronizacion
export let isFirebaseReady = false;
export let isOnline = navigator.onLine;
export let currentUser = null;
export let isAnonymous = false;
let unsubscribeAuth = null;
let unsubscribeData = null;

// ==================== INICIALIZAR FIREBASE ====================

export async function initFirebase() {
  try {
    // Cargar Firebase desde CDN
    if (!window.firebase) {
      await loadFirebaseSDK();
    }
    
    // Inicializar Firebase
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
    }
    
    // Configurar autenticacion
    const auth = window.firebase.auth();
    
    // Configurar persistencia - importante para iOS Safari
    await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
    
    // Verificar estado de autenticacion
    return new Promise((resolve) => {
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          currentUser = user;
          isAnonymous = user.isAnonymous;
          console.log('Usuario autenticado:', user.email || 'Anónimo');
          
          // Ocultar pantalla de login si existe
          const loginScreen = document.getElementById('loginScreen');
          if (loginScreen) loginScreen.classList.add('hidden');
        } else {
          // No hay usuario, mostrar pantalla de login
          console.log('No hay usuario conectado');
        }
        
        isFirebaseReady = true;
        
        // Listener para cambios de conexion
        window.addEventListener('online', () => {
          isOnline = true;
          console.log('Conexion restaurada');
        });
        
        window.addEventListener('offline', () => {
          isOnline = false;
          console.log('Sin conexion - modo offline');
        });
        
        resolve(true);
      });
    });
    
  } catch (error) {
    console.error('Error inicializando Firebase:', error);
    isFirebaseReady = false;
    return false;
  }
}

function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
    script.onload = () => {
      // Cargar servicios adicionales
      const services = [
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js'
      ];
      
      let loaded = 0;
      services.forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => {
          loaded++;
          if (loaded === services.length) resolve();
        };
        s.onerror = reject;
        document.head.appendChild(s);
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ==================== AUTENTICACION ====================

// Cargar Google Identity Services
function loadGoogleIdentitySDK() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function signInWithGoogle() {
  try {
    const auth = window.firebase.auth();
    const googleProvider = new window.firebase.auth.GoogleAuthProvider();
    
    // Intentar popup
    try {
      const result = await auth.signInWithPopup(googleProvider);
      currentUser = result.user;
      isAnonymous = false;
      
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.classList.add('hidden');
      
      return { success: true };
    } catch (popupError) {
      // Si falla popup, intentar redirect
      console.log('Popup bloqueado, usando redirect...');
      await auth.signInWithRedirect(googleProvider);
      return { success: true, redirecting: true };
    }
  } catch (error) {
    console.error('Error con Google:', error);
    return { success: false, error: error.message };
  }
}

// Verificar resultado del redirect cuando la página vuelve
export async function checkRedirectResult() {
  try {
    const auth = window.firebase.auth();
    const result = await auth.getRedirectResult();
    
    if (result.user) {
      currentUser = result.user;
      isAnonymous = false;
      console.log('Login con Google exitoso:', result.user.email);
      
      // Ocultar pantalla de login
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.classList.add('hidden');
      
      return { success: true, user: result.user };
    }
    return { success: false };
  } catch (error) {
    console.error('Error en redirect:', error);
    return { success: false, error: error.message };
  }
}

export async function signInAnonymously() {
  const auth = window.firebase.auth();
  
  try {
    const result = await auth.signInAnonymously();
    currentUser = result.user;
    isAnonymous = true;
    console.log('Login anonimo exitoso');
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error anonimo:', error);
    return { success: false, error: error.message };
  }
}

export async function signOut() {
  const auth = window.firebase.auth();
  
  try {
    await auth.signOut();
    currentUser = null;
    isAnonymous = false;
    console.log('Sesion cerrada');
    return { success: true };
  } catch (error) {
    console.error('Error al cerrar sesion:', error);
    return { success: false, error: error.message };
  }
}

export function isUserLoggedIn() {
  return currentUser !== null;
}

export function getUserDisplayName() {
  if (!currentUser) return 'Invitado';
  if (isAnonymous) return 'Anonimo';
  return currentUser.displayName || currentUser.email || 'Usuario';
}

export function getUserEmail() {
  if (!currentUser) return '';
  return currentUser.email || '';
}

// ==================== FIRESTORE HELPERS ====================

export function getDb() {
  if (!window.firebase || !isFirebaseReady) {
    throw new Error('Firebase no esta inicializado');
  }
  return window.firebase.firestore();
}

function getUserId() {
  if (!currentUser) {
    // Si no hay usuario, usar ID del dispositivo
    let deviceId = localStorage.getItem('finanzas_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('finanzas_device_id', deviceId);
    }
    return deviceId;
  }
  return currentUser.uid;
}

// ==================== GUARDAR DATOS ====================

export async function saveToFirestore(collection, data) {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible, guardando en localStorage');
    return false;
  }
  
  // Si es anonimo, solo guardar localmente
  if (isAnonymous) {
    console.log('Usuario anonimo - guardando solo localmente');
    return false;
  }
  
  try {
    const userId = getUserId();
    const docRef = getDb().collection('users').doc(userId).collection(collection).doc('data');
    
    await docRef.set({
      ...data,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error guardando en Firestore:', error);
    return false;
  }
}

// ==================== CARGAR DATOS ====================

export async function loadFromFirestore(collection) {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible');
    return null;
  }
  
  // Si es anonimo, no cargar desde la nube
  if (isAnonymous) {
    console.log('Usuario anonimo - usando solo datos locales');
    return null;
  }
  
  try {
    const userId = getUserId();
    const docRef = getDb().collection('users').doc(userId).collection(collection).doc('data');
    const doc = await docRef.get();
    
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error('Error cargando de Firestore:', error);
    return null;
  }
}

// ==================== SINCRONIZACION EN TIEMPO REAL ====================

export function subscribeToChanges(collection, callback) {
  if (!isFirebaseReady || isAnonymous) return () => {};
  
  // Desuscribir anterior
  if (unsubscribeData) {
    unsubscribeData();
  }
  
  const userId = getUserId();
  const docRef = getDb().collection('users').doc(userId).collection(collection).doc('data');
  
  unsubscribeData = docRef.onSnapshot((doc) => {
    if (doc.exists) {
      callback(doc.data());
    }
  }, (error) => {
    console.error('Error en suscripcion:', error);
  });
  
  return unsubscribeData;
}

// ==================== ELIMINAR SUSCRIPCIONES ====================

export function unsubscribeAll() {
  if (unsubscribeData) {
    unsubscribeData();
    unsubscribeData = null;
  }
}

// ==================== EXPORT/IMPORT ====================

export async function exportAllUserData() {
  if (!isFirebaseReady || isAnonymous) {
    throw new Error('Firebase no disponible para usuario anonimo');
  }
  
  const userId = getUserId();
  const collections = ['transactions', 'fixedExpenses', 'debts', 'creditCards', 
                      'savingsAccounts', 'savingsGoals', 'history', 'importantDates'];
  
  const allData = {};
  
  for (const col of collections) {
    const data = await loadFromFirestore(col);
    if (data) {
      allData[col] = data;
    }
  }
  
  return allData;
}

export async function importAllUserData(data) {
  if (!isFirebaseReady || isAnonymous) {
    throw new Error('Firebase no disponible para usuario anonimo');
  }
  
  for (const [collection, value] of Object.entries(data)) {
    await saveToFirestore(collection, value);
  }
}

// ==================== ACTUALIZAR ESTADO ====================

export function getAuthState() {
  return {
    isLoggedIn: currentUser !== null,
    isAnonymous: isAnonymous,
    displayName: getUserDisplayName(),
    email: getUserEmail(),
    photoURL: currentUser?.photoURL || null
  };
}
