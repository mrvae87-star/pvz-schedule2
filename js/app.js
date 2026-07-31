// ========================================
// ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ
// ========================================

import { initFirebase } from './config/firebase.js';
import { initNotificationSound, showNotification } from './utils/notifications.js';
import { escapeHtml, getMonthName, getMonthKey, getDayOfWeek, isToday } from './utils/helpers.js';
import { 
    ZVONOK_PUBLIC_KEY, 
    MANAGER_PHONE, 
    ZVONOK_MANUAL_URL, 
    getDeadlineTime,
    ZVONOK_API_TOKEN
} from './config/constants.js';

// ========================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================================

let allPVZData = {};
let currentPVZ = "";
let currentTab = "pvz";
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth() + 1;
let globalEmployees = [];
let isLoading = true;

let salaryData = {};
let currentDashboardYear = new Date().getFullYear();
let currentDashboardMonth = new Date().getMonth() + 1;

let extraWorks = {};
let fines = {};
let emergencyContacts = {};

// ========================================
// ПЕРЕМЕННЫЕ ДЛЯ ЧЕКИНА
// ========================================

let checkinData = {};
let checkinInterval = null;
let pvzOpenTimes = {};

// ========================================
// ИНИЦИАЛИЗАЦИЯ
// ========================================

initFirebase();
initNotificationSound();

// ========================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ
// ========================================

function getDefaultEmployees() {
    return [
        { name: "Анна", surname: "Смирнова", fullName: "Анна Смирнова", email: "anna@example.com", phone: "+7-999-123-45-67" },
        { name: "Иван", surname: "Козлов", fullName: "Иван Козлов", email: "ivan@example.com", phone: "+7-999-234-56-78" },
        { name: "Мария", surname: "Орлова", fullName: "Мария Орлова", email: "maria@example.com", phone: "+7-999-345-67-89" },
        { name: "Дмитрий", surname: "Павлов", fullName: "Дмитрий Павлов", email: "dmitry@example.com", phone: "+7-999-456-78-90" },
        { name: "Елена", surname: "Ветрова", fullName: "Елена Ветрова", email: "elena@example.com", phone: "+7-999-567-89-01" }
    ];
}

function getDefaultPVZData() {
    return { 
        "ПВЗ Центральный": { employeesHistory: {}, schedules: {} },
        "ПВЗ Северный": { employeesHistory: {}, schedules: {} },
        "ПВЗ Южный": { employeesHistory: {}, schedules: {} },
        "ПВЗ Восточный": { employeesHistory: {}, schedules: {} }
    };
}

function getEmployeesForMonth(pvzName, year, month) {
    if (!allPVZData[pvzName] || !allPVZData[pvzName].employeesHistory) return [];
    const monthKey = getMonthKey(year, month);
    if (allPVZData[pvzName].employeesHistory[monthKey]) {
        return [...allPVZData[pvzName].employeesHistory[monthKey]];
    }
    const allKeys = Object.keys(allPVZData[pvzName].employeesHistory).sort();
    if (allKeys.length === 0) return [];
    let lastKey = null;
    for (let key of allKeys) {
        const [keyYear, keyMonth] = key.split('-').map(Number);
        if (keyYear < year || (keyYear === year && keyMonth < month)) lastKey = key;
        else break;
    }
    if (lastKey) {
        allPVZData[pvzName].employeesHistory[monthKey] = [...allPVZData[pvzName].employeesHistory[lastKey]];
        return [...allPVZData[pvzName].employeesHistory[monthKey]];
    }
    return [];
}

function addEmployeeToMonth(pvzName, year, month, employeeName) {
    const currentEmps = getEmployeesForMonth(pvzName, year, month);
    if (!currentEmps.includes(employeeName)) {
        currentEmps.push(employeeName);
        const monthKey = getMonthKey(year, month);
        allPVZData[pvzName].employeesHistory[monthKey] = [...currentEmps];
        return true;
    }
    return false;
}

function removeEmployeeFromMonth(pvzName, year, month, employeeName) {
    const currentEmps = getEmployeesForMonth(pvzName, year, month);
    const index = currentEmps.indexOf(employeeName);
    if (index !== -1) {
        currentEmps.splice(index, 1);
        const monthKey = getMonthKey(year, month);
        allPVZData[pvzName].employeesHistory[monthKey] = [...currentEmps];
        if (allPVZData[pvzName].schedules && allPVZData[pvzName].schedules[employeeName]) {
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dayKey = `${year}-${month}-${d}`;
                if (allPVZData[pvzName].schedules[employeeName][dayKey] !== undefined) {
                    delete allPVZData[pvzName].schedules[employeeName][dayKey];
                }
            }
        }
        return true;
    }
    return false;
}

// ========================================
// РЕНДЕР ВКЛАДОК
// ========================================

