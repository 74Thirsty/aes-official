// main.js
window.onload = function () {
    generateJournalNumber();
    displayJournalEntries();
    updateBalanceStatus();
};

const { jsPDF } = window.jspdf;

let journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];

const ctx = document.getElementById('accountBalanceChart').getContext('2d');
const accountBalanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'],
        datasets: [{
            label: 'Debit Balance',
            data: [0, 0, 0, 0, 0],
            backgroundColor: '#28a745',
            borderColor: '#28a745',
            borderWidth: 1
        }, {
            label: 'Credit Balance',
            data: [0, 0, 0, 0, 0],
            backgroundColor: '#dc3545',
            borderColor: '#dc3545',
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

function generateJournalNumber(account1, account2) {
    const timestamp = Date.now();
    const accountString = `${account1}-${account2}-${timestamp}`;
    return `CPU-${accountString}`;
}

function updateBalanceStatus() {
    let debits = 0, credits = 0;
    let balanceByType = {
        asset: { debit: 0, credit: 0 },
        liability: { debit: 0, credit: 0 },
        equity: { debit: 0, credit: 0 },
        revenue: { debit: 0, credit: 0 },
        expense: { debit: 0, credit: 0 }
    };

    journalEntries.forEach(entry => {
        entry.entries.forEach(transaction => {
            balanceByType[transaction.accountType].debit += transaction.debit;
            balanceByType[transaction.accountType].credit += transaction.credit;
            debits += transaction.debit;
            credits += transaction.credit;
        });
    });

    if (debits === credits) {
        document.getElementById('balanceIndicator').classList.remove('unbalanced');
        document.getElementById('balanceIndicator').classList.add('balanced');
        document.getElementById('balanceIndicator').innerHTML = '✅ Balanced';
    } else {
        document.getElementById('balanceIndicator').classList.remove('balanced');
        document.getElementById('balanceIndicator').classList.add('unbalanced');
        document.getElementById('balanceIndicator').innerHTML = '⚠️ Unbalanced';
    }

    accountBalanceChart.data.datasets[0].data = [
        balanceByType.asset.debit,
        balanceByType.liability.debit,
        balanceByType.equity.debit,
        balanceByType.revenue.debit,
        balanceByType.expense.debit
    ];

    accountBalanceChart.data.datasets[1].data = [
        balanceByType.asset.credit,
        balanceByType.liability.credit,
        balanceByType.equity.credit,
        balanceByType.revenue.credit,
        balanceByType.expense.credit
    ];
    accountBalanceChart.update();
}

function displayJournalEntries() {
    const container = document.getElementById('journalEntries');
    container.innerHTML = '';

    journalEntries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'journal-entry';

        let html = `
            <strong>J/E Number: ${entry.journalNumber}</strong><br>
            <strong>Date:</strong> ${entry.postDate}<br>
            <strong>Description:</strong> ${entry.description}<br><br>
            <table>
                <tr>
                    <td><strong>Account</strong></td>
                    <td><strong>Debit</strong></td>
                    <td><strong>Credit</strong></td>
                </tr>
        `;

        entry.entries.forEach((transaction, index) => {
            let indentClass = (index === 1) ? 'class="indented"' : '';
            html += `
                <tr ${indentClass}>
                    <td>${transaction.accountName}</td>
                    <td>${transaction.debit > 0 ? "$" + transaction.debit.toFixed(2) : ""}</td>
                    <td>${transaction.credit > 0 ? "$" + transaction.credit.toFixed(2) : ""}</td>
                </tr>
            `;
        });

        html += `
            </table>
            <hr>
        `;

        entryDiv.innerHTML = html;
        container.appendChild(entryDiv);
    });
}

function generateBalanceSheet() {
    try {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text("Balance Sheet", 10, 10);
        doc.text("Assets", 10, 20);
        let yPosition = 30;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "asset") {
                    doc.text(`Account: ${transaction.accountName}`, 10, yPosition);
                    doc.text(`Debit: $${transaction.debit.toFixed(2)}`, 80, yPosition);
                    yPosition += 10;
                }
            });
        });

        doc.text("Liabilities", 10, yPosition);
        yPosition += 10;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "liability") {
                    doc.text(`Account: ${transaction.accountName}`, 10, yPosition);
                    doc.text(`Credit: $${transaction.credit.toFixed(2)}`, 80, yPosition);
                    yPosition += 10;
                }
            });
        });

        doc.text("Equity", 10, yPosition);
        yPosition += 10;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "equity") {
                    doc.text(`Account: ${transaction.accountName}`, 10, yPosition);
                    doc.text(`Credit: $${transaction.credit.toFixed(2)}`, 80, yPosition);
                    yPosition += 10;
                }
            });
        });

        doc.save("balance_sheet.pdf");
    } catch (error) {
        console.error('Error generating balance sheet:', error);
        alert('There was an error generating the balance sheet.');
    }
}

