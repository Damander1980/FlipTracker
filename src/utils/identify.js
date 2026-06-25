const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export async function identifyFromPhoto(base64, mime) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mime, data: base64 },
          },
          {
            type: "text",
            text: `You are an expert thrift store and estate sale item identifier for a reseller app.
Analyze this photo carefully. Respond ONLY with raw JSON, no markdown, no explanation:
{
  "name": "specific item name (brand, model, year, edition if visible)",
  "category": "one of: vinyl_45|vinyl_lp|vinyl_78|cd|cassette|eight_track|vhs|dvd|book_record|sheet_music|hardcover|paperback|childrens_book|comic|magazine|art_print|poster|maps|toys|games|trading_cards|coins|stamps|figurines|tins|advertising|kitchenware|glassware|jewelry|clothing|tools|cameras|electronics|clocks|postcards|photographs|documents|calendars|other",
  "description": "2-3 sentences including visible condition, markings, edition info",
  "era": "decade or year if identifiable",
  "estimatedValueLow": 0,
  "estimatedValueHigh": 0,
  "searchQuery": "best 3-6 word eBay search query for sold comps",
  "confidence": "high|medium|low",
  "redFlags": "condition issues, missing pieces, resale concerns (null if none)",
  "aiDisclaimer": "Always verify on eBay before purchasing. AI can make mistakes."
}

For estimatedValueLow and estimatedValueHigh: provide your best estimate in USD based on typical resale values. If truly unknown, use 0.`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Identification failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

export async function identifyFromText(query) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are an expert thrift store item identifier for a reseller app.
Based on this description: "${query}"
Respond ONLY with raw JSON:
{
  "name": "specific item name",
  "category": "one of: vinyl_45|vinyl_lp|vinyl_78|cd|cassette|eight_track|vhs|dvd|book_record|sheet_music|hardcover|paperback|childrens_book|comic|magazine|art_print|poster|maps|toys|games|trading_cards|coins|stamps|figurines|tins|advertising|kitchenware|glassware|jewelry|clothing|tools|cameras|electronics|clocks|postcards|photographs|documents|calendars|other",
  "description": "brief description",
  "era": "decade or year if known",
  "estimatedValueLow": 0,
  "estimatedValueHigh": 0,
  "searchQuery": "best 3-6 word eBay search query",
  "confidence": "high|medium|low",
  "redFlags": null,
  "aiDisclaimer": "Always verify on eBay before purchasing. AI can make mistakes."
}`,
      }],
    }),
  });

  if (!response.ok) throw new Error(`Identification failed: ${response.status}`);
  const data = await response.json();
  const text = data.content[0].text.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
