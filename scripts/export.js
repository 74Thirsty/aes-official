(() => {
  const STORAGE_KEY = 'journalEntries';

  const loadEntries = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('export.js: unable to load entries', error);
      return [];
    }
  };

  const formatEntryForPdf = (doc, entry, yPosition) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`Entry #: ${entry.journalNumber || ''}`, 12, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${entry.postDate || ''}`, 12, yPosition + 6);
    doc.text(`Description: ${entry.description || ''}`, 12, yPosition + 12);
    return yPosition + 20;
  };

  const appendLinesToPdf = (doc, entry, yPosition) => {
    (entry.entries || []).forEach((line) => {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      const text = `${line.accountName || ''} | Debit: ${debit.toFixed(2)} | Credit: ${credit.toFixed(2)}`;
      doc.text(text, 16, yPosition);
      yPosition += 6;
    });
    return yPosition + 2;
  };

  const exportToPdf = () => {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      alert('PDF export is unavailable in this environment.');
      return;
    }

    const entries = loadEntries();
    if (!entries.length) {
      alert('No journal entries to export yet.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(12);

    let y = 16;
    entries.forEach((entry, index) => {
      y = formatEntryForPdf(doc, entry, y);
      y = appendLinesToPdf(doc, entry, y);
      if (index < entries.length - 1 && y > 260) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save('journal_entries.pdf');
  };

  const exportToJson = () => {
    const entries = loadEntries();
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'journal_entries.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const bindButton = (selector, handler) => {
    const button = document.querySelector(selector);
    if (button) {
      button.addEventListener('click', handler);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindButton('#exportPDF', exportToPdf);
    bindButton('#exportJSON', exportToJson);
  });
})();
