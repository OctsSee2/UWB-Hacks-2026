import { getComponentsForCategory } from "./components";
import { getOriginsForComponents } from "./origins";
import { resolveShippingOrigin } from "./location";
import type { DemoAnalysisData, EmissionsResult, ProductData, ScrapedProduct } from "./types";

const DEFAULT_BUYER_ZIP = "98011";
const SHIPPING_EMISSION_FACTOR = 0.1; // kg CO2 per ton-mile
const DEFAULT_WEIGHT_KG = 1;
const DEFAULT_DISTANCE_MILES = 1000;

function getEstimatedWeight(product: ScrapedProduct): number {
  if (product.weightKg && product.weightKg > 0) {
    return product.weightKg;
  }

  const normalized = product.category.toLowerCase();
  if (normalized.includes("laptop") || normalized.includes("tablet") || normalized.includes("phone")) {
    return 1.8;
  }
  if (normalized.includes("shoe") || normalized.includes("clothing")) {
    return 1.2;
  }
  if (normalized.includes("camera")) {
    return 1.0;
  }
  if (normalized.includes("appliance") || normalized.includes("furniture")) {
    return 4.0;
  }

  return DEFAULT_WEIGHT_KG;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 3958.8 * c;
}

function getBuyerCoordinates(zip: string): { latitude: number; longitude: number } {
  const prefix = zip.slice(0, 3);
  switch (prefix) {
    case "980":
      return { latitude: 47.6150, longitude: -122.2015 };
    case "100":
      return { latitude: 40.7128, longitude: -74.0060 };
    case "941":
      return { latitude: 37.7749, longitude: -122.4194 };
    default:
      return { latitude: 39.8283, longitude: -98.5795 };
  }
}

function estimateProductionEmissions(
  components: string[],
  componentOrigins: Record<string, string[]>
): number {
  const baseRates: Record<string, number> = {
    battery: 12,
    display: 9,
    processor: 15,
    casing: 4,
    packaging: 1,
    lens: 6,
    sensor: 8,
    speaker: 5,
    cable: 2,
    cushion: 3,
    upper: 2,
    sole: 2,
    lace: 0.5,
    insole: 1,
    fabric: 3,
    thread: 0.2,
    buttons: 0.1,
    label: 0.1,
    wood: 5,
    metal: 8,
    plastic: 3,
    motor: 10,
    electronics: 9,
  };

  return components.reduce((total, component) => {
    const base = baseRates[component] ?? 3;
    const originMultiplier = componentOrigins[component]?.some((country) => country.toLowerCase().includes("china"))
      ? 1.2
      : 1;
    return total + base * originMultiplier;
  }, 0);
}

function estimateShippingEmissions(weightKg: number, distanceMiles: number): number {
  return (distanceMiles * (weightKg / 1000)) * SHIPPING_EMISSION_FACTOR;
}

function estimateDistance(
  originEstimate: EmissionsResult["originEstimate"],
  buyerZip: string
): number {
  const buyer = getBuyerCoordinates(buyerZip);
  if (!originEstimate.latitude || !originEstimate.longitude) {
    return DEFAULT_DISTANCE_MILES;
  }
  return haversineDistance(originEstimate.latitude, originEstimate.longitude, buyer.latitude, buyer.longitude);
}

export function estimateProductEmissions(
  product: ScrapedProduct,
  buyerZip = DEFAULT_BUYER_ZIP
): EmissionsResult {
  const components = product.components && product.components.length > 0
    ? product.components
    : getComponentsForCategory(product.category);
  const componentOrigins = getOriginsForComponents(components);
  const originEstimate = resolveShippingOrigin(product, componentOrigins);
  const weightKg = getEstimatedWeight(product);
  const distanceMiles = estimateDistance(originEstimate, buyerZip);
  const shippingEmissionsKg = estimateShippingEmissions(weightKg, distanceMiles);
  const productionEmissionsKg = estimateProductionEmissions(components, componentOrigins);
  const totalEmissionsKg = productionEmissionsKg + shippingEmissionsKg;

  return {
    components,
    componentOrigins,
    originEstimate,
    weightKg,
    distanceMiles,
    emissionFactor: SHIPPING_EMISSION_FACTOR,
    productionEmissionsKg,
    shippingEmissionsKg,
    totalEmissionsKg,
  };
}

export async function estimateRemoteProductEmissions(
  product: ScrapedProduct,
  buyerZip = DEFAULT_BUYER_ZIP
): Promise<EmissionsResult> {
  const components = product.components && product.components.length > 0
    ? product.components
    : getComponentsForCategory(product.category);
  const componentOrigins = getOriginsForComponents(components);
  const originEstimate = await resolveShippingOrigin(product, componentOrigins);
  const weightKg = getEstimatedWeight(product);
  const distanceMiles = estimateDistance(originEstimate, buyerZip);
  const shippingEmissionsKg = estimateShippingEmissions(weightKg, distanceMiles);
  const productionEmissionsKg = estimateProductionEmissions(components, componentOrigins);
  const totalEmissionsKg = productionEmissionsKg + shippingEmissionsKg;

  return {
    components,
    componentOrigins,
    originEstimate,
    weightKg,
    distanceMiles,
    emissionFactor: SHIPPING_EMISSION_FACTOR,
    productionEmissionsKg,
    shippingEmissionsKg,
    totalEmissionsKg,
  };
}

