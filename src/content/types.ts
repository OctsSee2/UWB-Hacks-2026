export type ProductData = {
  title: string;
  productName: string;
  price: string;
  brand: string;
  category: string;
  seller: string;
  shipsFrom: string | null;
  itemLocation: string;
  deliveryText: string;
  retailer: string;
  imageUrl: string;
  shipping: string;
  description: string;
  url: string;
  domain: string;
  ingredients: string;
  country: string | null;
  componentCountry: string | null;
  shippingZipcode: string;
  weightKg: number | null;
  components?: string[];
  componentOrigins?: Record<string, string[]>;
  originEstimate?: OriginEstimate;
  distanceMiles?: number;
};

export type ScrapedProduct = ProductData;

export type ProductComponents = {
  category: string;
  components: string[];
};

export type OriginType = "zip" | "cityState" | "seller" | "retailer" | "country";

export type ConfidenceLevel = "high" | "medium" | "low" | "very low";

export type OriginEstimate = {
  origin: string;
  originType: OriginType;
  confidence: ConfidenceLevel;
  zip?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

export type EmissionsResult = {
  components: string[];
  componentOrigins: Record<string, string[]>;
  originEstimate: OriginEstimate;
  weightKg: number;
  distanceMiles: number;
  emissionFactor: number;
  productionEmissionsKg: number;
  shippingEmissionsKg: number;
  totalEmissionsKg: number;
};

export type AuditEntry = {
  title: string;
  value: string;
  description?: string;
};

export type Alternative = {
  name: string;
  maker: string;
  carbon: string;
  ethics: string;
  price: string;
  tags: string;
};

export type ImpactStats = {
  savedKg: string;
  nextMilestone: string;
  progress: number;
  milesNotDriven: string;
  dayStreak: string;
  treesWorth: string;
  purchasesSwitched: string;
  flightAmount: string;
  flightLabel: string;
};

export type DemoAnalysisData = {
  productTitle: string;
  carbonKg: string;
  carbonPercent: number;
  emissionsLevel: string;
  alternativesCount: number;
  drivingEquivalent: string;
  treeGrowthEquivalent: string;
  phoneChargeEquivalent: string;
  source: string;
  ethicsScore: number;
  ethicsTags: string[];
  deliverySpeed: string;
  deliveryIncrease: string;
  deliveryNote: string;
  alternatives: Alternative[];
  auditTrail: AuditEntry[];
  savingsText: string;
  savingsAmount: string;
  savingsComparison: string;
  impact: ImpactStats;
};

export type ViewName = "analysis" | "alternatives" | "impact" | "onboarding";
