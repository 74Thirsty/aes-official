// balance.js
function updateBalanceStatus() {
    const indicator = document.getElementById("balanceIndicator");
    const status = Math.random() > 0.5 ? "balanced" : "unbalanced";
    indicator.className = "indicator " + status;
    indicator.innerHTML = status === "balanced" ? "✅ Balanced" : "⚠️ Unbalanced";
}