function renderTabs() {
    const tabsLeft = document.getElementById("tabsLeft");
    const tabsRight = document.getElementById("tabsRight");
    if (!tabsLeft || !tabsRight) return;

    tabsLeft.innerHTML = '';
    for (let pvz in allPVZData) {
        const tab = document.createElement('button');
        tab.className = `tab ${currentTab === pvz ? 'active' : ''}`;
        tab.innerHTML = `📍 ${pvz}`;
        tab.onclick = () => switchTab(pvz);
        tabsLeft.appendChild(tab);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'add-tab-btn';
    addBtn.innerHTML = '➕ Добавить ПВЗ';
    addBtn.onclick = () => addNewPVZ();
    tabsLeft.appendChild(addBtn);

    tabsRight.innerHTML = '';
}

// ========================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ========================================

async function switchTab(tabId) {
    document.querySelectorAll('[id$="TabContent"]').forEach(el => el.style.display = "none");

    if (tabId === 'employees') {
        currentTab = 'employees';
        document.getElementById("employeesTabContent").style.display = "block";
        renderGlobalEmployeesTable();
        showEmployeesSubtab('list');
    } else if (tabId === 'dashboard') {
        currentTab = 'dashboard';
        document.getElementById("dashboardTabContent").style.display = "block";
        renderSalaryTable();
    } else if (tabId === 'analytics') {
        currentTab = 'analytics';
        document.getElementById("analyticsTabContent").style.display = "block";
        renderAnalytics();
    } else if (tabId === 'emergency') {
        currentTab = 'emergency';
        document.getElementById("emergencyContactsTabContent").style.display = "block";
        loadPublicEmergencyForm();
    } else if (tabId === 'chat') {
        currentTab = 'chat';
        document.getElementById("chatTabContent").style.display = "block";
        populateChatPVZSelect();
    } else if (tabId === 'checkin') {
        currentTab = 'checkin';
        document.getElementById("checkinTabContent").style.display = "block";
        loadPvzOpenTimes();
        populateCheckinSelects();
        loadCheckinData();
        updateClock();
        updateShiftInfo();
        updateMyCheckinStatus();
        if (checkinInterval) clearInterval(checkinInterval);
        checkinInterval = setInterval(updateClock, 1000);
        if (window.checkinCheckInterval) clearInterval(window.checkinCheckInterval);
        window.checkinCheckInterval = setInterval(() => {
            checkMissedCheckins();
            updateMyCheckinStatus();
        }, 30000);
        setTimeout(() => {
            checkMissedCheckins();
            updateMyCheckinStatus();
        }, 1000);
    } else {
        currentPVZ = tabId;
        currentTab = tabId;
        document.getElementById("pvzTabContent").style.display = "block";
        updatePVZEmployeesUI();
        populateMonthSelect();
        renderSchedule();
    }

    renderTabs();
    await saveToFirestore();
}

// ========================================
// РЕНДЕР ГРАФИКА
// ========================================

function renderSchedule() {
    const data = allPVZData[currentPVZ];
    if (!data) return;

    const year = selectedYear, month = selectedMonth;
    const daysCount = new Date(year, month, 0).getDate();

    let headerHtml = `<tr><th class="employee-col">Сотрудник</th>`;
    for (let d = 1; d <= daysCount; d++) {
        const dow = getDayOfWeek(year, month, d);
        headerHtml += `<th class="${dow === 0 || dow === 6 ? 'weekend' : 'weekday'} ${isToday(year, month, d) ? 'today-column' : ''}">
            <div class="day-number">${d}</div>
            <div class="weekday-name">${["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][dow]}</div>
        </th>`;
    }
    headerHtml += '<th>📊</th></tr>';
    document.getElementById("tableHeader").innerHTML = headerHtml;

    const employeesThisMonth = getEmployeesForMonth(currentPVZ, year, month);
    let bodyHtml = '';

    for (let emp of employeesThisMonth) {
        let workCount = 0;
        let row = `<tr><td class="employee-col">${escapeHtml(emp)}</td>`;

        for (let d = 1; d <= daysCount; d++) {
            if (!data.schedules[emp]) data.schedules[emp] = {};
            const isWork = data.schedules[emp][`${year}-${month}-${d}`] === true;
            if (isWork) workCount++;
            row += `<td class="${isWork ? 'shift-work' : 'shift-off'} ${isToday(year, month, d) ? 'today-column' : ''}" 
                        data-employee="${emp}" data-year="${year}" data-month="${month}" data-day="${d}" data-status="${isWork}">
                        ${isWork ? '✅' : '❌'}
                    </td>`;
        }
        bodyHtml += row + `<td style="text-align:center;font-weight:700;">${workCount}</td></tr>`;
    }

    document.getElementById("tableBody").innerHTML = bodyHtml || '<tr><td colspan="40" style="text-align:center;padding:40px;">👀 Нет сотрудников</td></tr>';
    document.getElementById("currentMonthTitle").innerHTML = `📅 ${getMonthName(month)} ${year} | ${currentPVZ}`;
}

// ========================================
// ОБНОВЛЕНИЕ СПИСКА СОТРУДНИКОВ ПВЗ
// ========================================

function updatePVZEmployeesUI() {
    const container = document.getElementById("pvzEmployeesList");
    const span = document.getElementById("currentPVZName");
    const monthSpan = document.getElementById("currentMonthNameForPVZ");

    if (!container) return;

    const employees = getEmployeesForMonth(currentPVZ, selectedYear, selectedMonth);
    if (span) span.textContent = currentPVZ;
    if (monthSpan) monthSpan.textContent = `${getMonthName(selectedMonth)} ${selectedYear}`;

    container.innerHTML = employees.length === 0 
        ? '<span style="color:#64748b;">Нет сотрудников</span>' 
        : employees.map(emp => `
            <div class="pvz-employee-tag">
                ${escapeHtml(emp)}
                <button class="remove-from-pvz" data-name="${emp}">✕</button>
            </div>
        `).join('');

    document.querySelectorAll('.remove-from-pvz').forEach(btn => {
        btn.addEventListener('click', () => removeEmployeeFromPVZ(btn.dataset.name));
    });

    updateAvailableEmployeesSelect();
}

function updateAvailableEmployeesSelect() {
    const select = document.getElementById("availableEmployeesSelect");
    if (!select) return;

    const currentEmps = getEmployeesForMonth(currentPVZ, selectedYear, selectedMonth);
    const available = globalEmployees.filter(emp => !currentEmps.includes(emp.fullName));

    select.innerHTML = '<option value="">-- Выберите сотрудника --</option>';
    available.forEach(emp => {
        const o = document.createElement("option");
        o.value = emp.fullName;
        o.textContent = emp.fullName;
        select.appendChild(o);
    });
}

function populateMonthSelect() {
    const select = document.getElementById("monthSelect");
    if (!select) return;

    const now = new Date();
    select.innerHTML = '';
    const maxYear = 2028;
    const maxMonth = 12;
    let startYear = now.getFullYear() - 1;
    let startMonth = now.getMonth() + 1;

    for (let year = startYear; year <= maxYear; year++) {
        let monthStart = (year === startYear) ? startMonth : 1;
        let monthEnd = (year === maxYear) ? maxMonth : 12;
        for (let month = monthStart; month <= monthEnd; month++) {
            const option = document.createElement("option");
            option.value = `${year}-${month}`;
            option.textContent = `${getMonthName(month)} ${year}`;
            if (year === selectedYear && month === selectedMonth) option.selected = true;
            select.appendChild(option);
        }
    }
}

// ========================================
// РЕНДЕР ТАБЛИЦЫ СОТРУДНИКОВ
// ========================================

function renderGlobalEmployeesTable() {
    const tbody = document.getElementById("employeesTableBody");
    if (!tbody) return;

    tbody.innerHTML = globalEmployees.map((emp, idx) => `
        <tr>
            <td><strong>${escapeHtml(emp.name)}</strong></td>
            <td><strong>${escapeHtml(emp.surname)}</strong></td>
            <td>${escapeHtml(emp.email || '—')}</td>
            <td>${escapeHtml(emp.phone || '—')}</td>
            <td>
                <button class="edit-employee-btn" data-idx="${idx}">✏️</button>
                <button class="delete-employee-btn" data-idx="${idx}">🗑</button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.edit-employee-btn').forEach(btn => {
        btn.addEventListener('click', () => editGlobalEmployee(parseInt(btn.dataset.idx)));
    });

    document.querySelectorAll('.delete-employee-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteGlobalEmployee(parseInt(btn.dataset.idx)));
    });
}

// ========================================
// УПРАВЛЕНИЕ СОТРУДНИКАМИ
// ========================================

function editGlobalEmployee(idx) {
    if (!checkAdminPassword()) return;
    const emp = globalEmployees[idx];
    const newName = prompt("Имя:", emp.name);
    if (!newName) return;
    const newSurname = prompt("Фамилия:", emp.surname);
    if (!newSurname) return;

    const oldFullName = emp.fullName;
    emp.name = newName;
    emp.surname = newSurname;
    emp.fullName = `${newName} ${newSurname}`;
    emp.email = prompt("Email:", emp.email || "") || "";
    emp.phone = prompt("Телефон:", emp.phone || "") || "";

    for (let pvz in allPVZData) {
        if (allPVZData[pvz].employeesHistory) {
            for (let monthKey in allPVZData[pvz].employeesHistory) {
                const idx2 = allPVZData[pvz].employeesHistory[monthKey].indexOf(oldFullName);
                if (idx2 !== -1) allPVZData[pvz].employeesHistory[monthKey][idx2] = emp.fullName;
            }
        }
        if (allPVZData[pvz].schedules[oldFullName]) {
            allPVZData[pvz].schedules[emp.fullName] = allPVZData[pvz].schedules[oldFullName];
            delete allPVZData[pvz].schedules[oldFullName];
        }
    }

    updatePVZEmployeesUI();
    renderSchedule();
    renderGlobalEmployeesTable();
    saveToFirestore();
    showNotification(`✅ Сотрудник обновлён`, false);
}

function deleteGlobalEmployee(idx) {
    if (!checkAdminPassword()) return;
    const emp = globalEmployees[idx];
    if (!confirm(`Удалить "${emp.fullName}" из списка сотрудников?`)) return;

    const deletedName = emp.fullName;
    globalEmployees.splice(idx, 1);

    for (let pvz in allPVZData) {
        if (allPVZData[pvz].employeesHistory) {
            for (let monthKey in allPVZData[pvz].employeesHistory) {
                const idx2 = allPVZData[pvz].employeesHistory[monthKey].indexOf(deletedName);
                if (idx2 !== -1) allPVZData[pvz].employeesHistory[monthKey].splice(idx2, 1);
            }
        }
        delete allPVZData[pvz].schedules[deletedName];
    }

    updatePVZEmployeesUI();
    renderSchedule();
    renderGlobalEmployeesTable();
    saveToFirestore();
    showNotification(`❌ Сотрудник "${deletedName}" удалён`, false);
}

function addGlobalEmployee() {
    const name = document.getElementById("newEmpName")?.value.trim();
    const surname = document.getElementById("newEmpSurname")?.value.trim();

    if (!name || !surname) {
        alert("Введите имя и фамилию");
        return;
    }

    const fullName = `${name} ${surname}`;
    if (globalEmployees.some(e => e.fullName === fullName)) {
        alert("Такой сотрудник уже есть");
        return;
    }

    globalEmployees.push({
        name,
        surname,
        fullName,
        email: document.getElementById("newEmpEmail")?.value.trim() || "",
        phone: document.getElementById("newEmpPhone")?.value.trim() || ""
    });

    renderGlobalEmployeesTable();
    updateAvailableEmployeesSelect();
    saveToFirestore();
    showNotification(`✅ Сотрудник "${fullName}" добавлен`, false);

    ["newEmpName", "newEmpSurname", "newEmpEmail", "newEmpPhone"].forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).value = "";
    });
}

// ========================================
// УПРАВЛЕНИЕ ПВЗ
// ========================================

async function addNewPVZ() {
    if (!checkAdminPassword()) return;
    let num = Object.keys(allPVZData).length + 1;
    let name = `ПВЗ ${num}`;
    while (allPVZData[name]) { num++; name = `ПВЗ ${num}`; }
    allPVZData[name] = { employeesHistory: {}, schedules: {} };
    await switchTab(name);
    await saveToFirestore();
    showNotification(`✅ ПВЗ "${name}" добавлен`, false);
}

function editCurrentPVZName() {
    if (!checkAdminPassword()) return;
    const n = prompt("Новое название:", currentPVZ);
    if (n && n !== currentPVZ) {
        renamePVZ(currentPVZ, n);
    }
}

async function renamePVZ(oldName, newName) {
    if (!newName || newName === oldName || allPVZData[newName]) return false;
    allPVZData[newName] = allPVZData[oldName];
    delete allPVZData[oldName];
    if (currentPVZ === oldName) currentPVZ = newName;
    renderTabs();
    updatePVZEmployeesUI();
    renderSchedule();
    await saveToFirestore();
    showNotification(`✅ ПВЗ переименован`, false);
    return true;
}

async function deleteCurrentPVZ() {
    if (!checkAdminPassword() || Object.keys(allPVZData).length === 1) return;
    if (confirm(`Удалить "${currentPVZ}"?`)) {
        delete allPVZData[currentPVZ];
        currentPVZ = Object.keys(allPVZData)[0];
        renderTabs();
        updatePVZEmployeesUI();
        populateMonthSelect();
        renderSchedule();
        await saveToFirestore();
        showNotification(`❌ ПВЗ удалён`, false);
    }
}

// ========================================
// РАБОТА С ГРАФИКОМ (КЛИК ПО ЯЧЕЙКЕ)
// ========================================

async function toggleStatus(e) {
    let target = e.target;
    while (target && target.tagName !== 'TD') target = target.parentElement;
    if (!target || target.classList.contains('employee-col')) return;

    const emp = target.dataset.employee;
    const year = parseInt(target.dataset.year);
    const month = parseInt(target.dataset.month);
    const day = parseInt(target.dataset.day);
    const currentStatus = target.dataset.status === 'true';
    const newStatus = !currentStatus;

    if (!allPVZData[currentPVZ].schedules[emp]) {
        allPVZData[currentPVZ].schedules[emp] = {};
    }

    allPVZData[currentPVZ].schedules[emp][`${year}-${month}-${day}`] = newStatus;
    renderSchedule();
    await saveToFirestore();
    showNotification(`${emp}: ${newStatus ? '✅ рабочий день' : '❌ выходной'} на ${day}.${month}.${year}`, false);
}

// ========================================
// РАСЧЁТ ЗАРПЛАТЫ
// ========================================

function getEmployeeMonthData(employeeName, year, month) {
    const monthKey = getMonthKey(year, month);
    if (!salaryData[employeeName]) salaryData[employeeName] = {};
    if (!salaryData[employeeName][monthKey]) {
        salaryData[employeeName][monthKey] = { 
            rate: 1500, 
            traineeDays: 0, 
            traineeRate: 800, 
            advance: 0, 
            moneyTransferred: 0, 
            fine: 0 
        };
    }
    return salaryData[employeeName][monthKey];
}

function calculateWorkDaysForEmployee(employeeFullName, year, month) {
    let totalWorkDays = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let pvzName in allPVZData) {
        const schedules = allPVZData[pvzName].schedules[employeeFullName];
        if (!schedules) continue;
        for (let day = 1; day <= daysInMonth; day++) {
            const key = `${year}-${month}-${day}`;
            if (schedules[key] === true) totalWorkDays++;
        }
    }
    return totalWorkDays;
}

function calculateTotalExtraForMonth(employeeFullName, year, month) {
    let total = 0;
    const works = extraWorks[employeeFullName] || [];
    for (let work of works) {
        const [workYear, workMonth] = work.date.split('-');
        if (parseInt(workYear) === year && parseInt(workMonth) === month) {
            total += work.amount || 0;
        }
    }
    return total;
}

function calculateTotalFinesForMonth(employeeFullName, year, month) {
    let total = 0;
    const employeeFines = fines[employeeFullName] || [];
    for (let fine of employeeFines) {
        const [fineYear, fineMonth] = fine.date.split('-');
        if (parseInt(fineYear) === year && parseInt(fineMonth) === month) {
            total += fine.amount || 0;
        }
    }
    return total;
}

function calculateNetSalary(empFullName, year, month) {
    const monthData = getEmployeeMonthData(empFullName, year, month);
    const workDays = calculateWorkDaysForEmployee(empFullName, year, month);
    const baseSalary = workDays * monthData.rate;
    const traineeBonus = monthData.traineeDays * monthData.traineeRate;
    const extraAmount = calculateTotalExtraForMonth(empFullName, year, month);
    const totalFines = calculateTotalFinesForMonth(empFullName, year, month);
    monthData.fine = totalFines;
    const total = baseSalary + extraAmount + traineeBonus - monthData.advance - monthData.moneyTransferred - totalFines;
    return Math.max(0, total);
}

function renderSalaryTable() {
    const tbody = document.getElementById("salaryTableBody");
    if (!tbody) return;

    tbody.innerHTML = '';
    let totalMonthSalary = 0;

    for (let emp of globalEmployees) {
        const monthData = getEmployeeMonthData(emp.fullName, currentDashboardYear, currentDashboardMonth);
        const workDays = calculateWorkDaysForEmployee(emp.fullName, currentDashboardYear, currentDashboardMonth);
        const extraThisMonth = calculateTotalExtraForMonth(emp.fullName, currentDashboardYear, currentDashboardMonth);
        const finesThisMonth = calculateTotalFinesForMonth(emp.fullName, currentDashboardYear, currentDashboardMonth);
        const netSalary = calculateNetSalary(emp.fullName, currentDashboardYear, currentDashboardMonth);
        totalMonthSalary += netSalary;

        const row = tbody.insertRow();
        row.insertCell(0).innerHTML = `<strong>${escapeHtml(emp.fullName)}</strong>`;
        row.insertCell(1).innerHTML = `<span class="readonly-cell" style="display:inline-block; width:100%; text-align:center; font-weight:700;">${workDays}</span>`;
        row.insertCell(2).innerHTML = `<input type="number" class="salary-rate" data-name="${emp.fullName}" value="${monthData.rate}" step="100">`;
        row.insertCell(3).innerHTML = `<span class="extra-display" style="font-weight:700; color:#2563eb;">${extraThisMonth}</span>`;
        row.insertCell(4).innerHTML = `<input type="number" class="salary-trainee-days" data-name="${emp.fullName}" value="${monthData.traineeDays}" step="1">`;
        row.insertCell(5).innerHTML = `<input type="number" class="salary-trainee-rate" data-name="${emp.fullName}" value="${monthData.traineeRate}" step="100">`;
        row.insertCell(6).innerHTML = `<input type="number" class="salary-advance" data-name="${emp.fullName}" value="${monthData.advance}" step="500">`;
        row.insertCell(7).innerHTML = `<input type="number" class="salary-money-transferred" data-name="${emp.fullName}" value="${monthData.moneyTransferred}" step="500">`;
        row.insertCell(8).innerHTML = `<span class="fine-display" style="font-weight:700; color:#dc2626;">${finesThisMonth}</span>`;
        row.insertCell(9).innerHTML = `<span class="net-salary-amount" data-name="${emp.fullName}" style="font-weight:700; color:#15803d;">${netSalary} ₽</span>`;
    }

    const totalSpan = document.getElementById("totalSalaryAmount");
    if (totalSpan) totalSpan.innerText = totalMonthSalary.toLocaleString('ru-RU');

    document.querySelectorAll('#salaryTableBody input').forEach(input => {
        input.addEventListener('change', async function() {
            const empName = this.getAttribute('data-name');
            if (empName) {
                const monthData = getEmployeeMonthData(empName, currentDashboardYear, currentDashboardMonth);
                if (this.classList.contains('salary-rate')) monthData.rate = parseFloat(this.value) || 0;
                if (this.classList.contains('salary-trainee-days')) monthData.traineeDays = parseFloat(this.value) || 0;
                if (this.classList.contains('salary-trainee-rate')) monthData.traineeRate = parseFloat(this.value) || 0;
                if (this.classList.contains('salary-advance')) monthData.advance = parseFloat(this.value) || 0;
                if (this.classList.contains('salary-money-transferred')) monthData.moneyTransferred = parseFloat(this.value) || 0;

                const newNetSalary = calculateNetSalary(empName, currentDashboardYear, currentDashboardMonth);
                const netSpan = document.querySelector(`.net-salary-amount[data-name="${empName}"]`);
                if (netSpan) netSpan.innerText = `${newNetSalary} ₽`;

                let total = 0;
                document.querySelectorAll('.net-salary-amount').forEach(el => {
                    const val = parseFloat(el.innerText);
                    if (!isNaN(val)) total += val;
                });
                const totalSpan = document.getElementById("totalSalaryAmount");
                if (totalSpan) totalSpan.innerText = total.toLocaleString('ru-RU');

                await saveToFirestore();
            }
        });
    });
}

// ========================================
// АНАЛИТИКА
// ========================================

function renderAnalytics() {
    const tbody = document.getElementById("analyticsTableBody");
    const thead = document.getElementById("analyticsTableHeader");
    if (!tbody || !thead) return;

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === selectedYear && (today.getMonth() + 1) === selectedMonth);

    let headerHtml = '<tr><th style="min-width: 140px; position: sticky; left: 0; background: #1e293b; z-index: 20;">👤 Сотрудник</th>';
    for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = getDayOfWeek(selectedYear, selectedMonth, day);
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const isToday = isCurrentMonth && today.getDate() === day;
        let bgStyle = '';
        if (isWeekend) bgStyle = 'background: #991b1b;';
        if (isToday) bgStyle = 'background: #f59e0b;';
        headerHtml += `<th style="${bgStyle} width: 70px;"><div>${day}</div><div style="font-size: 0.65rem; opacity: 0.8;">${["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][dayOfWeek]}</div></th>`;
    }
    headerHtml += '<th style="min-width: 70px;">📊 Дней</th></tr>';
    thead.innerHTML = headerHtml;

    tbody.innerHTML = '';
    for (let emp of globalEmployees) {
        let rowHtml = `<tr><td class="employee-name-cell" style="position: sticky; left: 0; background: #f8fafc; z-index: 5;">${escapeHtml(emp.fullName)}</td>`;
        let workDaysCount = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && today.getDate() === day;
            let pvzName = '';
            let colorClass = '';

            for (let pvz in allPVZData) {
                const key = `${selectedYear}-${selectedMonth}-${day}`;
                if (allPVZData[pvz].schedules[emp.fullName]?.[key] === true) {
                    pvzName = pvz;
                    workDaysCount++;
                    colorClass = getPVZColorClass(pvz);
                    break;
                }
            }

            let cellClass = colorClass;
            let cellContent = '';
            if (pvzName) {
                let shortName = pvzName.length > 12 ? pvzName.substring(0, 10) + '..' : pvzName;
                cellContent = `<div class="work-badge">✅</div><span class="pvz-name-small">${escapeHtml(shortName)}</span>`;
            } else {
                cellContent = `<div class="off-badge">❌</div>`;
            }
            if (isToday) cellClass += ' today-highlight';
            rowHtml += `<td class="${cellClass}" style="vertical-align: middle;">${cellContent}</td>`;
        }

        rowHtml += `<td style="text-align: center; font-weight: 700; background: #e0f2fe;">${workDaysCount}</td></tr>`;
        tbody.innerHTML += rowHtml;
    }
}

function getPVZColorClass(pvzName) {
    const colors = {
        "ПВЗ Центральный": "pvz-color-0",
        "ПВЗ Северный": "pvz-color-1",
        "ПВЗ Южный": "pvz-color-2",
        "ПВЗ Восточный": "pvz-color-3"
    };
    return colors[pvzName] || "pvz-color-default";
}

// ========================================
// ЭКСТРЕННЫЕ КОНТАКТЫ
// ========================================

function loadPublicEmergencyForm() {
    populatePublicEmployeeSelect();
    clearPublicEmergencyForm();
}

function populatePublicEmployeeSelect() {
    const select = document.getElementById("publicEmployeeSelect");
    if (!select) return;
    select.innerHTML = '<option value="">-- Выберите сотрудника из списка --</option>';
    globalEmployees.forEach(emp => {
        const option = document.createElement("option");
        option.value = emp.fullName;
        option.textContent = emp.fullName;
        select.appendChild(option);
    });
}

function clearPublicEmergencyForm() {
    document.getElementById("publicEmployeeSelect").value = "";
    document.getElementById("publicEmployeeAddress").value = "";
    const container = document.getElementById("publicContactsContainer");
    if (container) {
        container.innerHTML = `
            <div class="emergency-form-row contact-row">
                <input type="text" class="contact-name-input" placeholder="ФИО контакта *">
                <input type="text" class="contact-phone-input" placeholder="Телефон *">
                <input type="text" class="contact-relation-input" placeholder="Кем приходится">
                <button type="button" class="delete-contact-btn remove-contact-row" style="display: none;">✕</button>
            </div>
        `;
    }
}

async function savePublicEmergencyContacts() {
    const selectedEmployee = document.getElementById("publicEmployeeSelect").value;
    if (!selectedEmployee) { alert("Выберите сотрудника"); return; }

    const address = document.getElementById("publicEmployeeAddress").value.trim();
    if (!address) { alert("Введите место проживания"); return; }

    const contacts = [];
    const rows = document.querySelectorAll('#publicContactsContainer .contact-row');
    rows.forEach(row => {
        const name = row.querySelector('.contact-name-input')?.value.trim();
        const phone = row.querySelector('.contact-phone-input')?.value.trim();
        const relation = row.querySelector('.contact-relation-input')?.value.trim();
        if (name && phone) {
            contacts.push({ 
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                contactName: name, 
                contactPhone: phone, 
                relation: relation || '' 
            });
        }
    });

    if (contacts.length === 0) {
        alert("Заполните хотя бы один контакт");
        return;
    }

    if (!emergencyContacts[selectedEmployee]) {
        emergencyContacts[selectedEmployee] = { address: "", contacts: [], documents: {} };
    }
    emergencyContacts[selectedEmployee].address = address;
    emergencyContacts[selectedEmployee].contacts = contacts;

    await saveToFirestore();
    showNotification("✅ Экстренные контакты сохранены!", false);
    clearPublicEmergencyForm();
}

// ========================================
// ЧАТ
// ========================================

function populateChatPVZSelect() {
    const select = document.getElementById("chatPVZSelect");
    if (!select) return;
    select.innerHTML = '<option value="">-- Выберите ПВЗ отправителя --</option>';
    for (let pvzName in allPVZData) {
        const option = document.createElement("option");
        option.value = pvzName;
        option.textContent = pvzName;
        select.appendChild(option);
    }
}

// ========================================
// ПРОВЕРКА ПАРОЛЯ
// ========================================

function checkAdminPassword() {
    const pwd = prompt("Введите пароль администратора:");
    return pwd === "zina6535564";
}

// ========================================
// РАБОТА С FIRESTORE
// ========================================

async function saveToFirestore() {
    if (isLoading) return;
    try {
        const db = firebase.firestore();
        await db.collection("appData").doc("globalEmployees").set({ employees: globalEmployees });
        await db.collection("appData").doc("allPVZData").set({ data: allPVZData });
        await db.collection("appData").doc("currentPVZ").set({ name: currentPVZ });
        await db.collection("appData").doc("salaryData").set({ data: salaryData });
        await db.collection("appData").doc("extraWorks").set({ data: extraWorks });
        await db.collection("appData").doc("fines").set({ data: fines });
        await db.collection("appData").doc("emergencyContacts").set({ data: emergencyContacts });
        console.log("✅ Данные сохранены в Firestore");
    } catch (error) {
        console.error("❌ Ошибка сохранения:", error);
    }
}

async function loadFromFirestore() {
    isLoading = true;
    try {
        const db = firebase.firestore();

        const employeesDoc = await db.collection("appData").doc("globalEmployees").get();
        if (employeesDoc.exists) {
            globalEmployees = employeesDoc.data().employees || [];
        } else {
            globalEmployees = getDefaultEmployees();
            await saveToFirestore();
        }

        const pvzDoc = await db.collection("appData").doc("allPVZData").get();
        if (pvzDoc.exists) {
            allPVZData = pvzDoc.data().data || {};
        } else {
            allPVZData = getDefaultPVZData();
            await saveToFirestore();
        }

        const currentPVZDoc = await db.collection("appData").doc("currentPVZ").get();
        currentPVZ = (currentPVZDoc.exists && allPVZData[currentPVZDoc.data().name]) 
            ? currentPVZDoc.data().name 
            : Object.keys(allPVZData)[0];

        const salaryDoc = await db.collection("appData").doc("salaryData").get();
        if (salaryDoc.exists) salaryData = salaryDoc.data().data || {};

        const extraDoc = await db.collection("appData").doc("extraWorks").get();
        if (extraDoc.exists) extraWorks = extraDoc.data().data || {};

        const finesDoc = await db.collection("appData").doc("fines").get();
        if (finesDoc.exists) fines = finesDoc.data().data || {};

        const emergencyDoc = await db.collection("appData").doc("emergencyContacts").get();
        if (emergencyDoc.exists) emergencyContacts = emergencyDoc.data().data || {};

        isLoading = false;
        console.log("✅ Данные загружены из Firestore");
        return true;
    } catch (error) {
        console.error("❌ Ошибка загрузки:", error);
        isLoading = false;
        return false;
    }
}

// ========================================
// ПОКАЗАТЬ ПОДВКЛАДКУ СОТРУДНИКОВ
// ========================================

function showEmployeesSubtab(subtabId) {
    document.getElementById("employeesListSubtab").style.display = subtabId === 'list' ? 'block' : 'none';
    document.getElementById("employeesEmergencySubtab").style.display = subtabId === 'emergency' ? 'block' : 'none';

    document.querySelectorAll('.employees-sub-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-employees-subtab') === subtabId) {
            btn.classList.add('active');
        }
    });

    if (subtabId === 'emergency') {
        loadPublicEmergencyForm();
    }
}

