(() => {
  const tickerRoot = document.getElementById("cryptoTicker");

  if (!tickerRoot) {
    return;
  }

  const coins = [
    { name: "BTC" },
    { name: "ETH" },
    { name: "SOL" },
    { name: "XRP" },
    { name: "DOGE" },
    { name: "AVAX" },
    { name: "ADA" },
    { name: "LINK" },
    { name: "MATIC" }
  ];

  const coinMap = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    XRP: "ripple",
    DOGE: "dogecoin",
    AVAX: "avalanche-2",
    ADA: "cardano",
    LINK: "chainlink",
    MATIC: "matic-network"
  };

  let positions = [];
  const speed = 1.2;
  const fontSize = 12;
  const tickerHeight = 24;
  const gap = 60;

  const dotSpacing = 4;
  const dotSize = 1.2;

  let textColor;
  let dotColor;

  let lastUpdateTime = 0;
  const updateInterval = 8000;

  function initializeTickerSketch() {
    if (typeof window.p5 !== "function") {
      return;
    }

    // eslint-disable-next-line no-new
    new window.p5((p) => {
      const formatCoin = (coin) => {
        if (coin.price === undefined) {
          return coin.name;
        }

        const formattedPrice = coin.price >= 1
          ? coin.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })
          : coin.price.toFixed(5);

        return `${coin.name}: $${formattedPrice}`;
      };

      const getLabelWidthByIndex = (index) => p.textWidth(formatCoin(coins[index]));

      const layoutTicker = () => {
        let x = p.width;
        positions = [];

        for (let index = 0; index < coins.length; index += 1) {
          positions.push(x);
          x += getLabelWidthByIndex(index) + gap;
        }
      };

      const drawDotMatrix = () => {
        p.noStroke();
        p.fill(dotColor);

        for (let y = dotSpacing / 2; y < p.height; y += dotSpacing) {
          for (let x = dotSpacing / 2; x < p.width; x += dotSpacing) {
            p.ellipse(x, y, dotSize, dotSize);
          }
        }
      };

      const updatePrices = async () => {
        const ids = Object.values(coinMap).join(",");
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              accept: "application/json"
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          for (const coin of coins) {
            const cgId = coinMap[coin.name];
            const livePrice = data?.[cgId]?.usd;

            if (typeof livePrice === "number") {
              coin.price = livePrice;
            }
          }

          layoutTicker();
        } catch (error) {
          console.error("Failed to fetch live prices:", error);
        }
      };

      p.setup = function setupTicker() {
        const canvas = p.createCanvas(tickerRoot.clientWidth || window.innerWidth, tickerHeight);
        canvas.parent("cryptoTicker");
        canvas.style("background", "transparent");
        canvas.elt.setAttribute("aria-hidden", "true");

        p.textFont("monospace");
        p.textSize(fontSize);
        p.textAlign(p.LEFT, p.CENTER);

        textColor = p.color(0, 170, 255);
        dotColor = p.color(19, 41, 75, 80);

        layoutTicker();
        void updatePrices();

        lastUpdateTime = p.millis();
      };

      p.draw = function drawTicker() {
        p.clear();
        drawDotMatrix();

        if (p.millis() - lastUpdateTime > updateInterval) {
          void updatePrices();
          lastUpdateTime = p.millis();
        }

        p.fill(textColor);
        p.noStroke();

        for (let index = 0; index < coins.length; index += 1) {
          const label = formatCoin(coins[index]);
          p.text(label, positions[index], tickerHeight / 2);
          positions[index] -= speed;

          if (positions[index] < -p.textWidth(label)) {
            const maxX = Math.max(...positions);
            positions[index] = maxX + getLabelWidthByIndex(index) + gap;
          }
        }
      };

      p.windowResized = function resizeTicker() {
        const nextWidth = tickerRoot.clientWidth || window.innerWidth;
        p.resizeCanvas(nextWidth, tickerHeight);
        layoutTicker();
      };
    }, tickerRoot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTickerSketch, { once: true });
  } else {
    initializeTickerSketch();
  }
})();
