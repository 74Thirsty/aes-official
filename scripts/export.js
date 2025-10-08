// export.js
function exportToPDF() {
    const doc = new jsPDF();
    doc.text("Exported PDF Content", 10, 10);
    doc.save("journal_entries.pdf");
}

function exportToJson() {
    const data = localStorage.getItem("journalEntries") || "[]";
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "journal_entries.json";
    link.click();
}
