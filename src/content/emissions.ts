import { classifyProductWithAI, generateAlternativesWithAI } from "./ai";
import { getComponentsForCategory } from "./components";
import { resolveShippingOrigin } from "./location";
import { getOriginsForComponents } from "./origins";
import type {
  DemoAnalysisData,
  EmissionsResult,
  OriginEstimate,
  ProductData,
  ScrapedProduct,
} from "./types";

const DEFAULT_BUYER_ZIP = "98011";
const SHIPPING_EMISSION_FACTOR = 0.1; // kg CO2 per ton-mile
const DEFAULT_WEIGHT_KG = 1;
const DEFAULT_BANANA_WEIGHT_KG = 0.18;
const DEFAULT_SINGLE_PRODUCE_WEIGHT_KG = 0.25;
const DEFAULT_CHARCOAL_BAG_WEIGHT_KG = 7.3;
const DEFAULT_DISTANCE_MILES = 1000;
const DOMESTIC_FALLBACK_DISTANCE_MILES = 600;
const UNKNOWN_CATEGORY = "unknown";
const KG_CO2_PER_MILE_DRIVEN = 0.404;
const KG_CO2_PER_PHONE_CHARGE = 0.008;
const KG_CO2_ABSORBED_PER_TREE_MONTH = 21.8 / 12;
const KG_CO2_PER_KG_CHARCOAL_BURNED = 3.0;
const PACKAGED_FOOD_COMPONENTS = ["food", "farming", "packaging"];
const PRODUCE_COMPONENTS = ["produce", "farming", "packaging"];

type ClassificationContext = {
  category: string;
  components: string[];
  usedAI: boolean;
  aiSubcategory?: string;
  aiConfidence?: "high" | "medium" | "low";
};

type EthicsAssessment = {
  score: number;
  tags: string[];
  details: string;
};

function normalizeCategory(category: string | null | undefined): string {
  return category?.trim().toLowerCase() || UNKNOWN_CATEGORY;
}

function hasComponents(components: string[] | undefined): components is string[] {
  return Array.isArray(components) && components.length > 0;
}

function shouldUseAIClassification(category: string, components: string[]): boolean {
  return !category || category === UNKNOWN_CATEGORY || components.length === 0;
}

function getClassificationFromScraper(product: ScrapedProduct): ClassificationContext {
  const scrapedCategory = normalizeCategory(product.category);
  const listingText = getListingText(product);
  const category = isCombustibleFuelProduct(listingText)
    ? "combustible fuel"
    : isFoodProduct(product, scrapedCategory)
      ? "packaged food"
      : scrapedCategory;
  const productComponents = inferComponentsFromProduct(product, category);
  const components = hasComponents(product.components)
    ? product.components
    : productComponents ?? getComponentsForCategory(category);

  return {
    category,
    components,
    usedAI: false,
  };
}

async function getClassificationForEmissions(
  product: ScrapedProduct
): Promise<ClassificationContext> {
  const scraped = getClassificationFromScraper(product);

  if (!shouldUseAIClassification(scraped.category, scraped.components)) {
    return scraped;
  }

  const aiResult = await classifyProductWithAI(product);

  if (!aiResult) {
    return scraped;
  }

  return {
    category: normalizeCategory(aiResult.category),
    components: aiResult.components,
    usedAI: true,
    aiSubcategory: aiResult.subcategory,
    aiConfidence: aiResult.confidence,
  };
}

