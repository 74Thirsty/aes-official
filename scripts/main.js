(() => {
  const STORAGE_KEY = 'journalEntries';
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

  const saveEntries = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journalEntries));
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
        const response = await fetch('../../data/ledger.json');
        if (!response.ok) {
          throw new Error('Unable to load ledger.json');
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          journalEntries = data;
        } else if (Array.isArray(data?.journalEntries)) {
          journalEntries = data.journalEntries;
        }
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
    }
  });

  window.loadLedgerJson = () => {
    const button = document.getElementById('loadLedger');
    if (button) {
      button.click();
    }
  };
})();
