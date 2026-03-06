// --- DOM Elements ---
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const textEl = document.getElementById('text');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('category');
const countEl = document.getElementById('transaction-count');
const themeToggle = document.getElementById('theme-toggle');

// --- Global Variables ---
let expenseChartInstance = null;

// --- Category Config for UI ---
const categoryIcons = {
    'Food': 'fa-utensils',
    'Transport': 'fa-car',
    'Shopping': 'fa-cart-shopping',
    'Bills': 'fa-file-invoice-dollar',
    'Salary': 'fa-money-bill-wave',
    'Other': 'fa-circle-question'
};

const categoryColors = {
    'Food': '#ff6384',
    'Transport': '#36a2eb',
    'Shopping': '#ffce56',
    'Bills': '#ff9f40',
    'Other': '#9966ff'
};

// --- Local Storage setup ---
// Retrieve transactions from Local Storage or return empty array
const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));
let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];

// Retrieve theme from Local Storage
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
}

// --- Event Listeners ---
// Theme Toggle Logic
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Update toggle icon
    if (isDarkMode) {
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    
    // Re-render chart to adapt to theme text colors
    updateChart();
});

// Add new transaction
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const text = textEl.value.trim();
    const amount = +amountEl.value.trim();
    const category = categoryEl.value;

    if (text === '' || isNaN(amount) || category === '') {
        alert('Please fill in all fields with valid data.');
        return;
    }

    const transaction = {
        id: generateID(),
        text,
        amount,
        category,
        date: new Date().toISOString()
    };

    transactions.push(transaction);

    addTransactionDOM(transaction);
    updateValues();
    updateLocalstorage();
    updateChart();

    // Clear form
    textEl.value = '';
    amountEl.value = '';
    categoryEl.value = '';
});

// --- Core Functions ---

// Generate random ID
function generateID() {
    return Math.floor(Math.random() * 1000000000).toString(16);
}

// Format currency
function formatCurrency(num) {
    return '$' + Math.abs(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
    // Determine sign and class
    const isIncome = transaction.amount > 0;
    const sign = isIncome ? '+' : '-';
    const typeClass = isIncome ? 'income' : 'expense';
    
    const li = document.createElement('li');
    li.classList.add(typeClass, 'fade-in');

    const iconClass = categoryIcons[transaction.category] || categoryIcons['Other'];

    li.innerHTML = `
        <div class="transaction-info">
            <div class="category-icon">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="transaction-details">
                <span class="transaction-text">${transaction.text}</span>
                <span class="transaction-category">${transaction.category}</span>
            </div>
        </div>
        <div class="transaction-amount-container">
            <span class="transaction-amount">${sign}${formatCurrency(transaction.amount)}</span>
            <button class="delete-btn" onclick="removeTransaction('${transaction.id}')" aria-label="Delete transaction">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;

    // prepend to show latest first
    listEl.prepend(li);
}

// Update the balance, income and expense
function updateValues() {
    const amounts = transactions.map(transaction => transaction.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0);

    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0);

    const expense = amounts
        .filter(item => item < 0)
        .reduce((acc, item) => (acc += item), 0) * -1; // Make positive

    // Determine total sign
    const totalSign = total < 0 ? '-' : '';

    balanceEl.innerText = `${totalSign}${formatCurrency(total)}`;
    incomeEl.innerText = `+${formatCurrency(income)}`;
    expenseEl.innerText = `-${formatCurrency(expense)}`;
    
    countEl.innerText = `${transactions.length} items`;
}

// Remove transaction by ID
window.removeTransaction = function(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    
    updateLocalstorage();
    init(); // Re-render everything
};

// Update local storage transactions
function updateLocalstorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Chart.js Visualization
function updateChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    
    // Filter only expenses
    const expenses = transactions.filter(t => t.amount < 0);
    
    // Aggregate by category
    const categoryTotals = {};
    expenses.forEach(t => {
        if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = 0;
        }
        categoryTotals[t.category] += Math.abs(t.amount);
    });
    
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const backgroundColors = labels.map(label => categoryColors[label] || categoryColors['Other']);
    
    // Theme aware text color
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#9ca3af' : '#6b7280';
    const gridColor = isDarkMode ? '#374151' : '#e5e7eb';

    if (expenseChartInstance) {
        expenseChartInstance.destroy(); // destroy old chart before rendering new
    }

    if (data.length === 0) {
        // Render empty state if no expenses
        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Expenses Yet'],
                datasets: [{
                    data: [1],
                    backgroundColor: [gridColor],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor }
                    },
                    tooltip: { enabled: false }
                },
                cutout: '70%'
            }
        });
        return;
    }

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: isDarkMode ? '#1f2937' : '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        padding: 20,
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += formatCurrency(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            },
            cutout: '70%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// Init app
function init() {
    listEl.innerHTML = '';
    
    // Sort transactions by date (newest first for UI, assuming array order represents time if not explicitly sorted, let's just reverse iterate or add sorted)
    // Actually we prepend in addTransactionDOM, so we should iterate array forward or backward?
    // If we want newest at top, and transactions are appended, we should iterate from start and prepend.
    transactions.forEach(addTransactionDOM);
    
    updateValues();
    updateChart();
}

// Start app
init();