function getEstimatedWeight(product: ScrapedProduct, category: string): number {
  if (product.weightKg && product.weightKg > 0) {
    return product.weightKg;
  }

  const parsedWeight = parsePackageWeightKg(product);
  if (parsedWeight) {
    return parsedWeight;
  }

  const normalized = category.toLowerCase();
  const listingText = getListingText(product);
  if (isCharcoalProduct(listingText)) {
    return DEFAULT_CHARCOAL_BAG_WEIGHT_KG;
  }
  if (isBananaProduct(listingText)) {
    return DEFAULT_BANANA_WEIGHT_KG;
  }
  if (isProduceProduct(listingText, normalized)) {
    return DEFAULT_SINGLE_PRODUCE_WEIGHT_KG;
  }
  if (isFoodProduct(product, normalized)) {
    return 0.45;
  }
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

function parsePackageWeightKg(product: ScrapedProduct): number | null {
  const text = getListingText(product);
  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds|kg|kilogram|kilograms|oz|ounce|ounces)\b/i);
  if (!weightMatch?.[1] || !weightMatch[2]) return null;

  const amount = Number(weightMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unit = weightMatch[2].toLowerCase();
  if (unit === "kg" || unit.startsWith("kilogram")) return amount;
  if (unit === "oz" || unit.startsWith("ounce")) return amount * 0.0283495;
  return amount * 0.453592;
}

function isCharcoalProduct(text: string): boolean {
  return /\b(charcoal|briquette|briquettes|lump coal|bbq coal|grilling coal)\b/.test(text);
}

function isCombustibleFuelProduct(text: string): boolean {
  return isCharcoalProduct(text) || /\b(propane|butane|lighter fluid|fire starter|firestarter|grill fuel|camp fuel)\b/.test(text);
}

function isBananaProduct(text: string): boolean {
  return /\bbanana|bananas\b/.test(text);
}

function isProduceProduct(text: string, category: string): boolean {
  return /\b(fresh fruit|fresh fruits|produce|grocery|banana|apple|orange|lemon|lime|avocado|berries|strawberry|grapes|vegetable|vegetables)\b/.test(`${text} ${category}`);
}

function isFoodProduct(product: ScrapedProduct, category: string): boolean {
  const text = getListingText(product);
  if (isCombustibleFuelProduct(`${text} ${category}`)) {
    return false;
  }

  const hasIngredients = Boolean(product.ingredients?.trim());
  const foodSignals = /\b(food|grocery|snack|snacks|breakfast|cereal|poptart|pop-tart|pop tarts|cookie|cookies|cracker|crackers|chips|candy|chocolate|granola|protein bar|nutrition bar|pastry|pastries|fruit|produce|beverage|coffee|tea|soda|juice|sauce|pasta|rice|noodle|soup|spice|seasoning)\b/.test(`${text} ${category}`);
  const cosmeticSignals = /\b(beauty|skin care|skincare|cosmetic|makeup|shampoo|conditioner|lotion|serum|fragrance|deodorant)\b/.test(`${text} ${category}`);

  return foodSignals || (hasIngredients && !cosmeticSignals);
}

function estimateUsePhaseEmissions(
  product: ScrapedProduct,
  weightKg: number
): { emissionsKg: number; description?: string } {
  const text = getListingText(product);
  if (!isCharcoalProduct(text)) {
    return { emissionsKg: 0 };
  }

  const fuelWeightKg = product.weightKg || parsePackageWeightKg(product) || weightKg || DEFAULT_CHARCOAL_BAG_WEIGHT_KG;
  const emissionsKg = fuelWeightKg * KG_CO2_PER_KG_CHARCOAL_BURNED;
  const weightSource = product.weightKg || parsePackageWeightKg(product)
    ? "listing/package weight"
    : "default charcoal bag weight";

  return {
    emissionsKg,
    description: `Adds expected CO2 from burning charcoal: ${fuelWeightKg.toFixed(1)} kg fuel x ${KG_CO2_PER_KG_CHARCOAL_BURNED.toFixed(1)} kg CO2/kg (${weightSource}).`,
  };
}

function inferComponentsFromProduct(product: ScrapedProduct, category: string): string[] | null {
  const listingText = getListingText(product);

  if (isProduceProduct(listingText, category)) {
    return PRODUCE_COMPONENTS;
  }
  if (isFoodProduct(product, category)) {
    return PACKAGED_FOOD_COMPONENTS;
  }

  return null;
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
      return { latitude: 47.615, longitude: -122.2015 };
    case "100":
      return { latitude: 40.7128, longitude: -74.006 };
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
    food: 1.2,
    produce: 0.35,
    farming: 0.45,
  };

  return components.reduce((total, component) => {
    const base = baseRates[component] ?? 3;
    const originMultiplier = componentOrigins[component]?.some((country) =>
      country.toLowerCase().includes("china")
    )
      ? 1.2
      : 1;
    return total + base * originMultiplier;
  }, 0);
}

