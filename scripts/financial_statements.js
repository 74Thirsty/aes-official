(() => {
  const STORAGE_KEY = 'journalEntries';
  const OUTPUT_ID = 'financialStatementsOutput';
  const NORMAL_BALANCES = {
    asset: 'debit',
    expense: 'debit',
    liability: 'credit',
    equity: 'credit',
    revenue: 'credit',
  };

  let lastStatement = null;

  const currencyFormatter = (() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      return null;
    }
  })();

  const formatCurrency = (value) => {
    const amount = Number.isFinite(value) ? value : 0;
    if (!currencyFormatter) {
      const absolute = Math.abs(amount).toFixed(2);
      return amount < 0 ? `($${absolute})` : `$${absolute}`;
    }
    const formatted = currencyFormatter.format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
  };

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const loadEntries = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('financial_statements.js: unable to parse stored entries', error);
      return [];
    }
  };

  const aggregateAccountBalances = (entries) => {
    const accounts = new Map();

    entries.forEach((entry) => {
      (entry?.entries || []).forEach((line) => {
        const accountType = typeof line.accountType === 'string' ? line.accountType.toLowerCase() : 'other';
        const accountName = typeof line.accountName === 'string' && line.accountName.trim() !== '' ? line.accountName : 'Unspecified account';
        const key = `${accountType}::${accountName}`;
        const debit = toNumber(line.debit);
        const credit = toNumber(line.credit);

        if (!accounts.has(key)) {
          accounts.set(key, {
            accountType,
            accountName,
            debit: 0,
            credit: 0,
          });
        }

        const account = accounts.get(key);
        account.debit += debit;
        account.credit += credit;
      });
    });

    return Array.from(accounts.values());
  };

  const calculateNetBalance = (account) => {
    const normalSide = NORMAL_BALANCES[account.accountType] || 'debit';
    const debit = toNumber(account.debit);
    const credit = toNumber(account.credit);
    return normalSide === 'debit' ? debit - credit : credit - debit;
  };

  const renderList = (items) => {
    if (!items.length) {
      return '<p class="auto-gaap-placeholder">No activity recorded.</p>';
    }

    const rows = items
      .map((item) => `<li><span>${item.accountName}</span><span>${formatCurrency(item.balance)}</span></li>`)
      .join('');
    return `<ul class="statement-list">${rows}</ul>`;
  };

  const renderBalanceSheet = (accounts) => {
    const assets = [];
    const liabilities = [];
    const equity = [];

    accounts.forEach((account) => {
      const balance = calculateNetBalance(account);
      if (Math.abs(balance) < 0.005) {
        return;
      }

      if (account.accountType === 'asset') {
        assets.push({ ...account, balance });
      } else if (account.accountType === 'liability') {
        liabilities.push({ ...account, balance });
      } else if (account.accountType === 'equity') {
        equity.push({ ...account, balance });
      }
    });

    const totalRevenue = accounts
      .filter((account) => account.accountType === 'revenue')
      .reduce((sum, account) => sum + calculateNetBalance(account), 0);
    const totalExpenses = accounts
      .filter((account) => account.accountType === 'expense')
      .reduce((sum, account) => sum + calculateNetBalance(account), 0);
    const netIncome = totalRevenue - totalExpenses;
    if (Math.abs(netIncome) >= 0.005) {
      equity.push({
        accountType: 'equity',
        accountName: netIncome >= 0 ? 'Current period earnings' : 'Current period loss',
        balance: netIncome,
      });
    }

    const totalAssets = assets.reduce((sum, item) => sum + item.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.balance, 0);
    const totalEquity = equity.reduce((sum, item) => sum + item.balance, 0);
    const balanceNote = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      ? 'Assets equal liabilities plus equity.'
      : 'Review balances—assets do not equal liabilities plus equity.';

    return `
      <article class="card compact">
        <h5>Balance sheet</h5>
        <div class="statement-columns">
          <div>
            <h6>Assets</h6>
            ${renderList(assets)}
            <p class="statement-total">Total assets: ${formatCurrency(totalAssets)}</p>
          </div>
          <div>
            <h6>Liabilities</h6>
            ${renderList(liabilities)}
            <p class="statement-total">Total liabilities: ${formatCurrency(totalLiabilities)}</p>
          </div>
          <div>
            <h6>Owner's equity</h6>
            ${renderList(equity)}
            <p class="statement-total">Total equity: ${formatCurrency(totalEquity)}</p>
          </div>
        </div>
        <p class="statement-footnote">${balanceNote}</p>
      </article>
    `;
  };

  const renderIncomeStatement = (accounts) => {
    const revenues = [];
    const expenses = [];

    accounts.forEach((account) => {
      if (account.accountType === 'revenue' || account.accountType === 'expense') {
        const balance = calculateNetBalance(account);
        if (Math.abs(balance) < 0.005) {
          return;
        }
        if (account.accountType === 'revenue') {
          revenues.push({ ...account, balance });
        } else {
          expenses.push({ ...account, balance });
        }
      }
    });

    const totalRevenue = revenues.reduce((sum, item) => sum + item.balance, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    return `
      <article class="card compact">
        <h5>Income statement</h5>
        <div class="statement-columns">
          <div>
            <h6>Revenues</h6>
            ${renderList(revenues)}
            <p class="statement-total">Total revenues: ${formatCurrency(totalRevenue)}</p>
          </div>
          <div>
            <h6>Expenses</h6>
            ${renderList(expenses)}
            <p class="statement-total">Total expenses: ${formatCurrency(totalExpenses)}</p>
          </div>
        </div>
        <p class="statement-total">Net income: ${formatCurrency(netIncome)}</p>
      </article>
    `;
  };

  const renderEquityStatement = (accounts) => {
    const equityAccounts = [];

    accounts.forEach((account) => {
      if (account.accountType === 'equity') {
        const balance = calculateNetBalance(account);
        if (Math.abs(balance) < 0.005) {
          return;
        }
        equityAccounts.push({ ...account, balance });
      }
    });

    const totalEquity = equityAccounts.reduce((sum, item) => sum + item.balance, 0);
    const totalRevenue = accounts
      .filter((account) => account.accountType === 'revenue')
      .reduce((sum, account) => sum + calculateNetBalance(account), 0);
    const totalExpenses = accounts
      .filter((account) => account.accountType === 'expense')
      .reduce((sum, account) => sum + calculateNetBalance(account), 0);
    const netIncomeRaw = totalRevenue - totalExpenses;
    const netIncomeValue = formatCurrency(netIncomeRaw);
    const endingEquity = totalEquity + netIncomeRaw;

    return `
      <article class="card compact">
        <h5>Statement of owner's equity</h5>
        ${renderList(equityAccounts)}
        <p class="statement-total">Owner investments & balances: ${formatCurrency(totalEquity)}</p>
        <p class="statement-total">Net income: ${netIncomeValue}</p>
        <p class="statement-total">Ending owner's equity: ${formatCurrency(endingEquity)}</p>
      </article>
    `;
  };

  const isCashAccount = (line) => {
    if (!line) return false;
    const name = typeof line.accountName === 'string' ? line.accountName.toLowerCase() : '';
    return line.accountType === 'asset' && name.includes('cash');
  };

  const categorizeCashFlows = (entries) => {
    const totals = { operating: 0, investing: 0, financing: 0 };

    entries.forEach((entry) => {
      const lines = Array.isArray(entry?.entries) ? entry.entries : [];
      if (!lines.length) return;
      const cashLine = lines.find((line) => isCashAccount(line));
      if (!cashLine) return;
      const cashChange = toNumber(cashLine.debit) - toNumber(cashLine.credit);
      const otherTypes = lines
        .filter((line) => line !== cashLine)
        .map((line) => (typeof line.accountType === 'string' ? line.accountType.toLowerCase() : 'other'));

      let bucket = 'operating';
      if (otherTypes.some((type) => type === 'liability' || type === 'equity')) {
        bucket = 'financing';
      } else if (otherTypes.some((type) => type === 'asset')) {
        bucket = 'investing';
      } else if (otherTypes.some((type) => type === 'revenue' || type === 'expense')) {
        bucket = 'operating';
      }

      totals[bucket] += cashChange;
    });

    return {
      operating: totals.operating,
      investing: totals.investing,
      financing: totals.financing,
      netChange: totals.operating + totals.investing + totals.financing,
    };
  };

  const renderCashFlowStatement = (entries) => {
    const totals = categorizeCashFlows(entries);

    return `
      <article class="card compact">
        <h5>Cash flow statement</h5>
        <ul class="statement-list">
          <li><span>Net cash from operating activities</span><span>${formatCurrency(totals.operating)}</span></li>
          <li><span>Net cash from investing activities</span><span>${formatCurrency(totals.investing)}</span></li>
          <li><span>Net cash from financing activities</span><span>${formatCurrency(totals.financing)}</span></li>
        </ul>
        <p class="statement-total">Net change in cash: ${formatCurrency(totals.netChange)}</p>
      </article>
    `;
  };

  const updateOutput = (html) => {
    const container = document.getElementById(OUTPUT_ID);
    if (!container) return;
    container.innerHTML = html;
  };

  const renderStatement = (type) => {
    const entries = loadEntries();
    if (!entries.length) {
      updateOutput('<p class="auto-gaap-placeholder">Add journal entries before generating financial statements.</p>');
      lastStatement = null;
      return;
    }

    const accounts = aggregateAccountBalances(entries);
    let html = '';

    if (type === 'balanceSheet') {
      html = renderBalanceSheet(accounts);
    } else if (type === 'incomeStatement') {
      html = renderIncomeStatement(accounts);
    } else if (type === 'equityStatement') {
      html = renderEquityStatement(accounts);
    } else if (type === 'cashFlow') {
      html = renderCashFlowStatement(entries);
    }

    if (!html) {
      updateOutput('<p class="auto-gaap-placeholder">Unable to generate the requested statement.</p>');
      lastStatement = null;
      return;
    }

    updateOutput(html);
    lastStatement = type;
  };

  const bindStatements = () => {
    const bindings = [
      { id: 'generateBalanceSheet', type: 'balanceSheet' },
      { id: 'generateIncomeStatement', type: 'incomeStatement' },
      { id: 'generateEquityStatement', type: 'equityStatement' },
      { id: 'generateCashFlow', type: 'cashFlow' },
    ];

    bindings.forEach((binding) => {
      const button = document.getElementById(binding.id);
      if (!button) return;
      button.addEventListener('click', () => renderStatement(binding.type));
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindStatements();
  });

  window.addEventListener('autoGaap:entriesChanged', () => {
    if (lastStatement) {
      renderStatement(lastStatement);
    }
  });
})();