// ========================================
// ДОБАВЛЕНИЕ СОТРУДНИКА В ПВЗ
// ========================================

async function addEmployeeToPVZ() {
    const empFullName = document.getElementById("availableEmployeesSelect").value;
    if (!empFullName) { alert("Выберите сотрудника"); return; }

    const currentEmps = getEmployeesForMonth(currentPVZ, selectedYear, selectedMonth);
    if (!currentEmps.includes(empFullName)) {
        addEmployeeToMonth(currentPVZ, selectedYear, selectedMonth, empFullName);
        updatePVZEmployeesUI();
        renderSchedule();
        await saveToFirestore();
        showNotification(`✅ ${empFullName} добавлен в ПВЗ`, false);
    } else {
        alert("Сотрудник уже добавлен в этом месяце");
    }
}

async function removeEmployeeFromPVZ(empFullName) {
    if (!checkAdminPassword()) return;
    if (!confirm(`Удалить "${empFullName}" из ПВЗ "${currentPVZ}" за ${getMonthName(selectedMonth)} ${selectedYear}?`)) return;

    removeEmployeeFromMonth(currentPVZ, selectedYear, selectedMonth, empFullName);
    updatePVZEmployeesUI();
    renderSchedule();
    await saveToFirestore();
    showNotification(`❌ ${empFullName} удалён из ПВЗ`, false);
}