function estimateShippingEmissions(weightKg: number, distanceMiles: number): number {
  return distanceMiles * (weightKg / 1000) * SHIPPING_EMISSION_FACTOR;
}

function estimateDistance(
  originEstimate: EmissionsResult["originEstimate"],
  buyerZip: string
): number {
  if (originEstimate.confidence === "very low") {
    return DOMESTIC_FALLBACK_DISTANCE_MILES;
  }

  const buyer = getBuyerCoordinates(buyerZip);
  if (!originEstimate.latitude || !originEstimate.longitude) {
    return DEFAULT_DISTANCE_MILES;
  }
  return haversineDistance(
    originEstimate.latitude,
    originEstimate.longitude,
    buyer.latitude,
    buyer.longitude
  );
}

function getInitialOriginEstimate(product: ScrapedProduct): OriginEstimate {
  const origin = product.shippingZipcode
    ? `Zip ${product.shippingZipcode}`
    : product.itemLocation || product.shipsFrom || product.retailer || "United States";

  return {
    origin,
    originType: product.shippingZipcode ? "zip" : product.itemLocation ? "cityState" : "retailer",
    confidence: product.shippingZipcode ? "high" : "low",
    zip: product.shippingZipcode || undefined,
    country: product.country ?? "USA",
    latitude: 39.8283,
    longitude: -98.5795,
  };
}

function buildEmissionsResultWithOrigin(
  product: ScrapedProduct,
  classification: ClassificationContext,
  originEstimate: OriginEstimate,
  buyerZip: string
): EmissionsResult {
  const componentOrigins = getOriginsForComponents(classification.components);
  const weightKg = getEstimatedWeight(product, classification.category);
  const distanceMiles = estimateDistance(originEstimate, buyerZip);
  const shippingEmissionsKg = estimateShippingEmissions(weightKg, distanceMiles);
  const productionEmissionsKg = estimateProductionEmissions(
    classification.components,
    componentOrigins
  );
  const usePhase = estimateUsePhaseEmissions(product, weightKg);
  const totalEmissionsKg = productionEmissionsKg + shippingEmissionsKg + usePhase.emissionsKg;

  return {
    components: classification.components,
    componentOrigins,
    originEstimate,
    weightKg,
    distanceMiles,
    emissionFactor: SHIPPING_EMISSION_FACTOR,
    productionEmissionsKg,
    shippingEmissionsKg,
    usePhaseEmissionsKg: usePhase.emissionsKg,
    usePhaseDescription: usePhase.description,
    totalEmissionsKg,
  };
}

export function estimateProductEmissions(
  product: ScrapedProduct,
  buyerZip = DEFAULT_BUYER_ZIP
): EmissionsResult {
  const classification = getClassificationFromScraper(product);
  return buildEmissionsResultWithOrigin(
    product,
    classification,
    getInitialOriginEstimate(product),
    buyerZip
  );
}

export async function estimateRemoteProductEmissions(
  product: ScrapedProduct,
  buyerZip = DEFAULT_BUYER_ZIP
): Promise<EmissionsResult> {
  const classification = await getClassificationForEmissions(product);
  const componentOrigins = getOriginsForComponents(classification.components);
  const originEstimate = await resolveShippingOrigin(product, componentOrigins);
  return buildEmissionsResultWithOrigin(product, classification, originEstimate, buyerZip);
}

function formatEmissionValue(value: number): string {
  if (value > 0 && value < 0.01) {
    return `${value.toFixed(3)} kg CO2e`;
  }
  return `${value.toFixed(2)} kg CO2e`;
}

