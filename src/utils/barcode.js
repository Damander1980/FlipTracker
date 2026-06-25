export async function lookupBarcode(barcode) {
  const clean = barcode.replace(/[^0-9X]/gi, "");

  // Try ISBN (books) first - 10 or 13 digits starting with 978/979
  if (clean.length === 13 && (clean.startsWith("978") || clean.startsWith("979"))) {
    return await lookupISBN(clean);
  }
  if (clean.length === 10) {
    return await lookupISBN(clean);
  }

  // Try UPC for everything else
  return await lookupUPC(clean);
}

async function lookupISBN(isbn) {
  try {
    // Google Books API - free, no key needed for basic use
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
    );
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo;
      const title = book.title || "Unknown Title";
      const authors = book.authors?.join(", ") || "Unknown Author";
      const year = book.publishedDate?.split("-")[0] || "";
      const publisher = book.publisher || "";

      return {
        found: true,
        type: "book",
        name: `${title} by ${authors}`,
        category: "hardcover",
        description: `${title} by ${authors}. Published ${year}${publisher ? ` by ${publisher}` : ""}. ISBN: ${isbn}`,
        era: year,
        searchQuery: `${title} ${authors} book`.substring(0, 50),
        confidence: "high",
        redFlags: null,
        estimatedValueLow: 0,
        estimatedValueHigh: 0,
        aiDisclaimer: "Verify condition and edition on eBay before purchasing.",
        thumbnail: book.imageLinks?.thumbnail || null,
      };
    }

    // Fallback to Open Library
    return await lookupOpenLibrary(isbn);
  } catch (err) {
    return await lookupOpenLibrary(isbn);
  }
}

async function lookupOpenLibrary(isbn) {
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const data = await res.json();
    const key = `ISBN:${isbn}`;

    if (data[key]) {
      const book = data[key];
      const title = book.title || "Unknown Title";
      const authors = book.authors?.map(a => a.name).join(", ") || "Unknown Author";
      const year = book.publish_date || "";

      return {
        found: true,
        type: "book",
        name: `${title} by ${authors}`,
        category: "hardcover",
        description: `${title} by ${authors}. ${year ? `Published ${year}.` : ""} ISBN: ${isbn}`,
        era: year.split(" ").pop() || "",
        searchQuery: `${title} book`.substring(0, 40),
        confidence: "high",
        redFlags: null,
        estimatedValueLow: 0,
        estimatedValueHigh: 0,
        aiDisclaimer: "Verify condition and edition on eBay before purchasing.",
        thumbnail: null,
      };
    }

    return { found: false, barcode: isbn };
  } catch {
    return { found: false, barcode: isbn };
  }
}

async function lookupUPC(upc) {
  try {
    // UPC Item DB - free tier
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const name = item.title || "Unknown Item";
      const brand = item.brand || "";
      const category = guessCategory(item.category || "");

      return {
        found: true,
        type: "product",
        name: name,
        category,
        description: `${name}${brand ? ` by ${brand}` : ""}. UPC: ${upc}`,
        era: "",
        searchQuery: name.substring(0, 50),
        confidence: "high",
        redFlags: null,
        estimatedValueLow: 0,
        estimatedValueHigh: 0,
        aiDisclaimer: "Verify on eBay before purchasing.",
        thumbnail: item.images?.[0] || null,
      };
    }

    return { found: false, barcode: upc };
  } catch {
    return { found: false, barcode: upc };
  }
}

function guessCategory(categoryStr) {
  const c = categoryStr.toLowerCase();
  if (c.includes("music") || c.includes("cd") || c.includes("vinyl")) return "cd";
  if (c.includes("book")) return "hardcover";
  if (c.includes("game") || c.includes("video game")) return "games";
  if (c.includes("dvd") || c.includes("movie") || c.includes("blu")) return "dvd";
  if (c.includes("toy")) return "toys";
  return "other";
}
