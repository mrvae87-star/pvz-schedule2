// ========================================
// КОНФИГУРАЦИЯ FIREBASE
// ========================================

export const firebaseConfig = {
    apiKey: "AIzaSyDnBMku_utsiVxHEfvPgAhQy89UAKSzBws",
    authDomain: "pvz-schedule-38959.firebaseapp.com",
    projectId: "pvz-schedule-38959",
    storageBucket: "pvz-schedule-38959.firebasestorage.app",
    messagingSenderId: "65668659955",
    appId: "1:65668659955:web:18cd4fe18dcf91e3aa1586"
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