// ========================================
// ========================================
// МОДУЛЬ ЧЕКИН
// ========================================
// ========================================

function loadPvzOpenTimes() {
    const saved = localStorage.getItem('pvzOpenTimes');
    if (saved) {
        pvzOpenTimes = JSON.parse(saved);
    } else {
        pvzOpenTimes = {};
        for (let pvzName in allPVZData) {
            pvzOpenTimes[pvzName] = '09:00';
        }
        if (allPVZData['ПВЗ Центральный']) pvzOpenTimes['ПВЗ Центральный'] = '09:00';
        if (allPVZData['ПВЗ Северный']) pvzOpenTimes['ПВЗ Северный'] = '10:00';
        if (allPVZData['ПВЗ Южный']) pvzOpenTimes['ПВЗ Южный'] = '08:30';
        if (allPVZData['ПВЗ Восточный']) pvzOpenTimes['ПВЗ Восточный'] = '11:00';
        savePvzOpenTimes();
    }
    renderPvzTimeSettings();
}

function savePvzOpenTimes() {
    localStorage.setItem('pvzOpenTimes', JSON.stringify(pvzOpenTimes));
}

function renderPvzTimeSettings() {
    const container = document.getElementById('pvzTimeList');
    if (!container) return;
    
    container.innerHTML = '';
    for (let pvzName in allPVZData) {
        const time = pvzOpenTimes[pvzName] || '09:00';
        const row = document.createElement('div');
        row.className = 'pvz-time-row';
        row.innerHTML = `
            <label>🏪 ${pvzName}</label>
            <input type="time" value="${time}" data-pvz="${pvzName}" class="pvz-time-input">
            <span style="font-size: 0.75rem; color: #64748b;">(открытие)</span>
        `;
        container.appendChild(row);
    }
}

