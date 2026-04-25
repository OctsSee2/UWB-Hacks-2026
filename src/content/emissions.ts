import type {
  DemoAnalysisData,
  MarketSegment,
  ProductData,
  ProductType,
} from "./types";

const fastFashionMarkers = ["shein", "temu", "fashion nova", "boohoo"];
const secondhandMarkers = ["secondhand", "pre-owned", "thrift", "resale", "used"];
const BASE_CLOTHING_CARBON_KG = 10.2;
const FAST_FASHION_ADJUSTMENT_KG = 2.1;
const SECONDHAND_ADJUSTMENT_KG = -4.8;
const CARBON_PERCENT_REFERENCE_KG = 22;
const DRIVING_EQ_MILES_PER_KG = 2.3;
const KG_PER_TREE_GROWTH_MONTH = 4.5;
const KG_PER_PHONE_CHARGE = 2;
const MIN_TREE_GROWTH_MONTHS = 1;
const MIN_PHONE_CHARGES = 1;
const SAVINGS_MULTIPLIER = 0.62;
const MIN_SAVINGS_KG = 1.8;
const MILES_COMPARISON_PER_KG = 1.4;
const MIN_COMPARISON_MILES = 4;
const clothingMarkers = [
  "shirt",
  "tee",
  "t-shirt",
  "jacket",
  "hoodie",
  "dress",
  "jeans",
  "pants",
  "skirt",
  "sweater",
  "top",
  "coat",
  "shorts",
  "apparel",
  "clothing",
];

function roundTo1Decimal(value: number): number {
  return Number(value.toFixed(1));
}

