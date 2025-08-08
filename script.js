document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let transactions = [];
    let accounts = [];
    let settings = {};
    let expenseChart = null;
    let incomeChart = null;
    let editingTransactionId = null;
    let selectedDate = new Date().toISOString().split('T')[0];
    let selectedMonth = new Date().toISOString().slice(0,7); // YYYY-MM for month picker

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
        setupCharts();
        updateUI();
    }

    // --- DATA PERSISTENCE (localStorage) ---
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

        applySettings(); // terapkan segera
        alert(settings.language === 'en' ? 'Settings saved successfully!' : 'Pengaturan berhasil disimpan!');
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem('financeSettings');
            if (raw) {
                const storedSettings = JSON.parse(raw);
                settings = storedSettings || {};
            } else {
                settings = {};
            }
        } catch (e) {
            console.error('Gagal baca financeSettings, mengosongkan pengaturan. Error:', e);
            settings = {};
            localStorage.removeItem('financeSettings');
        }

        // apply to controls (if exist)
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

        // Jika berada di tab rekap, perbarui chart
        const reportTab = document.getElementById('report-tab');
        if (reportTab && !reportTab.classList.contains('hidden')) {
            updateCharts();
        }
    }

    function initializeDatePicker() {
        if (dateInput) dateInput.value = selectedDate;

        // Tambahkan month picker untuk rekap (ditambahkan via JS agar tidak mengubah HTML asli terlalu banyak)
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

        // set event listener for month picker
        const monthInput = document.getElementById('selected-month');
        if (monthInput) {
            monthInput.value = selectedMonth;
            monthInput.addEventListener('change', () => {
                selectedMonth = monthInput.value;
                // hanya update chart (rekap)
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

        // Modals & Buttons
        const addTrxBtn = document.getElementById('add-transaction-btn-main');
        if (addTrxBtn) addTrxBtn.addEventListener('click', showTransactionModal);

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
        const btn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (btn) btn.classList.add('active');

        tabContents.forEach(tab => tab.classList.add('hidden'));
        const content = document.getElementById(tabId);
        if (content) content.classList.remove('hidden');

        if (tabId === 'report-tab') {
            // jalankan updateCharts sedikit kemudian agar canvas benar-benar visible
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
                // jika id tidak ditemukan, treat as new
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

    // --- CORE LOGIC (Transactions, Accounts) ---
    function formatCurrency(amount) {
        const currency = (settings && settings.currency) ? settings.currency : 'IDR';
        const locale = currency === 'IDR' ? 'id-ID' : (currency === 'EUR' ? 'de-DE' : 'en-US');
        // ensure number
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

        // tetap tampilkan per-hari di tab transaksi
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
                    <button class="action-btn edit-btn">${settings.language === 'en' ? 'Edit' : 'Edit'}</button>
                    <button class="action-btn delete-btn">${settings.language === 'en' ? 'Delete' : 'Hapus'}</button>
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
                <button class="action-btn delete-btn">${settings.language === 'en' ? 'Delete' : 'Hapus'}</button>
            </div>
        `).join('');

        container.querySelectorAll('.delete-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => deleteAccount(accounts[index].id));
        });
    }

    function updateSummary() {
        // summary tetap per-hari (sesuai tab transaksi)
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

        // Jika chart sudah ada (mis. re-init), destroy dulu
        const expenseCtx = document.getElementById('expense-chart');
        const incomeCtx = document.getElementById('income-chart');

        if (expenseChart) {
            try { expenseChart.destroy(); } catch(e){/*ignore*/}
        }
        if (incomeChart) {
            try { incomeChart.destroy(); } catch(e){/*ignore*/}
        }

        if (expenseCtx) {
            expenseChart = new Chart(expenseCtx.getContext('2d'), {
                type: 'pie',
                options: pieOptions(settings.language === 'en' ? 'Expenses by Category' : 'Pengeluaran per Kategori'),
                data: { labels: [], datasets: [{ data: [], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] }] }
            });
        }

        if (incomeCtx) {
            incomeChart = new Chart(incomeCtx.getContext('2d'), {
                type: 'pie',
                options: pieOptions(settings.language === 'en' ? 'Income by Category' : 'Pemasukan per Kategori'),
                data: { labels: [], datasets: [{ data: [], backgroundColor: ['#2ECC71', '#3498DB', '#9B59B6', '#E67E22', '#F1C40F', '#1ABC9C'] }] }
            });
        }

        // initial fill
        updateCharts();
    }

    function updateCharts() {
        if (!expenseChart || !incomeChart) return;

        // gunakan selectedMonth (YYYY-MM) sebagai filter untuk rekap per bulan
        const monthFilter = selectedMonth || new Date().toISOString().slice(0,7);

        const filteredByMonth = transactions.filter(t => {
            // transaksi harus memiliki date in format YYYY-MM-DD
            if (!t.date) return false;
            return t.date.slice(0,7) === monthFilter;
        });

        const agg = (items, type) => {
            const categories = {};
            items.filter(t => t.type === type).forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + t.amount;
            });
            return categories;
        };

        const expenseCategories = agg(filteredByMonth, 'expense');
        const incomeCategories = agg(filteredByMonth, 'income');

        expenseChart.data.labels = Object.keys(expenseCategories);
        expenseChart.data.datasets[0].data = Object.values(expenseCategories);
        expenseChart.options.plugins.title.text = settings.language === 'en' ? `Expenses (${monthFilter})` : `Pengeluaran (${monthFilter})`;
        expenseChart.update();

        incomeChart.data.labels = Object.keys(incomeCategories);
        incomeChart.data.datasets[0].data = Object.values(incomeCategories);
        incomeChart.options.plugins.title.text = settings.language === 'en' ? `Income (${monthFilter})` : `Pemasukan (${monthFilter})`;
        incomeChart.update();
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
        if (confirm(settings.language === 'en' ? 'Are you sure to delete ALL data? This action cannot be undone.' : 'YAKIN ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!')) {
            transactions = [];
            accounts = [];
            localStorage.removeItem('financeData');
            updateUI();
            alert(settings.language === 'en' ? 'All data cleared' : 'Semua data berhasil dihapus!');
        }
    }

    // --- APPLY SETTINGS (currency + language + startDay) ---
    function applySettings() {
        // re-render teks UI sesuai language sedikit demi sedikit
        applyLanguage();

        // re-init charts (untuk judul bahasa / format)
        setupCharts();

        // re-render UIs (to apply new currency formatting, etc)
        updateUI();
    }

    function applyLanguage() {
        const lang = settings.language || 'id';

        // summary labels (3)
        const summaryLabels = document.querySelectorAll('.summary-label');
        if (summaryLabels && summaryLabels.length >= 3) {
            summaryLabels[0].textContent = lang === 'en' ? 'INCOME' : 'PEMASUKAN';
            summaryLabels[1].textContent = lang === 'en' ? 'EXPENSE' : 'PENGELUARAN';
            summaryLabels[2].textContent = lang === 'en' ? 'DIFFERENCE' : 'SELISIH';
        }

        // section titles (generic)
        const sectionTitles = document.querySelectorAll('.section-title');
        sectionTitles.forEach(st => {
            // keep original if it matches known ones
            const txt = st.textContent.trim().toLowerCase();
            if (txt.includes('daftar rekening') || txt.includes('accounts')) {
                st.textContent = lang === 'en' ? 'Accounts' : 'Daftar Rekening';
            } else if (txt.includes('rekap') || txt.includes('report')) {
                st.textContent = lang === 'en' ? 'Report' : 'Rekap Keuangan';
            } else if (txt.includes('pengaturan') || txt.includes('settings')) {
                st.textContent = lang === 'en' ? 'Settings' : 'Pengaturan';
            }
        });

        // nav tab spans
        const tabSpans = document.querySelectorAll('.nav-tabs .tab-button span');
        if (tabSpans && tabSpans.length >= 4) {
            tabSpans[0].textContent = lang === 'en' ? 'Transactions' : 'Transaksi';
            tabSpans[1].textContent = lang === 'en' ? 'Accounts' : 'Rekening';
            tabSpans[2].textContent = lang === 'en' ? 'Report' : 'Rekap';
            tabSpans[3].textContent = lang === 'en' ? 'Settings' : 'Pengaturan';
        }

        // modal button texts
        const saveTrxBtn = document.getElementById('save-transaction-btn');
        const cancelTrxBtn = document.getElementById('cancel-transaction-btn');
        const saveAccBtn = document.getElementById('save-account-btn');
        const cancelAccBtn = document.getElementById('cancel-account-btn');
        if (saveTrxBtn) saveTrxBtn.textContent = lang === 'en' ? 'Save' : 'Simpan';
        if (cancelTrxBtn) cancelTrxBtn.textContent = lang === 'en' ? 'Cancel' : 'Batal';
        if (saveAccBtn) saveAccBtn.textContent = lang === 'en' ? 'Save' : 'Simpan';
        if (cancelAccBtn) cancelAccBtn.textContent = lang === 'en' ? 'Cancel' : 'Batal';

        // settings form labels & buttons (some are static in HTML; we update the Save button)
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) saveSettingsBtn.textContent = lang === 'en' ? 'Save Settings' : 'Simpan Pengaturan';

        // Export / Clear buttons
        const exportBtn = document.getElementById('export-data-btn');
        const clearBtn = document.getElementById('clear-data-btn');
        if (exportBtn) exportBtn.textContent = lang === 'en' ? 'Export Data' : 'Export Data';
        if (clearBtn) clearBtn.textContent = lang === 'en' ? 'Delete All Data' : 'Hapus Semua Data';
    }

    // Run the app
    init();
});
