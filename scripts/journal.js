// journal.js
function generateJournalNumber() {
    const now = new Date();
    const formatted = 'JN' + now.getTime();
    document.getElementById("journalNumber").value = formatted;
}

function displayJournalEntries() {
    const entries = JSON.parse(localStorage.getItem("journalEntries") || "[]");
    document.getElementById("journalEntries").innerHTML = entries.map((e, i) =>
        `<div>#${i + 1}: ${e.description}</div>`).join("");
}