function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`, "i");
  return pattern.test(text);
}

function inferProductType(productData: ProductData): ProductType {
  const text = `${productData.title} ${productData.description} ${productData.category}`.toLowerCase();
  return clothingMarkers.some((marker) => containsWord(text, marker))
    ? "clothing"
    : "other";
}

function inferMarketSegment(productData: ProductData): MarketSegment {
  const text = `${productData.title} ${productData.brand} ${productData.description} ${productData.domain}`.toLowerCase();
  if (secondhandMarkers.some((marker) => containsWord(text, marker))) return "secondhand";
  if (fastFashionMarkers.some((marker) => containsWord(text, marker))) return "fast-fashion";
  return "mainstream";
}

function inferDelivery(productData: ProductData): {
  speed: string;
  increase: string;
  multiplier: number;
} {
  const shippingText = productData.shipping.toLowerCase();
  if (
    shippingText.includes("same day") ||
    shippingText.includes("same-day") ||
    shippingText.includes("overnight")
  ) {
    return { speed: "Same-day", increase: "+45%", multiplier: 1.45 };
  }
  if (
    shippingText.includes("next day") ||
    shippingText.includes("next-day") ||
    shippingText.includes("one day") ||
    shippingText.includes("one-day")
  ) {
    return { speed: "Next-day", increase: "+25%", multiplier: 1.25 };
  }
  return { speed: "Standard", increase: "baseline", multiplier: 1 };
}

function calculateClothingCarbonKg(productData: ProductData, marketSegment: MarketSegment, deliveryMultiplier: number): number {
  const text = `${productData.title} ${productData.description}`.toLowerCase();
  let kg = BASE_CLOTHING_CARBON_KG;

  if (containsWord(text, "polyester")) kg += 2.4;
  if (containsWord(text, "denim")) kg += 1.7;
  if (containsWord(text, "leather")) kg += 4.2;
  if (containsWord(text, "linen")) kg -= 1.2;
  if (containsWord(text, "recycled")) kg -= 1.8;

  if (marketSegment === "fast-fashion") kg += FAST_FASHION_ADJUSTMENT_KG;
  if (marketSegment === "secondhand") kg += SECONDHAND_ADJUSTMENT_KG;

  return Math.max(1.2, roundTo1Decimal(kg * deliveryMultiplier));
}

function buildEthicsTags(segment: MarketSegment, deliverySpeed: string): string[] {
  const tags: string[] = [];
  if (segment === "fast-fashion") tags.push("Ultra-fast-fashion risk", "Opaque labor reporting");
  if (segment === "mainstream") tags.push("Limited supplier transparency");
  if (segment === "secondhand") tags.push("Circular fashion benefit", "Reuse over new production");
  if (deliverySpeed !== "Standard") tags.push("Air shipped");
  return tags;
}

export function getDemoAnalysisData(productData: ProductData): DemoAnalysisData {
  const productType = inferProductType(productData);
  const marketSegment = inferMarketSegment(productData);
  const delivery = inferDelivery(productData);
  const carbonKgNumber =
    productType === "clothing"
      ? calculateClothingCarbonKg(productData, marketSegment, delivery.multiplier)
      : 6.1;
  const ethicsBase =
    marketSegment === "secondhand" ? 88 : marketSegment === "mainstream" ? 61 : 32;
  const ethicsScore = Math.max(
    10,
    Math.min(98, ethicsBase - (delivery.speed === "Standard" ? 0 : 5))
  );
  const carbonPercent = Math.max(
    15,
    Math.min(100, Math.round((carbonKgNumber / CARBON_PERCENT_REFERENCE_KG) * 100))
  );
  const alternativesCount = productType === "clothing" ? 3 : 2;

  return {
    productTitle: productData.title,
    productType,
    carbonKg: carbonKgNumber.toFixed(1),
    carbonPercent,
    emissionsLevel:
      carbonKgNumber >= 16 ? "High emissions" : carbonKgNumber >= 9 ? "Medium emissions" : "Lower emissions",
    alternativesCount,
    drivingEquivalent: `${Math.round(carbonKgNumber * DRIVING_EQ_MILES_PER_KG)} miles driven`,
    treeGrowthEquivalent: `${Math.max(MIN_TREE_GROWTH_MONTHS, Math.round(carbonKgNumber / KG_PER_TREE_GROWTH_MONTH))} months tree growth`,
    phoneChargeEquivalent: `${Math.max(MIN_PHONE_CHARGES, Math.round(carbonKgNumber / KG_PER_PHONE_CHARGE))} phone charges`,
    source:
      "Estimated locally using scraped product text + backend-aligned heuristic stages (catalog, lifecycle, shipping, supply-chain signals).",
    ethicsScore,
    ethicsTags: buildEthicsTags(marketSegment, delivery.speed),
    deliverySpeed: delivery.speed,
    deliveryIncrease: delivery.increase,
    deliveryNote:
      delivery.speed === "Standard"
        ? "Standard shipping is used as the baseline for this estimate."
        : `${delivery.speed} delivery increases estimated shipping emissions versus standard for this product profile.`,
    alternatives: [
      {
        name: "Organic cotton tee - Seattle co-op",
        maker: "ThreadCycle Co-op - Seattle, WA",
        carbon: "2.1 kg CO2e",
        ethics: "Ethics 93/100",
        price: "$32",
        tags: "Fair-wage - Organic cotton - Ground shipped",
      },
      {
        name: "Secondhand denim jacket - local resale",
        maker: "ReWear Exchange - Portland, OR",
        carbon: "3.4 kg CO2e",
        ethics: "Ethics 90/100",
        price: "$44",
        tags: "Secondhand - Circular fashion - Pickup available",
      },
      {
        name: "Linen button-up - small batch",
        maker: "Northwest Loom - Tacoma, WA",
        carbon: "4.0 kg CO2e",
        ethics: "Ethics 89/100",
        price: "$58",
        tags: "Natural fibers - Small batch - Ground shipped",
      },
    ],
    savingsText: "Switching saves ~",
    savingsAmount: `${Math.max(MIN_SAVINGS_KG, roundTo1Decimal(carbonKgNumber * SAVINGS_MULTIPLIER))} kg CO2`,
    savingsComparison: ` - like not driving ${Math.max(MIN_COMPARISON_MILES, Math.round(carbonKgNumber * MILES_COMPARISON_PER_KG))} miles`,
    agentProfile: {
      productTypes: [productType],
      marketSegments: [marketSegment],
      purpose:
        "Classify clothing items and return lifecycle, shipping, and supply-chain signals to power lower-emission alternatives.",
      deepResearchEnabled: false,
      backendMode: "api-aggregator",
      apiPipeline: [
        "catalog-classifier",
        "lifecycle-emissions-api",
        "shipping-emissions-api",
        "supply-chain-risk-api",
      ],
    },
    impact: {
      savedKg: "56",
      nextMilestone: "56 of 100 kg to next milestone",
      progress: 56,
      milesNotDriven: "248",
      dayStreak: "7",
      treesWorth: "3",
      purchasesSwitched: "7",
      flightAmount: "1/2 flight",
      flightLabel: "SEA to LAS - about half a one-way ticket's emissions",
    },
  };
}
