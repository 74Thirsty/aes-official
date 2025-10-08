(() => {
  let chartInstance = null;

  const ensureChart = () => {
    const canvas = document.getElementById('accountBalanceChart');
    if (!canvas) return null;

    if (chartInstance) {
      return chartInstance;
    }

    const context = canvas.getContext('2d');
    chartInstance = new Chart(context, {
      type: 'bar',
      data: {
        labels: ['Assets', 'Liabilities', 'Equity', 'Revenue', 'Expense'],
        datasets: [
          {
            label: 'Debits',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(56, 189, 248, 0.55)',
            borderRadius: 12,
          },
          {
            label: 'Credits',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(249, 115, 22, 0.55)',
            borderRadius: 12,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
            ticks: { color: '#e2e8f0' },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
            ticks: { color: '#e2e8f0' },
          },
        },
        plugins: {
          legend: {
            labels: { color: '#e2e8f0' },
          },
        },
      },
    });

    return chartInstance;
  };

  const aggregateByType = (entries) => {
    const totals = {
      asset: { debit: 0, credit: 0 },
      liability: { debit: 0, credit: 0 },
      equity: { debit: 0, credit: 0 },
      revenue: { debit: 0, credit: 0 },
      expense: { debit: 0, credit: 0 },
    };

    entries.forEach((entry) => {
      (entry.entries || []).forEach((line) => {
        const type = (line.accountType || '').toLowerCase();
        if (!totals[type]) return;
        totals[type].debit += Number(line.debit || 0);
        totals[type].credit += Number(line.credit || 0);
      });
    });

    return totals;
  };

  const updateChart = (entries) => {
    const chart = ensureChart();
    if (!chart) return;

    const totals = aggregateByType(entries);
    chart.data.datasets[0].data = [
      totals.asset.debit,
      totals.liability.debit,
      totals.equity.debit,
      totals.revenue.debit,
      totals.expense.debit,
    ];
    chart.data.datasets[1].data = [
      totals.asset.credit,
      totals.liability.credit,
      totals.equity.credit,
      totals.revenue.credit,
      totals.expense.credit,
    ];
    chart.update();
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensureChart();
  });

  window.addEventListener('autoGaap:entriesChanged', (event) => {
    const entries = Array.isArray(event.detail) ? event.detail : [];
    updateChart(entries);
  });
})();
