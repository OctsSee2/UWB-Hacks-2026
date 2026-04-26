const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn("Missing GEMINI_API_KEY. Add it to backend/.env before using AI endpoints.");
}

const app = express();
app.use(express.json());
app.use((req: any, res: any, next: any) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

function isLikelyHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function buildMarketplaceFallbackUrl(name: string, maker: string): string {
  const query = encodeURIComponent(name.trim());
  const normalizedMaker = maker.toLowerCase();

  if (normalizedMaker.includes("etsy")) return `https://www.etsy.com/search?q=${query}`;
  if (normalizedMaker.includes("ebay")) return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
  if (normalizedMaker.includes("depop")) return `https://www.depop.com/search/?q=${query}`;
  if (normalizedMaker.includes("amazon")) return `https://www.amazon.com/s?k=${query}`;
  if (normalizedMaker.includes("target")) return `https://www.target.com/s?searchTerm=${query}`;
  if (normalizedMaker.includes("walmart")) return `https://www.walmart.com/search?q=${query}`;

  return `https://www.amazon.com/s?k=${query}`;
}

app.get("/", (req: any, res: any) => {
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
      model: "gemini-3-flash-preview",
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
    if (!geminiApiKey) {
      res.status(500).json({ error: "Missing GEMINI_API_KEY in backend/.env" });
      return;
    }

    const {
      productName,
      brand,
      category,
      description,
      retailer,
      price,
      carbonKg,
      emissionsLevel,
      components,
    } = req.body;

    const prompt = `
Suggest 3 realistic greener ecommerce alternatives for the product below.
Prefer products that are lower-carbon because they are local, refurbished, reused, durable, energy-efficient, made from recycled materials, or have simpler materials.

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
      "url": "exact product listing URL (https://...)"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text ?? "{}";
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    const alternatives = Array.isArray(parsed.alternatives)
      ? parsed.alternatives.slice(0, 3).map((item: any) => {
          const name = typeof item?.name === "string" ? item.name.trim() : "";
          const maker = typeof item?.maker === "string" ? item.maker.trim() : "";
          const rawUrl =
            typeof item?.url === "string"
              ? item.url
              : typeof item?.productUrl === "string"
                ? item.productUrl
                : typeof item?.link === "string"
                  ? item.link
                  : "";
          const url = isLikelyHttpUrl(rawUrl)
            ? rawUrl.trim()
            : buildMarketplaceFallbackUrl(name || productName || "eco alternative", maker);

          return {
            name,
            maker,
            carbon: typeof item?.carbon === "string" ? item.carbon : "",
            ethics: typeof item?.ethics === "string" ? item.ethics : "",
            price: typeof item?.price === "string" ? item.price : "",
            tags: typeof item?.tags === "string" ? item.tags : "",
            url,
          };
        })
      : [];

    res.json({ alternatives });
  } catch (error) {
    console.error("Gemini alternatives error:", error);
    res.status(500).json({ error: "Alternative generation failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
