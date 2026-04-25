export type ProductData = {
  title: string;
  price: string;
  brand: string;
  category: string;
  imageUrl: string;
  shipping: string;
  description: string;
  url: string;
  domain: string;
};

export type Alternative = {
  name: string;
  maker: string;
  carbon: string;
  ethics: string;
  price: string;
  tags: string;
};

export type ProductType = "clothing" | "other";
export type MarketSegment = "fast-fashion" | "mainstream" | "secondhand";
export type BackendMode = "api-aggregator" | "mock-local";
export type ApiPipelineStage =
  | "catalog-classifier"
  | "lifecycle-emissions-api"
  | "shipping-emissions-api"
  | "supply-chain-risk-api";

export type DemoAgentProfile = {
  productTypes: ProductType[];
  marketSegments: MarketSegment[];
  purpose: string;
  deepResearchEnabled: boolean;
  backendMode: BackendMode;
  apiPipeline: ApiPipelineStage[];
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
  productType: ProductType;
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
  savingsText: string;
  savingsAmount: string;
  savingsComparison: string;
  agentProfile: DemoAgentProfile;
  impact: ImpactStats;
};

export type ViewName = "analysis" | "alternatives" | "impact" | "onboarding";
