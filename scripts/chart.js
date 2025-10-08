// chart.js
function renderChart(data) {
    const ctx = document.getElementById("accountBalanceChart").getContext("2d");
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Account Balances',
                data: Object.values(data),
                backgroundColor: 'rgba(123, 175, 212, 0.7)',
            }]
        }
    });
}