function loadCheckinData() {
    const saved = localStorage.getItem('checkinData');
    if (saved) {
        checkinData = JSON.parse(saved);
    } else {
        checkinData = {};
        globalEmployees.forEach(emp => {
            checkinData[emp.fullName] = {
                today: {
                    status: 'pending',
                    time: null,
                    pvz: null
                }
            };
        });
    }
    renderCheckinStatus();
    updateMyCheckinStatus();
}

function saveCheckinData() {
    localStorage.setItem('checkinData', JSON.stringify(checkinData));
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const display = document.getElementById('currentTimeDisplay');
    if (display) display.textContent = timeStr;
    
    const dateDisplay = document.getElementById('todayDateDisplay');
    if (dateDisplay) dateDisplay.textContent = dateStr;
}

function isEmployeeWorkingToday(employeeFullName, pvzName) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    if (allPVZData[pvzName] && allPVZData[pvzName].schedules[employeeFullName]) {
        const key = `${year}-${month}-${day}`;
        return allPVZData[pvzName].schedules[employeeFullName][key] === true;
    }
    return false;
}

function getEmployeePVZToday(employeeFullName) {
    for (let pvzName in allPVZData) {
        if (isEmployeeWorkingToday(employeeFullName, pvzName)) {
            return pvzName;
        }
    }
    return null;
}

