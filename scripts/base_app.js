(() => {
  const ledgerEntries = [];

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const entry = {
      date: form.querySelector('#date')?.value || '',
      desc: form.querySelector('#desc')?.value || '',
      account: form.querySelector('#account')?.value || '',
      type: form.querySelector('#type')?.value || '',
      debit: parseFloat(form.querySelector('#debit')?.value || '0'),
      credit: parseFloat(form.querySelector('#credit')?.value || '0'),
    };

    ledgerEntries.push(entry);
    updateLedgerDisplay();
    form.reset();
  };

  const updateLedgerDisplay = () => {
    const ledgerDiv = document.getElementById('ledgerDisplay');
    if (!ledgerDiv) return;

    if (!ledgerEntries.length) {
      ledgerDiv.textContent = 'No entries yet.';
      return;
    }

    ledgerDiv.textContent = ledgerEntries
      .map((entry) => {
        const debit = Number.isFinite(entry.debit) ? entry.debit.toFixed(2) : '0.00';
        const credit = Number.isFinite(entry.credit) ? entry.credit.toFixed(2) : '0.00';
        return `${entry.date} | ${entry.account} | ${entry.type} | Dr: $${debit} | Cr: $${credit} | ${entry.desc}`;
      })
      .join('\n');
  };

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('entryForm');
    if (form) {
      form.addEventListener('submit', handleSubmit);
      updateLedgerDisplay();
    }
  });
})();
