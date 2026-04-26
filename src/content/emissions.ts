import { classifyProductWithAI } from "./ai";
import type { AIProductClassification } from "./ai";
import type { DemoAnalysisData, ProductData } from "./types";

const UNKNOWN_CATEGORY = "unknown";

type ProductDataWithComponents = ProductData & {
  components?: string[];
  subcategory?: string;
  classificationConfidence?: AIProductClassification["confidence"];
};

function getExistingComponents(productData: ProductData): string[] {
  const maybeComponents = (productData as ProductDataWithComponents).components;
  return Array.isArray(maybeComponents) ? maybeComponents : [];
}

function shouldUseAIClassification(category: string, components: string[]): boolean {
  return !category || category === UNKNOWN_CATEGORY || components.length === 0;
}

export async function getClassificationFallback(
  productData: ProductData
): Promise<AIProductClassification | null> {
  const category = productData.category?.trim().toLowerCase();
  const components = getExistingComponents(productData);

  if (shouldUseAIClassification(category, components)) {
    return classifyProductWithAI(productData);
  }

  return null;
}

export async function getProductDataForEmissions(
  productData: ProductData
): Promise<ProductDataWithComponents> {
  const category = productData.category?.trim().toLowerCase();
  const components = getExistingComponents(productData);

  if (!shouldUseAIClassification(category, components)) {
    return { ...productData, components };
  }

  const aiResult = await classifyProductWithAI(productData);

  if (!aiResult) {
    return { ...productData, components };
  }

  return {
    ...productData,
    category: aiResult.category,
    subcategory: aiResult.subcategory,
    components: aiResult.components,
    classificationConfidence: aiResult.confidence,
  };
}

export function getDemoAnalysisData(productData: ProductData): DemoAnalysisData {
  return {
    // Real scraped product data.
    productTitle: productData.title,

    // Fake demo analysis data for the hackathon prototype.
    carbonKg: "15.5",
    carbonPercent: 78,
    emissionsLevel: "High emissions",
    alternativesCount: 3,
    drivingEquivalent: "35 miles driven",
    treeGrowthEquivalent: "3 months tree growth",
    phoneChargeEquivalent: "7 phone charges",
    source: "Based on EPA USEEIO v1.3 + MIT delivery research",
    ethicsScore: 34,
    ethicsTags: ["Synthetic materials", "Long supply chain", "Air shipped"],
    deliverySpeed: "Same-day",
    deliveryIncrease: "+40%",
    deliveryNote: "Same-day adds ~40% more CO2 vs standard. You selected: Same-day.",
    alternatives: [
      {
        name: "Handmade canvas sneakers - Seattle maker",
        maker: "GreenStitch Studio - Seattle, WA",
        carbon: "1.2 kg CO2e",
        ethics: "Ethics 91/100",
        price: "$68",
        tags: "Local - Natural materials - Ground shipped",
      },
      {
        name: "Recycled-hemp low-tops - small batch",
        maker: "Kindred Footwork - Portland, OR",
        carbon: "2.4 kg CO2e",
        ethics: "Ethics 88/100",
        price: "$94",
        tags: "Recycled - Vegan - Ground shipped",
      },
    ],
    savingsText: "Switching saves ~",
    savingsAmount: "13 kg CO2",
    savingsComparison: " - like not driving 32 miles",
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
