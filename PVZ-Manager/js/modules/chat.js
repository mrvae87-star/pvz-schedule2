// ========================================
// МОДУЛЬ ЧАТА
// ========================================

import { getDB } from '../config/firebase.js';
import { CHAT_DELETE_PASSWORD } from '../config/constants.js';
import { escapeHtml } from '../utils/helpers.js';
import { showNotification, showSuccess, showError, playNotificationSound } from '../utils/notifications.js';

let chatUnsubscribe = null;
let chatMessages = [];
let lastMessageTimestamp = 0;

/**
 * Загрузить сообщения чата
 */
export function loadChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    // Отписываемся от предыдущей подписки
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    
    const db = getDB();
    
    chatUnsubscribe = db.collection('chatMessages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            const allDocs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    text: data.text || '',
                    author: data.author || 'Неизвестный',
                    pvz: data.pvz || '',
                    timestamp: data.timestamp?.toDate() || new Date(),
                    attachments: data.attachments || []
                };
            });
            
            chatMessages = allDocs;
            chatMessages.sort((a, b) => a.timestamp - b.timestamp);
            
            if (allDocs.length > 0) {
                lastMessageTimestamp = Math.max(...allDocs.map(m => m.timestamp.getTime()));
            }
            
            renderChatMessages();
            
            // Проверка на новые сообщения
            const hasNew = allDocs.some(m => m.timestamp.getTime() > lastMessageTimestamp - 5000);
            if (hasNew && document.getElementById('chatTabContent')?.style.display === 'block') {
                playNotificationSound();
            } else if (hasNew) {
                const chatBtn = document.getElementById('chatCornerBtn');
                if (chatBtn && !chatBtn.querySelector('.new-message-indicator')) {
                    const indicator = document.createElement('span');
                    indicator.className = 'new-message-indicator';
                    chatBtn.appendChild(indicator);
                    setTimeout(() => indicator.remove(), 5000);
                }
            }
        }, error => {
            console.error('❌ Ошибка загрузки сообщений:', error);
            container.innerHTML = '<div class="chat-loading">❌ Ошибка загрузки сообщений</div>';
        });
}

/**
 * Отобразить сообщения чата
 */
