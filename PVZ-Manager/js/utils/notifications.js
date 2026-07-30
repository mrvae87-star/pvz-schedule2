// ========================================
// СИСТЕМА УВЕДОМЛЕНИЙ
// ========================================

let notificationSound = null;

/**
 * Инициализация звука уведомлений
 */
export function initNotificationSound() {
    try {
        notificationSound = new Audio('data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==');
        notificationSound.volume = 0.5;
    } catch(e) {
        console.log("🔇 Звук не поддерживается");
    }
}

/**
 * Воспроизвести звук уведомления
 */
export function playNotificationSound() {
    if (notificationSound) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log("🔇 Не удалось воспроизвести звук"));
    }
}

/**
 * Показать уведомление
 * @param {string} message - Текст сообщения
 * @param {boolean} isError - true = красное (ошибка), false = зелёное (успех)
 */
export function showNotification(message, isError = true) {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(el => el.remove());
    
    // Создаём новое
    const notification = document.createElement('div');
    notification.className = `notification ${!isError ? 'success' : ''}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    // Автоудаление через 4 секунды
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

/**
 * Показать уведомление об успехе (зелёное)
 */
export function showSuccess(message) {
    showNotification(message, false);
}

/**
 * Показать уведомление об ошибке (красное)
 */
export function showError(message) {
    showNotification(message, true);
}