function generateIncomeStatement() {
    try {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text("Income Statement", 10, 10);
        doc.text("Revenue", 10, 20);
        let yPosition = 30;

        let totalRevenue = 0;
        let totalExpenses = 0;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "revenue") {
                    doc.text(`Account: ${transaction.accountName}`, 10, yPosition);
                    doc.text(`Credit: $${transaction.credit.toFixed(2)}`, 80, yPosition);
                    totalRevenue += transaction.credit;
                    yPosition += 10;
                }
            });
        });

        doc.text("Expenses", 10, yPosition);
        yPosition += 10;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "expense") {
                    doc.text(`Account: ${transaction.accountName}`, 10, yPosition);
                    doc.text(`Debit: $${transaction.debit.toFixed(2)}`, 80, yPosition);
                    totalExpenses += transaction.debit;
                    yPosition += 10;
                }
            });
        });

        const netIncome = totalRevenue - totalExpenses;
        doc.text(`Net Income: $${netIncome.toFixed(2)}`, 10, yPosition);

        doc.save("income_statement.pdf");
    } catch (error) {
        console.error('Error generating income statement:', error);
        alert('There was an error generating the income statement.');
    }
}

function generateCashFlowStatement() {
    try {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text("Cash Flow Statement", 10, 10);
        doc.text("Operating Activities", 10, 20);
        let yPosition = 30;

        let operatingCashFlows = 0;
        let investingCashFlows = 0;
        let financingCashFlows = 0;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "expense" && transaction.debit > 0) {
                    operatingCashFlows -= transaction.debit;
                    doc.text(`${transaction.accountName}:`, 10, yPosition);
                    doc.text(`($${transaction.debit.toFixed(2)})`, 80, yPosition);
                    yPosition += 10;
                }
            });
        });

        doc.text("Investing Activities", 10, yPosition);
        yPosition += 10;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "asset" && transaction.debit > 0) {
                    investingCashFlows -= transaction.debit;
                    doc.text(`${transaction.accountName}:`, 10, yPosition);
                    doc.text(`($${transaction.debit.toFixed(2)})`, 80, yPosition);
                    yPosition += 10;
                }
            });
        });

        doc.text("Financing Activities", 10, yPosition);
        yPosition += 10;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "liability" && transaction.credit > 0) {
                    financingCashFlows += transaction.credit;
                    doc.text(`${transaction.accountName}:`, 10, yPosition);
                    doc.text(`$${transaction.credit.toFixed(2)}`, 80, yPosition);
                    yPosition += 10;
                }
            });
        });

        const totalCashFlow = operatingCashFlows + investingCashFlows + financingCashFlows;

        doc.text("\nTotals:", 10, yPosition);
        doc.text(`Operating Activities: ($${Math.abs(operatingCashFlows).toFixed(2)})`, 10, yPosition + 10);
        doc.text(`Investing Activities: ($${Math.abs(investingCashFlows).toFixed(2)})`, 10, yPosition + 20);
        doc.text(`Financing Activities: $${financingCashFlows.toFixed(2)}`, 10, yPosition + 30);
        doc.text(`Net Change in Cash: $${totalCashFlow.toFixed(2)}`, 10, yPosition + 40);

        doc.save("cash_flow_statement.pdf");
    } catch (error) {
        console.error('Error generating cash flow statement:', error);
        alert('There was an error generating the cash flow statement.');
    }
}

