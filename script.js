document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let transactions = [];
    let accounts = [];
    let settings = {};
    let expenseChart = null;
    let incomeChart = null;
    let editingTransactionId = null;
    let selectedDate = new Date().toISOString().split('T')[0];
    let selectedMonth = new Date().toISOString().slice(0, 7);

    // DOM Elements
    const dateInput = document.getElementById('selected-date');
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const transactionModal = document.getElementById('transaction-modal');
    const accountModal = document.getElementById('account-modal');
    const appHeader = document.getElementById('app-header');
    const addTransactionBtn = document.getElementById('add-transaction-btn-main');

    // --- INITIALIZATION ---
    function init() {
        loadData();
        loadSettings();
        initializeDatePicker();
        setupEventListeners();
        setupCharts();
        renderCreditBox(); // Panggil fungsi untuk render credit
        updateUI();
    }

    // --- RENDER CREDIT BOX (Tambahan) ---
    function renderCreditBox() {
        const container = document.getElementById('credit-box-container');
        if (container) {
            container.innerHTML = `
                <div class="credit-box">
                    <p class="credit-title">Dibuat oleh:</p>
                    <p>
                        <span class="credit-icon">☕</span> 
                        <span class="credit-name">Andy Rasyadi, S.Pi., M.Si.</span>
                    </p>
                    <p>
                        <span class="credit-icon">🎓</span> 
                        Dosen Fakultas Kelautan dan Perikanan, Univ. Udayana
                    </p>
                </div>
            `;
        }
    }

    // --- DATA PERSISTENCE ---
    function saveData() {
        const data = { transactions, accounts };
        try {
            localStorage.setItem('financeData', JSON.stringify(data));
        } catch (e) {
            console.error('Gagal menyimpan data:', e);
        }
    }

    function loadData() {
        try {
            const raw = localStorage.getItem('financeData');
            if (raw) {
                const data = JSON.parse(raw);
                transactions = data.transactions || [];
                accounts = data.accounts || [];
            }
        } catch (e) {
            console.error('Data financeData rusak atau gagal parse. Mengosongkan data sementara. Error:', e);
            transactions = [];
            accounts = [];
            localStorage.removeItem('financeData');
        }
    }

    function saveSettings() {
        const currencyEl = document.getElementById('currency-select');
        const languageEl = document.getElementById('language-select');
        const startDayEl = document.getElementById('start-day');

        settings = {
            currency: currencyEl ? currencyEl.value : (settings.currency || 'IDR'),
            language: languageEl ? languageEl.value : (settings.language || 'id'),
            startDay: startDayEl ? startDayEl.value : (settings.startDay || '1'),
        };
        try {
            localStorage.setItem('financeSettings', JSON.stringify(settings));
        } catch (e) {
            console.error('Gagal menyimpan pengaturan:', e);
        }

        applySettings();
        alert(settings.language === 'en' ? 'Settings saved successfully!' : 'Pengaturan berhasil disimpan!');
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem('financeSettings');
            if (raw) {
                settings = JSON.parse(raw) || {};
            } else {
                settings = {};
            }
        } catch (e) {
            console.error('Gagal baca financeSettings, mengosongkan pengaturan. Error:', e);
            settings = {};
            localStorage.removeItem('financeSettings');
        }

        const currencySelect = document.getElementById('currency-select');
        const languageSelect = document.getElementById('language-select');
        const startDay = document.getElementById('start-day');

        if (currencySelect) currencySelect.value = settings.currency || 'IDR';
        if (languageSelect) languageSelect.value = settings.language || 'id';
        if (startDay) startDay.value = settings.startDay || '1';
    }
    
    // --- UI UPDATE ---
    function updateUI() {
        renderTransactions();
        renderAccounts();
        updateSummary();
        updateReportSummary();

        const reportTab = document.getElementById('report-tab');
        if (reportTab && !reportTab.classList.contains('hidden')) {
            updateCharts();
        }
    }

    function initializeDatePicker() {
        if (dateInput) dateInput.value = selectedDate;

        if (!document.getElementById('selected-month')) {
            const reportTabHeader = document.querySelector('#report-tab .section-title');
            if (reportTabHeader) {
                const wrapper = document.createElement('div');
                wrapper.style.margin = '10px 0 20px';
                wrapper.innerHTML = `
                    <label style="display:block; margin-bottom:8px; font-weight:600;">Pilih Bulan untuk Rekap</label>
                    <input type="month" id="selected-month" value="${selectedMonth}" style="padding:10px; border-radius:8px; border:1px solid #e9ecef;">
                `;
                reportTabHeader.parentNode.insertBefore(wrapper, reportTabHeader.nextSibling);
            }
        }

        const monthInput = document.getElementById('selected-month');
        if (monthInput) {
            monthInput.value = selectedMonth;
            monthInput.addEventListener('change', () => {
                selectedMonth = monthInput.value;
                updateReportSummary();
                if (!document.getElementById('report-tab').classList.contains('hidden')) updateCharts();
            });
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                selectedDate = dateInput.value;
                updateUI();
            });
        }

        tabs.forEach(button => {
            button.addEventListener('click', () => switchTab(button.dataset.tab));
        });

        const addTrxBtn = document.getElementById('add-transaction-btn-main');
        if (addTrxBtn) addTrxBtn.addEventListener('click', () => showTransactionModal());

        const addAccountBtn = document.getElementById('add-account-btn');
        if (addAccountBtn) addAccountBtn.addEventListener('click', showAccountModal);

        const saveTrxBtn = document.getElementById('save-transaction-btn');
        if (saveTrxBtn) saveTrxBtn.addEventListener('click', saveTransaction);

        const cancelTrxBtn = document.getElementById('cancel-transaction-btn');
        if (cancelTrxBtn) cancelTrxBtn.addEventListener('click', closeModal);

        const saveAccBtn = document.getElementById('save-account-btn');
        if (saveAccBtn) saveAccBtn.addEventListener('click', saveAccount);

        const cancelAccBtn = document.getElementById('cancel-account-btn');
        if (cancelAccBtn) cancelAccBtn.addEventListener('click', closeModal);

        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);

        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportData);

        const clearBtn = document.getElementById('clear-data-btn');
        if (clearBtn) clearBtn.addEventListener('click', clearAllData);

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) closeModal();
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // --- TAB NAVIGATION ---
    function switchTab(tabId) {
        tabs.forEach(btn => btn.classList.remove('active'));
        const btn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (btn) btn.classList.add('active');

        tabContents.forEach(tab => tab.classList.add('hidden'));
        const content = document.getElementById(tabId);
        if (content) content.classList.remove('hidden');

        if (tabId === 'transactions-tab') {
            appHeader.classList.remove('hidden');
            addTransactionBtn.classList.remove('hidden');
        } else {
            appHeader.classList.add('hidden');
            addTransactionBtn.classList.add('hidden');
        }

        if (tabId === 'report-tab') {
            setTimeout(() => {
                updateCharts();
            }, 10);
        } else {
            updateUI();
        }
    }

    // --- MODAL FUNCTIONS ---
    function showTransactionModal(idToEdit = null) {
        editingTransactionId = idToEdit;
        const titleEl = document.getElementById('transaction-modal-title');
        const typeEl = document.getElementById('transaction-type');
        const titleInput = document.getElementById('transaction-title');
        const category = document.getElementById('transaction-category');
        const amount = document.getElementById('transaction-amount');

        if (idToEdit) {
            const trx = transactions.find(t => t.id === idToEdit);
            if (trx) {
                titleEl.textContent = settings.language === 'en' ? 'Edit Transaction' : 'Edit Transaksi';
                typeEl.value = trx.type;
                titleInput.value = trx.title;
                category.value = trx.category;
                amount.value = trx.amount;
            } else {
                editingTransactionId = null;
                titleEl.textContent = settings.language === 'en' ? 'Add Transaction' : 'Tambah Transaksi';
                typeEl.value = 'expense';
                titleInput.value = '';
                category.value = '';
                amount.value = '';
            }
        } else {
            titleEl.textContent = settings.language === 'en' ? 'Add Transaction' : 'Tambah Transaksi';
            typeEl.value = 'expense';
            titleInput.value = '';
            category.value = '';
            amount.value = '';
        }
        transactionModal.classList.add('show');
    }

    function showAccountModal() {
        document.getElementById('account-name').value = '';
        document.getElementById('account-balance').value = '';
        accountModal.classList.add('show');
    }

    function closeModal() {
        transactionModal.classList.remove('show');
        accountModal.classList.remove('show');
        editingTransactionId = null;
    }

    // --- CORE LOGIC ---
    function formatCurrency(amount) {
        const currency = (settings && settings.currency) ? settings.currency : 'IDR';
        const locale = currency === 'IDR' ? 'id-ID' : (currency === 'EUR' ? 'de-DE' : 'en-US');
        const val = Number(amount) || 0;
        return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0 }).format(Math.abs(val));
    }

    function saveTransaction() {
        const type = document.getElementById('transaction-type').value;
        const title = document.getElementById('transaction-title').value.trim();
        const category = document.getElementById('transaction-category').value.trim();
        const amountRaw = document.getElementById('transaction-amount').value;
        const amount = parseFloat(amountRaw);

        if (!title || !category || isNaN(amount) || amount <= 0) {
            alert(settings.language === 'en' ? 'Please fill all fields correctly.' : 'Mohon isi semua field dengan benar.');
            return;
        }

        if (editingTransactionId) {
            const trxIndex = transactions.findIndex(t => t.id === editingTransactionId);
            if (trxIndex > -1) {
                const oldTransaction = { ...transactions[trxIndex] };
                transactions[trxIndex] = { ...transactions[trxIndex], type, title, category, amount };
                
                if (oldTransaction.category === 'Saldo Awal') {
                    updateAccountBalance(oldTransaction.title.replace('Saldo Awal - ', ''), amount);
                }
            }
        } else {
            const newTransaction = { id: Date.now(), type, title, category, amount, date: selectedDate };
            transactions.unshift(newTransaction);
        }

        saveData();
        updateUI();
        closeModal();
    }
    
    function updateAccountBalance(accountName, newAmount) {
        const accountIndex = accounts.findIndex(acc => acc.name === accountName);
        if (accountIndex > -1) {
            accounts[accountIndex].balance = newAmount;
        }
    }


    function deleteTransaction(id) {
        if (confirm(settings.language === 'en' ? 'Are you sure to delete this transaction?' : 'Anda yakin ingin menghapus transaksi ini?')) {
            transactions = transactions.filter(t => t.id !== id);
            saveData();
            updateUI();
        }
    }

    function saveAccount() {
        const name = document.getElementById('account-name').value.trim();
        const balance = parseFloat(document.getElementById('account-balance').value) || 0;

        if (!name) {
            alert(settings.language === 'en' ? 'Please enter account name.' : 'Mohon isi nama rekening.');
            return;
        }

        const newAcc = { id: Date.now(), name, balance };
        accounts.push(newAcc);

        if (balance > 0) {
            const newTransaction = {
                id: Date.now() + 1,
                type: 'income',
                title: `Saldo Awal - ${name}`,
                category: 'Saldo Awal',
                amount: balance,
                date: new Date().toISOString().split('T')[0]
            };
            transactions.unshift(newTransaction);
        }

        saveData();
        updateUI();
        closeModal();
    }

    function deleteAccount(id) {
        if (confirm(settings.language === 'en' ? 'Are you sure to delete this account?' : 'Anda yakin ingin menghapus rekening ini?')) {
            accounts = accounts.filter(a => a.id !== id);
            saveData();
            updateUI();
        }
    }

    // --- RENDER FUNCTIONS ---
    function renderTransactions() {
        const container = document.getElementById('transactions-list');
        if (!container) return;

        const dailyTransactions = transactions.filter(t => t.date === selectedDate);

        if (dailyTransactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 15px;">💳</div>
                    <p>${settings.language === 'en' ? 'No transactions for this date' : 'Belum ada transaksi untuk tanggal ini'}</p>
                    <p style="font-size: 0.9rem; margin-top: 5px;">${settings.language === 'en' ? 'Press + to add transaction' : 'Tekan tombol + untuk menambah transaksi'}</p>
                </div>`;
            return;
        }

        container.innerHTML = dailyTransactions.map(trx => `
            <div class="transaction-item">
                <div class="transaction-details">
                    <div class="transaction-title">${trx.title}</div>
                    <div class="transaction-category">${trx.category}</div>
                </div>
                <div class="transaction-amount ${trx.type}-amount">
                    ${trx.type === 'expense' ? '-' : '+'}${formatCurrency(trx.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" data-id="${trx.id}">${settings.language === 'en' ? 'Edit' : 'Edit'}</button>
                    <button class="action-btn delete-btn" data-id="${trx.id}">${settings.language === 'en' ? 'Delete' : 'Hapus'}</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => showTransactionModal(Number(e.target.dataset.id)));
        });
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteTransaction(Number(e.target.dataset.id)));
        });
    }

    function renderAccounts() {
        const container = document.getElementById('accounts-list');
        if (!container) return;

        if (accounts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 15px;">🏦</div>
                    <p>${settings.language === 'en' ? 'No accounts yet' : 'Belum ada rekening'}</p>
                </div>`;
            return;
        }

        container.innerHTML = accounts.map(acc => `
            <div class="account-card">
                <div class="account-details">
                    <div class="account-name">${acc.name}</div>
                    <div class="account-balance">${formatCurrency(acc.balance)}</div>
                </div>
                <button class="action-btn delete-btn" data-id="${acc.id}">${settings.language === 'en' ? 'Delete' : 'Hapus'}</button>
            </div>
        `).join('');

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteAccount(Number(e.target.dataset.id)));
        });
    }

    function updateSummary() {
        const dailyTransactions = transactions.filter(t => t.date === selectedDate);
        const totalIncome = dailyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = dailyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const difference = totalIncome - totalExpense;

        const incomeEl = document.getElementById('total-income');
        const expenseEl = document.getElementById('total-expense');
        const diffEl = document.getElementById('total-difference');

        if (incomeEl) incomeEl.textContent = formatCurrency(totalIncome);
        if (expenseEl) expenseEl.textContent = formatCurrency(totalExpense);
        if (diffEl) {
            diffEl.textContent = formatCurrency(difference);
            diffEl.className = 'summary-value ' + (difference >= 0 ? 'income' : 'expense');
        }
    }

    function updateReportSummary() {
        const monthFilter = selectedMonth || new Date().toISOString().slice(0, 7);
        const filteredByMonth = transactions.filter(t => t.date && t.date.slice(0, 7) === monthFilter);

        const totalIncome = filteredByMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = filteredByMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        const allAccountsBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        const reportIncomeEl = document.getElementById('report-income');
        const reportExpenseEl = document.getElementById('report-expense');
        const reportBalanceEl = document.getElementById('report-balance');

        if (reportIncomeEl) reportIncomeEl.textContent = formatCurrency(totalIncome);
        if (reportExpenseEl) reportExpenseEl.textContent = formatCurrency(totalExpense);
        if (reportBalanceEl) {
            reportBalanceEl.textContent = formatCurrency(allAccountsBalance);
            reportBalanceEl.className = 'report-value ' + (allAccountsBalance >= 0 ? 'income' : 'expense');
        }
    }
    
    // --- CHART FUNCTIONS ---
    function setupCharts() {
        const pieOptions = (title) => ({
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: title, font: { size: 16, weight: 'bold' } },
                legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, font: { size: 12 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}` } }
            },
            animation: { animateRotate: true, animateScale: true }
        });

        const expenseCtx = document.getElementById('expense-chart')?.getContext('2d');
        const incomeCtx = document.getElementById('income-chart')?.getContext('2d');

        if (expenseChart) expenseChart.destroy();
        if (incomeChart) incomeChart.destroy();

        if (expenseCtx) {
            expenseChart = new Chart(expenseCtx, {
                type: 'pie', options: pieOptions(''),
                data: { labels: [], datasets: [{ data: [], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] }] }
            });
        }

        if (incomeCtx) {
            incomeChart = new Chart(incomeCtx, {
                type: 'pie', options: pieOptions(''),
                data: { labels: [], datasets: [{ data: [], backgroundColor: ['#2ECC71', '#3498DB', '#9B59B6', '#E67E22', '#F1C40F', '#1ABC9C'] }] }
            });
        }
    }

    function updateCharts() {
        if (!expenseChart || !incomeChart) return;

        const monthFilter = selectedMonth || new Date().toISOString().slice(0, 7);
        const filteredByMonth = transactions.filter(t => t.date && t.date.slice(0, 7) === monthFilter);

        const aggregate = (items, type) => {
            return items.filter(t => t.type === type).reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {});
        };

        const expenseData = aggregate(filteredByMonth, 'expense');
        expenseChart.data.labels = Object.keys(expenseData);
        expenseChart.data.datasets[0].data = Object.values(expenseData);
        expenseChart.options.plugins.title.text = settings.language === 'en' ? `Expenses by Category (${monthFilter})` : `Pengeluaran per Kategori (${monthFilter})`;
        expenseChart.update();

        const incomeData = aggregate(filteredByMonth, 'income');
        incomeChart.data.labels = Object.keys(incomeData);
        incomeChart.data.datasets[0].data = Object.values(incomeData);
        incomeChart.options.plugins.title.text = settings.language === 'en' ? `Income by Category (${monthFilter})` : `Pemasukan per Kategori (${monthFilter})`;
        incomeChart.update();
    }
    
    // --- SETTINGS & DATA MANAGEMENT ---
    function exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ transactions, accounts, settings }, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `catatan-keuangan-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function clearAllData() {
        if (confirm(settings.language === 'en' ? 'Are you sure to delete ALL data? This action cannot be undone.' : 'YAKIN ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!')) {
            transactions = [];
            accounts = [];
            localStorage.removeItem('financeData');
            updateUI();
            alert(settings.language === 'en' ? 'All data cleared' : 'Semua data berhasil dihapus!');
        }
    }

    // --- APPLY SETTINGS ---
    function applySettings() {
        applyLanguage();
        // Re-initialize charts to update titles immediately
        setupCharts();
        updateUI();
    }
    
    function applyLanguage() {
        const lang = settings.language || 'id';
        const translations = {
            'id': {
                'INCOME': 'PEMASUKAN', 'EXPENSE': 'PENGELUARAN', 'DIFFERENCE': 'SELISIH',
                'Accounts': 'Daftar Rekening', 'Report': 'Rekap Keuangan', 'Settings': 'Pengaturan',
                'Transactions': 'Transaksi', 'AccountsTab': 'Rekening', 'ReportTab': 'Rekap', 'SettingsTab': 'Pengaturan',
                'Save': 'Simpan', 'Cancel': 'Batal', 'Save Settings': 'Simpan Pengaturan',
                'Export Data': 'Export Data', 'Delete All Data': 'Hapus Semua Data',
                'Edit': 'Edit', 'Delete': 'Hapus'
            },
            'en': {
                'INCOME': 'INCOME', 'EXPENSE': 'EXPENSE', 'DIFFERENCE': 'DIFFERENCE',
                'Accounts': 'Accounts', 'Report': 'Financial Report', 'Settings': 'Settings',
                'Transactions': 'Transactions', 'AccountsTab': 'Accounts', 'ReportTab': 'Report', 'SettingsTab': 'Settings',
                'Save': 'Save', 'Cancel': 'Cancel', 'Save Settings': 'Save Settings',
                'Export Data': 'Export Data', 'Delete All Data': 'Delete All Data',
                'Edit': 'Edit', 'Delete': 'Delete'
            }
        };

        const t = translations[lang];

        document.querySelector('.summary-item:nth-child(1) .summary-label').textContent = t.INCOME;
        document.querySelector('.summary-item:nth-child(2) .summary-label').textContent = t.EXPENSE;
        document.querySelector('.summary-item:nth-child(3) .summary-label').textContent = t.DIFFERENCE;
        
        document.querySelector('.nav-tabs .tab-button[data-tab="transactions-tab"] span').textContent = t.Transactions;
        document.querySelector('.nav-tabs .tab-button[data-tab="accounts-tab"] span').textContent = t.AccountsTab;
        document.querySelector('.nav-tabs .tab-button[data-tab="report-tab"] span').textContent = t.ReportTab;
        document.querySelector('.nav-tabs .tab-button[data-tab="settings-tab"] span').textContent = t.SettingsTab;

        document.getElementById('save-settings-btn').textContent = t['Save Settings'];
        document.getElementById('export-data-btn').textContent = t['Export Data'];
        document.getElementById('clear-data-btn').textContent = t['Delete All Data'];
    }

    // Run the app
    init();
});
