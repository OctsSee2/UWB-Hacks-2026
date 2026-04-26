import type { OriginEstimate, ScrapedProduct } from "./types";

const DEFAULT_COORDINATES = { latitude: 39.8283, longitude: -98.5795 };
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const ZIPPOTAMPO_BASE = "https://api.zippopotam.us/us";

const retailerFallbacks: Record<string, { origin: string; latitude: number; longitude: number }> = {
  "amazon.com": { origin: "Amazon logistics hub, Seattle, WA", latitude: 47.6062, longitude: -122.3321 },
  "target.com": { origin: "Target distribution center, Minneapolis, MN", latitude: 44.9778, longitude: -93.2650 },
  "walmart.com": { origin: "Walmart headquarters, Bentonville, AR", latitude: 36.3729, longitude: -94.2088 },
};

const stateCoordinates: Record<string, { latitude: number; longitude: number }> = {
  AL: { latitude: 32.3182, longitude: -86.9023 },
  AK: { latitude: 64.2008, longitude: -149.4937 },
  AZ: { latitude: 34.0489, longitude: -111.0937 },
  AR: { latitude: 34.9697, longitude: -92.3731 },
  CA: { latitude: 36.7783, longitude: -119.4179 },
  CO: { latitude: 39.1130, longitude: -105.3589 },
  CT: { latitude: 41.6032, longitude: -73.0877 },
  DE: { latitude: 38.9108, longitude: -75.5277 },
  FL: { latitude: 27.9944, longitude: -81.7603 },
  GA: { latitude: 32.1656, longitude: -82.9001 },
  HI: { latitude: 19.8968, longitude: -155.5828 },
  ID: { latitude: 44.0682, longitude: -114.7420 },
  IL: { latitude: 40.6331, longitude: -89.3985 },
  IN: { latitude: 40.2672, longitude: -86.1349 },
  IA: { latitude: 41.8780, longitude: -93.0977 },
  KS: { latitude: 39.0119, longitude: -98.4842 },
  KY: { latitude: 37.8393, longitude: -84.2700 },
  LA: { latitude: 31.2448, longitude: -92.1450 },
  ME: { latitude: 45.2538, longitude: -69.4455 },
  MD: { latitude: 39.0458, longitude: -76.6413 },
  MA: { latitude: 42.4072, longitude: -71.3824 },
  MI: { latitude: 44.3148, longitude: -85.6024 },
  MN: { latitude: 46.7296, longitude: -94.6859 },
  MS: { latitude: 32.3547, longitude: -89.3985 },
  MO: { latitude: 37.9643, longitude: -91.8318 },
  MT: { latitude: 46.8797, longitude: -110.3626 },
  NE: { latitude: 41.4925, longitude: -99.9018 },
  NV: { latitude: 38.8026, longitude: -116.4194 },
  NH: { latitude: 43.1939, longitude: -71.5724 },
  NJ: { latitude: 40.0583, longitude: -74.4057 },
  NM: { latitude: 34.9727, longitude: -105.0324 },
  NY: { latitude: 40.7128, longitude: -74.0060 },
  NC: { latitude: 35.7596, longitude: -79.0193 },
  ND: { latitude: 47.5515, longitude: -101.0020 },
  OH: { latitude: 40.4173, longitude: -82.9071 },
  OK: { latitude: 35.0078, longitude: -97.0929 },
  OR: { latitude: 43.8041, longitude: -120.5542 },
  PA: { latitude: 41.2033, longitude: -77.1945 },
  RI: { latitude: 41.5801, longitude: -71.4774 },
  SC: { latitude: 33.8361, longitude: -81.1637 },
  SD: { latitude: 43.9695, longitude: -99.9018 },
  TN: { latitude: 35.5175, longitude: -86.5804 },
  TX: { latitude: 31.9686, longitude: -99.9018 },
  UT: { latitude: 39.3210, longitude: -111.0937 },
  VT: { latitude: 44.5588, longitude: -72.5778 },
  VA: { latitude: 37.4316, longitude: -78.6569 },
  WA: { latitude: 47.7511, longitude: -120.7401 },
  WV: { latitude: 38.5976, longitude: -80.4549 },
  WI: { latitude: 43.7844, longitude: -88.7879 },
  WY: { latitude: 43.0759, longitude: -107.2903 },
};

const stateNameToCode: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

const countryCoordinates: Record<string, { latitude: number; longitude: number }> = {
  china: { latitude: 31.2304, longitude: 121.4737 },
  "south korea": { latitude: 37.5665, longitude: 126.9780 },
  taiwan: { latitude: 25.0330, longitude: 121.5654 },
  vietnam: { latitude: 21.0278, longitude: 105.8342 },
  bangladesh: { latitude: 23.6850, longitude: 90.3563 },
  usa: { latitude: 39.8283, longitude: -98.5795 },
};