function generateOwnersEquity() {
    try {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text("Owner's Equity", 10, 10);
        doc.text("Capital Contributions", 10, 20);
        let yPosition = 30;

        let capitalContributions = 0;
        let drawings = 0;
        let netIncome = 0;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "equity" && transaction.credit > 0) {
                    capitalContributions += transaction.credit;
                    doc.text(`${transaction.accountName}:`, 10, yPosition);
                    doc.text(`$${transaction.credit.toFixed(2)}`, 80, yPosition);
                    yPosition += 10;
                }
            });
        });

        doc.text("Drawings", 10, yPosition);
        yPosition += 10;

        journalEntries.forEach(entry => {
            entry.entries.forEach(transaction => {
                if (transaction.accountType === "equity" && transaction.debit > 0) {
                    drawings += transaction.debit;
                    doc.text(`${transaction.accountName}:`, 10, yPosition);
                    doc.text(`($${transaction.debit.toFixed(2)})`, 80, yPosition);
                    yPosition += 10;
                }
            });
        });

        journalEntries.forEach(entry => {
            const revenue = entry.entries.reduce((acc, trans) =>
                acc + (trans.accountType === "revenue" ? trans.credit : 0), 0);
            const expenses = entry.entries.reduce((acc, trans) =>
                acc + (trans.accountType === "expense" ? trans.debit : 0), 0);
            netIncome += revenue - expenses;
        });

        const totalEquity = capitalContributions - drawings + netIncome;

        doc.text("\nTotals:", 10, yPosition);
        doc.text(`Capital Contributions: $${capitalContributions.toFixed(2)}`, 10, yPosition + 10);
        doc.text(`Drawings: ($${drawings.toFixed(2)})`, 10, yPosition + 20);
        doc.text(`Net Income: $${netIncome.toFixed(2)}`, 10, yPosition + 30);
        doc.text(`Total Owner's Equity: $${totalEquity.toFixed(2)}`, 10, yPosition + 40);

        doc.save("owners_equity.pdf");
    } catch (error) {
        console.error('Error generating owner\'s equity:', error);
        alert('There was an error generating the owner\'s equity statement.');
    }
}

function exportToPDF() {
    try {
        const doc = new jsPDF();
        doc.setFontSize(12);

        let yPosition = 10;
        doc.text('Journal Entries', 10, yPosition);
        yPosition += 10;

        journalEntries.forEach(entry => {
            doc.text(`Entry #: ${entry.journalNumber}`, 10, yPosition);
            yPosition += 5;

            entry.entries.forEach(transaction => {
                doc.text(`${transaction.accountName}:`, 10, yPosition);
                doc.text(`Debit: $${transaction.debit.toFixed(2)}, Credit: $${transaction.credit.toFixed(2)}`,
                        10, yPosition + 5);
                yPosition += 15;
            });

            yPosition += 10;
        });

        doc.save('journal_entries.pdf');
    } catch (error) {
        console.error('Error generating export:', error);
        alert('There was an error generating the export.');
    }
}

function exportToJson() {
    try {
        const data = JSON.stringify(journalEntries, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'journal-entries.json';
        a.click();
    } catch (error) {
        console.error('Error exporting to JSON:', error);
        alert('There was an error exporting to JSON.');
    }
}

document.getElementById("journalForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const account1Type = document.getElementById("account1Type").value;
    const account1Name = document.getElementById("account1Name").value;
    const debitAmount1 = parseFloat(document.getElementById("debitAmount1").value) || 0;
    const creditAmount1 = parseFloat(document.getElementById("creditAmount1").value) || 0;

    const account2Type = document.getElementById("account2Type").value;
    const account2Name = document.getElementById("account2Name").value;
    const debitAmount2 = parseFloat(document.getElementById("debitAmount2").value) || 0;
    const creditAmount2 = parseFloat(document.getElementById("creditAmount2").value) || 0;

    const description = document.getElementById("description").value;

    if (!account1Type || !account1Name || (!debitAmount1 && !creditAmount1) || 
        !account2Type || !account2Name || (!debitAmount2 && !creditAmount2) || !description) {
        alert("Please fill all required fields.");
        return;
    }

    const journalNumber = generateJournalNumber(account1Name, account2Name);

    const entry = {
        id: Date.now(),
        journalNumber: journalNumber,
        postDate: document.getElementById('postDate').value,
        description: description,
        entries: [
            {
                accountType: account1Type,
                accountName: account1Name,
                debit: debitAmount1,
                credit: creditAmount1
            },
            {
                accountType: account2Type,
                accountName: account2Name,
                debit: debitAmount2,
                credit: creditAmount2
            }
        ]
    };

    journalEntries.push(entry);
    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));

    displayJournalEntries();
    updateBalanceStatus();
    document.getElementById("journalForm").reset();
});

window.onload = function() {
    displayJournalEntries();
    updateBalanceStatus();
};
document.getElementById("exportPDF").addEventListener("click", exportToPDF);
document.getElementById("exportJSON").addEventListener("click", exportToJson);  