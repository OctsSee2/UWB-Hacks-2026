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

function normalizeMarketplace(value: unknown): string {
  const marketplace = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (marketplace.includes("etsy")) return "Etsy";
  if (marketplace.includes("ebay")) return "eBay";
  if (marketplace.includes("target")) return "Target";
  if (marketplace.includes("walmart")) return "Walmart";
  if (marketplace.includes("depop")) return "Depop";
  return "Amazon";
}

function buildMarketplaceSearchUrl(searchQuery: string, marketplace: string): string {
  const query = encodeURIComponent(searchQuery.trim());

  switch (normalizeMarketplace(marketplace)) {
    case "Etsy":
      return `https://www.etsy.com/search?q=${query}`;
    case "eBay":
      return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
    case "Depop":
      return `https://www.depop.com/search/?q=${query}`;
    case "Target":
      return `https://www.target.com/s?searchTerm=${query}`;
    case "Walmart":
      return `https://www.walmart.com/search?q=${query}`;
    default:
      return `https://www.amazon.com/s?k=${query}`;
  }
}

function getSearchQuery(candidate: Record<string, unknown>): string {
  if (typeof candidate.searchQuery === "string" && candidate.searchQuery.trim()) {
    return candidate.searchQuery.trim();
  }

  return [candidate.name, candidate.maker]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();
}

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
  const hasValidSearchQuery =
    candidate.searchQuery === undefined || typeof candidate.searchQuery === "string";
  const hasValidMarketplace =
    candidate.marketplace === undefined || typeof candidate.marketplace === "string";
  const hasValidLinkType =
    candidate.linkType === undefined ||
    candidate.linkType === "listing" ||
    candidate.linkType === "search";
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

  return hasRequiredText && hasValidUrl && hasValidSearchQuery && hasValidMarketplace && hasValidLinkType;
}

export async function generateAlternativesWithAI(
  product: ScrapedProduct,
  context: {
    carbonKg: string;
    emissionsLevel: string;
    ethicsScore?: number;
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
        ethicsScore: context.ethicsScore,
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

    const validAlternatives: Alternative[] = json.alternatives
      .filter(isAlternative)
      .slice(0, 3);

    return validAlternatives
      .map((alternative) => {
        const candidate = alternative as Alternative & Record<string, unknown>;
        const searchQuery = getSearchQuery(candidate);
        const marketplace = normalizeMarketplace(candidate.marketplace || candidate.maker);

        return {
          ...alternative,
          searchQuery: alternative.searchQuery || searchQuery,
          marketplace,
          url: alternative.url || buildMarketplaceSearchUrl(searchQuery, marketplace),
          linkType: alternative.linkType || "search",
        };
      });
  } catch (error) {
    console.error("AI alternatives error:", error);
    return null;
  }
}