function formatEmissionValue(value: number): string {
  if (value > 0 && value < 0.01) {
    return `${value.toFixed(3)} kg CO2e`;
  }
  return `${value.toFixed(2)} kg CO2e`;
}

function buildDemoAnalysisData(emissions: EmissionsResult, productData: ProductData): DemoAnalysisData {
  const totalCarbon = emissions.totalEmissionsKg;
  const carbonPercent = Math.min(100, (totalCarbon / 20) * 100);
  const emissionsLevel = totalCarbon > 15 ? "High emissions" : totalCarbon > 5 ? "Medium emissions" : "Low emissions";
  const confidence = emissions.originEstimate.confidence;
  const weightDescription = productData.weightKg ? "Provided by listing." : "Estimated from product category.";
  const hasScrapedComponents = Boolean(productData.components && productData.components.length);
  const componentList = hasScrapedComponents
    ? productData.components!.join(", ")
    : emissions.components.join(", ");
  const componentSource = hasScrapedComponents
    ? "Extracted from product description."
    : "Inferred from product category.";

  return {
    productTitle: productData.productName || productData.title,
    carbonKg: totalCarbon.toFixed(1),
    carbonPercent: Math.round(carbonPercent),
    emissionsLevel,
    alternativesCount: 3,
    drivingEquivalent: `${Math.max(1, Math.round(totalCarbon * 2))} miles driven`,
    treeGrowthEquivalent: `${Math.max(1, Math.round(totalCarbon / 5))} months tree growth`,
    phoneChargeEquivalent: `${Math.max(1, Math.round(totalCarbon * 2))} phone charges`,
    source: `Estimated from ${hasScrapedComponents ? "description" : "category"}-based components, plus ${confidence} origin inference`,
    ethicsScore: emissions.originEstimate.country === "USA" ? 80 : 50,
    ethicsTags: [
      emissions.originEstimate.country ? `Origin: ${emissions.originEstimate.country}` : "Origin unknown",
      `Confidence: ${confidence}`,
    ],
    deliverySpeed: productData.deliveryText || "Standard",
    deliveryIncrease: confidence === "high" ? "+0%" : confidence === "medium" ? "+15%" : "+30%",
    deliveryNote: `Origin estimated from ${emissions.originEstimate.originType}.`,
    alternatives: [
      {
        name: "Eco-friendly alternative",
        maker: "Local maker",
        carbon: `${(totalCarbon * 0.5).toFixed(1)} kg CO2e`,
        ethics: "Ethics 90/100",
        price: productData.price,
        tags: "Local - Sustainable",
      },
    ],
    auditTrail: [
      {
        title: "Item category",
        value: productData.category || "Unknown",
        description: `Used to infer a component breakdown and weight estimate.`,
      },
      {
        title: "Components detected",
        value: componentList,
        description: componentSource,
      },
      {
        title: "Weight estimate",
        value: `${emissions.weightKg.toFixed(1)} kg`,
        description: weightDescription,
      },
      {
        title: "Shipping origin",
        value: `${emissions.originEstimate.origin}`,
        description: `Inferred origin type: ${emissions.originEstimate.originType}, confidence: ${confidence}.`,
      },
      {
        title: "Distance estimate",
        value: `${emissions.distanceMiles.toFixed(0)} miles`,
        description: `Calculated from origin and buyer coordinates.`,
      },
      {
        title: "Production emissions",
        value: `${emissions.productionEmissionsKg.toFixed(1)} kg CO2e`,
        description: `Based on component count and assumed manufacturing factors.`,
      },
      {
        title: "Shipping emissions",
        value: formatEmissionValue(emissions.shippingEmissionsKg),
        description: `Calculated as distance × weight × shipping factor.`,
      },
    ],
    savingsText: "Switching saves ~",
    savingsAmount: `${(totalCarbon * 0.5).toFixed(1)} kg CO2`,
    savingsComparison: ` - like not driving ${Math.round(totalCarbon)} miles`,
    impact: {
      savedKg: "0",
      nextMilestone: "0 of 100 kg to next milestone",
      progress: 0,
      milesNotDriven: "0",
      dayStreak: "0",
      treesWorth: "0",
      purchasesSwitched: "0",
      flightAmount: "0",
      flightLabel: "",
    },
  };
}

export function getDemoAnalysisData(productData: ProductData): DemoAnalysisData {
  const emissions = estimateProductEmissions(productData);
  return buildDemoAnalysisData(emissions, productData);
}

export async function calculateProductAnalysis(productData: ProductData): Promise<DemoAnalysisData> {
  const emissions = await estimateRemoteProductEmissions(productData);
  return buildDemoAnalysisData(emissions, productData);
}
