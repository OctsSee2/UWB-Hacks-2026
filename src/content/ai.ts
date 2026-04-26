import type { ProductData } from "./types";

export type ScrapedProduct = ProductData & {
  productName?: string;
  seller?: string;
  retailer?: string;
};

export type AIProductClassification = {
  category: string;
  subcategory: string;
  components: string[];
  confidence: "high" | "medium" | "low";
};

const AI_CLASSIFY_URL = "http://localhost:3000/api/classify-product";

export async function classifyProductWithAI(
  product: ScrapedProduct
): Promise<AIProductClassification | null> {
  try {
    const response = await fetch(AI_CLASSIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productName: product.productName || product.title,
        brand: product.brand || "",
        description: product.description || "",
        retailer: product.retailer || product.seller || product.domain || product.url || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI classification failed:", response.status, errorText);
      return null;
    }

    const json = await response.json();

    if (
      !json ||
      typeof json.category !== "string" ||
      typeof json.subcategory !== "string" ||
      !Array.isArray(json.components) ||
      !["high", "medium", "low"].includes(json.confidence)
    ) {
      console.error("AI classification returned unexpected response:", json);
      return null;
    }

    return {
      category: json.category,
      subcategory: json.subcategory,
      components: json.components.filter(
        (component: unknown): component is string => typeof component === "string"
      ),
      confidence: json.confidence,
    };
  } catch (error) {
    console.error("AI classification error:", error);
    return null;
  }
}
