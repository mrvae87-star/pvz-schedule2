// ========================================
// КОНСТАНТЫ ПРИЛОЖЕНИЯ
// ========================================

// Пароли доступа
export const SITE_ACCESS_PASSWORD = "pvz15";
export const DASHBOARD_PASSWORD = "zina6535564";
export const CHAT_DELETE_PASSWORD = "zina6535564";
export const AUTH_KEY = "app_authorized";

// Дни недели
export const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

// Типы документов
export const DOC_TYPES = {
    passport: { label: '🛂 Паспорт', icon: '🛂' },
    questionnaire: { label: '📋 Трудовая анкета', icon: '📋' },
    contract: { label: '📝 Трудовой договор', icon: '📝' },
    application: { label: '📄 Заявление на расчет', icon: '📄' }
};

// ========================================
// НАСТРОЙКИ ZVONOK.COM
// ========================================

// Публичный ключ (для фронтенда)
export const ZVONOK_PUBLIC_KEY = "6ec133ae14476ac8fb7f7e68a8591296";

// Номер руководителя (в формате 7XXXXXXXXXX, без +)
export const MANAGER_PHONE = "79299007708";

// Ссылка для ручного звонка
export const ZVONOK_MANUAL_URL = "https://zvonok.com/click2call";

// JWT ТОКЕН ДЛЯ API
export const ZVONOK_API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4OTMxNjMzNjEsInNlc3Npb25fa2V5IjoiMDE5ZmI0MTgtYjI2My03N2U1LTljNjktOTMwYmM0NTZhZDljIiwiZXhwIjoyMTAwNzkyOTQ1fQ.LvrGGlH8hdC902AGx3lpi3fAk-b1RQe3HkQkICBPhqU";

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

/**
 * Получить название месяца
 */
export function getMonthName(month) {
    return ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"][month - 1];
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
    const pvzColors = {
        "ПВЗ Центральный": "pvz-color-0",
        "ПВЗ Северный": "pvz-color-1",
        "ПВЗ Южный": "pvz-color-2",
        "ПВЗ Восточный": "pvz-color-3"
    };
    return pvzColors[pvzName] || "pvz-color-default";
}

/**
 * Вычислить время дедлайна (за 30 минут до открытия)
 */
export function getDeadlineTime(openTime) {
    if (!openTime) return '08:30';
    const [hour, minute] = openTime.split(':').map(Number);
    let deadlineHour = hour;
    let deadlineMinute = minute - 30;
    
    if (deadlineMinute < 0) {
        deadlineMinute += 60;
        deadlineHour -= 1;
    }
    if (deadlineHour < 0) deadlineHour += 24;
    
    return `${String(deadlineHour).padStart(2, '0')}:${String(deadlineMinute).padStart(2, '0')}`;
}