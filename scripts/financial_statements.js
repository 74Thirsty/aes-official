(() => {
  const STORAGE_KEY = 'journalEntries';
  const OUTPUT_ID = 'financialStatementsOutput';
  const STATEMENT_METADATA = {
    balanceSheet: { title: 'Balance sheet', fileName: 'balance_sheet' },
    incomeStatement: { title: 'Income statement', fileName: 'income_statement' },
    equityStatement: { title: "Statement of owner's equity", fileName: 'owners_equity_statement' },
    cashFlow: { title: 'Cash flow statement', fileName: 'cash_flow_statement' },
  };
  const NORMAL_BALANCES = {
    asset: 'debit',
    expense: 'debit',
    liability: 'credit',
    equity: 'credit',
    revenue: 'credit',
  };

  let lastStatement = null;
  let lastStatementInfo = null;
  let fallbackEntries = [];

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
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('financial_statements.js: unable to parse stored entries', error);
    }

    if (fallbackEntries.length) {
      return fallbackEntries.map((entry) => ({
        ...entry,
        entries: Array.isArray(entry.entries)
          ? entry.entries.map((line) => ({ ...line }))
          : [],
      }));
    }

    return [];
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

    const html = `
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

    return {
      html,
      data: {
        sections: {
          assets: assets.map((item) => ({
            accountType: 'asset',
            accountName: item.accountName,
            balance: Number(item.balance),
          })),
          liabilities: liabilities.map((item) => ({
            accountType: 'liability',
            accountName: item.accountName,
            balance: Number(item.balance),
          })),
          equity: equity.map((item) => ({
            accountType: 'equity',
            accountName: item.accountName,
            balance: Number(item.balance),
          })),
        },
        totals: {
          assets: totalAssets,
          liabilities: totalLiabilities,
          equity: totalEquity,
        },
        reconciliation: balanceNote,
      },
    };
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

    const html = `
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

    return {
      html,
      data: {
        sections: {
          revenues: revenues.map((item) => ({
            accountType: 'revenue',
            accountName: item.accountName,
            balance: Number(item.balance),
          })),
          expenses: expenses.map((item) => ({
            accountType: 'expense',
            accountName: item.accountName,
            balance: Number(item.balance),
          })),
        },
        totals: {
          revenue: totalRevenue,
          expenses: totalExpenses,
          netIncome,
        },
      },
    };
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

    const html = `
      <article class="card compact">
        <h5>Statement of owner's equity</h5>
        ${renderList(equityAccounts)}
        <p class="statement-total">Owner investments & balances: ${formatCurrency(totalEquity)}</p>
        <p class="statement-total">Net income: ${netIncomeValue}</p>
        <p class="statement-total">Ending owner's equity: ${formatCurrency(endingEquity)}</p>
      </article>
    `;

    return {
      html,
      data: {
        accounts: equityAccounts.map((item) => ({
          accountType: 'equity',
          accountName: item.accountName,
          balance: Number(item.balance),
        })),
        totals: {
          ownerEquity: totalEquity,
          netIncome: netIncomeRaw,
          endingEquity,
        },
      },
    };
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

    const html = `
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

    return {
      html,
      data: { ...totals },
    };
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
      lastStatementInfo = null;
      return;
    }

    const accounts = aggregateAccountBalances(entries);
    let result = null;

    if (type === 'balanceSheet') {
      result = renderBalanceSheet(accounts);
    } else if (type === 'incomeStatement') {
      result = renderIncomeStatement(accounts);
    } else if (type === 'equityStatement') {
      result = renderEquityStatement(accounts);
    } else if (type === 'cashFlow') {
      result = renderCashFlowStatement(entries);
    }

    if (!result || !result.html) {
      updateOutput('<p class="auto-gaap-placeholder">Unable to generate the requested statement.</p>');
      lastStatement = null;
      lastStatementInfo = null;
      return;
    }

    updateOutput(result.html);
    lastStatement = type;
    const metadata = STATEMENT_METADATA[type] || { title: 'Financial statement', fileName: 'financial_statement' };
    lastStatementInfo = {
      type,
      title: metadata.title,
      fileName: metadata.fileName,
      html: result.html,
      data: result.data,
      generatedAt: new Date().toISOString(),
    };
  };

  const wrapHtmlDocument = (title, body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; background: #f9fafb; padding: 2rem; }
      h1 { font-size: 1.5rem; margin-bottom: 1rem; }
      article { background: #ffffff; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); }
      ul { list-style: none; padding: 0; margin: 0; }
      li { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 0; }
      li span:first-child { font-weight: 600; }
      .statement-total { font-weight: 600; margin-top: 0.75rem; }
      .statement-columns { display: grid; gap: 1.5rem; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${body}
  </body>
</html>`;

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrentStatementAsHtml = () => {
    if (!lastStatementInfo) {
      alert('Generate a financial statement before downloading it.');
      return;
    }

    const documentHtml = wrapHtmlDocument(lastStatementInfo.title, lastStatementInfo.html);
    const blob = new Blob([documentHtml], { type: 'text/html' });
    triggerDownload(blob, `${lastStatementInfo.fileName}.html`);
  };

  const exportCurrentStatementAsJson = () => {
    if (!lastStatementInfo) {
      alert('Generate a financial statement before exporting it.');
      return;
    }

    const payload = {
      statement: lastStatementInfo.title,
      generatedAt: lastStatementInfo.generatedAt,
      data: lastStatementInfo.data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `${lastStatementInfo.fileName}.json`);
  };

  const appendSectionToPdf = (doc, heading, rows, startY) => {
    if (!rows || !rows.length) {
      return startY;
    }

    let y = startY;
    const ensureSpace = () => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    };

    ensureSpace();
    doc.setFont('helvetica', 'bold');
    doc.text(heading, 12, y);
    y += 6;
    doc.setFont('helvetica', 'normal');

    rows.forEach((row) => {
      ensureSpace();
      const line = `${row.accountName}: ${formatCurrency(row.balance)}`;
      doc.text(line, 16, y);
      y += 6;
    });

    return y + 2;
  };

  const exportCurrentStatementAsPdf = () => {
    if (!lastStatementInfo) {
      alert('Generate a financial statement before exporting it.');
      return;
    }

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      alert('PDF export is unavailable in this environment.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(lastStatementInfo.title, 12, 20);
    doc.setFontSize(12);

    let y = 30;
    const { type, data } = lastStatementInfo;

    if (type === 'balanceSheet') {
      y = appendSectionToPdf(doc, 'Assets', data.sections.assets, y);
      y = appendSectionToPdf(doc, 'Liabilities', data.sections.liabilities, y + 4);
      y = appendSectionToPdf(doc, "Owner's equity", data.sections.equity, y + 4);
      doc.setFont('helvetica', 'bold');
      y += 4;
      doc.text(`Total assets: ${formatCurrency(data.totals.assets)}`, 12, y);
      y += 6;
      doc.text(`Total liabilities: ${formatCurrency(data.totals.liabilities)}`, 12, y);
      y += 6;
      doc.text(`Total equity: ${formatCurrency(data.totals.equity)}`, 12, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(data.reconciliation, 12, y);
    } else if (type === 'incomeStatement') {
      y = appendSectionToPdf(doc, 'Revenues', data.sections.revenues, y);
      y = appendSectionToPdf(doc, 'Expenses', data.sections.expenses, y + 4);
      doc.setFont('helvetica', 'bold');
      y += 4;
      doc.text(`Total revenues: ${formatCurrency(data.totals.revenue)}`, 12, y);
      y += 6;
      doc.text(`Total expenses: ${formatCurrency(data.totals.expenses)}`, 12, y);
      y += 6;
      doc.text(`Net income: ${formatCurrency(data.totals.netIncome)}`, 12, y);
    } else if (type === 'equityStatement') {
      y = appendSectionToPdf(doc, "Owner's equity accounts", data.accounts, y);
      doc.setFont('helvetica', 'bold');
      y += 4;
      doc.text(`Owner investments & balances: ${formatCurrency(data.totals.ownerEquity)}`, 12, y);
      y += 6;
      doc.text(`Net income: ${formatCurrency(data.totals.netIncome)}`, 12, y);
      y += 6;
      doc.text(`Ending owner's equity: ${formatCurrency(data.totals.endingEquity)}`, 12, y);
    } else if (type === 'cashFlow') {
      doc.setFont('helvetica', 'normal');
      doc.text(`Net cash from operating activities: ${formatCurrency(data.operating)}`, 12, y);
      y += 6;
      doc.text(`Net cash from investing activities: ${formatCurrency(data.investing)}`, 12, y);
      y += 6;
      doc.text(`Net cash from financing activities: ${formatCurrency(data.financing)}`, 12, y);
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text(`Net change in cash: ${formatCurrency(data.netChange)}`, 12, y);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text('No exportable data found for this statement.', 12, y);
    }

    doc.save(`${lastStatementInfo.fileName}.pdf`);
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

  const bindExports = () => {
    const bindings = [
      { id: 'downloadStatementHtml', handler: exportCurrentStatementAsHtml },
      { id: 'downloadStatementJson', handler: exportCurrentStatementAsJson },
      { id: 'downloadStatementPdf', handler: exportCurrentStatementAsPdf },
    ];

    bindings.forEach((binding) => {
      const button = document.getElementById(binding.id);
      if (!button) return;
      button.addEventListener('click', binding.handler);
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindStatements();
    bindExports();
  });

  window.addEventListener('autoGaap:entriesChanged', (event) => {
    if (Array.isArray(event.detail)) {
      fallbackEntries = [];
    }

    if (lastStatement) {
      renderStatement(lastStatement);
    }
  });

  window.addEventListener('autoGaap:ledgerHydrated', (event) => {
    const entries = Array.isArray(event.detail) ? event.detail : [];
    fallbackEntries = entries.map((entry) => ({
      ...entry,
      entries: Array.isArray(entry.entries)
        ? entry.entries.map((line) => ({ ...line }))
        : [],
    }));

    if (lastStatement) {
      renderStatement(lastStatement);
    }
  });
})();
