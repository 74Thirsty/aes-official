window.ledgerEntries = [];

document.getElementById("entryForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const entry = {
    date: document.getElementById("date").value,
    desc: document.getElementById("desc").value,
    account: document.getElementById("account").value,
    type: document.getElementById("type").value,
    debit: parseFloat(document.getElementById("debit").value || 0),
    credit: parseFloat(document.getElementById("credit").value || 0),
  };
  window.ledgerEntries.push(entry);
  updateLedgerDisplay();
  this.reset();
});

function updateLedgerDisplay() {
  const ledgerDiv = document.getElementById("ledgerDisplay");
  if (!window.ledgerEntries.length) {
    ledgerDiv.textContent = "No entries yet.";
    return;
  }

  ledgerDiv.textContent = window.ledgerEntries.map(e => {
    return `${e.date} | ${e.account} | ${e.type} | Dr: $${e.debit.toFixed(2)} | Cr: $${e.credit.toFixed(2)} | ${e.desc}`;
  }).join("\n");
}
