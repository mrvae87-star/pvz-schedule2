// Firebase подключение

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Настройки твоего проекта Firebase

const firebaseConfig = {
  apiKey: "AIzaSyAf8UcXSI1VpTe_qytCxeomUt_ENjKgoZY",
  authDomain: "pvz-schedule2.firebaseapp.com",
  projectId: "pvz-schedule2",
  storageBucket: "pvz-schedule2.firebasestorage.app",
  messagingSenderId: "680318009283",
  appId: "1:680318009283:web:f5f8dea852b505f89e8776"
};


// Запуск Firebase

const app = initializeApp(firebaseConfig);


// Подключение Firestore

export const db = getFirestore(app);
