// ========================================
// МОДУЛЬ АВТОРИЗАЦИИ
// ========================================

import { SITE_ACCESS_PASSWORD, DASHBOARD_PASSWORD, AUTH_KEY } from '../config/constants.js';
import { showNotification, showError, showSuccess } from '../utils/notifications.js';

/**
 * Проверка авторизации при загрузке страницы
 */
export function checkAuth() {
    const isAuth = localStorage.getItem(AUTH_KEY);
    const loginScreen = document.getElementById('loginScreen');
    const mainContent = document.getElementById('mainAppContent');
    
    if (isAuth === "true") {
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        return true;
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
        return false;
    }
}

/**
 * Настройка формы входа
 * @param {Function} onSuccess - Колбэк при успешном входе
 */
export function setupLogin(onSuccess) {
    const loginBtn = document.getElementById('submitLoginBtn');
    const passwordInput = document.getElementById('passwordInput');
    const errorDiv = document.getElementById('loginError');
    
    if (!loginBtn || !passwordInput || !errorDiv) {
        console.error("❌ Элементы входа не найдены");
        return;
    }
    
    const tryLogin = () => {
        const enteredPassword = passwordInput.value.trim();
        
        if (enteredPassword === SITE_ACCESS_PASSWORD) {
            // Успешный вход
            localStorage.setItem(AUTH_KEY, "true");
            
            const loginScreen = document.getElementById('loginScreen');
            const mainContent = document.getElementById('mainAppContent');
            
            if (loginScreen) loginScreen.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            
            errorDiv.textContent = '';
            passwordInput.value = '';
            
            showSuccess("✅ Доступ разрешён! Загрузка данных...");
            
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
            return true;
        } else {
            // Неверный пароль
            errorDiv.textContent = '❌ Неверный пароль! Попробуйте снова.';
            passwordInput.value = '';
            passwordInput.focus();
            return false;
        }
    };
    
    // События
    loginBtn.addEventListener('click', tryLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            tryLogin();
        }
    });
    
    return tryLogin;
}

/**
 * Проверка пароля для административных действий
 * @param {string} action - Описание действия для подтверждения
 * @returns {boolean} - true если пароль верен
 */
export function checkAdminPassword(action = '') {
    const message = action ? `Введите пароль для "${action}":` : "Введите пароль администратора:";
    const password = prompt(message);
    return password === DASHBOARD_PASSWORD;
}

/**
 * Выход из системы
 */
export function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem(AUTH_KEY);
        location.reload();
    }
}