// ========================================
// ПРОВЕРКА ПРОПУСКОВ (за 30 минут ДО открытия)
// ========================================

function checkMissedCheckins() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    console.log(`🔍 Проверка чекинов в ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    
    globalEmployees.forEach(emp => {
        const empData = checkinData[emp.fullName];
        if (!empData || !empData.today) return;
        
        const pvz = getEmployeePVZToday(emp.fullName);
        if (!pvz) {
            if (empData.today.status === 'pending' || empData.today.status === 'missed') {
                empData.today.status = 'not-working';
                empData.today.pvz = null;
            }
            return;
        }
        
        if (empData.today.status === 'confirmed') return;
        
        const openTime = pvzOpenTimes[pvz] || '09:00';
        const [openHour, openMinute] = openTime.split(':').map(Number);
        const openMinutes = openHour * 60 + openMinute;
        const deadlineMinutes = openMinutes - 30;
        
        if (currentMinutes >= deadlineMinutes && empData.today.status === 'pending') {
            empData.today.status = 'missed';
            empData.today.pvz = pvz;
            notifyManager(emp.fullName, pvz);
        }
    });
    
    saveCheckinData();
    renderCheckinStatus();
    updateMyCheckinStatus();
}

// ========================================
// УВЕДОМЛЕНИЕ ЧЕРЕЗ ПРОКСИ (ОБХОД CORS)
// ========================================

function notifyManager(employeeName, pvzName) {
    const openTime = pvzOpenTimes[pvzName] || '09:00';
    const deadlineTime = getDeadlineTime(openTime);
    const phone = MANAGER_PHONE;
    
    const message = `⚠️ СРОЧНО! Сотрудник ${employeeName} НЕ ОТМЕТИЛСЯ на смену в ${pvzName}! Дедлайн был в ${deadlineTime}. ПВЗ открывается в ${openTime}. Свяжитесь с сотрудником немедленно!`;
    
    console.log(`📞 [${new Date().toLocaleTimeString()}] Уведомление для ${employeeName}`);
    console.log(`📞 ПВЗ: ${pvzName}, Открытие: ${openTime}, Дедлайн: ${deadlineTime}`);
    console.log(`📞 Номер руководителя: +${phone}`);
    
    // Используем прокси для обхода CORS
    const proxyUrl = new URL(`proxy.html?action=call&phone=${phone}`, window.location.href).href;
    window.open(proxyUrl, '_blank');
    showNotification(`📞 Открыта страница звонка для ${employeeName}`, false);
    
    // Логируем
    const logs = JSON.parse(localStorage.getItem('checkinLogs') || '[]');
    logs.push({
        employee: employeeName,
        pvz: pvzName,
        openTime: openTime,
        deadline: deadlineTime,
        time: new Date().toISOString(),
        message: message,
        notified: true,
        method: 'proxy'
    });
    localStorage.setItem('checkinLogs', JSON.stringify(logs));
}

// ========================================
// АЛЬТЕРНАТИВНОЕ УВЕДОМЛЕНИЕ (FALLBACK)
// ========================================

function fallbackNotify(employeeName, pvzName, message, error) {
    console.log(`⚠️ [FALLBACK] Уведомление для ${employeeName}:`, message);
    console.log(`❌ Причина:`, error);
    
    const openTime = pvzOpenTimes[pvzName] || '09:00';
    const deadlineTime = getDeadlineTime(openTime);
    
    const manualUrl = `${ZVONOK_MANUAL_URL}?phone=${MANAGER_PHONE}&message=${encodeURIComponent(message)}`;
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = 'background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 12px; margin-bottom: 10px; z-index: 10000; position: fixed; top: 20px; right: 20px; max-width: 350px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    notification.innerHTML = `
        <div style="font-weight: 700; color: #dc2626; font-size: 1rem;">🚨 СРОЧНО!</div>
        <div style="font-weight: 600; color: #92400e; margin-top: 4px;">${employeeName} не отметился!</div>
        <div style="font-size: 0.85rem; color: #78350f; margin-top: 4px;">🏪 ${pvzName}</div>
        <div style="font-size: 0.8rem; color: #92400e;">⏰ Открытие в ${openTime} | Дедлайн был в ${deadlineTime}</div>
        <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="window.open('${manualUrl}', '_blank')" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-weight: 700; font-size: 1rem;">
                📞 СРОЧНО ПОЗВОНИТЬ!
            </button>
            <button onclick="this.parentElement.parentElement.remove()" style="background: #e2e8f0; border: none; padding: 10px 16px; border-radius: 20px; cursor: pointer;">
                ✕ Закрыть
            </button>
        </div>
        <div style="font-size: 0.65rem; color: #78350f; margin-top: 8px; border-top: 1px solid #fde68a; padding-top: 6px; word-break: break-all;">
            🔗 ${manualUrl}
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 60000);
}

// ========================================
// ПОДТВЕРЖДЕНИЕ ЧЕКИНА
// ========================================

async function confirmCheckin() {
    const employeeSelect = document.getElementById('checkinEmployeeSelect');
    const btn = document.getElementById('checkinConfirmBtn');
    
    const employee = employeeSelect?.value;
    
    if (!employee) {
        showNotification('❌ Выберите себя!', true);
        return;
    }
    
    const pvz = getEmployeePVZToday(employee);
    
    if (!pvz) {
        showNotification(`❌ У вас сегодня нет смены!`, true);
        return;
    }
    
    if (checkinData[employee] && checkinData[employee].today && checkinData[employee].today.status === 'confirmed') {
        showNotification(`✅ Вы уже отметились сегодня!`, false);
        return;
    }
    
    if (!checkinData[employee]) {
        checkinData[employee] = {};
    }
    
    checkinData[employee].today = {
        status: 'confirmed',
        time: new Date().toISOString(),
        pvz: pvz
    };
    
    saveCheckinData();
    renderCheckinStatus();
    updateMyCheckinStatus();
    updateShiftInfo();
    populateCheckinSelects();
    
    showNotification(`✅ ${employee} подтвердил выход на смену в ${pvz}!`, false);
    
    btn.textContent = '✅ Отмечен!';
    btn.classList.add('confirmed');
    btn.disabled = true;
    
    setTimeout(() => {
        btn.textContent = '✅ Подтвердить выход на смену';
        btn.classList.remove('confirmed');
        btn.disabled = false;
    }, 5000);
}

function populateCheckinSelects() {
    const empSelect = document.getElementById('checkinEmployeeSelect');
    if (empSelect) {
        const currentValue = empSelect.value;
        empSelect.innerHTML = '<option value="">-- Выберите себя --</option>';
        globalEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.fullName;
            option.textContent = emp.fullName;
            empSelect.appendChild(option);
        });
        if (currentValue) empSelect.value = currentValue;
    }
}

function updateShiftInfo() {
    const employee = document.getElementById('checkinEmployeeSelect')?.value;
    const shiftInfo = document.getElementById('shiftInfo');
    const shiftText = document.getElementById('shiftInfoText');
    
    if (!employee) {
        shiftInfo.style.display = 'none';
        return;
    }
    
    const pvz = getEmployeePVZToday(employee);
    const empData = checkinData[employee];
    const isConfirmed = empData && empData.today && empData.today.status === 'confirmed';
    
    shiftInfo.style.display = 'block';
    
    if (pvz && !isConfirmed) {
        const openTime = pvzOpenTimes[pvz] || '09:00';
        const deadlineTime = getDeadlineTime(openTime);
        
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [openHour, openMinute] = openTime.split(':').map(Number);
        const deadlineMinutes = (openHour * 60 + openMinute) - 30;
        
        const isDeadlinePassed = currentMinutes >= deadlineMinutes;
        
        shiftText.innerHTML = `
            <div style="font-size: 1rem; font-weight: 600; color: #15803d;">✅ Вы работаете сегодня</div>
            <div style="font-size: 0.95rem; color: #1e293b; margin-top: 4px;">🏪 ${pvz}</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">⏰ Открытие в ${openTime}</div>
            <div style="font-size: 0.85rem; color: ${isDeadlinePassed ? '#dc2626' : '#f59e0b'}; margin-top: 4px; font-weight: 600;">
                ⚠️ Отметиться нужно ДО ${deadlineTime} (за 30 минут до открытия)
                ${isDeadlinePassed ? ' ❌ Время вышло!' : ''}
            </div>
        `;
    } else if (pvz && isConfirmed) {
        const time = new Date(empData.today.time);
        const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        shiftText.innerHTML = `
            <div style="font-size: 1rem; font-weight: 600; color: #15803d;">✅ Вы уже отметились!</div>
            <div style="font-size: 0.95rem; color: #1e293b; margin-top: 4px;">🏪 ${pvz}</div>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">🕐 Отметились в ${timeStr}</div>
        `;
    } else {
        shiftText.innerHTML = `
            <div style="font-size: 1rem; font-weight: 600; color: #991b1b;">❌ У вас нет смены сегодня</div>
        `;
    }
}

