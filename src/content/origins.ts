export const componentOriginMap: Record<string, string[]> = {
  battery: ["China", "South Korea"],
  display: ["China", "Taiwan"],
  processor: ["Taiwan", "South Korea"],
  casing: ["China", "Vietnam"],
  packaging: ["China", "USA"],
  lens: ["Japan", "China"],
  sensor: ["China", "Japan"],
  speaker: ["China", "Vietnam"],
  cable: ["China", "Malaysia"],
  cushion: ["Vietnam", "China"],
  upper: ["Vietnam", "China"],
  sole: ["Vietnam", "China"],
  lace: ["China", "Vietnam"],
  insole: ["China", "Vietnam"],
  fabric: ["Bangladesh", "Vietnam"],
  thread: ["China", "India"],
  buttons: ["China", "India"],
  label: ["China", "India"],
  wood: ["Canada", "USA"],
  metal: ["China", "Germany"],
  plastic: ["China", "USA"],
  motor: ["China", "Germany"],
  electronics: ["China", "Taiwan"],
};

export function getOriginsForComponents(components: string[]): Record<string, string[]> {
  return components.reduce<Record<string, string[]>>((result, component) => {
    result[component] = componentOriginMap[component] ?? ["China"];
    return result;
  }, {});
}

export function getMostLikelyComponentCountry(componentOrigins: Record<string, string[]>): string | null {
  const countryCounts = Object.values(componentOrigins).flat().reduce<Record<string, number>>((counts, country) => {
    counts[country] = (counts[country] ?? 0) + 1;
    return counts;
  }, {});

  const sorted = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}
