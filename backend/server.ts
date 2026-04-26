const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const geminiApiKey = process.env.GEMINI_API_KEY;
const serpApiKey = process.env.SERP_API_KEY || process.env.SERPAPI_API_KEY;

if (!geminiApiKey) {
  console.warn("Missing GEMINI_API_KEY. Add it to backend/.env before using AI endpoints.");
}

if (!serpApiKey) {
  console.warn("Missing SERP_API_KEY. Alternatives will use marketplace search links only.");
}

const app = express();
app.use(express.json());

const allowedCorsOrigins = new Set([
  "https://www.amazon.com",
  "https://www.target.com",
  "https://www.walmart.com",
]);

function isAllowedCorsOrigin(origin: string): boolean {
  return allowedCorsOrigins.has(origin) ||
    /^chrome-extension:\/\/[a-z]{32}$/.test(origin) ||
    /^http:\/\/localhost(?::\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin);
}

app.use((req: any, res: any, next: any) => {
  const origin = req.header("Origin");
  if (origin && isAllowedCorsOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Vary", "Origin");
  res.header(
    "Access-Control-Allow-Headers",
    req.header("Access-Control-Request-Headers") || "Content-Type"
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Max-Age", "86400");
  if (req.header("Access-Control-Request-Private-Network") === "true") {
    res.header("Access-Control-Allow-Private-Network", "true");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

function normalizeMarketplace(value: unknown): string {
  const marketplace = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (marketplace.includes("etsy")) return "etsy";
  if (marketplace.includes("ebay")) return "ebay";
  if (marketplace.includes("target")) return "target";
  if (marketplace.includes("walmart")) return "walmart";
  if (marketplace.includes("depop")) return "depop";
  return "amazon";
}

function getMarketplaceLabel(value: unknown): string {
  switch (normalizeMarketplace(value)) {
    case "etsy":
      return "Etsy";
    case "ebay":
      return "eBay";
    case "depop":
      return "Depop";
    case "target":
      return "Target";
    case "walmart":
      return "Walmart";
    default:
      return "Amazon";
  }
}

function buildMarketplaceSearchUrl(searchQuery: string, marketplace: string): string {
  const query = encodeURIComponent(searchQuery.trim());

  switch (normalizeMarketplace(marketplace)) {
    case "etsy":
      return `https://www.etsy.com/search?q=${query}`;
    case "ebay":
      return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
    case "depop":
      return `https://www.depop.com/search/?q=${query}`;
    case "target":
      return `https://www.target.com/s?searchTerm=${query}`;
    case "walmart":
      return `https://www.walmart.com/search?q=${query}`;
    default:
      return `https://www.amazon.com/s?k=${query}`;
  }
}

function isConsumableProduct(productName: string, category: string): boolean {
  const text = `${productName} ${category}`.toLowerCase();
  return /\b(food|grocery|snack|beverage|coffee|tea|candy|chocolate|protein|supplement|vitamin|charcoal|briquette|briquettes|lighter fluid|fuel|cleaner|detergent|soap|shampoo|skincare|beauty|cosmetic|pet food)\b/.test(text) ||
    isLivingPlantProduct(productName, category);
}

function isLivingPlantProduct(productName: string, category: string): boolean {
  const text = `${productName} ${category}`.toLowerCase();
  return /\b(live plant|plant|tree|sapling|seedling|seeds|bulb|bulbs|nursery|citrus|fruit tree|orange tree|lemon tree|lime tree|apple tree|garden)\b/.test(text);
}

function isSecondhandQuery(searchQuery: string): boolean {
  return /\b(refurbished|renewed|used|pre-owned|preowned|secondhand|second-hand|restored|reconditioned)\b/.test(searchQuery.toLowerCase());
}

function isDisallowedConsumableMarketplace(value: unknown): boolean {
  const marketplace = getText(value).toLowerCase();
  return marketplace.includes("ebay") || marketplace.includes("depop");
}

function getDefaultMarketplace(searchQuery: string, category = ""): string {
  const query = searchQuery.toLowerCase();

  if (isConsumableProduct(searchQuery, category)) {
    return "Amazon";
  }
  if (/\b(refurbished|renewed|used|pre-owned|secondhand|second-hand)\b/.test(query)) {
    return "eBay";
  }
  if (/\b(handmade|organic|cotton|wool|wood|recycled|artisan)\b/.test(query)) {
    return "Etsy";
  }

  return "Amazon";
}

function getAlternativeSearchTarget(productName: string, category: string): string {
  const text = `${productName} ${category}`.toLowerCase();

  if (/\b(tv|television|fire tv|smart tv|qled|oled|uhd|4k|8k)\b/.test(text)) {
    const size = text.match(/\b(\d{2,3})\s*(?:in|inch|")/)?.[1];
    return `${size ? `${size} inch ` : ""}4K smart TV`.trim();
  }
  if (/\b(vacuum|dyson|hoover|shark)\b/.test(text)) return "vacuum cleaner";
  if (/\b(rug|mat|carpet|doormat)\b/.test(text)) return "rug";
  if (/\b(laptop|notebook|macbook|chromebook)\b/.test(text)) return "laptop";
  if (/\b(phone|iphone|android|smartphone)\b/.test(text)) return "smartphone";
  if (/\b(headphones|earbuds|speaker)\b/.test(text)) return "small electronics";
  if (/\b(shoe|sneaker|shirt|hoodie|jacket|pants|clothing|apparel)\b/.test(text)) return "clothing";
  if (isLivingPlantProduct(productName, category)) return productName || "live plant";

  return productName || category || "product";
}

function getAlternativeSearchSeeds(productName: string, category: string): Array<{
  name: string;
  maker: string;
  searchQuery: string;
  marketplace: string;
  tags: string;
  category?: string;
}> {
  const searchTarget = getAlternativeSearchTarget(productName, category);

  if (isLivingPlantProduct(productName, category)) {
    return [
      {
        name: `Local nursery ${searchTarget}`,
        maker: "Google Shopping",
        searchQuery: `local nursery ${searchTarget}`,
        marketplace: "Google Shopping",
        tags: "Local nursery - Shorter shipping - Live plant",
        category,
      },
      {
        name: `Organic ${searchTarget}`,
        maker: "Google Shopping",
        searchQuery: `organic ${searchTarget}`,
        marketplace: "Google Shopping",
        tags: "Organic growing practices - Live plant - New product",
        category,
      },
      {
        name: `Bare root ${searchTarget}`,
        maker: "Google Shopping",
        searchQuery: `bare root ${searchTarget}`,
        marketplace: "Google Shopping",
        tags: "Lower shipping weight - Less packaging - Live plant",
        category,
      },
    ];
  }

  if (isConsumableProduct(productName, category)) {
    return [
      {
        name: `Sustainably sourced ${searchTarget}`,
        maker: "Google Shopping",
        searchQuery: `sustainably sourced ${searchTarget}`,
        marketplace: "Google Shopping",
        tags: "Sustainably sourced - Lower-impact supply chain - New product",
        category,
      },
      {
        name: `Organic ${searchTarget}`,
        maker: "Google Shopping",
        searchQuery: `organic ${searchTarget}`,
        marketplace: "Google Shopping",
        tags: "Organic - Certification signal - New product",
        category,
      },
      {
        name: `Bulk ${searchTarget} recyclable packaging`,
        maker: "Google Shopping",
        searchQuery: `bulk ${searchTarget} recyclable packaging`,
        marketplace: "Google Shopping",
        tags: "Reduced packaging - Bulk option - New product",
        category,
      },
    ];
  }

  return [
    {
      name: `Refurbished ${searchTarget}`,
      maker: "Google Shopping",
      searchQuery: `refurbished ${searchTarget}`,
      marketplace: "Google Shopping",
      tags: "Refurbished - Reuse - Lower manufacturing impact",
      category,
    },
    {
      name: `Used ${searchTarget}`,
      maker: "Google Shopping",
      searchQuery: `used ${searchTarget}`,
      marketplace: "Google Shopping",
      tags: "Second-hand - Circular economy - Waste reduction",
      category,
    },
    {
      name: `Energy efficient ${searchTarget}`,
      maker: "Google Shopping",
      searchQuery: `energy efficient ${searchTarget}`,
      marketplace: "Google Shopping",
      tags: "Energy efficient - Lower use-phase impact - Durable option",
      category,
    },
  ];
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getSerpApiResultUrl(result: any, fallbackQuery: string): string {
  const directUrl =
    getText(result?.product_link) ||
    getText(result?.link) ||
    getText(result?.serpapi_product_api);

  return directUrl || buildMarketplaceSearchUrl(fallbackQuery, "Amazon");
}

function parseCarbonKg(value: unknown): number | null {
  const text = getText(value);
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getAlternativeSignalText(seed: any, result?: any): string {
  return [
    seed?.name,
    seed?.maker,
    seed?.searchQuery,
    seed?.tags,
    result?.title,
    result?.source,
  ].map(getText).join(" ").toLowerCase();
}

function inferAlternativeCondition(text: string): "used" | "refurbished" | "recycled" | "energyEfficient" | "new" {
  if (/\b(used|pre-owned|preowned|secondhand|second-hand|local pickup)\b/.test(text)) {
    return "used";
  }
  if (/\b(refurbished|renewed|restored|reconditioned)\b/.test(text)) {
    return "refurbished";
  }
  if (/\b(recycled|upcycled|post-consumer|organic|repairable|durable)\b/.test(text)) {
    return "recycled";
  }
  if (/\b(energy star|energy efficient|energy-efficient|low power)\b/.test(text)) {
    return "energyEfficient";
  }
  return "new";
}

function inferAlternativeCategory(text: string, seed: any): string {
  const fallback = getText(seed?.category).toLowerCase();

  if (/\b(tv|television|qled|oled|uhd|4k|8k)\b/.test(text)) return "television";
  if (/\b(vacuum|dyson|hoover|shark)\b/.test(text)) return "vacuum";
  if (/\b(rug|mat|carpet|doormat)\b/.test(text)) return "rug";
  if (/\b(laptop|notebook|macbook|chromebook)\b/.test(text)) return "laptop";
  if (/\b(phone|iphone|android|smartphone)\b/.test(text)) return "phone";
  if (/\b(headphones|earbuds|speaker)\b/.test(text)) return "small electronics";
  if (/\b(shirt|hoodie|jacket|pants|jeans|shoe|sneaker|apparel|clothing)\b/.test(text)) return "clothing";
  if (/\b(chair|desk|table|sofa|furniture)\b/.test(text)) return "furniture";
  if (/\b(appliance|microwave|toaster|blender|coffee maker)\b/.test(text)) return "appliance";

  return fallback || "general product";
}

function extractFirstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match?.[1]) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function estimateAlternativeWeightKg(category: string, text: string): number {
  if (category === "television") {
    const inches = extractFirstNumber(text, /(\d+(?:\.\d+)?)\s*(?:in|inch|")/i);
    if (!inches) return 10;
    if (inches <= 32) return 5;
    if (inches <= 43) return 7;
    if (inches <= 55) return 10.5;
    if (inches <= 65) return 17;
    return 23;
  }

  if (category === "vacuum") return /\b(cordless|stick|battery)\b/.test(text) ? 3.2 : 5.5;
  if (category === "rug") {
    const width = extractFirstNumber(text, /(\d+(?:\.\d+)?)\s*x\s*\d+(?:\.\d+)?/i);
    const length = extractFirstNumber(text, /\d+(?:\.\d+)?\s*x\s*(\d+(?:\.\d+)?)/i);
    if (width && length) return Math.max(0.8, Math.min(12, width * length * 0.18));
    return 2.5;
  }
  if (category === "laptop") return 1.8;
  if (category === "phone") return 0.25;
  if (category === "small electronics") return 0.8;
  if (category === "clothing") return /\b(shoe|sneaker|boot)\b/.test(text) ? 1.1 : 0.7;
  if (category === "furniture") return 14;
  if (category === "appliance") return 4.5;

  return 1.5;
}

function estimateNewProductionKg(category: string, weightKg: number, text: string): number {
  switch (category) {
    case "television":
      return 4 + weightKg * 3.2;
    case "vacuum":
      return weightKg * 3.8 + (/\b(cordless|battery)\b/.test(text) ? 8 : 2);
    case "rug":
      return weightKg * (/\b(organic|recycled|jute|wool|cotton)\b/.test(text) ? 1.6 : 2.7) + 0.8;
    case "laptop":
      return 18 + weightKg * 8;
    case "phone":
      return 22 + weightKg * 28;
    case "small electronics":
      return 5 + weightKg * 7;
    case "clothing":
      return weightKg * (/\b(organic|recycled|secondhand|used)\b/.test(text) ? 4 : 8) + 0.5;
    case "furniture":
      return weightKg * (/\b(wood|bamboo|secondhand|used)\b/.test(text) ? 1.8 : 3.2) + 4;
    case "appliance":
      return weightKg * 4.5 + 5;
    default:
      return weightKg * 3 + 2;
  }
}

function getConditionProductionMultiplier(condition: string): number {
  switch (condition) {
    case "used":
      return 0.15;
    case "refurbished":
      return 0.38;
    case "recycled":
      return 0.62;
    case "energyEfficient":
      return 0.9;
    default:
      return 1;
  }
}

function estimateAlternativeShippingKg(weightKg: number, text: string, linkType: "listing" | "search"): number {
  const distanceMiles = /\b(local|pickup|nearby)\b/.test(text) ? 25 : linkType === "listing" ? 700 : 1000;
  const freightKg = distanceMiles * (weightKg / 1000) * 0.1;
  const packagingKg = /\b(used|local pickup|secondhand|second-hand)\b/.test(text) ? 0.1 : Math.min(1.2, weightKg * 0.08);
  return freightKg + packagingKg;
}

function getConditionCarbonCap(condition: string, currentCarbon: number): number {
  switch (condition) {
    case "used":
      return currentCarbon * 0.3;
    case "refurbished":
      return currentCarbon * 0.55;
    case "recycled":
      return currentCarbon * 0.7;
    case "energyEfficient":
      return currentCarbon * 0.9;
    default:
      return currentCarbon * 1.05;
  }
}

function estimateAlternativeCarbon(seed: any, result: any | null, currentCarbonKg: string): string {
  const existing = getText(seed?.carbon);
  if (existing && !/estimate varies/i.test(existing)) return existing;

  const text = getAlternativeSignalText(seed, result);
  const condition = inferAlternativeCondition(text);
  const category = inferAlternativeCategory(text, seed);
  const weightKg = estimateAlternativeWeightKg(category, text);
  const productionKg = estimateNewProductionKg(category, weightKg, text) *
    getConditionProductionMultiplier(condition);
  const shippingKg = estimateAlternativeShippingKg(weightKg, text, result ? "listing" : "search");
  const modelEstimate = productionKg + shippingKg;
  const currentCarbon = parseCarbonKg(currentCarbonKg);
  const cappedEstimate = currentCarbon
    ? Math.min(modelEstimate, getConditionCarbonCap(condition, currentCarbon))
    : modelEstimate;

  return `~${Math.max(0.1, cappedEstimate).toFixed(1)} kg CO2e`;
}

function parseEthicsScore(value: unknown): number | null {
  const text = getText(value);
  const match = text.match(/ethics\s+(\d{1,3})\/100/i);
  if (!match?.[1]) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? clampScore(parsed) : null;
}

function estimateAlternativeEthics(
  seed: any,
  result: any | null,
  linkType: "listing" | "search",
  baselineEthicsScore = 50
): string {
  const text = getAlternativeSignalText(seed, result);
  const condition = inferAlternativeCondition(text);
  const category = inferAlternativeCategory(text, seed);
  let score = 45;

  switch (condition) {
    case "used":
      score += 18;
      break;
    case "refurbished":
      score += 15;
      break;
    case "recycled":
      score += 11;
      break;
    case "energyEfficient":
      score += 7;
      break;
    default:
      score += 0;
  }

  if (linkType === "listing") score += 5;
  else score -= 8;

  if (/\b(back market|ebay refurbished|certified refurbished|walmart restored|amazon renewed)\b/.test(text)) {
    score += 8;
  } else if (/\b(walmart|target|best buy|ebay|etsy|amazon)\b/.test(text)) {
    score += 4;
  }

  if (/\b(certified|restored|renewed|energy star|gots|fair trade|b corp)\b/.test(text)) score += 5;
  if (/\b(recycled|organic|repairable|durable|wood|wool|cotton|jute|bamboo)\b/.test(text)) score += 5;
  if (/\b(local|nearby|pickup)\b/.test(text)) score += 4;

  if (category === "television" || category === "laptop" || category === "phone" || category === "small electronics") {
    score -= 8;
  }
  if (/\b(battery|cordless|qled|oled|lithium|smart tv|processor)\b/.test(text)) score -= 5;
  if (/\b(marketplace prices|compare sellers|search)\b/.test(text) || linkType === "search") score -= 4;

  let maxScore = 92;
  if (category === "television" || category === "laptop" || category === "phone" || category === "small electronics") {
    maxScore = 86;
  }
  if (linkType === "search") {
    maxScore = Math.min(maxScore, 72);
  }
  if (!/\b(certified|restored|renewed|energy star|gots|fair trade|b corp|back market|walmart|target|best buy|ebay|etsy|amazon)\b/.test(text)) {
    maxScore = Math.min(maxScore, 78);
  }

  const modeledScore = Math.min(clampScore(score), maxScore);
  let minimumLift = 6;

  if (condition === "used") minimumLift = 14;
  else if (condition === "refurbished") minimumLift = 12;
  else if (condition === "recycled") minimumLift = 10;
  else if (condition === "energyEfficient") minimumLift = 6;

  if (linkType === "search") minimumLift = Math.max(4, minimumLift - 4);

  // Marketplace evidence caps keep weak listings from looking perfect, but an
  // alternative should still score above the product it is replacing.
  const baselineAnchoredScore = Math.min(95, baselineEthicsScore + minimumLift);
  const finalScore = Math.max(modeledScore, baselineAnchoredScore);

  return `Ethics ${finalScore}/100`;
}

async function searchShoppingResult(seed: any): Promise<any | null> {
  if (!serpApiKey) return null;

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: seed.searchQuery,
    api_key: serpApiKey,
    gl: "us",
    hl: "en",
  });
  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);

  if (!response.ok) {
    console.error("SerpApi search failed:", response.status, await response.text());
    return null;
  }

  const json = await response.json();
  const results = Array.isArray(json.shopping_results) ? json.shopping_results : [];
  const consumable = isConsumableProduct(seed?.searchQuery || "", seed?.category || "");
  return results.find((result: any) => {
    if (!getText(result?.title)) return false;
    if (!consumable) return true;
    const resultText = [
      result?.title,
      result?.source,
      result?.link,
      result?.product_link,
    ].map(getText).join(" ");
    return !isSecondhandQuery(resultText) && !isDisallowedConsumableMarketplace(result?.source);
  }) || null;
}

async function buildAlternativesFromShoppingResults(
  seeds: any[],
  currentCarbonKg = "",
  baselineEthicsScore = 50
): Promise<any[]> {
  const results = await Promise.all(
    seeds.slice(0, 3).map(async (seed) => {
      const result = await searchShoppingResult(seed);
      const marketplace = result ? getText(result.source) || "Google Shopping" : seed.marketplace;
      const fallbackMarketplace = getDefaultMarketplace(seed.searchQuery, seed.category);
      const searchUrl = buildMarketplaceSearchUrl(seed.searchQuery, fallbackMarketplace);

      if (!result) {
        return {
          name: seed.name || seed.searchQuery,
          maker: seed.maker || fallbackMarketplace,
          carbon: estimateAlternativeCarbon(seed, null, currentCarbonKg),
          ethics: estimateAlternativeEthics(seed, null, "search", baselineEthicsScore),
          price: seed.price || "Marketplace prices",
          tags: seed.tags || "Marketplace search - Compare sellers",
          searchQuery: seed.searchQuery,
          marketplace: fallbackMarketplace,
          url: searchUrl,
          linkType: "search",
        };
      }

      return {
        name: getText(result.title) || seed.name || seed.searchQuery,
        maker: marketplace,
        carbon: estimateAlternativeCarbon(seed, result, currentCarbonKg),
        ethics: estimateAlternativeEthics(seed, result, "listing", baselineEthicsScore),
        price: getText(result.price) || seed.price || "Marketplace prices",
        tags: seed.tags || "Shopping result - Compare details",
        searchQuery: seed.searchQuery,
        marketplace,
        url: getSerpApiResultUrl(result, seed.searchQuery),
        linkType: "listing",
      };
    })
  );

  return results.sort((a, b) => {
    if (a.linkType === b.linkType) return 0;
    return a.linkType === "listing" ? -1 : 1;
  });
}

app.get("/", (_req: any, res: any) => {
  res.send("Backend running");
});

app.post("/api/classify-product", async (req: any, res: any) => {
  try {
    if (!geminiApiKey) {
      res.status(500).json({ error: "Missing GEMINI_API_KEY in backend/.env" });
      return;
    }

    const { productName, brand, description, retailer } = req.body;

    const prompt = `
Analyze this ecommerce product and infer its carbon-estimation category.

Product name: ${productName ?? "unknown"}
Brand: ${brand ?? "unknown"}
Retailer: ${retailer ?? "unknown"}
Description: ${description ?? "unknown"}

Return ONLY valid JSON in this shape:
{
  "category": "electronics | clothing | furniture | appliance | food | beauty | household | toy | sports | unknown",
  "subcategory": "short specific type like laptop, treadmill, hoodie, sofa, etc.",
  "components": ["component 1", "component 2", "component 3"],
  "confidence": "high | medium | low"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text ?? "{}";

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (error) {
    console.error("Gemma/Gemini error:", error);
    res.status(500).json({ error: "AI classification failed" });
  }
});

app.post("/api/alternatives", async (req: any, res: any) => {
  try {
    const {
      productName,
      brand,
      category,
      description,
      retailer,
      price,
      carbonKg,
      emissionsLevel,
      ethicsScore,
      components,
    } = req.body;
    const baselineEthicsScore = Number.isFinite(Number(ethicsScore))
      ? clampScore(Number(ethicsScore))
      : 50;
    const isConsumable = isConsumableProduct(
      productName ?? "",
      category ?? ""
    );

    const fallbackSeeds = getAlternativeSearchSeeds(
      productName ?? "product",
      category ?? "product"
    );

    const serpAlternatives = await buildAlternativesFromShoppingResults(
      fallbackSeeds,
      carbonKg,
      baselineEthicsScore
    );
    const hasSerpListings = serpAlternatives.some(
      (alternative) => alternative.linkType === "listing"
    );

    if (hasSerpListings || !geminiApiKey) {
      res.json({ alternatives: serpAlternatives });
      return;
    }

    try {
      const prompt = `
Suggest 3 realistic greener ecommerce marketplace searches for the product below.
Prefer products that are lower-carbon because they are local, refurbished, reused, durable, energy-efficient, made from recycled materials, or have simpler materials.
If the product is food, fuel, beauty, cleaning, supplements, or another consumable, do NOT suggest used, refurbished, renewed, pre-owned, secondhand, eBay, or resale alternatives. For consumables, prefer organic, certified, sustainably sourced, concentrated, refill, bulk, recyclable packaging, or lower-use-impact options.
If the product is a live plant, tree, seedling, seed, bulb, or nursery item, do NOT suggest used, refurbished, renewed, pre-owned, secondhand, eBay, or resale alternatives. Prefer local nursery, organic, bare-root, native, drought-tolerant, or reduced-packaging plant options.
Do NOT invent exact product listing URLs.
Each alternative should be a search idea that a shopper can open on a marketplace.

Product name: ${productName ?? "unknown"}
Brand: ${brand ?? "unknown"}
Category: ${category ?? "unknown"}
Retailer: ${retailer ?? "unknown"}
Price: ${price ?? "unknown"}
Description: ${description ?? "unknown"}
Current estimate: ${carbonKg ?? "unknown"} kg CO2e, ${emissionsLevel ?? "unknown"}
Detected components: ${Array.isArray(components) ? components.join(", ") : "unknown"}

Return ONLY valid JSON in this exact shape:
{
  "alternatives": [
    {
      "name": "specific alternative product name",
      "maker": "brand, seller, or source",
      "carbon": "short estimate like 4.2 kg CO2e",
      "ethics": "short score like Ethics 88/100",
      "price": "price estimate like $24.99 or Similar price",
      "tags": "2-3 short reasons separated by hyphens",
      "searchQuery": "specific marketplace search query, not a URL",
      "marketplace": "Amazon | eBay | Etsy | Target | Walmart"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

      const text = response.text ?? "{}";
      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      const geminiSeeds = Array.isArray(parsed.alternatives)
        ? parsed.alternatives.map((item: any) => {
            const name = typeof item?.name === "string" ? item.name.trim() : "";
            const maker = typeof item?.maker === "string" ? item.maker.trim() : "";
            const searchQuery =
              typeof item?.searchQuery === "string" && item.searchQuery.trim()
                ? item.searchQuery.trim()
                : [name, maker].filter(Boolean).join(" ").trim() ||
                  `${productName ?? "eco alternative"} greener alternative`;
            const requestedMarketplace =
              typeof item?.marketplace === "string" && item.marketplace.trim()
                ? getMarketplaceLabel(item.marketplace)
                : getDefaultMarketplace(searchQuery, category);
            const marketplace = isConsumable && isDisallowedConsumableMarketplace(requestedMarketplace)
              ? getDefaultMarketplace(searchQuery, category)
              : requestedMarketplace;

            return {
              name: name || searchQuery,
              maker: maker || `${marketplace} search`,
              carbon: typeof item?.carbon === "string" && item.carbon.trim()
                ? item.carbon
                : "Estimate varies",
              ethics: typeof item?.ethics === "string" && item.ethics.trim()
                ? item.ethics
                : "Verify seller ethics",
              price: typeof item?.price === "string" && item.price.trim()
                ? item.price
                : "Marketplace prices",
              tags: typeof item?.tags === "string" && item.tags.trim()
                ? item.tags
                : "AI suggestion - Verify listing",
              searchQuery,
              marketplace,
              category,
            };
          })
          .filter((seed: any) => !isConsumable || (
            !isSecondhandQuery(seed.searchQuery) &&
            !isSecondhandQuery(seed.name) &&
            !isDisallowedConsumableMarketplace(seed.marketplace)
          ))
          .slice(0, 3)
        : fallbackSeeds;

      const alternatives = await buildAlternativesFromShoppingResults(
        geminiSeeds.length ? geminiSeeds : fallbackSeeds,
        carbonKg,
        baselineEthicsScore
      );
      res.json({ alternatives });
      return;
    } catch (geminiError) {
      console.error("Gemini alternative seed fallback failed:", geminiError);
      res.json({ alternatives: serpAlternatives });
    }
  } catch (error) {
    console.error("Alternative generation error:", error);
    res.status(500).json({ error: "Alternative generation failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
