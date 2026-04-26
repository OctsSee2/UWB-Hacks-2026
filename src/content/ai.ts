import type { ProductData } from "./types";
import type { Alternative } from "./types";

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
const AI_ALTERNATIVES_URL = "http://localhost:3000/api/alternatives";

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

function isAlternative(value: unknown): value is Alternative {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const hasValidUrl =
    candidate.url === undefined || typeof candidate.url === "string";
  const hasRequiredText =
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.maker === "string" &&
    candidate.maker.trim().length > 0 &&
    typeof candidate.carbon === "string" &&
    candidate.carbon.trim().length > 0 &&
    typeof candidate.ethics === "string" &&
    candidate.ethics.trim().length > 0 &&
    typeof candidate.price === "string" &&
    candidate.price.trim().length > 0 &&
    typeof candidate.tags === "string" &&
    candidate.tags.trim().length > 0;

  return hasRequiredText && hasValidUrl;
}

export async function generateAlternativesWithAI(
  product: ScrapedProduct,
  context: {
    carbonKg: string;
    emissionsLevel: string;
    category: string;
    components: string[];
  }
): Promise<Alternative[] | null> {
  try {
    const response = await fetch(AI_ALTERNATIVES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productName: product.productName || product.title,
        brand: product.brand || "",
        category: context.category || product.category || "",
        description: product.description || "",
        retailer: product.retailer || product.seller || product.domain || product.url || "",
        price: product.price || "",
        carbonKg: context.carbonKg,
        emissionsLevel: context.emissionsLevel,
        components: context.components,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI alternatives failed:", response.status, errorText);
      return null;
    }

    const json = await response.json();
    if (!json || !Array.isArray(json.alternatives)) {
      console.error("AI alternatives returned unexpected response:", json);
      return null;
    }

    return json.alternatives.filter(isAlternative).slice(0, 3);
  } catch (error) {
    console.error("AI alternatives error:", error);
    return null;
  }
}
