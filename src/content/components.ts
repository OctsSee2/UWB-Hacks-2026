export const categoryComponentsMap: Record<string, string[]> = {
  laptop: ["battery", "display", "processor", "casing", "packaging"],
  notebook: ["battery", "display", "processor", "casing", "packaging"],
  tablet: ["battery", "display", "processor", "casing", "packaging"],
  phone: ["battery", "display", "processor", "casing", "packaging"],
  smartphone: ["battery", "display", "processor", "casing", "packaging"],
  camera: ["battery", "lens", "sensor", "casing", "packaging"],
  headphones: ["speaker", "cable", "cushion", "casing", "packaging"],
  backpack: ["fabric", "thread", "metal", "plastic", "packaging"],
  bag: ["fabric", "thread", "metal", "plastic", "packaging"],
  shoes: ["upper", "sole", "lace", "insole", "packaging"],
  clothing: ["fabric", "thread", "buttons", "label", "packaging"],
  furniture: ["wood", "metal", "plastic", "cushion", "packaging"],
  appliance: ["motor", "casing", "electronics", "wiring", "packaging"],
  tv: ["casing", "display", "electronics", "wiring", "packaging"],
  television: ["casing", "display", "electronics", "wiring", "packaging"],
};

const defaultComponents = ["packaging", "casing", "electronics"];

export function getComponentsForCategory(category: string): string[] {
  const normalized = category.trim().toLowerCase();
  if (!normalized) return defaultComponents;

  for (const key of Object.keys(categoryComponentsMap)) {
    if (normalized.includes(key)) {
      return categoryComponentsMap[key];
    }
  }

  return defaultComponents;
}
