// ========================================
// КОНФИГУРАЦИЯ FIREBASE
// ========================================
export const firebaseConfig = {
    apiKey: "AIzaSyAf8UcXSI1VpTe_qytCxeomUt_ENjKgoZY",
    authDomain: "pvz-schedule2.firebaseapp.com",
    projectId: "pvz-schedule2",
    storageBucket: "pvz-schedule2.firebasestorage.app",
    messagingSenderId: "680318009283",
    appId: "1:680318009283:web:f5f8dea852b505f89e8776"
};

let firebaseApp = null;
let firestore = null;

/**
 * Инициализация Firebase
 */
export function initFirebase() {
    if (!firebaseApp) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firestore = firebase.firestore();
        console.log("✅ Firebase инициализирован");
    }
    return { app: firebaseApp, db: firestore };
}

/**
 * Получить экземпляр Firestore
 */
export function getDB() {
    if (!firestore) {
        initFirebase();
    }
    return firestore;
}

/**
 * Получить экземпляр приложения Firebase
 */
export function getApp() {
    if (!firebaseApp) {
        initFirebase();
    }
    return firebaseApp;
}
