document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let transactions = [];
    let accounts = [];
    let settings = {};
    let expenseChart = null;
    let incomeChart = null;
    let editingTransactionId = null;
    let selectedDate = new Date().toISOString().split('T')[0];

    // DOM Elements
    const dateInput = document.getElementById('selected-date');
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const transactionModal = document.getElementById('transaction-modal');
    const accountModal = document.getElementById('account-modal');

    // --- INITIALIZATION ---
    function init() {
        loadData();
        loadSettings();
        initializeDatePicker();
        setupEventListeners();
        updateUI();
        setupCharts();
    }

    // --- DATA PERSISTENCE (localStorage) ---
    function saveData() {
        const data = { transactions, accounts };
        localStorage.setItem('financeData', JSON.stringify(data));
    }

    function loadData() {
        const data = JSON.parse(localStorage.getItem('financeData'));
        if (data) {
            transactions = data.transactions || [];
            accounts = data.accounts || [];
        }
    }
    
    function saveSettings() {
        settings = {
            currency: document.getElementById('currency-select').value,
            language: document.getElementById('language-select').value,
            startDay: document.getElementById('start-day').value,
        };
        localStorage.setItem('financeSettings', JSON.stringify(settings));
        alert('Pengaturan berhasil disimpan!');
    }

    function loadSettings() {
        const storedSettings = JSON.parse(localStorage.getItem('financeSettings'));
        if (storedSettings) {
            settings = storedSettings;
            document.getElementById('currency-select').value = settings.currency || 'IDR';
            document.getElementById('language-select').value = settings.language || 'id';
            document.getElementById('start-day').value = settings.startDay || '1';
        }
    }

    // --- UI UPDATE ---
    function updateUI() {
        renderTransactions();
        renderAccounts();
        updateSummary();
        if (document.getElementById('report-tab').classList.contains('hidden') === false) {
            updateCharts();
        }
    }

    function initializeDatePicker() {
        dateInput.value = selectedDate;
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        dateInput.addEventListener('change', () => {
            selectedDate = dateInput.value;
            updateUI();
        });

        tabs.forEach(button => {
            button.addEventListener('click', () => switchTab(button.dataset.tab));
        });

        // Modals & Buttons
        document.getElementById('add-transaction-btn-main').addEventListener('click', showTransactionModal);
        document.getElementById('add-account-btn').addEventListener('click', showAccountModal);

        document.getElementById('save-transaction-btn').addEventListener('click', saveTransaction);
        document.getElementById('cancel-transaction-btn').addEventListener('click', closeModal);
        document.getElementById('save-account-btn').addEventListener('click', saveAccount);
        document.getElementById('cancel-account-btn').addEventListener('click', closeModal);

        document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
        document.getElementById('export-data-btn').addEventListener('click', exportData);
        document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
        
        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) closeModal();
            });
        });

        // Close modal with Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // --- TAB NAVIGATION ---
    function switchTab(tabId) {
        tabs.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');

        tabContents.forEach(tab => tab.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');

        if (tabId === 'report-tab') {
            setTimeout(updateCharts, 10);
        }
    }

    // --- MODAL FUNCTIONS ---
    function showTransactionModal(idToEdit = null) {
        editingTransactionId = idToEdit;
        const form = {
            title: document.getElementById('transaction-modal-title'),
            type: document.getElementById('transaction-type'),
            titleInput: document.getElementById('transaction-title'),
            category: document.getElementById('transaction-category'),
            amount: document.getElementById('transaction-amount')
        };

        if (idToEdit) {
            const trx = transactions.find(t => t.id === idToEdit);
            form.title.textContent = 'Edit Transaksi';
            form.type.value = trx.type;
            form.titleInput.value = trx.title;
            form.category.value = trx.category;
            form.amount.value = trx.amount;
        } else {
            form.title.textContent = 'Tambah Transaksi';
            form.type.value = 'expense';
            form.titleInput.value = '';
            form.category.value = '';
            form.amount.value = '';
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

    // --- CORE LOGIC (Transactions, Accounts) ---
    function formatCurrency(amount) {
        const currency = settings.currency || 'IDR';
        const locale = currency === 'IDR' ? 'id-ID' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0 }).format(Math.abs(amount));
    }

    function saveTransaction() {
        const type = document.getElementById('transaction-type').value;
        const title = document.getElementById('transaction-title').value.trim();
        const category = document.getElementById('transaction-category').value.trim();
        const amount = parseFloat(document.getElementById('transaction-amount').value);

        if (!title || !category || isNaN(amount) || amount <= 0) {
            alert('Mohon isi semua field dengan benar.');
            return;
        }

        if (editingTransactionId) {
            const trxIndex = transactions.findIndex(t => t.id === editingTransactionId);
            if (trxIndex > -1) {
                transactions[trxIndex] = { ...transactions[trxIndex], type, title, category, amount };
            }
        } else {
            const newTransaction = { id: Date.now(), type, title, category, amount, date: selectedDate };
            transactions.unshift(newTransaction);
        }
        
        saveData();
        updateUI();
        closeModal();
    }

    function deleteTransaction(id) {
        if (confirm('Anda yakin ingin menghapus transaksi ini?')) {
            transactions = transactions.filter(t => t.id !== id);
            saveData();
            updateUI();
        }
    }
    
    function saveAccount() {
        const name = document.getElementById('account-name').value.trim();
        const balance = parseFloat(document.getElementById('account-balance').value) || 0;

        if (!name) {
            alert('Mohon isi nama rekening.');
            return;
        }

        accounts.push({ id: Date.now(), name, balance });

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
        if (confirm('Anda yakin ingin menghapus rekening ini?')) {
            accounts = accounts.filter(a => a.id !== id);
            saveData();
            updateUI();
        }
    }

    // --- RENDER FUNCTIONS ---
    function renderTransactions() {
        const container = document.getElementById('transactions-list');
        const dailyTransactions = transactions.filter(t => t.date === selectedDate);
        
        if (dailyTransactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 15px;">💳</div>
                    <p>Belum ada transaksi untuk tanggal ini</p>
                    <p style="font-size: 0.9rem; margin-top: 5px;">Tekan tombol + untuk menambah transaksi</p>
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
                    <button class="action-btn edit-btn">Edit</button>
                    <button class="action-btn delete-btn">Hapus</button>
                </div>
            </div>
        `).join('');

        // Re-attach event listeners for new elements
        container.querySelectorAll('.edit-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => showTransactionModal(dailyTransactions[index].id));
        });
        container.querySelectorAll('.delete-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => deleteTransaction(dailyTransactions[index].id));
        });
    }
    
    function renderAccounts() {
        const container = document.getElementById('accounts-list');
        if (accounts.length === 0) {
             container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 15px;">🏦</div>
                    <p>Belum ada rekening</p>
                </div>`;
            return;
        }

        container.innerHTML = accounts.map(acc => `
            <div class="account-card">
                <div class="account-details">
                    <div class="account-name">${acc.name}</div>
                    <div class="account-balance">${formatCurrency(acc.balance)}</div>
                </div>
                <button class="action-btn delete-btn">Hapus</button>
            </div>
        `).join('');
        
        container.querySelectorAll('.delete-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => deleteAccount(accounts[index].id));
        });
    }

    function updateSummary() {
        const dailyTransactions = transactions.filter(t => t.date === selectedDate);
        const totalIncome = dailyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = dailyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const difference = totalIncome - totalExpense;

        document.getElementById('total-income').textContent = formatCurrency(totalIncome);
        document.getElementById('total-expense').textContent = formatCurrency(totalExpense);
        
        const diffElement = document.getElementById('total-difference');
        diffElement.textContent = formatCurrency(difference);
        diffElement.className = 'summary-value ' + (difference >= 0 ? 'income' : 'expense');
    }

    // --- CHART FUNCTIONS ---
    function setupCharts() {
        const pieOptions = (title) => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: title, font: { size: 16, weight: 'bold' } },
                legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, font: { size: 12 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}` } }
            },
            animation: { animateRotate: true, animateScale: true }
        });

        expenseChart = new Chart(document.getElementById('expense-chart').getContext('2d'), {
            type: 'pie',
            options: pieOptions('Pengeluaran per Kategori'),
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] }] }
        });

        incomeChart = new Chart(document.getElementById('income-chart').getContext('2d'), {
            type: 'pie',
            options: pieOptions('Pemasukan per Kategori'),
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#2ECC71', '#3498DB', '#9B59B6', '#E67E22', '#F1C40F', '#1ABC9C'] }] }
        });
    }

    function updateCharts() {
        const updateChartData = (chart, type) => {
            const categories = {};
            transactions.filter(t => t.type === type).forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + t.amount;
            });
            chart.data.labels = Object.keys(categories);
            chart.data.datasets[0].data = Object.values(categories);
            chart.update('none');
        };
        updateChartData(expenseChart, 'expense');
        updateChartData(incomeChart, 'income');
    }

    // --- SETTINGS FUNCTIONS ---
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
        if (confirm('YAKIN ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!')) {
            transactions = [];
            accounts = [];
            localStorage.removeItem('financeData');
            updateUI();
            alert('Semua data berhasil dihapus!');
        }
    }

    // Run the app
    init();
});