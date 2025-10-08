// depreciation.js

// Function to calculate straight-line depreciation
function calculateDepreciation(assetValue, usefulLife) {
  if (isNaN(assetValue) || isNaN(usefulLife) || assetValue <= 0 || usefulLife <= 0) {
    alert("Please enter valid positive numbers for asset value and useful life.");
    return;
  }

  // Straight Line Depreciation Formula: Depreciation = (Asset Value) / (Useful Life in Years)
  const depreciation = assetValue / usefulLife;

  // Displaying the calculated depreciation for each year
  let depreciationResults = [];
  for (let year = 1; year <= usefulLife; year++) {
    depreciationResults.push({
      year: year,
      depreciationAmount: depreciation.toFixed(2),
      accumulatedDepreciation: (depreciation * year).toFixed(2),
      bookValue: (assetValue - (depreciation * year)).toFixed(2)
    });
  }

  // Displaying depreciation results
  displayDepreciationResults(depreciationResults);
}

// Function to display depreciation results in the DOM
function displayDepreciationResults(results) {
  const depreciationContainer = document.getElementById("depreciation-info");
  depreciationContainer.innerHTML = '';  // Clear previous results

  const table = document.createElement('table');
  table.classList.add('table-auto', 'w-full', 'border-collapse', 'mt-4');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `
    <th class="border px-4 py-2 text-left">Year</th>
    <th class="border px-4 py-2 text-left">Depreciation</th>
    <th class="border px-4 py-2 text-left">Accumulated Depreciation</th>
    <th class="border px-4 py-2 text-left">Book Value</th>
  `;
  table.appendChild(headerRow);

  results.forEach(result => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="border px-4 py-2">${result.year}</td>
      <td class="border px-4 py-2">$${result.depreciationAmount}</td>
      <td class="border px-4 py-2">$${result.accumulatedDepreciation}</td>
      <td class="border px-4 py-2">$${result.bookValue}</td>
    `;
    table.appendChild(row);
  });

  depreciationContainer.appendChild(table);
}

// Event listener to calculate depreciation when asset value and useful life are input
document.getElementById("apply-depreciation").addEventListener("change", function() {
  const assetName = document.getElementById("asset-name").value;
  const assetValue = parseFloat(document.getElementById("asset-value").value);
  const usefulLife = parseInt(document.getElementById("useful-life").value);

  if (this.checked && assetName && assetValue && usefulLife) {
    // If depreciation is applied, calculate it
    calculateDepreciation(assetValue, usefulLife);
  } else {
    // If checkbox is unchecked, clear results
    document.getElementById("depreciation-info").innerHTML = '';
  }
});

// Example to manually trigger depreciation on page load (or on other events)
function triggerDepreciation() {
  const assetValue = 10000; // Example value
  const usefulLife = 5; // Example life in years

  calculateDepreciation(assetValue, usefulLife);
}

// Optional: Call this function to automatically trigger depreciation on page load
window.onload = function() {
  triggerDepreciation(); // Default values for demonstration
};