function formatConfidenceLabel(confidence: OriginEstimate["confidence"]): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    default:
      return "Very low confidence";
  }
}

function buildShippingEstimateNote(emissions: EmissionsResult): string {
  const distance = Math.max(0, Math.round(emissions.distanceMiles));
  const originType = emissions.originEstimate.originType;

  if (emissions.originEstimate.confidence === "very low") {
    return `No fulfillment origin was found, so shipping uses a conservative ${distance} mile fulfillment-network fallback.`;
  }

  if (emissions.originEstimate.confidence === "high") {
    return `Shipping impact uses a ${originType} clue and an estimated ${distance} mile route.`;
  }

  return `Exact fulfillment origin was unavailable, so shipping impact uses a ${originType} estimate over about ${distance} miles.`;
}

function buildShippingImpactLabel(emissions: EmissionsResult): string {
  return `Shipping: ${formatEmissionValue(emissions.shippingEmissionsKg)}`;
}

function parseCarbonKg(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEquivalentCount(value: number): string {
  if (value < 10) return Math.max(1, Math.round(value)).toString();
  if (value < 1000) return Math.round(value).toString();
  return `${Math.round(value / 100) / 10}k`;
}

function buildEquivalencies(totalCarbon: number): {
  drivingEquivalent: string;
  treeGrowthEquivalent: string;
  phoneChargeEquivalent: string;
  auditDescription: string;
} {
  const milesDriven = totalCarbon / KG_CO2_PER_MILE_DRIVEN;
  const phoneCharges = totalCarbon / KG_CO2_PER_PHONE_CHARGE;
  const treeMonths = totalCarbon / KG_CO2_ABSORBED_PER_TREE_MONTH;

  return {
    drivingEquivalent: `${formatEquivalentCount(milesDriven)} miles driven`,
    treeGrowthEquivalent: `${formatEquivalentCount(treeMonths)} months tree growth`,
    phoneChargeEquivalent: `${formatEquivalentCount(phoneCharges)} phone charges`,
    auditDescription: [
      `${KG_CO2_PER_MILE_DRIVEN} kg CO2/mile driven`,
      `${KG_CO2_PER_PHONE_CHARGE} kg CO2/phone charge`,
      `${KG_CO2_ABSORBED_PER_TREE_MONTH.toFixed(2)} kg CO2 absorbed/tree-month`,
    ].join("; "),
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getListingText(productData: ProductData): string {
  return [
    productData.productName,
    productData.title,
    productData.brand,
    productData.category,
    productData.description,
    productData.seller,
    productData.retailer,
    productData.shipping,
    productData.deliveryText,
    productData.ingredients,
    productData.country ?? "",
    productData.componentCountry ?? "",
  ].join(" ").toLowerCase();
}

function hasSignal(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function getComponentRisk(components: string[]): { adjustment: number; label: string } {
  const risks: Record<string, number> = {
    battery: -8,
    electronics: -7,
    processor: -6,
    display: -5,
    motor: -5,
    plastic: -4,
    metal: -3,
    fabric: -3,
    packaging: -2,
    wood: 2,
  };

  const adjustment = components.reduce((total, component) => total + (risks[component] ?? 0), 0);
  if (adjustment <= -12) return { adjustment, label: "High material risk" };
  if (adjustment <= -5) return { adjustment, label: "Moderate material risk" };
  if (adjustment > 0) return { adjustment, label: "Lower-impact materials" };
  return { adjustment, label: "Material risk neutral" };
}

function getCategoryRisk(category: string): { adjustment: number; label: string } {
  const normalized = category.toLowerCase();

  if (/(electronics|phone|laptop|tablet|camera|tv|television)/.test(normalized)) {
    return { adjustment: -8, label: "Electronics supply chain" };
  }
  if (/(clothing|shoes|apparel|fashion)/.test(normalized)) {
    return { adjustment: -6, label: "Textile supply chain" };
  }
  if (/(toy|beauty)/.test(normalized)) {
    return { adjustment: -4, label: "Moderate category risk" };
  }
  if (/(combustible fuel|fuel|charcoal|propane|butane)/.test(normalized)) {
    return { adjustment: -18, label: "Combustible fuel" };
  }
  if (/(furniture|appliance)/.test(normalized)) {
    return { adjustment: -3, label: "Durability matters" };
  }

  return { adjustment: 0, label: "Category risk neutral" };
}

function getOriginAssessment(
  emissions: EmissionsResult
): { adjustment: number; label: string } {
  const country = emissions.originEstimate.country?.trim().toLowerCase();
  const confidence = emissions.originEstimate.confidence;
  let adjustment = 0;

  if (!country) {
    adjustment -= 8;
  } else if (["usa", "united states", "canada", "germany", "japan"].includes(country)) {
    adjustment += 10;
  } else if (["south korea", "taiwan"].includes(country)) {
    adjustment += 6;
  } else if (["vietnam", "malaysia"].includes(country)) {
    adjustment -= 2;
  } else if (["china", "bangladesh", "india"].includes(country)) {
    adjustment -= 8;
  } else {
    adjustment -= 3;
  }

  if (confidence === "high") adjustment += 5;
  if (confidence === "low") adjustment -= 8;
  if (confidence === "very low") adjustment -= 14;

  if (emissions.distanceMiles < 500) adjustment += 6;
  else if (emissions.distanceMiles < 1500) adjustment += 2;
  else if (emissions.distanceMiles > 5000) adjustment -= 8;
  else if (emissions.distanceMiles > 2500) adjustment -= 5;

  const label = country && country !== "none" && country !== "unknown"
    ? `Origin: ${emissions.originEstimate.country}`
    : "";

  return { adjustment, label };
}

function getListingSignalAssessment(text: string): { adjustment: number; labels: string[] } {
  const labels: string[] = [];
  let adjustment = 0;

  if (hasSignal(text, [/\b(recycled|post-consumer|upcycled)\b/])) {
    adjustment += 10;
    labels.push("Recycled materials");
  }
  if (hasSignal(text, [/\b(refurbished|renewed|pre-owned|used|secondhand|second-hand)\b/])) {
    adjustment += 12;
    labels.push("Reuse/circular");
  }
  if (hasSignal(text, [/\b(organic|gots|fair trade|fairtrade|b corp|certified b)\b/])) {
    adjustment += 10;
    labels.push("Certification signal");
  }
  if (hasSignal(text, [/\b(energy star|energy-efficient|energy efficient|low power)\b/])) {
    adjustment += 8;
    labels.push("Energy efficient");
  }
  if (hasSignal(text, [/\b(repairable|durable|lifetime warranty|replacement parts)\b/])) {
    adjustment += 6;
    labels.push("Durability signal");
  }
  if (hasSignal(text, [/\b(made in usa|made in the usa|local|locally made)\b/])) {
    adjustment += 8;
    labels.push("Local/domestic signal");
  }
  if (hasSignal(text, [/\b(disposable|single-use|single use|fast fashion)\b/])) {
    adjustment -= 10;
    labels.push("Disposable signal");
  }
  if (isCombustibleFuelProduct(text)) {
    adjustment -= 35;
    labels.push("Combustion/use emissions");
  }

  return { adjustment, labels };
}

function getEthicsScoreCap(text: string): { cap: number; reason?: string } {
  if (isCharcoalProduct(text)) {
    return { cap: 20, reason: "combustible charcoal cap 20" };
  }
  if (isCombustibleFuelProduct(text)) {
    return { cap: 15, reason: "combustible fuel cap 15" };
  }

  return { cap: 100 };
}

function buildEthicsAssessment(
  emissions: EmissionsResult,
  productData: ProductData,
  classification: ClassificationContext
): EthicsAssessment {
  const listingText = getListingText(productData);
  const origin = getOriginAssessment(emissions);
  const category = getCategoryRisk(classification.category || productData.category);
  const component = getComponentRisk(emissions.components);
  const listingSignals = getListingSignalAssessment(listingText);
  const componentCountryCount = new Set(Object.values(emissions.componentOrigins).flat()).size;
  const traceabilityAdjustment = classification.usedAI ? -5 : 0;
  const multiCountryAdjustment = componentCountryCount > 3 ? -4 : 0;
  const scoreCap = getEthicsScoreCap(listingText);
  const rawScore = clampScore(
    60 +
      origin.adjustment +
      category.adjustment +
      component.adjustment +
      listingSignals.adjustment +
      traceabilityAdjustment +
      multiCountryAdjustment
  );
  const score = Math.min(rawScore, scoreCap.cap);
  const confidenceLabel =
    emissions.originEstimate.confidence === "high"
      ? "High confidence"
      : emissions.originEstimate.confidence === "medium"
        ? "Medium confidence"
        : "Low confidence";
  const tags = [
    ...listingSignals.labels,
    origin.label,
    component.label,
    confidenceLabel,
  ].filter(Boolean).slice(0, 4);
  const details = [
    `Base 60`,
    `origin ${origin.adjustment >= 0 ? "+" : ""}${origin.adjustment}`,
    `category ${category.adjustment >= 0 ? "+" : ""}${category.adjustment}`,
    `materials ${component.adjustment >= 0 ? "+" : ""}${component.adjustment}`,
    `listing signals ${listingSignals.adjustment >= 0 ? "+" : ""}${listingSignals.adjustment}`,
    traceabilityAdjustment ? `AI inference ${traceabilityAdjustment}` : "",
    multiCountryAdjustment ? `multi-country components ${multiCountryAdjustment}` : "",
    scoreCap.reason ? scoreCap.reason : "",
  ].filter(Boolean).join("; ");

  return {
    score,
    tags,
    details,
  };
}

function buildDemoAnalysisData(
  emissions: EmissionsResult,
  productData: ProductData,
  classification: ClassificationContext
): DemoAnalysisData {
  const totalCarbon = emissions.totalEmissionsKg;
  const carbonPercent = Math.min(100, (totalCarbon / 20) * 100);
  const emissionsLevel =
    totalCarbon > 20 ? "High emissions" : totalCarbon > 10 ? "Medium emissions" : "Low emissions";
  const confidence = emissions.originEstimate.confidence;
  const equivalencies = buildEquivalencies(totalCarbon);
  const weightDescription = productData.weightKg
    ? "Provided by listing."
    : "Estimated from product category.";
  const hasScrapedComponents = hasComponents(productData.components);
  const componentList = emissions.components.join(", ") || "Unknown";
  const componentSource = classification.usedAI
    ? `Inferred by AI fallback${classification.aiConfidence ? ` (${classification.aiConfidence} confidence)` : ""}.`
    : hasScrapedComponents
      ? "Extracted from product description."
      : "Inferred from product category.";
  const sourceBasis = classification.usedAI
    ? "AI-inferred components"
    : hasScrapedComponents
      ? "description-based components"
      : "category-based components";
  const sourceParts = [
    `Estimated from ${sourceBasis}`,
    emissions.usePhaseEmissionsKg > 0 ? "combustion/use-phase impact" : "",
    `${confidence} origin inference`,
  ].filter(Boolean);
  const ethics = buildEthicsAssessment(emissions, productData, classification);
  const usePhaseAuditEntry = emissions.usePhaseEmissionsKg > 0
    ? [{
        title: "Use-phase emissions",
        value: `${emissions.usePhaseEmissionsKg.toFixed(1)} kg CO2e`,
        description: emissions.usePhaseDescription || "Estimated from expected emissions during product use.",
      }]
    : [];

  return {
    productTitle: productData.productName || productData.title,
    carbonKg: totalCarbon.toFixed(1),
    carbonPercent: Math.round(carbonPercent),
    emissionsLevel,
    alternativesCount: 0,
    drivingEquivalent: equivalencies.drivingEquivalent,
    treeGrowthEquivalent: equivalencies.treeGrowthEquivalent,
    phoneChargeEquivalent: equivalencies.phoneChargeEquivalent,
    source: sourceParts.join(", plus "),
    ethicsScore: ethics.score,
    ethicsTags: ethics.tags,
    deliverySpeed: buildShippingImpactLabel(emissions),
    deliveryIncrease: formatConfidenceLabel(confidence),
    deliveryNote: buildShippingEstimateNote(emissions),
    alternatives: [],
    auditTrail: [
      {
        title: "Item category",
        value: classification.category || productData.category || "Unknown",
        description: classification.usedAI
          ? `AI fallback selected this category${classification.aiSubcategory ? ` with subcategory: ${classification.aiSubcategory}` : ""}.`
          : "Used to infer a component breakdown and weight estimate.",
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
        description: emissions.originEstimate.confidence === "very low"
          ? "No fulfillment origin found; using a conservative fulfillment-network fallback."
          : "Calculated from origin and buyer coordinates.",
      },
      {
        title: "Production emissions",
        value: `${emissions.productionEmissionsKg.toFixed(1)} kg CO2e`,
        description: "Based on component count and assumed manufacturing factors.",
      },
      {
        title: "Shipping emissions",
        value: formatEmissionValue(emissions.shippingEmissionsKg),
        description: "Calculated as distance x weight x shipping factor.",
      },
      ...usePhaseAuditEntry,
      {
        title: "Equivalencies",
        value: `${equivalencies.drivingEquivalent}, ${equivalencies.phoneChargeEquivalent}`,
        description: equivalencies.auditDescription,
      },
      {
        title: "Ethics estimate",
        value: `${ethics.score}/100`,
        description: ethics.details,
      },
    ],
    savingsText: "",
    savingsAmount: "",
    savingsComparison: "",
  };
}

export function getDemoAnalysisData(productData: ProductData, buyerZip = DEFAULT_BUYER_ZIP): DemoAnalysisData {
  const classification = getClassificationFromScraper(productData);
  const emissions = buildEmissionsResultWithOrigin(
    productData,
    classification,
    getInitialOriginEstimate(productData),
    buyerZip
  );
  return buildDemoAnalysisData(emissions, productData, classification);
}

export async function calculateProductAnalysis(productData: ProductData, buyerZip = DEFAULT_BUYER_ZIP): Promise<DemoAnalysisData> {
  const classification = await getClassificationForEmissions(productData);
  const componentOrigins = getOriginsForComponents(classification.components);
  const originEstimate = await resolveShippingOrigin(productData, componentOrigins);
  const emissions = buildEmissionsResultWithOrigin(
    productData,
    classification,
    originEstimate,
    buyerZip
  );
  const analysis = buildDemoAnalysisData(emissions, productData, classification);
  const alternatives = await generateAlternativesWithAI(productData, {
    carbonKg: analysis.carbonKg,
    emissionsLevel: analysis.emissionsLevel,
    ethicsScore: analysis.ethicsScore,
    category: classification.category,
    components: emissions.components,
  });

  if (!alternatives || alternatives.length === 0) {
    return analysis;
  }

  return {
    ...analysis,
    alternatives,
    alternativesCount: alternatives.length,
    ...(() => {
      const alternativeCarbonValues = alternatives
        .map((alternative) => parseCarbonKg(alternative.carbon))
        .filter((value): value is number => value !== null);
      const lowestAlternativeCarbon = Math.min(...alternativeCarbonValues);
      const savingsKg = Number.isFinite(lowestAlternativeCarbon)
        ? emissions.totalEmissionsKg - lowestAlternativeCarbon
        : 0;

      if (savingsKg <= 0) {
        return {
          savingsText: "",
          savingsAmount: "",
          savingsComparison: "",
        };
      }

      return {
        savingsText: "Best linked option may save ~",
        savingsAmount: `${savingsKg.toFixed(1)} kg CO2`,
        savingsComparison: ` - like not driving ${Math.max(1, Math.round(savingsKg * 2))} miles`,
      };
    })(),
  };
}