function updateMyCheckinStatus() {
    const container = document.getElementById('myCheckinStatus');
    if (!container) return;
    
    const employee = document.getElementById('checkinEmployeeSelect')?.value;
    if (!employee) {
        container.style.display = 'none';
        return;
    }
    
    const empData = checkinData[employee];
    if (!empData || !empData.today) {
        container.style.display = 'none';
        return;
    }
    
    const status = empData.today.status;
    const pvz = empData.today.pvz;
    const time = empData.today.time;
    
    container.style.display = 'block';
    container.className = status;
    
    let text = '';
    if (status === 'confirmed') {
        const timeStr = new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        text = `✅ Вы отметились в ${pvz} в ${timeStr}`;
    } else if (status === 'missed') {
        const pvzWorking = getEmployeePVZToday(employee);
        const openTime = pvzOpenTimes[pvzWorking] || '09:00';
        const deadlineTime = getDeadlineTime(openTime);
        text = `❌ ВЫ НЕ ОТМЕТИЛИСЬ! Дедлайн был в ${deadlineTime}. Срочно свяжитесь с руководителем!`;
    } else if (status === 'pending') {
        const pvzWorking = getEmployeePVZToday(employee);
        if (pvzWorking) {
            const openTime = pvzOpenTimes[pvzWorking] || '09:00';
            const deadlineTime = getDeadlineTime(openTime);
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const [openHour, openMinute] = openTime.split(':').map(Number);
            const deadlineMinutes = (openHour * 60 + openMinute) - 30;
            const isDeadlinePassed = currentMinutes >= deadlineMinutes;
            
            text = `⏳ Ожидаем ваш чекин в ${pvzWorking}`;
            if (isDeadlinePassed) {
                text += ` ⚠️ ДЕДЛАЙН ПРОШЁЛ! (нужно было до ${deadlineTime})`;
            } else {
                text += ` ⏰ Отметьтесь ДО ${deadlineTime}`;
            }
        } else {
            text = `📅 У вас нет смены сегодня`;
        }
    } else if (status === 'not-working') {
        text = `📅 У вас нет смены сегодня`;
    }
    
    container.textContent = text;
}

