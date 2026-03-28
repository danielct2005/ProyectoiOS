/**
 * ===== MODULO DE FIREBASE =====
 * Configuracion y sincronizacion con Firestore
 */

// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Firebase
// Obtlos en: Firebase Console > Configuracion del proyecto > Tus apps > Web app

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Estado de sincronizacion
export let isFirebaseReady = false;
export let isOnline = navigator.onLine;
let unsubscribe = null;

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
    
    // Verificar conexion
    const db = window.firebase.firestore();
    await db.collection('_health').doc('check').get();
    
    isFirebaseReady = true;
    console.log('Firebase conectado correctamente');
    
    // Listener para cambios de conexion
    window.addEventListener('online', () => {
      isOnline = true;
      console.log('Conexion restaurada');
    });
    
    window.addEventListener('offline', () => {
      isOnline = false;
      console.log('Sin conexion - modo offline');
    });
    
    return true;
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

// ==================== FIRESTORE HELPERS ====================

export function getDb() {
  if (!window.firebase || !isFirebaseReady) {
    throw new Error('Firebase no esta inicializado');
  }
  return window.firebase.firestore();
}

export function getUserId() {
  // Por ahora usamos un ID unico basado en el dispositivo
  // En el futuro puedes agregar autenticacion
  let userId = localStorage.getItem('finanzas_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('finanzas_user_id', userId);
  }
  return userId;
}

// ==================== GUARDAR DATOS ====================

export async function saveToFirestore(collection, data) {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible, guardando en localStorage');
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
  if (!isFirebaseReady) return () => {};
  
  const userId = getUserId();
  const docRef = getDb().collection('users').doc(userId).collection(collection).doc('data');
  
  unsubscribe = docRef.onSnapshot((doc) => {
    if (doc.exists) {
      callback(doc.data());
    }
  }, (error) => {
    console.error('Error en suscripcion:', error);
  });
  
  return unsubscribe;
}

// ==================== ELIMINAR SUSCRIPCION ====================

export function unsubscribeChanges() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// ==================== EXPORT/IMPORT ====================

export async function exportAllUserData() {
  if (!isFirebaseReady) {
    throw new Error('Firebase no disponible');
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
  if (!isFirebaseReady) {
    throw new Error('Firebase no disponible');
  }
  
  for (const [collection, value] of Object.entries(data)) {
    await saveToFirestore(collection, value);
  }
}
