const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req: any, res: any) => {
  res.send("Backend running");
});

app.post("/api/classify-product", async (req: any, res: any) => {
  try {
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

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});