function renderCheckinStatus() {
    const container = document.getElementById('checkinStatusList');
    if (!container) return;
    
    let confirmedCount = 0;
    let pendingCount = 0;
    let missedCount = 0;
    let notWorkingCount = 0;
    
    let html = '';
    
    globalEmployees.forEach(emp => {
        const empData = checkinData[emp.fullName];
        let status = 'pending';
        let time = null;
        let pvz = null;
        
        if (empData && empData.today) {
            status = empData.today.status || 'pending';
            time = empData.today.time;
            pvz = empData.today.pvz;
        }
        
        if (status === 'pending' || status === 'not-working') {
            const workingPvz = getEmployeePVZToday(emp.fullName);
            if (!workingPvz) {
                status = 'not-working';
            } else if (status === 'pending') {
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const openTime = pvzOpenTimes[workingPvz] || '09:00';
                const [openHour, openMinute] = openTime.split(':').map(Number);
                const openMinutes = openHour * 60 + openMinute;
                const deadlineMinutes = openMinutes - 30;
                
                if (currentMinutes >= deadlineMinutes) {
                    status = 'missed';
                    if (empData) {
                        empData.today.status = 'missed';
                        empData.today.pvz = workingPvz;
                    }
                    const logs = JSON.parse(localStorage.getItem('checkinLogs') || '[]');
                    const alreadyNotified = logs.some(log => 
                        log.employee === emp.fullName && 
                        new Date(log.time).toDateString() === new Date().toDateString()
                    );
                    if (!alreadyNotified) {
                        notifyManager(emp.fullName, workingPvz);
                    }
                }
            }
        }
        
        if (status === 'confirmed') confirmedCount++;
        else if (status === 'missed') missedCount++;
        else if (status === 'not-working') notWorkingCount++;
        else pendingCount++;
        
        let statusText = '';
        let statusClass = '';
        let timeStr = '';
        let pvzDisplay = '';
        
        if (status === 'confirmed') {
            statusText = '✅ Отметил(а)ся';
            statusClass = 'confirmed';
            if (time) {
                const date = new Date(time);
                timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
            if (pvz) pvzDisplay = `🏪 ${pvz}`;
        } else if (status === 'missed') {
            statusText = '❌ Пропустил(а)';
            statusClass = 'missed';
            if (pvz) pvzDisplay = `🏪 ${pvz}`;
        } else if (status === 'not-working') {
            statusText = '📅 Не работает';
            statusClass = 'not-working';
        } else {
            const workingPvz = getEmployeePVZToday(emp.fullName);
            statusText = '⏳ Ожидает';
            statusClass = 'pending';
            if (workingPvz) pvzDisplay = `🏪 ${workingPvz}`;
        }
        
        html += `
            <div class="checkin-status-item">
                <span class="checkin-status-employee">👤 ${emp.fullName}</span>
                ${pvzDisplay ? `<span class="checkin-status-pvz">${pvzDisplay}</span>` : ''}
                ${timeStr ? `<span class="checkin-status-time">🕐 ${timeStr}</span>` : ''}
                <span class="checkin-status-badge ${statusClass}">${statusText}</span>
            </div>
        `;
    });
    
    const statsHtml = `
        <div style="display: flex; gap: 20px; padding: 12px 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; flex-wrap: wrap;">
            <span style="font-weight: 600;">📊 Статистика:</span>
            <span style="color: #15803d;">✅ Отметились: ${confirmedCount}</span>
            <span style="color: #92400e;">⏳ Ожидают: ${pendingCount}</span>
            <span style="color: #991b1b;">❌ Пропустили: ${missedCount}</span>
            <span style="color: #64748b;">📅 Не работают: ${notWorkingCount}</span>
            <span style="color: #1e293b;">👥 Всего: ${globalEmployees.length}</span>
        </div>
    `;
    
    container.innerHTML = statsHtml + html;
}

function toggleTimeSettings() {
    const content = document.getElementById('timeSettingsContent');
    if (content.style.display === 'block') {
        content.style.display = 'none';
    } else {
        if (checkAdminPassword()) {
            content.style.display = 'block';
            renderPvzTimeSettings();
        }
    }
}

function toggleStaffStatus() {
    const content = document.getElementById('staffStatusContent');
    if (content.style.display === 'block') {
        content.style.display = 'none';
    } else {
        if (checkAdminPassword()) {
            content.style.display = 'block';
            renderCheckinStatus();
        }
    }
}

function savePvzTimes() {
    if (!checkAdminPassword()) return;
    
    const inputs = document.querySelectorAll('.pvz-time-input');
    inputs.forEach(input => {
        const pvz = input.dataset.pvz;
        const time = input.value;
        if (pvz && time) {
            pvzOpenTimes[pvz] = time;
        }
    });
    
    savePvzOpenTimes();
    showNotification('✅ Настройки времени сохранены!', false);
    document.getElementById('timeSettingsContent').style.display = 'none';
}

// ========================================
// ТЕСТОВАЯ ФУНКЦИЯ (через прокси)
// ========================================

window.testZvonokCall = function() {
    const phone = MANAGER_PHONE || "79299007708";
    
    console.log('📞 Отправка звонка через прокси...');
    console.log('📞 Номер: +' + phone);
    
    // Используем прокси для обхода CORS
    const proxyUrl = new URL(`proxy.html?action=call&phone=${phone}`, window.location.href).href;
    
    console.log('📞 Открываем прокси:', proxyUrl);
    
    // Открываем прокси в новой вкладке
    window.open(proxyUrl, '_blank');
    alert('✅ Страница прокси открыта! Звонок отправляется...');
};

// ========================================
// ПРОВЕРКА СТАТУСА (через прокси)
// ========================================

window.checkCallStatus = function(phone = MANAGER_PHONE) {
    console.log('📊 Проверка статуса через прокси...');
    
    const proxyUrl = `/proxy.html?action=status&phone=${phone}`;
    window.open(proxyUrl, '_blank');
    alert('📊 Страница прокси открыта!');
};

console.log('📞 Для теста звонка выполните: testZvonokCall()');
console.log('📞 Для проверки статуса выполните: checkCallStatus()');
console.log('📞 Номер руководителя: +' + MANAGER_PHONE);
console.log('⏰ Система оповещает за 30 минут ДО открытия ПВЗ');

// ========================================
// НАСТРОЙКА ОБРАБОТЧИКОВ
// ========================================

function setupEventListeners() {
    document.getElementById("employeesCornerBtn")?.addEventListener("click", () => switchTab('employees'));
    document.getElementById("analyticsCornerBtn")?.addEventListener("click", () => switchTab('analytics'));
    document.getElementById("dashboardCornerBtn")?.addEventListener("click", () => switchTab('dashboard'));
    document.getElementById("chatCornerBtn")?.addEventListener("click", () => switchTab('chat'));
    document.getElementById("checkinCornerBtn")?.addEventListener("click", () => switchTab('checkin'));

    document.getElementById("addEmployeeBtnGlobal")?.addEventListener("click", addGlobalEmployee);
    document.getElementById("addToPVZBtn")?.addEventListener("click", addEmployeeToPVZ);
    document.getElementById("editPVZNameBtn")?.addEventListener("click", editCurrentPVZName);
    document.getElementById("deletePVZBtn")?.addEventListener("click", deleteCurrentPVZ);

    document.getElementById("monthSelect")?.addEventListener("change", (e) => {
        [selectedYear, selectedMonth] = e.target.value.split("-").map(Number);
        updatePVZEmployeesUI();
        renderSchedule();
    });

    document.getElementById("goToCurrentMonthBtn")?.addEventListener("click", () => {
        const now = new Date();
        selectedYear = now.getFullYear();
        selectedMonth = now.getMonth() + 1;
        document.getElementById("monthSelect").value = `${selectedYear}-${selectedMonth}`;
        updatePVZEmployeesUI();
        renderSchedule();
    });

    document.getElementById("scheduleGrid")?.addEventListener("click", toggleStatus);

    document.querySelectorAll('.employees-sub-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const subtab = btn.getAttribute('data-employees-subtab');
            showEmployeesSubtab(subtab);
        });
    });

    document.getElementById("savePublicEmergencyContactsBtn")?.addEventListener("click", savePublicEmergencyContacts);

    document.getElementById("addMoreContactsBtn")?.addEventListener("click", () => {
        const container = document.getElementById("publicContactsContainer");
        if (!container) return;
        const newRow = document.createElement('div');
        newRow.className = 'emergency-form-row contact-row';
        newRow.innerHTML = `
            <input type="text" class="contact-name-input" placeholder="ФИО контакта *">
            <input type="text" class="contact-phone-input" placeholder="Телефон *">
            <input type="text" class="contact-relation-input" placeholder="Кем приходится">
            <button type="button" class="delete-contact-btn remove-contact-row">✕</button>
        `;
        container.appendChild(newRow);

        document.querySelectorAll('.remove-contact-row').forEach(btn => {
            btn.addEventListener('click', function() {
                const rows = container.querySelectorAll('.contact-row');
                if (rows.length > 1) {
                    this.closest('.contact-row').remove();
                } else {
                    showNotification("Должен быть хотя бы один контакт", true);
                }
            });
        });
    });

    document.getElementById("dashboardMonthSelect")?.addEventListener("change", (e) => {
        [currentDashboardYear, currentDashboardMonth] = e.target.value.split("-").map(Number);
        renderSalaryTable();
    });

    document.getElementById("checkinEmployeeSelect")?.addEventListener("change", function() {
        updateShiftInfo();
        updateMyCheckinStatus();
    });

    document.getElementById("checkinConfirmBtn")?.addEventListener("click", confirmCheckin);
    document.getElementById("toggleTimeSettingsBtn")?.addEventListener("click", toggleTimeSettings);
    document.getElementById("savePvzTimesBtn")?.addEventListener("click", savePvzTimes);
    document.getElementById("toggleStaffStatusBtn")?.addEventListener("click", toggleStaffStatus);
}

// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ========================================

async function initApp() {
    try {
        showNotification("🔄 Загрузка данных...", false);
        await loadFromFirestore();
        setupEventListeners();
        await switchTab(currentPVZ);
        showNotification("✅ Приложение загружено!", false);
        console.log("🚀 PVZ Manager запущен!");
    } catch (error) {
        console.error("❌ Ошибка инициализации:", error);
        showNotification("❌ Ошибка загрузки приложения", true);
    }
}

// ========================================
// ЗАПУСК
// ========================================

function handleLogin() {
    const passwordInput = document.getElementById('passwordInput');
    const errorDiv = document.getElementById('loginError');
    const pwd = passwordInput?.value.trim() || '';

    if (pwd === 'pvz15') {
        localStorage.setItem('app_authorized', 'true');
        const loginScreen = document.getElementById('loginScreen');
        const mainContent = document.getElementById('mainAppContent');
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        if (errorDiv) errorDiv.textContent = '';
        if (passwordInput) passwordInput.value = '';
        initApp();
    } else {
        if (errorDiv) errorDiv.textContent = '❌ Неверный пароль! Попробуйте "pvz15"';
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
}

const isAuthorized = localStorage.getItem('app_authorized') === 'true';

if (isAuthorized) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainAppContent').style.display = 'block';
    initApp();
} else {
    const loginBtn = document.getElementById('submitLoginBtn');
    const passwordInput = document.getElementById('passwordInput');
    
    if (loginBtn) {
        const newBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(newBtn, loginBtn);
        newBtn.addEventListener('click', handleLogin);
        console.log('✅ Кнопка входа настроена!');
    } else {
        console.error('❌ Кнопка входа не найдена!');
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }
}

// Экспорт функций для глобального доступа
window.toggleStatus = toggleStatus;
window.switchTab = switchTab;
window.addGlobalEmployee = addGlobalEmployee;
window.addEmployeeToPVZ = addEmployeeToPVZ;
window.removeEmployeeFromPVZ = removeEmployeeFromPVZ;
window.editCurrentPVZName = editCurrentPVZName;
window.deleteCurrentPVZ = deleteCurrentPVZ;
window.showEmployeesSubtab = showEmployeesSubtab;
window.filterAnalyticsTable = renderAnalytics;
window.filterEmergencyContacts = loadPublicEmergencyForm;

window.confirmCheckin = confirmCheckin;
window.loadCheckinData = loadCheckinData;
window.renderCheckinStatus = renderCheckinStatus;
window.toggleTimeSettings = toggleTimeSettings;
window.toggleStaffStatus = toggleStaffStatus;
window.savePvzTimes = savePvzTimes;

window.testZvonokCall = testZvonokCall;
window.checkCallStatus = checkCallStatus;

console.log('🚀 Приложение готово к работе!');
