(() => {
  const STORAGE_KEY = 'journalEntries';

  const loadEntries = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('journal.js: unable to parse stored entries', error);
      return [];
    }
  };

  const renderJournalSummary = (entries) => {
    const container = document.getElementById('journalEntries');
    if (!container) return;

    if (!entries.length) {
      container.innerHTML = '<p class="auto-gaap-placeholder">No journal entries yet. Add one to see AutoGAAP in action.</p>';
      return;
    }

    const fragments = entries
      .slice()
      .reverse()
      .map((entry, index) => {
        const lines = [
          `<header><span class="badge">J/E ${index + 1}</span><span>${entry.postDate || ''}</span></header>`,
          `<h4>${escapeHtml(entry.description || 'Untitled entry')}</h4>`,
          '<table class="auto-gaap-table">',
          '<thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>',
          '<tbody>',
          ...entry.entries.map((line) => {
            const debit = Number(line.debit || 0);
            const credit = Number(line.credit || 0);
            return `<tr><td>${escapeHtml(line.accountName || '')}</td><td>${debit ? formatCurrency(debit) : ''}</td><td>${credit ? formatCurrency(credit) : ''}</td></tr>`;
          }),
          '</tbody>',
          '</table>',
        ];
        return `<article class="card compact">${lines.join('')}</article>`;
      });

    container.innerHTML = fragments.join('');
  };

  const escapeHtml = (value) => {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
    } catch (error) {
      return `$${amount.toFixed(2)}`;
    }
  };

  const ensureJournalNumber = () => {
    const field = document.getElementById('journalNumber');
    if (!field) return;
    field.value = `JN-${Date.now()}`;
  };

  const handleEntriesChanged = (entries) => {
    renderJournalSummary(entries);
    ensureJournalNumber();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const entries = loadEntries();
    handleEntriesChanged(entries);
  });

  window.addEventListener('autoGaap:entriesChanged', (event) => {
    const entries = Array.isArray(event.detail) ? event.detail : loadEntries();
    handleEntriesChanged(entries);
  });

  window.addEventListener('autoGaap:ledgerHydrated', (event) => {
    const entries = Array.isArray(event.detail) ? event.detail : [];
    if (!entries.length) {
      return;
    }
    handleEntriesChanged(entries);
  });
})();
