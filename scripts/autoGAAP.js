'use strict';

(function () {
  const STORAGE_KEY = 'journalEntries';
  const FALLBACK_LEDGER_URL = 'data/ledger.json';
  const SUMMARY_CONTAINER_ID = 'autoGaapSummary';
  const RECOMMENDATIONS_ID = 'autoGaapRecommendations';
  const RUN_BUTTON_ID = 'runAutoGaap';
  const CHART_CANVAS_ID = 'autoGaapChart';
  const DEFAULT_TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense', 'other'];
  const NORMAL_BALANCES = {
    asset: 'debit',
    expense: 'debit',
    liability: 'credit',
    equity: 'credit',
    revenue: 'credit'
  };
  const BALANCE_TOLERANCE = 0.01;

  let chartInstance = null;
  const currencyFormatter = typeof Intl !== 'undefined' && Intl.NumberFormat
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : null;

  document.addEventListener('DOMContentLoaded', () => {
    const runButton = getElement(RUN_BUTTON_ID);
    if (runButton) {
      runButton.addEventListener('click', () => runAutoGaapAnalysis());
    }

    const journalForm = document.getElementById('journalForm');
    if (journalForm) {
      journalForm.addEventListener('submit', () => {
        setTimeout(runAutoGaapAnalysis, 75);
      });
    }

    runAutoGaapAnalysis();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      runAutoGaapAnalysis();
    }
  });

  window.addEventListener('autoGaap:refresh', () => runAutoGaapAnalysis());

  window.autoGAAP = {
    analyze: () => runAutoGaapAnalysis(),
    loadLedgerEntries: () => loadLedgerEntries(),
    summarize: (entries) => summarizeJournalEntries(entries)
  };

  async function runAutoGaapAnalysis() {
    const summaryContainer = getElement(SUMMARY_CONTAINER_ID);
    const recommendationContainer = getElement(RECOMMENDATIONS_ID);

    if (summaryContainer) {
      summaryContainer.innerHTML = '<p class="auto-gaap-placeholder">Analyzing ledger data...</p>';
    }
    if (recommendationContainer) {
      recommendationContainer.innerHTML = '';
    }

    let ledgerEntries = [];
    try {
      ledgerEntries = await loadLedgerEntries();
    } catch (error) {
      console.error('AutoGAAP: Unable to load ledger entries.', error);
    }

    if (!Array.isArray(ledgerEntries) || ledgerEntries.length === 0) {
      if (summaryContainer) {
        summaryContainer.innerHTML = '<p class="auto-gaap-placeholder">No journal entries available yet. Add an entry to generate AutoGAAP insights.</p>';
      }
      if (recommendationContainer) {
        recommendationContainer.innerHTML = '';
      }
      clearGaapChart();
      return;
    }

    const summary = summarizeJournalEntries(ledgerEntries);
    renderSummary(summary);
    renderRecommendations(summary);
    renderGaapChart(summary);
  }

  async function loadLedgerEntries() {
    const storedEntries = getStoredJournalEntries();
    if (storedEntries && storedEntries.length > 0) {
      return storedEntries;
    }

    try {
      const response = await fetch(FALLBACK_LEDGER_URL, { cache: 'no-store' });
      if (!response.ok) {
        console.warn('AutoGAAP: Fallback ledger could not be loaded.', response.statusText);
        return [];
      }

      const payload = await response.json();
      if (Array.isArray(payload)) {
        return payload;
      }
      if (payload && Array.isArray(payload.journalEntries)) {
        return payload.journalEntries;
      }
      return [];
    } catch (error) {
      console.warn('AutoGAAP: Error fetching fallback ledger.', error);
      return [];
    }
  }

  function getStoredJournalEntries() {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.warn('AutoGAAP: Failed to parse journal entries from storage.', error);
      return null;
    }
  }

  function summarizeJournalEntries(entries) {
    const totalsByType = new Map();
    DEFAULT_TYPE_ORDER.forEach((type) => {
      totalsByType.set(type, { debit: 0, credit: 0 });
    });

    const totalsByAccount = new Map();
    let totalDebits = 0;
    let totalCredits = 0;
    let lineItemCount = 0;

    entries.forEach((entry) => {
      if (!entry || !Array.isArray(entry.entries)) {
        return;
      }

      entry.entries.forEach((lineItem) => {
        const accountTypeRaw = typeof lineItem.accountType === 'string' ? lineItem.accountType.toLowerCase() : 'other';
        const accountType = accountTypeRaw || 'other';
        const debit = toNumber(lineItem.debit);
        const credit = toNumber(lineItem.credit);
        const accountName = lineItem.accountName && lineItem.accountName.trim() !== ''
          ? lineItem.accountName
          : 'Unspecified Account';

        totalDebits += debit;
        totalCredits += credit;
        lineItemCount += 1;

        if (!totalsByType.has(accountType)) {
          totalsByType.set(accountType, { debit: 0, credit: 0 });
        }
        const typeTotals = totalsByType.get(accountType);
        typeTotals.debit += debit;
        typeTotals.credit += credit;

        if (!totalsByAccount.has(accountName)) {
          totalsByAccount.set(accountName, {
            accountName,
            accountType,
            debit: 0,
            credit: 0
          });
        }
        const accountTotals = totalsByAccount.get(accountName);
        accountTotals.debit += debit;
        accountTotals.credit += credit;
      });
    });

    const totalsByTypeObject = {};
    const typeOrderSet = new Set(DEFAULT_TYPE_ORDER);

    totalsByType.forEach((value, key) => {
      typeOrderSet.add(key);
      totalsByTypeObject[key] = {
        debit: round(value.debit),
        credit: round(value.credit),
        net: round(value.debit - value.credit)
      };
    });

    const totalsByAccountArray = Array.from(totalsByAccount.values()).map((account) => ({
      accountName: account.accountName,
      accountType: account.accountType,
      debit: round(account.debit),
      credit: round(account.credit),
      net: round(account.debit - account.credit)
    })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

    return {
      entryCount: entries.length,
      lineItemCount,
      totalDebits: round(totalDebits),
      totalCredits: round(totalCredits),
      totalsByType: totalsByTypeObject,
      totalsByAccount: totalsByAccountArray,
      typeOrder: Array.from(typeOrderSet)
    };
  }

  function renderSummary(summary) {
    const summaryContainer = getElement(SUMMARY_CONTAINER_ID);
    if (!summaryContainer) {
      return;
    }

    const difference = round(summary.totalDebits - summary.totalCredits);
    const balanced = Math.abs(difference) <= BALANCE_TOLERANCE;

    const kpis = [
      { label: 'Journal Entries', value: summary.entryCount },
      { label: 'Line Items', value: summary.lineItemCount },
      { label: 'Total Debits', value: formatCurrency(summary.totalDebits) },
      { label: 'Total Credits', value: formatCurrency(summary.totalCredits) }
    ];

    const kpiHtml = `
      <div class="auto-gaap-kpis">
        ${kpis.map((kpi) => `
          <div class="auto-gaap-kpi">
            <span class="auto-gaap-kpi-label">${escapeHtml(kpi.label)}</span>
            <span class="auto-gaap-kpi-value">${escapeHtml(String(kpi.value))}</span>
          </div>
        `).join('')}
      </div>
    `;

    const typeRows = summary.typeOrder.map((type) => {
      const totals = summary.totalsByType[type] || { debit: 0, credit: 0, net: 0 };
      return `
        <tr>
          <td>${escapeHtml(toTitleCase(type))}</td>
          <td>${escapeHtml(formatCurrency(totals.debit))}</td>
          <td>${escapeHtml(formatCurrency(totals.credit))}</td>
          <td>${escapeHtml(formatCurrency(totals.net))}</td>
        </tr>
      `;
    }).join('');

    let topAccountsHtml = '';
    const topAccounts = summary.totalsByAccount.slice(0, 5);
    if (topAccounts.length > 0) {
      topAccountsHtml = `
        <h4>Largest Account Balances</h4>
        <table class="auto-gaap-table auto-gaap-account-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Type</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Net (Debit - Credit)</th>
            </tr>
          </thead>
          <tbody>
            ${topAccounts.map((account) => `
              <tr>
                <td>${escapeHtml(account.accountName)}</td>
                <td>${escapeHtml(toTitleCase(account.accountType || 'other'))}</td>
                <td>${escapeHtml(formatCurrency(account.debit))}</td>
                <td>${escapeHtml(formatCurrency(account.credit))}</td>
                <td>${escapeHtml(formatCurrency(account.net))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    summaryContainer.innerHTML = `
      ${kpiHtml}
      <div class="auto-gaap-status ${balanced ? 'balanced' : 'unbalanced'}">
        ${balanced
          ? 'Debits and credits are in balance.'
          : `Ledger is out of balance by ${escapeHtml(formatCurrency(difference))} (Debit - Credit).`}
      </div>
      <table class="auto-gaap-table">
        <thead>
          <tr>
            <th>Account Type</th>
            <th>Total Debits</th>
            <th>Total Credits</th>
            <th>Net (Debit - Credit)</th>
          </tr>
        </thead>
        <tbody>
          ${typeRows}
        </tbody>
      </table>
      ${topAccountsHtml}
    `;
  }

  function renderRecommendations(summary) {
    const recommendationContainer = getElement(RECOMMENDATIONS_ID);
    if (!recommendationContainer) {
      return;
    }

    const messages = [];
    const difference = round(summary.totalDebits - summary.totalCredits);

    if (Math.abs(difference) > BALANCE_TOLERANCE) {
      messages.push(`Ledger debits and credits differ by ${formatCurrency(difference)}. Investigate recent journal entries.`);
    } else {
      messages.push('Ledger debits and credits are balanced.');
    }

    Object.entries(summary.totalsByType).forEach(([type, totals]) => {
      if (!NORMAL_BALANCES[type]) {
        return;
      }
      const net = round(totals.net);
      if (Math.abs(net) <= BALANCE_TOLERANCE) {
        return;
      }
      if (NORMAL_BALANCES[type] === 'debit' && net < 0) {
        messages.push(`${toTitleCase(type)} accounts show a credit balance. Review for potential misclassifications.`);
      }
      if (NORMAL_BALANCES[type] === 'credit' && net > 0) {
        messages.push(`${toTitleCase(type)} accounts show a debit balance. Confirm the entries are recorded correctly.`);
      }
    });

    const topAccounts = summary.totalsByAccount.slice(0, 3);
    if (topAccounts.length > 0) {
      const accountMessage = topAccounts
        .map((account) => `${account.accountName} (${formatCurrency(account.net)})`)
        .join(', ');
      messages.push(`Largest balances: ${accountMessage}.`);
    }

    recommendationContainer.innerHTML = `
      <h4>AutoGAAP Highlights</h4>
      <ul>
        ${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}
      </ul>
    `;
  }

  function renderGaapChart(summary) {
    const canvas = getElement(CHART_CANVAS_ID);
    if (!canvas) {
      return;
    }

    if (typeof Chart === 'undefined') {
      console.warn('AutoGAAP: Chart.js is not available. Skipping chart rendering.');
      return;
    }

    const labels = [];
    const data = [];
    const backgroundColors = [];
    const borderColors = [];

    summary.typeOrder.forEach((type) => {
      const totals = summary.totalsByType[type];
      if (!totals) {
        return;
      }
      const net = round(totals.net);
      labels.push(toTitleCase(type));
      data.push(net);
      const positive = net >= 0;
      backgroundColors.push(positive ? 'rgba(40, 167, 69, 0.6)' : 'rgba(220, 53, 69, 0.6)');
      borderColors.push(positive ? '#28a745' : '#dc3545');
    });

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(context, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Net balance (Debit - Credit)',
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function clearGaapChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    const canvas = getElement(CHART_CANVAS_ID);
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function round(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(value) {
    const numeric = round(toNumber(value));
    if (currencyFormatter) {
      return currencyFormatter.format(numeric);
    }
    const sign = numeric < 0 ? '-' : '';
    return `${sign}$${Math.abs(numeric).toFixed(2)}`;
  }

  function toTitleCase(value) {
    if (!value) {
      return 'Other';
    }
    return value
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getElement(id) {
    return document.getElementById(id);
  }
})();
