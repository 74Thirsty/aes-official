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

  const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  const escapeHtml = (value) =>
    typeof value === 'string' ? value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char) : '';

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

  const safeDivide = (numerator, denominator) => {
    const divisor = Number(denominator);
    if (!Number.isFinite(divisor) || Math.abs(divisor) < 0.00001) {
      return null;
    }
    const dividend = Number(numerator);
    if (!Number.isFinite(dividend)) {
      return null;
    }
    return dividend / divisor;
  };

  const formatPercentage = (value) =>
    Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';

  const formatRatio = (value) => (Number.isFinite(value) ? value.toFixed(2) : '—');

  const parseDateValue = (value) => {
    if (!value || typeof value !== 'string') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDateDisplay = (date) => {
    if (!date) return null;
    try {
      return date.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return date.toISOString().split('T')[0];
    }
  };

  const deriveReportingPeriod = (entries) => {
    let start = null;
    let end = null;

    entries.forEach((entry) => {
      const date = parseDateValue(entry?.postDate);
      if (!date) return;
      if (!start || date < start) start = date;
      if (!end || date > end) end = date;
    });

    const asOfLabel = end ? `As of ${formatDateDisplay(end)}` : 'As of current session';
    let periodLabel = 'For the current session';
    if (start && end) {
      if (start.getTime() === end.getTime()) {
        periodLabel = `For the period ended ${formatDateDisplay(end)}`;
      } else {
        periodLabel = `For the period ${formatDateDisplay(start)} – ${formatDateDisplay(end)}`;
      }
    } else if (end) {
      periodLabel = `For the period through ${formatDateDisplay(end)}`;
    }

    return {
      startDateIso: start ? start.toISOString() : null,
      endDateIso: end ? end.toISOString() : null,
      asOfLabel,
      periodLabel,
      entryCount: entries.length,
    };
  };

  const sortByMagnitudeDesc = (a, b) => Math.abs(b.balance) - Math.abs(a.balance);

  const renderStatementHeader = (title, context, mode = 'period', tagline = '') => {
    const reporting = context?.reportingPeriod || {
      asOfLabel: 'As of current session',
      periodLabel: 'For the current session',
      entryCount: context?.entryCount || 0,
    };

    const descriptor = mode === 'asOf' ? reporting.asOfLabel : reporting.periodLabel;
    const resolvedTagline = tagline ? `<p class="statement-tagline">${escapeHtml(tagline)}</p>` : '';

    return `
      <header class="statement-header">
        <div>
          <h5>${escapeHtml(title)}</h5>
          <p class="statement-subtitle">${escapeHtml(descriptor)}</p>
          ${resolvedTagline}
        </div>
        <ul class="statement-meta">
          <li><span class="label">Entries analyzed</span><span>${reporting.entryCount}</span></li>
          <li><span class="label">Reporting currency</span><span>USD</span></li>
        </ul>
      </header>
    `;
  };

  const renderMetrics = (metrics) => {
    if (!Array.isArray(metrics) || !metrics.length) {
      return '';
    }

    const items = metrics
      .map((metric) => {
        const value = escapeHtml(metric.value ?? '');
        const note = metric.note ? `<small>${escapeHtml(metric.note)}</small>` : '';
        return `<li><span>${escapeHtml(metric.label ?? '')}</span><strong>${value}</strong>${note}</li>`;
      })
      .join('');

    return `
      <section class="statement-metrics">
        <h6>Key indicators</h6>
        <ul class="metrics-grid">${items}</ul>
      </section>
    `;
  };

  const renderFootnotes = (notes) => {
    if (!Array.isArray(notes) || !notes.length) {
      return '';
    }

    const items = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('');

    return `
      <section class="statement-footnotes">
        <h6>Notes</h6>
        <ol>${items}</ol>
      </section>
    `;
  };

  const resolveNormalSide = (item) => {
    if (typeof item?.normalSide === 'string') {
      return item.normalSide;
    }

    if (typeof item?.accountType === 'string' && NORMAL_BALANCES[item.accountType]) {
      return NORMAL_BALANCES[item.accountType];
    }

    return 'debit';
  };

  const resolveNetBalance = (item) => {
    if (item && Number.isFinite(Number(item.balance))) {
      return Number(item.balance);
    }

    const debit = toNumber(item?.debit);
    const credit = toNumber(item?.credit);
    const normalSide = resolveNormalSide(item);
    return normalSide === 'credit' ? credit - debit : debit - credit;
  };

  const renderSectionTable = (sections) => {
    const body = sections
      .map((section) => {
        const total = section.total ?? 0;
        const hasLines = Array.isArray(section.items) && section.items.length;
        const shareBaseline = hasLines
          ? Math.abs(total) > 0.0001
            ? Math.abs(total)
            : section.items.reduce((sum, current) => sum + Math.abs(resolveNetBalance(current)), 0)
          : 0;
        const rows = hasLines
          ? section.items
              .map((item) => {
                const debit = toNumber(item.debit);
                const credit = toNumber(item.credit);
                const net = resolveNetBalance(item);
                const share = shareBaseline > 0.0001 ? formatPercentage(Math.abs(net) / shareBaseline) : '—';
                return `
                  <tr>
                    <td>${escapeHtml(item.accountName)}</td>
                    <td class="numeric">${Math.abs(debit) > 0.0001 ? formatCurrency(debit) : '—'}</td>
                    <td class="numeric">${Math.abs(credit) > 0.0001 ? formatCurrency(credit) : '—'}</td>
                    <td class="numeric">${formatCurrency(net)}</td>
                    <td class="numeric">${share}</td>
                  </tr>
                `;
              })
              .join('')
          : '<tr class="statement-empty"><td colspan="5">No activity recorded.</td></tr>';

        const totalDebit = hasLines ? section.items.reduce((sum, item) => sum + toNumber(item.debit), 0) : 0;
        const totalCredit = hasLines ? section.items.reduce((sum, item) => sum + toNumber(item.credit), 0) : 0;
        const resolvedTotal = Number.isFinite(Number(total)) ? Number(total) : resolveNetBalance({
          debit: totalDebit,
          credit: totalCredit,
          normalSide: section.normalSide,
        });
        const totalShare = Math.abs(resolvedTotal) > 0.0001 ? '100%' : '—';

        return `
          <tr class="statement-section"><th colspan="5">${escapeHtml(section.title)}</th></tr>
          ${rows}
          <tr class="statement-subtotal">
            <td>${escapeHtml(section.totalLabel || `Total ${section.title.toLowerCase()}`)}</td>
            <td class="numeric">${Math.abs(totalDebit) > 0.0001 ? formatCurrency(totalDebit) : '—'}</td>
            <td class="numeric">${Math.abs(totalCredit) > 0.0001 ? formatCurrency(totalCredit) : '—'}</td>
            <td class="numeric">${formatCurrency(resolvedTotal)}</td>
            <td class="numeric">${totalShare}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <table class="statement-table">
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col" class="numeric">Debits</th>
            <th scope="col" class="numeric">Credits</th>
            <th scope="col" class="numeric">Net impact</th>
            <th scope="col" class="numeric">% of section</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;
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

  const renderBalanceSheet = (accounts, context) => {
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
        debit: netIncome < 0 ? Math.abs(netIncome) : 0,
        credit: netIncome > 0 ? Math.abs(netIncome) : 0,
        normalSide: 'credit',
      });
    }

    assets.sort(sortByMagnitudeDesc);
    liabilities.sort(sortByMagnitudeDesc);
    equity.sort(sortByMagnitudeDesc);

    const totalAssets = assets.reduce((sum, item) => sum + item.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.balance, 0);
    const totalEquity = equity.reduce((sum, item) => sum + item.balance, 0);
    const equationVariance = totalAssets - (totalLiabilities + totalEquity);
    const balanceNote = Math.abs(equationVariance) < 0.01
      ? 'Assets reconcile to liabilities plus equity.'
      : `Review balances — the accounting equation is off by ${formatCurrency(equationVariance)}.`;
    const workingCapital = totalAssets - totalLiabilities;
    const debtToEquity = safeDivide(totalLiabilities, totalEquity);
    const coverageRatio = safeDivide(totalAssets, totalLiabilities + totalEquity);

    const sections = [
      { title: 'Assets', items: assets, total: totalAssets, totalLabel: 'Total assets' },
      { title: 'Liabilities', items: liabilities, total: totalLiabilities, totalLabel: 'Total liabilities' },
      { title: "Owner's equity", items: equity, total: totalEquity, totalLabel: "Total owner's equity" },
    ];

    const metrics = [
      { label: 'Working capital', value: formatCurrency(workingCapital) },
      { label: 'Debt-to-equity', value: formatRatio(debtToEquity ?? null), note: 'Liabilities ÷ equity' },
      { label: 'Assets coverage', value: formatRatio(coverageRatio ?? null), note: 'Assets ÷ (liabilities + equity)' },
    ];

    const notes = [
      balanceNote,
      "Percentages reflect each account's share of its section total.",
      'Debit and credit columns list the gross postings captured for each account.',
      `Prepared ${context?.reportingPeriod?.asOfLabel || 'for the current session'}.`,
    ];

    const html = `
      <article class="card statement-card">
        ${renderStatementHeader('Balance sheet', context, 'asOf', 'Detailed classification of assets, liabilities, and equity.')}
        ${renderSectionTable(sections)}
        ${renderMetrics(metrics)}
        ${renderFootnotes(notes)}
      </article>
    `;

    return {
      html,
      data: {
        sections: {
          assets: assets.map((item) => ({
            accountType: 'asset',
            accountName: item.accountName,
            debit: toNumber(item.debit),
            credit: toNumber(item.credit),
            balance: Number(item.balance),
            shareOfSection: Math.abs(totalAssets) > 0.0001 ? Math.abs(item.balance) / Math.abs(totalAssets) : 0,
          })),
          liabilities: liabilities.map((item) => ({
            accountType: 'liability',
            accountName: item.accountName,
            debit: toNumber(item.debit),
            credit: toNumber(item.credit),
            balance: Number(item.balance),
            shareOfSection: Math.abs(totalLiabilities) > 0.0001 ? Math.abs(item.balance) / Math.abs(totalLiabilities) : 0,
          })),
          equity: equity.map((item) => ({
            accountType: 'equity',
            accountName: item.accountName,
            debit: toNumber(item.debit),
            credit: toNumber(item.credit),
            balance: Number(item.balance),
            shareOfSection: Math.abs(totalEquity) > 0.0001 ? Math.abs(item.balance) / Math.abs(totalEquity) : 0,
          })),
        },
        totals: {
          assets: totalAssets,
          liabilities: totalLiabilities,
          equity: totalEquity,
        },
        reconciliation: balanceNote,
        metrics: {
          workingCapital,
          debtToEquity,
          assetsCoverage: coverageRatio,
        },
        reportingPeriod: context?.reportingPeriod || null,
      },
    };
  };

  const renderIncomeStatement = (accounts, context) => {
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

    revenues.sort(sortByMagnitudeDesc);
    expenses.sort(sortByMagnitudeDesc);

    const totalRevenue = revenues.reduce((sum, item) => sum + item.balance, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.balance, 0);
    const netIncome = totalRevenue - totalExpenses;
    const expenseRatio = safeDivide(totalExpenses, totalRevenue);
    const netMargin = safeDivide(netIncome, totalRevenue);

    const resultLabel = netIncome >= 0 ? 'Net income' : 'Net loss';

    const sections = [
      { title: 'Revenues', items: revenues, total: totalRevenue, totalLabel: 'Total revenues' },
      { title: 'Expenses', items: expenses, total: totalExpenses, totalLabel: 'Total expenses' },
      {
        title: 'Results',
        items: [
          {
            accountType: 'equity',
            accountName: resultLabel,
            balance: netIncome,
            debit: netIncome < 0 ? Math.abs(netIncome) : 0,
            credit: netIncome > 0 ? Math.abs(netIncome) : 0,
            normalSide: netIncome >= 0 ? 'credit' : 'debit',
          },
        ],
        total: netIncome,
        totalLabel: resultLabel,
      },
    ];

    const metrics = [
      { label: 'Total revenue', value: formatCurrency(totalRevenue) },
      {
        label: 'Total expenses',
        value: formatCurrency(totalExpenses),
        note: expenseRatio !== null ? `${formatPercentage(Math.abs(expenseRatio))} of revenue` : undefined,
      },
      {
        label: resultLabel,
        value: formatCurrency(netIncome),
        note: netMargin !== null ? `${formatPercentage(netMargin)} margin` : undefined,
      },
    ];

    const notes = [
      `${resultLabel} equals total revenue minus total expenses.`,
      "Percentages reflect each line's contribution to its section total.",
      'Debit and credit columns show the gross postings behind each line.',
      `Prepared ${context?.reportingPeriod?.periodLabel || 'for the current session'}.`,
    ];

    const html = `
      <article class="card statement-card">
        ${renderStatementHeader('Income statement', context, 'period', 'Performance for the reporting window.')}
        ${renderSectionTable(sections)}
        ${renderMetrics(metrics)}
        ${renderFootnotes(notes)}
      </article>
    `;

    return {
      html,
      data: {
        sections: {
          revenues: revenues.map((item) => ({
            accountType: 'revenue',
            accountName: item.accountName,
            debit: toNumber(item.debit),
            credit: toNumber(item.credit),
            balance: Number(item.balance),
            shareOfSection: Math.abs(totalRevenue) > 0.0001 ? Math.abs(item.balance) / Math.abs(totalRevenue) : 0,
          })),
          expenses: expenses.map((item) => ({
            accountType: 'expense',
            accountName: item.accountName,
            debit: toNumber(item.debit),
            credit: toNumber(item.credit),
            balance: Number(item.balance),
            shareOfSection: Math.abs(totalExpenses) > 0.0001 ? Math.abs(item.balance) / Math.abs(totalExpenses) : 0,
          })),
          results: [
            {
              accountType: 'equity',
              accountName: resultLabel,
              debit: netIncome < 0 ? Math.abs(netIncome) : 0,
              credit: netIncome > 0 ? Math.abs(netIncome) : 0,
              balance: netIncome,
              shareOfSection: Math.abs(netIncome) > 0.0001 ? 1 : 0,
            },
          ],
        },
        totals: {
          revenue: totalRevenue,
          expenses: totalExpenses,
          netIncome,
        },
        metrics: {
          expenseRatio,
          netMargin,
        },
        reportingPeriod: context?.reportingPeriod || null,
      },
    };
  };

  const renderEquityStatement = (accounts, context) => {
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

    equityAccounts.sort(sortByMagnitudeDesc);

    const totalEquity = equityAccounts.reduce((sum, item) => sum + item.balance, 0);
    const totalRevenue = accounts
      .filter((account) => account.accountType === 'revenue')
      .reduce((sum, account) => sum + calculateNetBalance(account), 0);
    const totalExpenses = accounts
      .filter((account) => account.accountType === 'expense')
      .reduce((sum, account) => sum + calculateNetBalance(account), 0);
    const netIncomeRaw = totalRevenue - totalExpenses;
    const endingEquity = totalEquity + netIncomeRaw;
    const resultLabel = netIncomeRaw >= 0 ? 'Net income' : 'Net loss';
    const returnOnEquity = safeDivide(netIncomeRaw, endingEquity);
    const earningsShare = safeDivide(netIncomeRaw, endingEquity);
    const revenueShare = safeDivide(netIncomeRaw, totalRevenue);

    const sections = [
      {
        title: "Owner's equity accounts",
        items: equityAccounts,
        total: totalEquity,
        totalLabel: "Owner investments & balances",
      },
      {
        title: 'Current period earnings',
        items: [
          {
            accountType: 'equity',
            accountName: resultLabel,
            balance: netIncomeRaw,
            debit: netIncomeRaw < 0 ? Math.abs(netIncomeRaw) : 0,
            credit: netIncomeRaw > 0 ? Math.abs(netIncomeRaw) : 0,
            normalSide: netIncomeRaw >= 0 ? 'credit' : 'debit',
          },
        ],
        total: netIncomeRaw,
        totalLabel: resultLabel,
      },
      {
        title: "Ending owner's equity",
        items: [
          {
            accountType: 'equity',
            accountName: "Ending owner's equity",
            balance: endingEquity,
            debit: endingEquity < 0 ? Math.abs(endingEquity) : 0,
            credit: endingEquity > 0 ? Math.abs(endingEquity) : 0,
            normalSide: endingEquity >= 0 ? 'credit' : 'debit',
          },
        ],
        total: endingEquity,
        totalLabel: "Ending owner's equity",
      },
    ];

    const metrics = [
      { label: "Ending owner's equity", value: formatCurrency(endingEquity) },
      {
        label: resultLabel,
        value: formatCurrency(netIncomeRaw),
        note: revenueShare !== null ? `${formatPercentage(revenueShare)} of revenue` : undefined,
      },
      {
        label: 'Return on equity',
        value: returnOnEquity !== null ? formatPercentage(returnOnEquity) : '—',
        note: 'Net income ÷ ending equity',
      },
    ];

    const notes = [
      `${resultLabel} is rolled into ending equity for the reporting period.`,
      "Percentages illustrate each line's share of the ending balance.",
      'Debit and credit columns highlight the gross postings feeding each movement.',
      `Prepared ${context?.reportingPeriod?.periodLabel || 'for the current session'}.`,
    ];

    const html = `
      <article class="card statement-card">
        ${renderStatementHeader("Statement of owner's equity", context, 'period', 'Movement in owner capital accounts.')}
        ${renderSectionTable(sections)}
        ${renderMetrics(metrics)}
        ${renderFootnotes(notes)}
      </article>
    `;

    return {
      html,
      data: {
        accounts: equityAccounts.map((item) => ({
          accountType: 'equity',
          accountName: item.accountName,
          debit: toNumber(item.debit),
          credit: toNumber(item.credit),
          balance: Number(item.balance),
        })),
        rollforward: [
          {
            label: "Owner investments & balances",
            debit: equityAccounts.reduce((sum, item) => sum + toNumber(item.debit), 0),
            credit: equityAccounts.reduce((sum, item) => sum + toNumber(item.credit), 0),
            balance: totalEquity,
          },
          {
            label: resultLabel,
            debit: netIncomeRaw < 0 ? Math.abs(netIncomeRaw) : 0,
            credit: netIncomeRaw > 0 ? Math.abs(netIncomeRaw) : 0,
            balance: netIncomeRaw,
          },
          {
            label: "Ending owner's equity",
            debit: endingEquity < 0 ? Math.abs(endingEquity) : 0,
            credit: endingEquity > 0 ? Math.abs(endingEquity) : 0,
            balance: endingEquity,
          },
        ],
        totals: {
          ownerEquity: totalEquity,
          netIncome: netIncomeRaw,
          endingEquity,
        },
        metrics: {
          returnOnEquity,
          earningsShare,
        },
        reportingPeriod: context?.reportingPeriod || null,
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

  const renderCashFlowStatement = (entries, accounts, context) => {
    const totals = categorizeCashFlows(entries);
    const netChange = totals.netChange;

    const endingCash = accounts
      .filter((account) => account.accountType === 'asset' && typeof account.accountName === 'string')
      .filter((account) => account.accountName.toLowerCase().includes('cash'))
      .reduce((sum, account) => sum + calculateNetBalance(account), 0);
    const openingCash = endingCash - netChange;

    const cashSummaryItems = [
      {
        accountName: 'Net cash from operating activities',
        balance: totals.operating,
        debit: totals.operating >= 0 ? Math.abs(totals.operating) : 0,
        credit: totals.operating < 0 ? Math.abs(totals.operating) : 0,
        normalSide: totals.operating >= 0 ? 'debit' : 'credit',
      },
      {
        accountName: 'Net cash from investing activities',
        balance: totals.investing,
        debit: totals.investing >= 0 ? Math.abs(totals.investing) : 0,
        credit: totals.investing < 0 ? Math.abs(totals.investing) : 0,
        normalSide: totals.investing >= 0 ? 'debit' : 'credit',
      },
      {
        accountName: 'Net cash from financing activities',
        balance: totals.financing,
        debit: totals.financing >= 0 ? Math.abs(totals.financing) : 0,
        credit: totals.financing < 0 ? Math.abs(totals.financing) : 0,
        normalSide: totals.financing >= 0 ? 'debit' : 'credit',
      },
    ];

    const sections = [
      {
        title: 'Cash flow summary',
        items: cashSummaryItems,
        total: netChange,
        totalLabel: 'Net change in cash',
        normalSide: netChange >= 0 ? 'debit' : 'credit',
      },
    ];

    const operatingShare = netChange ? Math.abs(totals.operating) / Math.abs(netChange) : null;
    const metrics = [
      { label: 'Net change in cash', value: formatCurrency(netChange) },
      { label: 'Ending cash balance', value: formatCurrency(endingCash) },
      {
        label: 'Operating contribution',
        value: operatingShare !== null ? formatPercentage(operatingShare) : '—',
        note: 'Operating cash ÷ total net change (absolute)',
      },
    ];

    const notes = [
      'Cash flow categories are inferred from the counterpart accounts paired with cash in each journal entry.',
      "Percentages reflect each activity's share of total net cash movement (absolute value).",
      'Debit and credit columns show cash inflows versus outflows for each activity.',
      `Prepared ${context?.reportingPeriod?.periodLabel || 'for the current session'}.`,
    ];

    const html = `
      <article class="card statement-card">
        ${renderStatementHeader('Cash flow statement', context, 'period', 'Sources and uses of cash for the reporting window.')}
        ${renderSectionTable(sections)}
        ${renderMetrics(metrics)}
        ${renderFootnotes(notes)}
      </article>
    `;

    return {
      html,
      data: {
        sections: {
          summary: cashSummaryItems.map((item) => ({
            accountName: item.accountName,
            debit: toNumber(item.debit),
            credit: toNumber(item.credit),
            balance: item.balance,
            shareOfSection: Math.abs(netChange) > 0.0001 ? Math.abs(item.balance) / Math.abs(netChange) : 0,
          })),
        },
        totals: { ...totals },
        endingCash,
        openingCash,
        reportingPeriod: context?.reportingPeriod || null,
      },
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
    const context = {
      reportingPeriod: deriveReportingPeriod(entries),
      entryCount: entries.length,
    };
    let result = null;

    if (type === 'balanceSheet') {
      result = renderBalanceSheet(accounts, context);
    } else if (type === 'incomeStatement') {
      result = renderIncomeStatement(accounts, context);
    } else if (type === 'equityStatement') {
      result = renderEquityStatement(accounts, context);
    } else if (type === 'cashFlow') {
      result = renderCashFlowStatement(entries, accounts, context);
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
      h1 { font-size: 1.6rem; margin-bottom: 1.5rem; }
      article { background: #ffffff; border-radius: 0.75rem; padding: 1.75rem; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); margin-bottom: 1.5rem; }
      .statement-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.25rem; }
      .statement-header h5 { font-size: 1.25rem; margin: 0 0 0.35rem; }
      .statement-subtitle { margin: 0; color: #4b5563; font-size: 0.95rem; }
      .statement-tagline { margin: 0.25rem 0 0; color: #6b7280; font-size: 0.85rem; }
      .statement-meta { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; font-size: 0.85rem; color: #4b5563; }
      .statement-meta li { display: flex; gap: 0.5rem; justify-content: space-between; min-width: 180px; }
      .statement-meta .label { font-weight: 600; color: #111827; }
      .statement-table { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; }
      .statement-table th, .statement-table td { border-bottom: 1px solid #e5e7eb; padding: 0.6rem 0.4rem; text-align: left; font-size: 0.9rem; }
      .statement-table thead th { text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.08em; color: #6b7280; border-bottom: 2px solid #d1d5db; }
      .statement-table tbody tr.statement-section th { padding-top: 1rem; font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase; color: #6b7280; border-bottom: none; }
      .statement-table tbody tr.statement-subtotal td { font-weight: 600; border-top: 1px solid #d1d5db; }
      .statement-table tbody tr.statement-empty td { color: #9ca3af; font-style: italic; }
      .statement-table td.numeric, .statement-table th.numeric { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .statement-metrics { margin-bottom: 1.25rem; }
      .statement-metrics h6 { margin: 0 0 0.75rem; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
      .metrics-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .metrics-grid li { background: #f3f4f6; border-radius: 0.5rem; padding: 0.9rem; display: grid; gap: 0.25rem; }
      .metrics-grid span { color: #4b5563; font-size: 0.85rem; }
      .metrics-grid strong { font-size: 1rem; color: #111827; }
      .metrics-grid small { color: #6b7280; font-size: 0.75rem; }
      .statement-footnotes h6 { margin: 0 0 0.5rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
      .statement-footnotes ol { margin: 0; padding-left: 1.25rem; color: #4b5563; font-size: 0.85rem; display: grid; gap: 0.5rem; }
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

  const summarizeDebitCredit = (row) => {
    const debit = toNumber(row?.debit);
    const credit = toNumber(row?.credit);
    const net = resolveNetBalance(row);
    const segments = [];
    if (Math.abs(debit) > 0.0001) {
      segments.push(`Debit ${formatCurrency(debit)}`);
    }
    if (Math.abs(credit) > 0.0001) {
      segments.push(`Credit ${formatCurrency(credit)}`);
    }
    segments.push(`Net ${formatCurrency(net)}`);
    return segments.join(' | ');
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
      const detail = summarizeDebitCredit(row);
      const line = `${row.accountName}: ${detail}`;
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
    const reporting = data?.reportingPeriod || null;
    if (reporting) {
      const descriptor = type === 'balanceSheet' ? reporting.asOfLabel : reporting.periodLabel;
      doc.setFont('helvetica', 'italic');
      if (descriptor) {
        doc.text(descriptor, 12, y);
        y += 6;
      }
      if (typeof reporting.entryCount === 'number') {
        doc.text(`Entries analyzed: ${reporting.entryCount}`, 12, y);
        y += 6;
      }
      doc.setFont('helvetica', 'normal');
    }

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
      const totals = data?.totals || {};
      const summaryRows = Array.isArray(data?.sections?.summary) ? data.sections.summary : [];
      y = appendSectionToPdf(doc, 'Cash flow summary', summaryRows, y);
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text(`Net change in cash: ${formatCurrency(totals.netChange)}`, 12, y);
      if (typeof data.endingCash === 'number') {
        y += 6;
        doc.text(`Ending cash balance: ${formatCurrency(data.endingCash)}`, 12, y);
      }
      if (typeof data.openingCash === 'number') {
        y += 6;
        doc.text(`Implied opening cash: ${formatCurrency(data.openingCash)}`, 12, y);
      }
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
