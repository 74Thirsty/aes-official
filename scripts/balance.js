(() => {
  const STORAGE_KEY = 'journalEntries';

  const getEntries = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('balance.js: failed to parse stored entries', error);
      return [];
    }
  };

  const calculateBalance = (entries) => {
    return entries.reduce(
      (acc, entry) => {
        (entry.entries || []).forEach((line) => {
          acc.debits += Number(line.debit || 0);
          acc.credits += Number(line.credit || 0);
        });
        return acc;
      },
      { debits: 0, credits: 0 }
    );
  };

  const renderBalanceIndicator = (entries) => {
    const indicator = document.getElementById('balanceIndicator');
    if (!indicator) return;

    const { debits, credits } = calculateBalance(entries);
    const isBalanced = Math.abs(debits - credits) < 0.01;
    indicator.classList.toggle('balanced', isBalanced);
    indicator.classList.toggle('unbalanced', !isBalanced);
    indicator.innerHTML = isBalanced ? '✅ Balanced' : '⚠️ Unbalanced';
  };

  const handleChange = (entries) => {
    renderBalanceIndicator(entries);
  };

  document.addEventListener('DOMContentLoaded', () => {
    handleChange(getEntries());
  });

  window.addEventListener('autoGaap:entriesChanged', (event) => {
    const entries = Array.isArray(event.detail) ? event.detail : getEntries();
    handleChange(entries);
  });
})();