function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    if (chatMessages.length === 0) {
        container.innerHTML = '<div class="chat-loading">💬 Пока нет сообщений. Напишите что-нибудь!</div>';
        return;
    }
    
    const currentPVZ = getCurrentEmployeeName();
    
    container.innerHTML = chatMessages.map(msg => {
        const isOwn = msg.author === currentPVZ;
        const timeStr = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = msg.timestamp.toLocaleDateString();
        
        let attachmentsHtml = '';
        if (msg.attachments && msg.attachments.length > 0) {
            attachmentsHtml = '<div class="message-attachments">';
            msg.attachments.forEach(att => {
                if (att.type === 'image') {
                    attachmentsHtml += `
                        <div class="attachment" onclick="window.openChatAttachment('${att.url}')">
                            <img src="${att.url}" alt="attachment">
                            <span class="attachment-name">${escapeHtml(att.name)}</span>
                        </div>
                    `;
                } else {
                    const icon = att.type === 'pdf' ? '📕' : (att.type === 'doc' ? '📄' : '📎');
                    attachmentsHtml += `
                        <div class="attachment" onclick="window.openChatAttachment('${att.url}')">
                            <span class="attachment-icon">${icon}</span>
                            <span class="attachment-name">${escapeHtml(att.name)}</span>
                        </div>
                    `;
                }
            });
            attachmentsHtml += '</div>';
        }
        
        const deleteBtnHtml = `
            <button class="delete-message-btn" onclick="window.deleteChatMessage('${msg.id}')" title="Удалить сообщение">
                🗑
            </button>
        `;
        
        return `
            <div class="message ${isOwn ? 'message-own' : ''}">
                <div class="message-header">
                    <span class="message-author">📍 ${escapeHtml(msg.author)}</span>
                    <span class="message-pvz">🏪 ${escapeHtml(msg.pvz)}</span>
                    <span class="message-time">${dateStr} ${timeStr} ${deleteBtnHtml}</span>
                </div>
                <div class="message-text">${escapeHtml(msg.text).replace(/\n/g, '<br>')}</div>
                ${attachmentsHtml}
            </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

/**
 * Получить текущего пользователя (ПВЗ)
 */
function getCurrentEmployeeName() {
    const select = document.getElementById('chatPVZSelect');
    return select ? select.value : 'Неизвестный ПВЗ';
}

/**
 * Отправить сообщение
 */
export async function sendChatMessage() {
    const messageInput = document.getElementById('chatMessageInput');
    const pvzSelect = document.getElementById('chatPVZSelect');
    const fileInput = document.getElementById('chatFileInput');
    
    const text = messageInput?.value.trim() || '';
    const selectedPVZ = pvzSelect?.value || '';
    
    if (!selectedPVZ) {
        showError('⚠️ Выберите ПВЗ отправителя!');
        return;
    }
    
    if (!text && fileInput?.files.length === 0) {
        showError('⚠️ Введите сообщение или прикрепите файл!');
        return;
    }
    
    // Загружаем файлы
    const attachments = await uploadChatFiles(Array.from(fileInput?.files || []));
    
    const message = {
        text: text,
        author: selectedPVZ,
        pvz: selectedPVZ,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        attachments: attachments
    };
    
    try {
        const db = getDB();
        await db.collection('chatMessages').add(message);
        
        if (messageInput) messageInput.value = '';
        if (fileInput) fileInput.value = '';
        showSuccess('✅ Сообщение отправлено');
    } catch(e) {
        console.error('❌ Ошибка отправки:', e);
        showError('❌ Ошибка отправки сообщения');
    }
}

/**
 * Загрузить файлы для чата
 */
async function uploadChatFiles(files) {
    const attachments = [];
    
    for (const file of files) {
        try {
            let dataUrl;
            let type = 'file';
            
            if (file.type.startsWith('image/')) {
                dataUrl = await compressImageForChat(file);
                type = 'image';
            } else if (file.type === 'application/pdf') {
                dataUrl = await readFileAsDataURL(file);
                type = 'pdf';
            } else {
                dataUrl = await readFileAsDataURL(file);
                type = 'doc';
            }
            
            attachments.push({
                name: file.name,
                type: type,
                url: dataUrl,
                size: file.size
            });
        } catch(e) {
            console.error('Ошибка загрузки файла:', e);
        }
    }
    
    return attachments;
}

/**
 * Сжать изображение для чата
 */
function compressImageForChat(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Прочитать файл как DataURL
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Удалить сообщение
 */
window.deleteChatMessage = async function(messageId) {
    const password = prompt('Введите пароль администратора для удаления сообщения:');
    if (password !== CHAT_DELETE_PASSWORD) {
        showError('❌ Неверный пароль!');
        return;
    }
    
    try {
        const db = getDB();
        await db.collection('chatMessages').doc(messageId).delete();
        showSuccess('✅ Сообщение удалено');
    } catch(e) {
        console.error('❌ Ошибка удаления сообщения:', e);
        showError('❌ Ошибка при удалении сообщения');
    }
};

/**
 * Открыть вложение
 */
window.openChatAttachment = function(url) {
    if (!url) {
        showError('❌ Ссылка на файл отсутствует');
        return;
    }
    
    if (url.startsWith('data:')) {
        // Открываем в новой вкладке
        const win = window.open('', '_blank');
        if (!win) {
            // Если блокируется, скачиваем
            const link = document.createElement('a');
            link.href = url;
            link.download = 'file';
            link.click();
            return;
        }
        
        const isImage = url.startsWith('data:image');
        
        win.document.write(`
            <html>
                <head>
                    <title>Файл</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            background: #f0f4f8;
                            font-family: system-ui, sans-serif;
                        }
                        .file-container {
                            background: white;
                            border-radius: 20px;
                            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
                            width: 95%;
                            max-width: 900px;
                            height: 90vh;
                            max-height: 800px;
                            display: flex;
                            flex-direction: column;
                            padding: 20px;
                        }
                        .file-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 16px;
                            padding-bottom: 12px;
                            border-bottom: 2px solid #e2e8f0;
                        }
                        .file-header h2 {
                            font-size: 1.1rem;
                            color: #1e293b;
                        }
                        .file-viewer {
                            flex: 1;
                            overflow: auto;
                            background: #f8fafc;
                            border-radius: 12px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        }
                        .file-viewer iframe,
                        .file-viewer img {
                            width: 100%;
                            height: 100%;
                            border: none;
                            border-radius: 8px;
                            object-fit: contain;
                        }
                        .close-btn {
                            padding: 8px 24px;
                            background: #3b82f6;
                            color: white;
                            border: none;
                            border-radius: 40px;
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 0.9rem;
                        }
                        .close-btn:hover { background: #2563eb; }
                        .download-btn {
                            padding: 8px 20px;
                            background: #e2e8f0;
                            color: #1e293b;
                            border: none;
                            border-radius: 40px;
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 0.9rem;
                            margin-right: 10px;
                        }
                        .download-btn:hover { background: #cbd5e1; }
                        .file-actions { display: flex; gap: 8px; }
                    </style>
                </head>
                <body>
                    <div class="file-container">
                        <div class="file-header">
                            <h2>📎 Просмотр файла</h2>
                            <div class="file-actions">
                                <button class="download-btn" onclick="downloadFile()">⬇ Скачать</button>
                                <button class="close-btn" onclick="window.close()">✕ Закрыть</button>
                            </div>
                        </div>
                        <div class="file-viewer">
                            ${isImage ? `<img src="${url}" alt="Изображение">` : `<iframe src="${url}"></iframe>`}
                        </div>
                    </div>
                    <script>
                        function downloadFile() {
                            const link = document.createElement('a');
                            link.href = '${url}';
                            link.download = 'file';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                    <\/script>
                </body>
            </html>
        `);
        win.document.close();
    } else {
        window.open(url, '_blank');
    }
};

/**
 * Заполнить список ПВЗ для чата
 */
export function populateChatPVZSelect(pvzNames) {
    const select = document.getElementById('chatPVZSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Выберите ПВЗ отправителя --</option>';
    pvzNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

/**
 * Открыть чат
 */
export function openChat(pvzNames) {
    const chatContent = document.getElementById('chatTabContent');
    if (chatContent) chatContent.style.display = 'block';
    
    populateChatPVZSelect(pvzNames);
    
    if (chatMessages.length === 0) {
        loadChatMessages();
    } else {
        renderChatMessages();
    }
    
    // Убираем индикатор новых сообщений
    const chatBtn = document.getElementById('chatCornerBtn');
    if (chatBtn) {
        const indicator = chatBtn.querySelector('.new-message-indicator');
        if (indicator) indicator.remove();
    }
}

/**
 * Настройка обработчиков чата
 */
export function setupChatHandlers() {
    const sendBtn = document.getElementById('chatSendBtn');
    const messageInput = document.getElementById('chatMessageInput');
    const fileBtn = document.getElementById('chatFileBtn');
    const fileInput = document.getElementById('chatFileInput');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendChatMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
    
    if (fileBtn && fileInput) {
        fileBtn.addEventListener('click', () => fileInput.click());
    }
}

/**
 * Очистить подписку чата
 */
export function cleanupChat() {
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
}