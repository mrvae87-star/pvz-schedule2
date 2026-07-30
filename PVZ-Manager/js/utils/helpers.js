// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

/**
 * Экранирование HTML-символов для защиты от XSS
 */
export function escapeHtml(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Получить название месяца
 */
export function getMonthName(month) {
    const names = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", 
                   "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    return names[month - 1] || month;
}

/**
 * Получить ключ месяца (год-месяц)
 */
export function getMonthKey(year, month) {
    return `${year}-${month}`;
}

/**
 * Получить день недели (0 - воскресенье, 6 - суббота)
 */
export function getDayOfWeek(year, month, day) {
    return new Date(year, month - 1, day).getDay();
}

/**
 * Проверить, является ли дата сегодняшней
 */
export function isToday(year, month, day) {
    const today = new Date();
    return today.getFullYear() === year && 
           today.getMonth() + 1 === month && 
           today.getDate() === day;
}

/**
 * Получить класс цвета для ПВЗ
 */
export function getPVZColorClass(pvzName) {
    const colors = {
        "ПВЗ Центральный": "pvz-color-0",
        "ПВЗ Северный": "pvz-color-1",
        "ПВЗ Южный": "pvz-color-2",
        "ПВЗ Восточный": "pvz-color-3"
    };
    return colors[pvzName] || "pvz-color-default";
}

/**
 * Проверить, является ли строка валидным email
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Отформатировать номер телефона
 */
export function formatPhone(phone) {
    if (!phone) return '';
    // Удаляем все не-цифры
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `+7 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
    }
    return phone;
}