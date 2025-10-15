'use strict';

(function () {
  const STORAGE_KEY = 'journalEntries';
  const FALLBACK_LEDGER_URL = (() => {
    try {
      return new URL('../data/ledger.json', window.location.href).toString();
    } catch (error) {
      console.warn('AutoGAAP: Unable to resolve fallback ledger path.', error);
      return '../data/ledger.json';
    }
  })();
  const CLEAR_SENTINEL_KEY = 'journalEntriesCleared';
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
  const EMBEDDED_FALLBACK_LEDGER = Object.freeze([
    {
      journalNumber: 'CPU-CASH-SREV-20240105',
      postDate: '2024-01-05',
      description: 'Service revenue received in cash',
      entries: [
        { accountType: 'asset', accountName: 'Cash', debit: 8500, credit: 0 },
        { accountType: 'revenue', accountName: 'Service Revenue', debit: 0, credit: 8500 }
      ]
    },
    {
      journalNumber: 'CPU-RENT-CASH-20240201',
      postDate: '2024-02-01',
      description: 'Office rent paid for February',
      entries: [
        { accountType: 'expense', accountName: 'Rent Expense', debit: 1200, credit: 0 },
        { accountType: 'asset', accountName: 'Cash', debit: 0, credit: 1200 }
      ]
    },
    {
      journalNumber: 'CPU-EQ-AP-20240312',
      postDate: '2024-03-12',
      description: 'Purchased equipment on account',
      entries: [
        { accountType: 'asset', accountName: 'Equipment', debit: 5000, credit: 0 },
        { accountType: 'liability', accountName: 'Accounts Payable', debit: 0, credit: 5000 }
      ]
    },
    {
      journalNumber: 'CPU-INVEST-20240402',
      postDate: '2024-04-02',
      description: 'Owner investment to capitalize the business',
      entries: [
        { accountType: 'asset', accountName: 'Cash', debit: 10000, credit: 0 },
        { accountType: 'equity', accountName: "Owner's Capital", debit: 0, credit: 10000 }
      ]
    },
    {
      journalNumber: 'CPU-LOANPAY-20240520',
      postDate: '2024-05-20',
      description: 'Principal payment on bank loan',
      entries: [
        { accountType: 'liability', accountName: 'Notes Payable', debit: 2000, credit: 0 },
        { accountType: 'asset', accountName: 'Cash', debit: 0, credit: 2000 }
      ]
    }
  ]);

  let chartInstance = null;
  let lastLoadUsedFallback = false;
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
  window.addEventListener('autoGaap:entriesChanged', (event) => {
    if (Array.isArray(event.detail)) {
      runAutoGaapAnalysis(event.detail);
    } else {
      runAutoGaapAnalysis();
    }
  });

  window.autoGAAP = {
    analyze: () => runAutoGaapAnalysis(),
    loadLedgerEntries: () => loadLedgerEntries(),
    summarize: (entries) => summarizeJournalEntries(entries)
  };

  async function runAutoGaapAnalysis(entriesOverride) {
    const summaryContainer = getElement(SUMMARY_CONTAINER_ID);
    const recommendationContainer = getElement(RECOMMENDATIONS_ID);

    if (summaryContainer) {
      summaryContainer.innerHTML = '<p class="auto-gaap-placeholder">Analyzing ledger data...</p>';
    }
    if (recommendationContainer) {
      recommendationContainer.innerHTML = '';
    }

    let ledgerEntries = Array.isArray(entriesOverride) ? entriesOverride : [];
    let usedFallbackForThisRun = false;
    if (!ledgerEntries.length) {
      try {
        ledgerEntries = await loadLedgerEntries();
        usedFallbackForThisRun = lastLoadUsedFallback && Array.isArray(ledgerEntries) && ledgerEntries.length > 0;
      } catch (error) {
        console.error('AutoGAAP: Unable to load ledger entries.', error);
      }
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
    const health = analyzeLedgerHealth(ledgerEntries, summary);

    renderSummary(summary, health);
    renderRecommendations(summary, health);
    renderGaapChart(summary);

    if (usedFallbackForThisRun) {
      broadcastFallbackLedger(ledgerEntries);
      lastLoadUsedFallback = false;
    }
  }

  async function loadLedgerEntries() {
    const storedEntries = getStoredJournalEntries();
    if (storedEntries && storedEntries.length > 0) {
      return storedEntries;
    }

    if (wasLedgerExplicitlyCleared()) {
      lastLoadUsedFallback = false;
      return [];
    }

    try {
      const response = await fetch(FALLBACK_LEDGER_URL, { cache: 'no-store' });
      if (!response.ok) {
        console.warn('AutoGAAP: Fallback ledger could not be loaded.', response.statusText);
        lastLoadUsedFallback = EMBEDDED_FALLBACK_LEDGER.length > 0;
        return [...EMBEDDED_FALLBACK_LEDGER];
      }

      const payload = await response.json();
      if (Array.isArray(payload)) {
        lastLoadUsedFallback = payload.length > 0;
        return payload;
      }
      if (payload && Array.isArray(payload.journalEntries)) {
        lastLoadUsedFallback = payload.journalEntries.length > 0;
        return payload.journalEntries;
      }
      lastLoadUsedFallback = EMBEDDED_FALLBACK_LEDGER.length > 0;
      return [...EMBEDDED_FALLBACK_LEDGER];
    } catch (error) {
      console.warn('AutoGAAP: Error fetching fallback ledger.', error);
      lastLoadUsedFallback = EMBEDDED_FALLBACK_LEDGER.length > 0;
      return [...EMBEDDED_FALLBACK_LEDGER];
    }
  }

  function broadcastFallbackLedger(entries) {
    if (!Array.isArray(entries) || !entries.length) {
      return;
    }

    const clonedEntries = entries
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const lines = Array.isArray(entry.entries)
          ? entry.entries.map((line) => (line && typeof line === 'object' ? { ...line } : null)).filter(Boolean)
          : [];

        return {
          ...entry,
          entries: lines,
        };
      })
      .filter(Boolean);

    if (!clonedEntries.length) {
      return;
    }

    window.dispatchEvent(new CustomEvent('autoGaap:ledgerHydrated', { detail: clonedEntries }));
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

  function wasLedgerExplicitlyCleared() {
    try {
      return Boolean(window.localStorage ? window.localStorage.getItem(CLEAR_SENTINEL_KEY) : null);
    } catch (error) {
      console.warn('AutoGAAP: Unable to read ledger cleared sentinel.', error);
      return false;
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

  function renderSummary(summary, health) {
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
      ${renderIssueBanner(health)}
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

  function renderRecommendations(summary, health) {
    const recommendationContainer = getElement(RECOMMENDATIONS_ID);
    if (!recommendationContainer) {
      return;
    }

    const ledgerHealth = health || { issues: [], warnings: [] };
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

    const issueList = ledgerHealth.issues.length
      ? `
        <div class="auto-gaap-issue-group" role="alert">
          <h5>Detected issues</h5>
          <ul>${ledgerHealth.issues.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul>
        </div>
      `
      : '';

    const warningList = ledgerHealth.warnings.length
      ? `
        <div class="auto-gaap-warning-group">
          <h5>Potential follow-ups</h5>
          <ul>${ledgerHealth.warnings.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul>
        </div>
      `
      : '';

    recommendationContainer.innerHTML = `
      <h4>AutoGAAP Highlights</h4>
      <ul>
        ${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}
      </ul>
      ${issueList || warningList ? `<div class="auto-gaap-health">${issueList}${warningList}</div>` : '<p class="auto-gaap-placeholder">No policy exceptions detected in the latest run.</p>'}
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
      backgroundColors.push(positive ? 'rgba(37, 99, 235, 0.7)' : 'rgba(234, 88, 12, 0.7)');
      borderColors.push(positive ? '#1d4ed8' : '#c2410c');
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
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.18)' },
            ticks: { color: '#1f2937', font: { weight: '600' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.16)' },
            ticks: { color: '#1f2937' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function analyzeLedgerHealth(entries, summary) {
    const issues = [];
    const warnings = [];
    const seenNumbers = new Set();
    const today = new Date();

    entries.forEach((entry, entryIndex) => {
      if (!entry || typeof entry !== 'object') {
        issues.push(`Entry ${entryIndex + 1} is not a valid journal object.`);
        return;
      }

      const journalLabel = entry.journalNumber || `Entry ${entryIndex + 1}`;
      const description = entry.description || '';
      const postDate = entry.postDate ? new Date(entry.postDate) : null;

      if (seenNumbers.has(journalLabel)) {
        warnings.push(`${journalLabel} appears more than once. Confirm you have not duplicated the journal.`);
      } else {
        seenNumbers.add(journalLabel);
      }

      if (!description.trim()) {
        issues.push(`${journalLabel} is missing a description. Add the business purpose and approvals.`);
      }

      if (!postDate || Number.isNaN(postDate.getTime())) {
        issues.push(`${journalLabel} does not have a valid post date.`);
      } else if (postDate > today) {
        warnings.push(`${journalLabel} posts in the future (${postDate.toISOString().slice(0, 10)}). Confirm timing.`);
      }

      if (!Array.isArray(entry.entries) || entry.entries.length === 0) {
        issues.push(`${journalLabel} has no line items.`);
        return;
      }

      let entryDebits = 0;
      let entryCredits = 0;

      entry.entries.forEach((lineItem, lineIndex) => {
        const debit = round(toNumber(lineItem && lineItem.debit));
        const credit = round(toNumber(lineItem && lineItem.credit));
        entryDebits += debit;
        entryCredits += credit;

        const accountName = lineItem && typeof lineItem.accountName === 'string' && lineItem.accountName.trim()
          ? lineItem.accountName.trim()
          : '';
        const accountType = lineItem && typeof lineItem.accountType === 'string' && lineItem.accountType.trim()
          ? lineItem.accountType.trim()
          : '';

        if (!accountName) {
          issues.push(`${journalLabel} line ${lineIndex + 1} is missing an account name.`);
        }

        if (!accountType) {
          warnings.push(`${journalLabel} line ${lineIndex + 1} is missing an account classification.`);
        }

        if (debit === 0 && credit === 0) {
          warnings.push(`${journalLabel} line ${lineIndex + 1} has zero debit and credit values.`);
        }
      });

      const imbalance = round(entryDebits - entryCredits);
      if (Math.abs(imbalance) > BALANCE_TOLERANCE) {
        issues.push(`${journalLabel} is out of balance by ${formatCurrency(imbalance)} (Debit - Credit).`);
      }
    });

    if (summary) {
      const totalImbalance = round(summary.totalDebits - summary.totalCredits);
      if (Math.abs(totalImbalance) > BALANCE_TOLERANCE) {
        issues.push(`Total ledger imbalance is ${formatCurrency(totalImbalance)}. Investigate latest entries.`);
      }
    }

    return {
      issues: dedupeMessages(issues).slice(0, 10),
      warnings: dedupeMessages(warnings).slice(0, 10)
    };
  }

  function renderIssueBanner(health) {
    const ledgerHealth = health || { issues: [], warnings: [] };
    if (!ledgerHealth.issues.length && !ledgerHealth.warnings.length) {
      return '';
    }

    if (ledgerHealth.issues.length) {
      return `
        <div class="auto-gaap-status-banner issue" role="alert">
          ${escapeHtml(ledgerHealth.issues[0])}
        </div>
      `;
    }

    return `
      <div class="auto-gaap-status-banner warning" role="note">
        ${escapeHtml(ledgerHealth.warnings[0])}
      </div>
    `;
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

  function dedupeMessages(messages) {
    return Array.from(new Set(messages.filter(Boolean)));
  }

  const accountingAssistantForm = document.getElementById('accountingAssistantForm');
  const accountingAssistantLog = document.getElementById('accountingAssistantLog');

  if (accountingAssistantForm && accountingAssistantLog) {
    const accountingAssistantInput = document.getElementById('accountingAssistantInput');
    const accountingAssistantButton = accountingAssistantForm.querySelector('button[type="submit"]');
    const defaultAssistantLabel = accountingAssistantButton ? accountingAssistantButton.textContent : '';
    const accountingPatterns = [
      {
        test: /(revenue recognition|asc 606|deferred revenue|performance obligation|contract)/,
        response:
          'Document the contract ID, identify each performance obligation, and schedule revenue recognition as milestones are met. Auto GAAP keeps the liability in deferred revenue until you mark the obligation satisfied, then suggests the debit/credit pair for recognition.'
      },
      {
        test: /(accrual|accrued|payable|true[-\s]?up|reverse|reversing entry)/,
        response:
          'Record the accrual with a debit to the expense and a credit to the appropriate accrued liability. Include the expected settlement date so the recurring controls queue a reversal or true-up. The accrual panel in the journal builder stores who approved the estimate and when to revisit it.'
      },
      {
        test: /(prepaid|amortization|deferral|schedule)/,
        response:
          'For prepaid activity, debit the prepaid asset and credit cash or payables. Capture the service window in the prepaid schedule so Auto GAAP books the monthly amortization entry automatically and shows the runoff in the depreciation preview.'
      },
      {
        test: /(depreciation|fixed asset|useful life|salvage|capitaliz)/,
        response:
          'Confirm the capitalization threshold, then debit the asset and credit cash or accounts payable. Enter cost, salvage, and useful life in the asset fields so the depreciation preview calculates straight-line expense and the remaining net book value each period.'
      },
      {
        test: /(trial balance|balance|out of balance|debits|credits)/,
        response:
          'Use the balance indicator under the journal builder and the Auto GAAP highlights table to confirm total debits equal credits. If you see a variance, drill into the account breakdown and adjust the entry before posting to keep the ledger reconciled.'
      },
      {
        test: /(financial statement|income statement|balance sheet|cash flow|equity statement)/,
        response:
          'Load your entries and trigger the financial statement generator. It maps each account to the correct statement section, shows period-to-date balances, and lets you export HTML, JSON, or PDF for review packages.'
      },
      {
        test: /(internal control|audit|supporting doc|documentation|evidence)/,
        response:
          'Attach the source document reference, approval trail, and policy citation in the description. Auto GAAP reminders prompt you to log preparer/reviewer details so auditors can trace each entry from evidence to financial statements.'
      },
      {
        test: /(cash flow|operating|investing|financing)/,
        response:
          'Classify cash activity by asking whether it supports operations, investing in long-term assets, or financing capital. The cash flow generator in Auto GAAP groups your journal lines accordingly and reconciles beginning to ending cash automatically.'
      },
      {
        test: /(close|month[-\s]?end|reconcile|checklist|calendar)/,
        response:
          'Anchor each task to the close checklist: reconcile subledgers, review accruals, generate statements, then lock the period. Auto GAAP tracks status on each step so controllers know when reviewers and approvers have signed off.'
      },
      {
        test: /(chart of accounts|coa|account type|classification)/,
        response:
          'Choose the account from your GAAP-aligned chart and verify the normal balance. Auto GAAP enforces the asset/liability/equity/revenue/expense taxonomy so every posting flows cleanly into statements and analytics.'
      }
    ];
    const accountingFallbackResponses = [
      'I can outline debits, credits, and supporting controls for your entry—just share the business event and timing.',
      'Need a walkthrough? Ask about revenue, expenses, cash flow, or reconciliations and I will map the Auto GAAP workflow for you.',
      'Provide the accounts involved plus any policies you are referencing, and I will recommend documentation steps and reviewers.'
    ];
    let fallbackCursor = 0;

    const appendAssistantMessage = (role, text) => {
      const bubble = document.createElement('div');
      bubble.className = `message ${role}`;
      bubble.textContent = text;
      accountingAssistantLog.appendChild(bubble);
      accountingAssistantLog.scrollTop = accountingAssistantLog.scrollHeight;
    };

    const generateAccountingResponse = (value) => {
      const normalized = value.toLowerCase();
      for (const pattern of accountingPatterns) {
        if (pattern.test(normalized)) {
          return pattern.response;
        }
      }
      const fallback = accountingFallbackResponses[fallbackCursor % accountingFallbackResponses.length];
      fallbackCursor += 1;
      return fallback;
    };

    const primerMessages = [
      'Hi, I’m the Auto GAAP accounting assistant. Ask me about ledger entries, GAAP policy, or how to keep the close on track.',
      'You can prompt me with questions like:\n• Draft a deferred revenue entry\n• Explain the controls for payroll accruals\n• Show how this maps to the balance sheet'
    ];

    primerMessages.forEach((message) => appendAssistantMessage('bot', message));

    accountingAssistantForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!accountingAssistantInput) {
        return;
      }
      const rawValue = accountingAssistantInput.value.trim();
      if (!rawValue) {
        return;
      }

      appendAssistantMessage('user', rawValue);
      accountingAssistantInput.value = '';

      if (accountingAssistantButton) {
        accountingAssistantButton.disabled = true;
        accountingAssistantButton.textContent = 'Thinking…';
      }

      window.setTimeout(() => {
        appendAssistantMessage('bot', generateAccountingResponse(rawValue));
        if (accountingAssistantButton) {
          accountingAssistantButton.disabled = false;
          accountingAssistantButton.textContent = defaultAssistantLabel;
        }
        accountingAssistantInput.focus();
      }, 480 + Math.random() * 420);
    });
  }

  function getElement(id) {
    return document.getElementById(id);
  }
})();
