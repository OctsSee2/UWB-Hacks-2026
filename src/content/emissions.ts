import type { DemoAnalysisData, ProductData } from "./types";

export function getDemoAnalysisData(productData: ProductData): DemoAnalysisData {
  return {
    // Real scraped product data.
    productTitle: productData.title,
    productType: "clothing",

    // Fake demo analysis data for the hackathon prototype.
    carbonKg: "18.2",
    carbonPercent: 84,
    emissionsLevel: "High emissions",
    alternativesCount: 3,
    drivingEquivalent: "41 miles driven",
    treeGrowthEquivalent: "4 months tree growth",
    phoneChargeEquivalent: "9 phone charges",
    source: "Estimated from apparel lifecycle and shipping-impact research",
    ethicsScore: 29,
    ethicsTags: [
      "Ultra-fast-fashion risk",
      "Opaque labor reporting",
      "Air shipped",
    ],
    deliverySpeed: "Same-day",
    deliveryIncrease: "+45%",
    deliveryNote:
      "Same-day adds ~45% more CO2 vs standard, a common fast-fashion pattern on large marketplaces like Shein and Amazon.",
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
    savingsAmount: "14.8 kg CO2",
    savingsComparison: " - like not driving 33 miles",
    agentProfile: {
      productTypes: ["clothing"],
      marketSegments: ["fast-fashion"],
      purpose:
        "Help shoppers move away from fast-fashion purchases (for example Shein and Amazon listings) toward lower-emission, higher-ethics clothing alternatives.",
      deepResearchEnabled: true,
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
