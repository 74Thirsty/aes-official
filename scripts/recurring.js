(() => {
  const STORAGE_KEY = 'recurringEntries';
  const JOURNAL_STORAGE_KEY = 'journalEntries';

  const loadRecurring = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('recurring.js: unable to parse recurring entries', error);
      return [];
    }
  };

  const saveRecurring = (entries) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  };

  const getJournalEntries = () => {
    try {
      const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('recurring.js: unable to parse journal entries', error);
      return [];
    }
  };

  const saveJournalEntries = (entries) => {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('autoGaap:entriesChanged', { detail: entries }));
    window.dispatchEvent(new CustomEvent('autoGaap:refresh'));
  };

  const getWeekNumber = (date) => {
    const first = new Date(date.getFullYear(), 0, 1);
    const pastDays = Math.floor((date - first) / 86400000);
    return Math.ceil((pastDays + first.getDay() + 1) / 7);
  };

  const shouldCreateEntry = (entry, today) => {
    const startDate = new Date(entry.startDate);
    const endDate = new Date(entry.endDate);
    if (!(today >= startDate && today <= endDate)) {
      return false;
    }

    switch (entry.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return getWeekNumber(today) === getWeekNumber(startDate);
      case 'monthly':
        return today.getDate() === startDate.getDate();
      default:
        return false;
    }
  };

  const ensureRecurringEntries = () => {
    const today = new Date();
    const recurringEntries = loadRecurring();
    if (!recurringEntries.length) return;

    let journalEntries = getJournalEntries();
    let added = false;

    recurringEntries.forEach((entry) => {
      if (!shouldCreateEntry(entry, today)) return;

      const newEntry = {
        journalNumber: `R-${Date.now()}`,
        postDate: today.toISOString().slice(0, 10),
        description: entry.description,
        entries: entry.entries,
        isRecurring: true,
      };

      journalEntries = [...journalEntries, newEntry];
      added = true;
    });

    if (added) {
      saveJournalEntries(journalEntries);
    }
  };

  const handleSaveRecurring = () => {
    const entry = collectRecurringData();
    if (!entry) return;
    const entries = [...loadRecurring(), entry];
    saveRecurring(entries);
    ensureRecurringEntries();
  };

  const collectRecurringData = () => {
    const startDate = document.getElementById('recurringStart')?.value;
    const endDate = document.getElementById('recurringEnd')?.value;
    const frequency = document.getElementById('recurringFrequency')?.value;
    const description = document.getElementById('description')?.value;

    const account1Type = document.getElementById('account1Type')?.value;
    const account1Name = document.getElementById('account1Name')?.value;
    const debitAmount1 = parseFloat(document.getElementById('debitAmount1')?.value || '0');
    const creditAmount1 = parseFloat(document.getElementById('creditAmount1')?.value || '0');

    const account2Type = document.getElementById('account2Type')?.value;
    const account2Name = document.getElementById('account2Name')?.value;
    const debitAmount2 = parseFloat(document.getElementById('debitAmount2')?.value || '0');
    const creditAmount2 = parseFloat(document.getElementById('creditAmount2')?.value || '0');

    if (!startDate || !endDate || !frequency) {
      return null;
    }

    return {
      description,
      entries: [
        { accountType: account1Type, accountName: account1Name, debit: debitAmount1, credit: creditAmount1 },
        { accountType: account2Type, accountName: account2Name, debit: debitAmount2, credit: creditAmount2 },
      ],
      startDate,
      endDate,
      frequency,
    };
  };

  const bindRecurringButton = () => {
    const button = document.getElementById('saveRecurring');
    if (button) {
      button.addEventListener('click', handleSaveRecurring);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindRecurringButton();
    ensureRecurringEntries();
    setInterval(ensureRecurringEntries, 24 * 60 * 60 * 1000);
  });
})();
