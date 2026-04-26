import { getImage, getText } from "../utils";
import type { ProductData } from "../types";
import type { SelectorSet } from "./types";

export function queryText(selectors: string[]): string {
  return getText(selectors).trim();
}

export function getDefaultProductTitle(selectors: string[] = []): string {
  return (
    queryText(selectors) ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title
  );
}

function getSeller(selectors: string[]): string {
  const text = queryText(selectors);
  const match = text.match(/sold by\s+([^.,\n]+)/i);
  return match ? match[1].trim() : text;
}

function getItemLocation(selectors: string[]): string {
  const text = queryText(selectors);
  if (text) return text;

  const bodyText = document.body.textContent || "";
  const match = bodyText.match(/item location[:\s]+([^\n]+)/i);
  return match ? match[1].trim() : "";
}

function getDeliveryText(selectors: string[], shippingSelectors: string[]): string {
  return queryText(selectors) || queryText(shippingSelectors);
}

function getCountry(selectors: string[]): string | null {
  const text = queryText(selectors) || document.body.textContent || "";
  const match =
    text.match(/made in\s+([A-Za-z\s]+)/i) ||
    text.match(/country.*?:\s*([A-Za-z\s]+)/i);
  return match ? match[1].trim() : null;
}

function getComponentCountry(selectors: string[]): string | null {
  const text = queryText(selectors) || document.body.textContent || "";
  const match =
    text.match(/components from\s+([A-Za-z\s]+)/i) ||
    text.match(/origin.*?:\s*([A-Za-z\s]+)/i);
  return match ? match[1].trim() : null;
}

export function extractComponentsFromDescription(description: string): string[] {
  const text = description.toLowerCase();
  if (!text) return [];

  const mapping: Record<string, string> = {
    polyester: "fabric",
    nylon: "fabric",
    cotton: "fabric",
    canvas: "fabric",
    leather: "fabric",
    denim: "fabric",
    wool: "fabric",
    brass: "metal",
    aluminum: "metal",
    aluminium: "metal",
    steel: "metal",
    copper: "metal",
    iron: "metal",
    titanium: "metal",
    grommet: "metal",
    metal: "metal",
    plastic: "plastic",
    polypropylene: "plastic",
    polyethylene: "plastic",
    pvc: "plastic",
    acrylic: "plastic",
    wood: "wood",
    bamboo: "wood",
    battery: "battery",
    display: "display",
    processor: "processor",
    chip: "processor",
    lens: "lens",
    sensor: "sensor",
    speaker: "speaker",
    cable: "cable",
    cord: "cable",
    cushion: "cushion",
    upper: "upper",
    sole: "sole",
    lace: "lace",
    insole: "insole",
    thread: "thread",
    buttons: "buttons",
    label: "label",
    motor: "motor",
    electronics: "electronics",
    wiring: "electronics",
    charger: "electronics",
    circuitry: "electronics",
    packaging: "packaging",
    casing: "casing",
    shell: "casing",
  };

  const pattern = new RegExp(`\\b(${Object.keys(mapping).join("|")})(?:s|es)?\\b`, "gi");
  const components = new Set<string>();

  for (const match of text.matchAll(pattern)) {
    const term = match[1].toLowerCase();
    const component = mapping[term];
    if (component) {
      components.add(component);
    }
  }

  if (components.size > 0 && !components.has("packaging")) {
    components.add("packaging");
  }

  return Array.from(components);
}

function extractZip(text: string): string | null {
  const match = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

function isDeliveryDestinationText(text: string): boolean {
  return /\b(deliver to|delivering to|ship to|shipping to|your location|choose location|update location)\b/i.test(text);
}

function isOriginZipText(text: string): boolean {
  return /\b(ships from|shipping from|item location|origin|warehouse|fulfilled from)\b/i.test(text);
}

function getShippingZipcode(selectors: string[]): string {
  const text = queryText(selectors);
  const fromSelector = extractZip(text);
  if (fromSelector && isOriginZipText(text) && !isDeliveryDestinationText(text)) {
    return fromSelector;
  }

  const bodyText = document.body.textContent || "";
  const originMatch = bodyText.match(
    /\b(?:ships from|shipping from|item location|origin|warehouse|fulfilled from)\b[^\n]{0,120}?\b(\d{5})(?:-\d{4})?\b/i
  );

  return originMatch?.[1] || "";
}

function getWeightKg(selectors: string[]): number | null {
  const text = queryText(selectors) || document.body.textContent || "";
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  return unit.startsWith("lb") ? value * 0.453592 : value;
}

function getShipsFrom(selectors: string[]): string | null {
  const bodyText = document.body.textContent || "";
  const shipMatch = bodyText.match(/ships from\s+([^.,\n]+)/i);
  if (shipMatch) return shipMatch[1].trim();

  const text = queryText(selectors);
  const match = text.match(/ships from\s+([^.,\n]+)/i);
  return match ? match[1].trim() : null;
}

function getRetailer(): string {
  return window.location.hostname.replace(/^www\./, "");
}

export function scrapeWithSelectors(selectors: SelectorSet): ProductData {
  const productName = getDefaultProductTitle(selectors.title).trim() || "Unknown Title";
  const description = queryText(selectors.description);

  return {
    productName,
    title: productName,
    price: queryText(selectors.price),
    brand: queryText(selectors.brand),
    category: queryText(selectors.category),
    seller: getSeller(selectors.seller),
    shipsFrom: getShipsFrom(selectors.shipsFrom),
    itemLocation: getItemLocation(selectors.itemLocation),
    deliveryText: getDeliveryText(selectors.deliveryText, selectors.shipping),
    retailer: getRetailer(),
    imageUrl: getImage(selectors.image),
    shipping: queryText(selectors.shipping),
    description,
    url: window.location.href,
    domain: window.location.hostname,
    ingredients: queryText(selectors.ingredients),
    country: getCountry(selectors.country),
    componentCountry: getComponentCountry(selectors.componentCountry),
    shippingZipcode: getShippingZipcode(selectors.shippingZipcode),
    weightKg: getWeightKg(selectors.weight),
    components: extractComponentsFromDescription(description),
  };
}
