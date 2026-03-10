(function (globalScope) {
  const LOCAL_ASSET_BASE = "../assets/books";
  const PLACEHOLDER_COVER = `${LOCAL_ASSET_BASE}/placeholder-cover.png`;
  const SUPPORTED_EXTENSIONS = ["jpg", "png", "webp"];
  const assetExistsCache = new Map();

  /**
   * Normalize a title into a stable slug.
   * - lowercase
   * - remove punctuation/symbols
   * - collapse whitespace into hyphens
   */
  function slugify(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, "-");
  }

  async function assetExists(path) {
    if (!path) {
      return false;
    }

    if (assetExistsCache.has(path)) {
      return assetExistsCache.get(path);
    }

    let exists = false;

    try {
      const headResponse = await fetch(path, { method: "HEAD", cache: "force-cache" });
      exists = headResponse.ok;
    } catch (error) {
      exists = false;
    }

    if (!exists) {
      try {
        const getResponse = await fetch(path, { method: "GET", cache: "force-cache" });
        exists = getResponse.ok;
      } catch (error) {
        exists = false;
      }
    }

    assetExistsCache.set(path, exists);
    return exists;
  }

  function extractAppleId(salesUrl) {
    const match = String(salesUrl || "").match(/id(\d+)/i);
    return match ? match[1] : null;
  }

  async function extractCoverFromSalesPage(salesUrl) {
    if (!salesUrl) {
      return null;
    }

    // First attempt: parse og:image from the sales page HTML.
    try {
      const pageResponse = await fetch(salesUrl, { method: "GET" });
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i);

        if (ogImageMatch && ogImageMatch[1]) {
          return ogImageMatch[1];
        }

        const imgSrcMatch = html.match(/<img[^>]+(?:class|id)=["'][^"']*(?:cover|artwork|book)[^"']*["'][^>]+src=["']([^"']+)["'][^>]*>/i)
          || html.match(/<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id)=["'][^"']*(?:cover|artwork|book)[^"']*["'][^>]*>/i);

        if (imgSrcMatch && imgSrcMatch[1]) {
          return imgSrcMatch[1];
        }
      }
    } catch (error) {
      // Ignore cross-origin/network failures and continue fallback flow.
    }

    // Secondary Apple fallback: use the listing ID in Apple iTunes lookup API.
    try {
      const appleId = extractAppleId(salesUrl);
      if (!appleId) {
        return null;
      }

      const lookupResponse = await fetch(`https://itunes.apple.com/lookup?id=${appleId}`);
      if (!lookupResponse.ok) {
        return null;
      }

      const payload = await lookupResponse.json();
      const record = payload && payload.results && payload.results[0];
      if (!record) {
        return null;
      }

      return record.artworkUrl512 || record.artworkUrl100 || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve a book cover using deterministic fallback order:
   * 1) local /assets/books slug match (jpg/png/webp)
   * 2) extracted cover from sales URL
   * 3) static placeholder image
   */
  async function getBookCover(book) {
    try {
      const slug = slugify(book && book.title);
      if (!slug) {
        return PLACEHOLDER_COVER;
      }

      for (const ext of SUPPORTED_EXTENSIONS) {
        const localPath = `${LOCAL_ASSET_BASE}/${slug}.${ext}`;
        if (await assetExists(localPath)) {
          return localPath;
        }
      }

      const extractedCover = await extractCoverFromSalesPage(book && book.salesUrl);
      if (extractedCover) {
        return extractedCover;
      }

      return PLACEHOLDER_COVER;
    } catch (error) {
      return PLACEHOLDER_COVER;
    }
  }

  globalScope.getBookCover = getBookCover;
  globalScope.bookCoverUtils = {
    getBookCover,
    slugify,
    extractCoverFromSalesPage
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      getBookCover,
      slugify,
      extractCoverFromSalesPage
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