function buildEstimate(
  origin: string,
  originType: OriginEstimate["originType"],
  confidence: OriginEstimate["confidence"],
  latitude: number,
  longitude: number,
  zip?: string,
  country?: string
): OriginEstimate {
  return {
    origin,
    originType,
    confidence,
    latitude,
    longitude,
    zip,
    country,
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function geocodeZip(zip: string): Promise<{ latitude: number; longitude: number }> {
  const result = await fetchJson<{ places: Array<{ "latitude": string; "longitude": string }> }>(`${ZIPPOTAMPO_BASE}/${zip}`);
  const place = result?.places?.[0];
  if (!place) {
    return DEFAULT_COORDINATES;
  }
  return {
    latitude: parseFloat(place.latitude),
    longitude: parseFloat(place.longitude),
  };
}

async function geocodeText(text: string): Promise<{ latitude: number; longitude: number } | null> {
  const query = encodeURIComponent(text);
  const url = `${NOMINATIM_BASE}?format=json&limit=1&q=${query}`;
  const result = await fetchJson<Array<{ lat: string; lon: string }>>(url);
  const match = result?.[0];
  if (!match) return null;
  return {
    latitude: parseFloat(match.lat),
    longitude: parseFloat(match.lon),
  };
}

function parseCityState(text: string): { city: string; state: string } | null {
  const match = text.match(/([A-Za-z ]+),\s*([A-Za-z]{2})\b/);
  if (match) {
    return { city: match[1].trim(), state: match[2].toUpperCase() };
  }

  const fullNameMatch = text.match(/([A-Za-z ]+)\s+(?:state|city)\s*[:\-]\s*([A-Za-z ]+)/i);
  if (fullNameMatch) {
    const stateName = fullNameMatch[2].trim().toLowerCase();
    const stateCode = stateNameToCode[stateName];
    if (stateCode) {
      return { city: fullNameMatch[1].trim(), state: stateCode };
    }
  }

  return null;
}

function getRetailerFallback(domain: string): OriginEstimate {
  const fallback = retailerFallbacks[domain] ?? retailerFallbacks["amazon.com"];
  return buildEstimate(
    fallback.origin,
    "retailer",
    "low",
    fallback.latitude,
    fallback.longitude,
    undefined,
    "USA"
  );
}

function getCountryFallback(country: string): OriginEstimate {
  const key = country.trim().toLowerCase();
  const coords = countryCoordinates[key] ?? DEFAULT_COORDINATES;
  return buildEstimate(country, "country", "very low", coords.latitude, coords.longitude, undefined, country);
}

function getMostLikelyComponentCountry(componentOrigins: Record<string, string[]>): string | null {
  const counts = Object.values(componentOrigins).flat().reduce<Record<string, number>>((acc, country) => {
    acc[country] = (acc[country] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

export async function resolveShippingOrigin(
  product: ScrapedProduct,
  componentOrigins: Record<string, string[]>
): Promise<OriginEstimate> {
  if (product.shippingZipcode) {
    const coords = await geocodeZip(product.shippingZipcode);
    return buildEstimate(
      `Zip ${product.shippingZipcode}`,
      "zip",
      "high",
      coords.latitude,
      coords.longitude,
      product.shippingZipcode,
      product.country ?? "USA"
    );
  }

  const textSources = [product.itemLocation, product.shipsFrom ?? "", product.deliveryText];
  for (const text of textSources) {
    const parsed = parseCityState(text);
    if (parsed) {
      const coords = stateCoordinates[parsed.state] ?? DEFAULT_COORDINATES;
      return buildEstimate(
        `${parsed.city}, ${parsed.state}`,
        "cityState",
        "medium",
        coords.latitude,
        coords.longitude,
        undefined,
        undefined
      );
    }
  }

  const searchText = [product.shipsFrom, product.itemLocation, product.deliveryText, product.seller]
    .filter(Boolean)
    .join(" ");

  if (searchText) {
    const coords = await geocodeText(searchText);
    if (coords) {
      return buildEstimate(
        searchText,
        "seller",
        "medium",
        coords.latitude,
        coords.longitude
      );
    }
  }

  if (product.retailer) {
    return getRetailerFallback(product.retailer);
  }

  const fallbackCountry = product.country || getMostLikelyComponentCountry(componentOrigins);
  if (fallbackCountry) {
    return getCountryFallback(fallbackCountry);
  }

  return buildEstimate("United States", "retailer", "low", DEFAULT_COORDINATES.latitude, DEFAULT_COORDINATES.longitude, undefined, "USA");
}
