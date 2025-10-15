(() => {
  const STORAGE_KEY = 'journalEntries';
  const CLEAR_SENTINEL_KEY = 'journalEntriesCleared';
  const LEDGER_DATA_URL = (() => {
    try {
      return new URL('../data/ledger.json', window.location.href).toString();
    } catch (error) {
      console.warn('main.js: unable to resolve ledger data path', error);
      return '../data/ledger.json';
    }
  })();
  let journalEntries = [];

  const loadEntries = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('main.js: unable to parse stored journal entries', error);
      return [];
    }
  };

  const clearLedgerSentinel = () => {
    try {
      localStorage.removeItem(CLEAR_SENTINEL_KEY);
    } catch (error) {
      console.warn('main.js: unable to clear ledger sentinel', error);
    }
  };

  const markLedgerCleared = () => {
    try {
      localStorage.setItem(CLEAR_SENTINEL_KEY, String(Date.now()));
    } catch (error) {
      console.warn('main.js: unable to persist ledger cleared sentinel', error);
    }
  };

  const wasLedgerCleared = () => {
    try {
      return Boolean(localStorage.getItem(CLEAR_SENTINEL_KEY));
    } catch (error) {
      console.warn('main.js: unable to read ledger cleared sentinel', error);
      return false;
    }
  };

  const saveEntries = () => {
    if (journalEntries.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(journalEntries));
      clearLedgerSentinel();
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    notifySubscribers();
  };

  const notifySubscribers = () => {
    window.dispatchEvent(new CustomEvent('autoGaap:entriesChanged', { detail: journalEntries.slice() }));
    window.dispatchEvent(new CustomEvent('autoGaap:refresh'));
  };

  const formatNumber = (value) => {
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  };

  const generateJournalNumber = (account1, account2) => {
    const sanitized = [account1, account2].map((value) => (value || 'GEN').replace(/\s+/g, '-').toUpperCase());
    return `CPU-${sanitized.join('-')}-${Date.now()}`;
  };

  const extractEntriesFromPayload = (payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.journalEntries)) {
      return payload.journalEntries;
    }
    return [];
  };

  const sanitizeImportedEntries = (candidates) => {
    if (!Array.isArray(candidates)) {
      return [];
    }

    const baseTimestamp = Date.now();

    return candidates
      .map((entry, index) => {
        if (!entry || !Array.isArray(entry.entries)) {
          return null;
        }

        const sanitizedLines = entry.entries
          .map((line) => ({
            accountType: typeof line.accountType === 'string' ? line.accountType : '',
            accountName: typeof line.accountName === 'string' ? line.accountName : '',
            debit: formatNumber(line.debit),
            credit: formatNumber(line.credit),
          }))
          .filter((line) => line.accountType || line.accountName || line.debit !== 0 || line.credit !== 0);

        if (!sanitizedLines.length) {
          return null;
        }

        return {
          id: Number.isFinite(Number(entry.id)) ? Number(entry.id) : baseTimestamp + index,
          journalNumber: typeof entry.journalNumber === 'string' && entry.journalNumber ? entry.journalNumber : `IM-${baseTimestamp}-${index + 1}`,
          postDate: typeof entry.postDate === 'string' ? entry.postDate : '',
          description: typeof entry.description === 'string' ? entry.description : '',
          entries: sanitizedLines,
          meta: entry.meta && typeof entry.meta === 'object' ? entry.meta : {},
        };
      })
      .filter(Boolean);
  };

  const gatherLineItem = (typeId, nameId, debitId, creditId) => {
    const accountType = document.getElementById(typeId)?.value || '';
    const accountName = document.getElementById(nameId)?.value || '';
    const debit = formatNumber(document.getElementById(debitId)?.value || '0');
    const credit = formatNumber(document.getElementById(creditId)?.value || '0');
    return { accountType, accountName, debit, credit };
  };

  const validateLineItem = ({ accountType, accountName, debit, credit }) => {
    if (!accountType || !accountName) return false;
    if (debit <= 0 && credit <= 0) return false;
    return true;
  };

  const resetConditionalSections = () => {
    document.getElementById('accrual-details')?.classList.add('hidden');
    document.getElementById('prepaid-details')?.classList.add('hidden');
    document.getElementById('asset-details')?.classList.add('hidden');
    const depreciationInfo = document.getElementById('depreciation-info');
    if (depreciationInfo) {
      depreciationInfo.innerHTML = '';
    }
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();

    const postDate = document.getElementById('postDate')?.value || '';
    const description = document.getElementById('description')?.value || '';
    const lineOne = gatherLineItem('account1Type', 'account1Name', 'debitAmount1', 'creditAmount1');
    const lineTwo = gatherLineItem('account2Type', 'account2Name', 'debitAmount2', 'creditAmount2');

    if (!postDate || !description || !validateLineItem(lineOne) || !validateLineItem(lineTwo)) {
      alert('Complete all required journal information before saving.');
      return;
    }

    const journalNumber = generateJournalNumber(lineOne.accountName, lineTwo.accountName);
    const entry = {
      id: Date.now(),
      journalNumber,
      postDate,
      description,
      entries: [lineOne, lineTwo],
      meta: collectMeta(),
    };

    journalEntries = [...journalEntries, entry];
    saveEntries();
    event.currentTarget.reset();
    resetConditionalSections();
    const journalField = document.getElementById('journalNumber');
    if (journalField) {
      journalField.value = '';
    }
  };

  const collectMeta = () => {
    return {
      accrued: document.getElementById('isAccrued')?.checked || false,
      accruedDueDate: document.getElementById('accrued-due-date')?.value || '',
      accruedAccount: document.getElementById('accrued-account')?.value || '',
      accruedPeriod: document.getElementById('accrued-period')?.value || '',
      prepaid: document.getElementById('isPrepaid')?.checked || false,
      prepaidStartDate: document.getElementById('prepaid-start-date')?.value || '',
      prepaidEndDate: document.getElementById('prepaid-end-date')?.value || '',
      prepaidAccount: document.getElementById('prepaid-account')?.value || '',
      depreciationApplied: document.getElementById('apply-depreciation')?.checked || false,
      assetName: document.getElementById('asset-name')?.value || '',
      assetValue: document.getElementById('asset-value')?.value || '',
      usefulLife: document.getElementById('useful-life')?.value || '',
      recurringStart: document.getElementById('recurringStart')?.value || '',
      recurringEnd: document.getElementById('recurringEnd')?.value || '',
      recurringFrequency: document.getElementById('recurringFrequency')?.value || '',
    };
  };

  const toggleVisibility = (checkboxId, targetId) => {
    const checkbox = document.getElementById(checkboxId);
    const target = document.getElementById(targetId);
    if (!checkbox || !target) return;

    const update = () => {
      target.classList.toggle('hidden', !checkbox.checked);
    };

    checkbox.addEventListener('change', update);
    update();
  };

  const bindRunAutoGaap = () => {
    const button = document.getElementById('runAutoGaap');
    if (button) {
      button.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('autoGaap:refresh'));
      });
    }
  };

  const bindLoadSample = () => {
    const button = document.getElementById('loadLedger');
    if (!button) return;
    button.addEventListener('click', async () => {
      try {
        button.disabled = true;
        button.textContent = 'Loading…';
        const response = await fetch(LEDGER_DATA_URL, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Unable to load ledger.json');
        }
        const data = await response.json();
        const loadedEntries = extractEntriesFromPayload(data);
        journalEntries = sanitizeImportedEntries(loadedEntries);
        saveEntries();
      } catch (error) {
        console.warn('main.js: failed to load ledger', error);
        alert('Unable to load sample ledger.');
      } finally {
        button.disabled = false;
        button.textContent = 'Load Sample Ledger';
      }
    });
  };

  const bindClearLedger = () => {
    const button = document.getElementById('clearLedger');
    if (!button) return;

    button.addEventListener('click', () => {
      if (!journalEntries.length) {
        alert('Ledger is already empty.');
        return;
      }

      const confirmed = window.confirm('Clear all journal entries from this ledger? This action cannot be undone.');
      if (!confirmed) {
        return;
      }

      journalEntries = [];
      markLedgerCleared();
      saveEntries();
    });
  };

  const bindImportLedger = () => {
    const button = document.getElementById('importLedger');
    const fileInput = document.getElementById('importLedgerInput');
    if (!button || !fileInput) return;

    button.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const [file] = fileInput.files || [];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = typeof reader.result === 'string' ? reader.result : '';
          const payload = JSON.parse(text);
          const imported = sanitizeImportedEntries(extractEntriesFromPayload(payload));
          if (!imported.length) {
            throw new Error('No journal entries found in import.');
          }
          journalEntries = imported;
          saveEntries();
          alert('Ledger imported successfully.');
        } catch (error) {
          console.warn('main.js: failed to import ledger', error);
          alert('Unable to import ledger. Verify the JSON file matches the expected format.');
        } finally {
          fileInput.value = '';
        }
      };
      reader.onerror = () => {
        console.warn('main.js: file reader error while importing ledger');
        alert('Unable to read the selected file.');
        fileInput.value = '';
      };
      reader.readAsText(file);
    });
  };

  const bindForm = () => {
    const form = document.getElementById('journalForm');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
  };

  const initialize = () => {
    journalEntries = loadEntries();
    bindForm();
    bindRunAutoGaap();
    bindLoadSample();
    bindClearLedger();
    bindImportLedger();
    toggleVisibility('isAccrued', 'accrual-details');
    toggleVisibility('isPrepaid', 'prepaid-details');
    toggleVisibility('apply-depreciation', 'asset-details');
    notifySubscribers();
  };

  document.addEventListener('DOMContentLoaded', initialize);

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      journalEntries = loadEntries();
      notifySubscribers();
    } else if (event.key === CLEAR_SENTINEL_KEY && event.newValue) {
      journalEntries = [];
      notifySubscribers();
    }
  });

  window.addEventListener('autoGaap:ledgerHydrated', (event) => {
    if (journalEntries.length || wasLedgerCleared()) {
      return;
    }

    const entries = Array.isArray(event.detail) ? event.detail : [];
    const sanitized = sanitizeImportedEntries(entries);
    if (!sanitized.length) {
      return;
    }

    journalEntries = sanitized;
    saveEntries();
  });

  window.loadLedgerJson = () => {
    const button = document.getElementById('loadLedger');
    if (button) {
      button.click();
    }
  };
})();
