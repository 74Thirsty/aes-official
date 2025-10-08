(() => {
  const formatCurrency = (value) => {
    return Number.isFinite(value) ? `$${value.toFixed(2)}` : '$0.00';
  };

  const renderRows = (container, rows) => {
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'auto-gaap-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Year</th>
          <th>Depreciation</th>
          <th>Accumulated</th>
          <th>Book Value</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const body = table.querySelector('tbody');
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${formatCurrency(row.depreciation)}</td>
        <td>${formatCurrency(row.accumulated)}</td>
        <td>${formatCurrency(row.bookValue)}</td>
      `;
      body.appendChild(tr);
    });
    container.appendChild(table);
  };

  const calculateDepreciation = (assetValue, usefulLife) => {
    if (!assetValue || !usefulLife || assetValue <= 0 || usefulLife <= 0) {
      return [];
    }

    const annual = assetValue / usefulLife;
    const rows = [];
    for (let year = 1; year <= usefulLife; year += 1) {
      rows.push({
        year,
        depreciation: annual,
        accumulated: annual * year,
        bookValue: Math.max(assetValue - annual * year, 0),
      });
    }
    return rows;
  };

  const handleToggle = (event) => {
    const checked = event.target.checked;
    const container = document.getElementById('depreciation-info');
    if (!container) return;

    const assetDetails = document.getElementById('asset-details');
    if (assetDetails) {
      assetDetails.classList.toggle('hidden', !checked);
    }

    if (!checked) {
      container.innerHTML = '';
      return;
    }

    const assetValue = parseFloat(document.getElementById('asset-value')?.value || '0');
    const usefulLife = parseInt(document.getElementById('useful-life')?.value || '0', 10);
    const rows = calculateDepreciation(assetValue, usefulLife);
    if (!rows.length) {
      container.innerHTML = '<p class="auto-gaap-placeholder">Enter asset value and useful life to preview depreciation.</p>';
      return;
    }
    renderRows(container, rows);
  };

  const bindHandlers = () => {
    const toggle = document.getElementById('apply-depreciation');
    if (!toggle) return;

    const inputs = ['asset-name', 'asset-value', 'useful-life']
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    toggle.addEventListener('change', handleToggle);
    inputs.forEach((input) => {
      input.addEventListener('input', () => {
        if (toggle.checked) {
          handleToggle({ target: toggle });
        }
      });
    });
  };

  document.addEventListener('DOMContentLoaded', bindHandlers);
})();
