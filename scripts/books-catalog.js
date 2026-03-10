(function () {
  const CATALOG_BASE_URL = "https://your-site.com/books";
  const DEFAULT_DESCRIPTION = "Detailed publication notes coming soon.";
  const FALLBACK_PLACEHOLDER = "../assets/books/placeholder-cover.png";

  const BOOK_MATRIX_ROWS = [
    {
      platform: "apple",
      "book title": "Ctrl+c, Ctrl+v, and the Death of Reason Audiobook",
      url: "https://books.apple.com/us/audiobook/ctrl-c-ctrl-v-and-the-death-of-reason-unabridged/id1839247511",
      price: "5.99",
      description:
        "Ctrl+C, Ctrl+V, and the Death of Reason by C. E. Hirschauer. Ctrl+C, Ctrl+V killed craftsmanship—now speed pretends to be intelligence, and repetition masquerades as reasoning."
    },
    { platform: "barnes", "book title": "", url: "", price: "", description: "" },
    { platform: "amazon", "book title": "", url: "", price: "", description: "" },
    { platform: "audible", "book title": "", url: "", price: "", description: "" },
    {
      platform: "apple",
      "book title": "Tokenization of Real World Assets",
      url: "https://books.apple.com/us/book/tokenization-of-real-world-assets/id6752820646",
      price: "14.99",
      description:
        "Tokenized Economies: Real-World Assets in the Age of Blockchain is a deep exploration of how tokenization is transforming global finance."
    },
    {
      platform: "apple",
      "book title": "Inside The Black Forest: The MEV Playbook",
      url: "https://books.apple.com/us/book/inside-the-black-forest-the-mev-playbook/id6749015183",
      price: "10.99",
      description:
        "MEV: Dark Forest Profits in Ethereum's Shadow Economy. A black-ops manual covering frontrunning, blockspace competition, and extraction dynamics."
    },
    {
      platform: "apple",
      "book title": "EVM Unlocked",
      url: "https://books.apple.com/us/book/evm-unlocked-the-hidden-engine-powering-modern-finance/id6757259148",
      price: "12.99",
      description:
        "A focused breakdown of the EVM execution layer and its role in modern programmable finance systems."
    },
    {
      platform: "apple",
      "book title": "Designing and Launching Cryptocurrencies",
      url: "https://books.apple.com/us/book/designing-and-launching-cryptocurrencies/id6751117632",
      price: "25.99",
      description:
        "The definitive roadmap for turning a crypto concept into a secure, competitive, and launch-ready asset."
    },
    {
      platform: "apple",
      "book title": "Smart Contracts",
      url: "https://books.apple.com/us/book/smart-contracts-the-future-of-business-finance/id6749497265",
      price: "20.99",
      description:
        "A full-lifecycle guide to self-executing agreements—from contract design to secure deployment."
    },
    {
      platform: "apple",
      "book title": "The Crypto Almanac",
      url: "https://books.apple.com/us/book/the-crypto-almanac/id6751018716",
      price: "15.99",
      description:
        "Comprehensive coverage of blockchain, DeFi, and smart contracts for practical decision-making."
    },
    {
      platform: "apple",
      "book title": "Ctrl+c, Ctrl+v, and the Death of Reason",
      url: "https://books.apple.com/us/book/ctrl-c-ctrl-v-and-the-death-of-reason/id6747921672",
      price: "10.99",
      description:
        "A sharp critique of copy-paste engineering culture and a case for reclaiming technical craftsmanship."
    },
    {
      platform: "apple",
      "book title": "Neural Ledger",
      url: "https://books.apple.com/us/book/neural-ledger/id6751048942",
      price: "15.99",
      description:
        "How AI is becoming the operating system of financial decision engines across banking and fintech."
    },
    {
      platform: "apple",
      "book title": "Reactive Profitable Zone Expansion (RPZE)",
      url: "https://books.apple.com/us/book/reactive-profit-zone-expansion/id6749500245",
      price: "12.99",
      description:
        "A tactical trading framework focused on identifying and expanding high-probability DeFi profit zones."
    }
  ];

  const CATALOG_URL_MAP = {
    "copy-paste-and-the-death-of-reason": "./copy-paste-death.html",
    "designing-and-launching-cryptocurrencies": "./designing-cryptocurrencies.html"
  };

  function slugify(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
  }

  function normalizeRows(rows) {
    return rows
      .map((row) => {
        const title = (row["book title"] || "").trim();
        const salesUrl = (row.url || "").trim();
        const description = (row.description || "").trim();
        const price = (row.price || "").trim();

        if (!title || !salesUrl) {
          return null;
        }

        const slug = slugify(title);
        return {
          title,
          salesUrl,
          description: description || DEFAULT_DESCRIPTION,
          price,
          slug,
          catalogUrl: CATALOG_URL_MAP[slug] || `${CATALOG_BASE_URL}/${slug}`
        };
      })
      .filter(Boolean);
  }

  async function resolveCover(book) {
    if (typeof window.getBookCover !== "function") {
      return FALLBACK_PLACEHOLDER;
    }

    try {
      return (await window.getBookCover(book)) || FALLBACK_PLACEHOLDER;
    } catch (error) {
      return FALLBACK_PLACEHOLDER;
    }
  }

  function buildCard(book, coverUrl) {
    const article = document.createElement("article");
    article.className = "card book-card";

    const coverLink = document.createElement("a");
    coverLink.className = "book-cover image";
    coverLink.href = book.catalogUrl;

    const coverImage = document.createElement("img");
    coverImage.src = coverUrl;
    coverImage.alt = `Cover art for ${book.title}`;
    coverImage.loading = "lazy";
    coverImage.referrerPolicy = "no-referrer";
    coverImage.addEventListener("error", () => {
      coverImage.src = FALLBACK_PLACEHOLDER;
    });

    coverLink.appendChild(coverImage);

    const body = document.createElement("div");
    body.className = "book-body";

    const top = document.createElement("div");
    top.className = "book-top";

    const heading = document.createElement("h3");
    heading.textContent = book.title;
    top.appendChild(heading);

    const description = document.createElement("p");
    description.textContent = book.description;

    const meta = document.createElement("div");
    meta.className = "book-meta";
    if (book.price) {
      const price = document.createElement("span");
      price.className = "price";
      price.textContent = `$${book.price}`;
      meta.appendChild(price);
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const buyNow = document.createElement("a");
    buyNow.className = "button primary";
    buyNow.href = book.salesUrl;
    buyNow.target = "_blank";
    buyNow.rel = "noopener noreferrer";
    buyNow.textContent = "Buy Now";

    const viewCatalog = document.createElement("a");
    viewCatalog.className = "button outline";
    viewCatalog.href = book.catalogUrl;
    viewCatalog.textContent = "View Catalog";

    actions.appendChild(buyNow);
    actions.appendChild(viewCatalog);

    body.appendChild(top);
    body.appendChild(description);
    body.appendChild(meta);
    body.appendChild(actions);

    article.appendChild(coverLink);
    article.appendChild(body);

    return article;
  }

  async function renderBooks() {
    const grid = document.getElementById("books-catalog-grid");
    if (!grid) {
      return;
    }

    const books = normalizeRows(BOOK_MATRIX_ROWS);
    for (const book of books) {
      const coverUrl = await resolveCover(book);
      grid.appendChild(buildCard(book, coverUrl));
    }
  }

  renderBooks();
})();(function () {
  const CATALOG_BASE_URL = "https://your-site.com/books";
  const DEFAULT_DESCRIPTION = "Detailed publication notes coming soon.";
  const FALLBACK_PLACEHOLDER = "../assets/books/placeholder-cover.png";

  const BOOK_MATRIX_ROWS = [
    {
      platform: "apple",
      "book title": "Ctrl+c, Ctrl+v, and the Death of Reason Audiobook",
      url: "https://books.apple.com/us/audiobook/ctrl-c-ctrl-v-and-the-death-of-reason-unabridged/id1839247511",
      price: "5.99",
      description:
        "Ctrl+C, Ctrl+V, and the Death of Reason by C. E. Hirschauer. Ctrl+C, Ctrl+V killed craftsmanship—now speed pretends to be intelligence, and repetition masquerades as reasoning."
    },
    { platform: "barnes", "book title": "", url: "", price: "", description: "" },
    { platform: "amazon", "book title": "", url: "", price: "", description: "" },
    { platform: "audible", "book title": "", url: "", price: "", description: "" },
    {
      platform: "apple",
      "book title": "Tokenization of Real World Assets",
      url: "https://books.apple.com/us/book/tokenization-of-real-world-assets/id6752820646",
      price: "14.99",
      description:
        "Tokenized Economies: Real-World Assets in the Age of Blockchain is a deep exploration of how tokenization is transforming global finance."
    },
    {
      platform: "apple",
      "book title": "Inside The Black Forest: The MEV Playbook",
      url: "https://books.apple.com/us/book/inside-the-black-forest-the-mev-playbook/id6749015183",
      price: "10.99",
      description:
        "MEV: Dark Forest Profits in Ethereum's Shadow Economy. A black-ops manual covering frontrunning, blockspace competition, and extraction dynamics."
    },
    {
      platform: "apple",
      "book title": "EVM Unlocked",
      url: "https://books.apple.com/us/book/evm-unlocked-the-hidden-engine-powering-modern-finance/id6757259148",
      price: "12.99",
      description:
        "A focused breakdown of the EVM execution layer and its role in modern programmable finance systems."
    },
    {
      platform: "apple",
      "book title": "Designing and Launching Cryptocurrencies",
      url: "https://books.apple.com/us/book/designing-and-launching-cryptocurrencies/id6751117632",
      price: "25.99",
      description:
        "The definitive roadmap for turning a crypto concept into a secure, competitive, and launch-ready asset."
    },
    {
      platform: "apple",
      "book title": "Smart Contracts",
      url: "https://books.apple.com/us/book/smart-contracts-the-future-of-business-finance/id6749497265",
      price: "20.99",
      description:
        "A full-lifecycle guide to self-executing agreements—from contract design to secure deployment."
    },
    {
      platform: "apple",
      "book title": "The Crypto Almanac",
      url: "https://books.apple.com/us/book/the-crypto-almanac/id6751018716",
      price: "15.99",
      description:
        "Comprehensive coverage of blockchain, DeFi, and smart contracts for practical decision-making."
    },
    {
      platform: "apple",
      "book title": "Ctrl+c, Ctrl+v, and the Death of Reason",
      url: "https://books.apple.com/us/book/ctrl-c-ctrl-v-and-the-death-of-reason/id6747921672",
      price: "10.99",
      description:
        "A sharp critique of copy-paste engineering culture and a case for reclaiming technical craftsmanship."
    },
    {
      platform: "apple",
      "book title": "Neural Ledger",
      url: "https://books.apple.com/us/book/neural-ledger/id6751048942",
      price: "15.99",
      description:
        "How AI is becoming the operating system of financial decision engines across banking and fintech."
    },
    {
      platform: "apple",
      "book title": "Reactive Profitable Zone Expansion (RPZE)",
      url: "https://books.apple.com/us/book/reactive-profit-zone-expansion/id6749500245",
      price: "12.99",
      description:
        "A tactical trading framework focused on identifying and expanding high-probability DeFi profit zones."
    }
  ];

  const CATALOG_URL_MAP = {
    "copy-paste-and-the-death-of-reason": "./copy-paste-death.html",
    "designing-and-launching-cryptocurrencies": "./designing-cryptocurrencies.html"
  };


  function slugify(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
  }

  function normalizeRows(rows) {
    return rows
      .map((row) => {
        const title = (row["book title"] || "").trim();
        const salesUrl = (row.url || "").trim();
        const description = (row.description || "").trim();
        const price = (row.price || "").trim();

        if (!title || !salesUrl) {
          return null;
        }

        const slug = slugify(title);
        return {
          title,
          salesUrl,
          description: description || DEFAULT_DESCRIPTION,
          price,
          slug,
          catalogUrl: CATALOG_URL_MAP[slug] || `${CATALOG_BASE_URL}/${slug}`
        };
      })
      .filter(Boolean);
  }

  async function resolveCover(book) {
    if (typeof window.getBookCover !== "function") {
      return FALLBACK_PLACEHOLDER;
    }

    try {
      return (await window.getBookCover(book)) || FALLBACK_PLACEHOLDER;
    } catch (error) {
      return FALLBACK_PLACEHOLDER;
    }
  }

  function buildCard(book, coverUrl) {
    const article = document.createElement("article");
    article.className = "card book-card";

    const coverLink = document.createElement("a");
    coverLink.className = "book-cover image";
    coverLink.href = book.catalogUrl;

    const coverImage = document.createElement("img");
    coverImage.src = coverUrl;
    coverImage.alt = `Cover art for ${book.title}`;
    coverImage.loading = "lazy";
    coverImage.referrerPolicy = "no-referrer";
    coverImage.addEventListener("error", () => {
      coverImage.src = FALLBACK_PLACEHOLDER;
    });

    coverLink.appendChild(coverImage);

    const body = document.createElement("div");
    body.className = "book-body";

    const top = document.createElement("div");
    top.className = "book-top";

    const heading = document.createElement("h3");
    heading.textContent = book.title;
    top.appendChild(heading);

    const description = document.createElement("p");
    description.textContent = book.description;

    const meta = document.createElement("div");
    meta.className = "book-meta";
    if (book.price) {
      const price = document.createElement("span");
      price.className = "price";
      price.textContent = `$${book.price}`;
      meta.appendChild(price);
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const buyNow = document.createElement("a");
    buyNow.className = "button primary";
    buyNow.href = book.salesUrl;
    buyNow.target = "_blank";
    buyNow.rel = "noopener noreferrer";
    buyNow.textContent = "Buy Now";

    const viewCatalog = document.createElement("a");
    viewCatalog.className = "button outline";
    viewCatalog.href = book.catalogUrl;
    viewCatalog.textContent = "View Catalog";

    actions.appendChild(buyNow);
    actions.appendChild(viewCatalog);

    body.appendChild(top);
    body.appendChild(description);
    body.appendChild(meta);
    body.appendChild(actions);

    article.appendChild(coverLink);
    article.appendChild(body);

    return article;
  }

  async function renderBooks() {
    const grid = document.getElementById("books-catalog-grid");
    if (!grid) {
      return;
    }

    const books = normalizeRows(BOOK_MATRIX_ROWS);
    for (const book of books) {
      const coverUrl = await resolveCover(book);
      grid.appendChild(buildCard(book, coverUrl));
    }
  }

  renderBooks();
})();
