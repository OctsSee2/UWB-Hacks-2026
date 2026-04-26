import {
  brandSelectors,
  categorySelectors,
  componentCountrySelectors,
  countrySelectors,
  deliveryTextSelectors,
  descriptionSelectors,
  imageSelectors,
  ingredientsSelectors,
  itemLocationSelectors,
  priceSelectors,
  sellerSelectors,
  shipsFromSelectors,
  shippingSelectors,
  shippingZipcodeSelectors,
  weightSelectors,
} from "./config";
import { getImage, getText } from "./utils";
import type { ProductData } from "./types";

export function getProductTitle(): string {
  return (
    document.querySelector("#productTitle")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title
  );
}

function getCategory(): string {
  return getText(categorySelectors);
}

function getSeller(): string {
  const text = getText(sellerSelectors);
  const match = text.match(/sold by\s+([^.,\n]+)/i);
  return match ? match[1].trim() : text;
}

function getItemLocation(): string {
  const text = getText(itemLocationSelectors);
  if (text) return text;

  const bodyText = document.body.textContent || "";
  const match = bodyText.match(/item location[:\s]+([^\n]+)/i);
  return match ? match[1].trim() : "";
}

function getDeliveryText(): string {
  return getText(deliveryTextSelectors) || getText(shippingSelectors);
}

function getCountry(): string | null {
  const text = getText(countrySelectors) || document.body.textContent || "";
  const match = text.match(/made in\s+([A-Za-z\s]+)/i) || text.match(/country.*?:\s*([A-Za-z\s]+)/i);
  return match ? match[1].trim() : null;
}

function getComponentCountry(): string | null {
  const text = getText(componentCountrySelectors) || document.body.textContent || "";
  const match = text.match(/components from\s+([A-Za-z\s]+)/i) || text.match(/origin.*?:\s*([A-Za-z\s]+)/i);
  return match ? match[1].trim() : null;
}

function extractComponentsFromDescription(description: string): string[] {
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

function getShippingZipcode(): string {
  const text = getText(shippingZipcodeSelectors);
  const fromSelector = extractZip(text);
  if (fromSelector) return fromSelector;

  const bodyText = document.body.textContent || "";
  return extractZip(bodyText) || "";
}

function getWeightKg(): number | null {
  const text = getText(weightSelectors) || document.body.textContent || "";
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  return unit.startsWith("lb") ? value * 0.453592 : value;
}

function getShipsFrom(): string | null {
  const bodyText = document.body.textContent || "";
  const shipMatch = bodyText.match(/ships from\s+([^.,\n]+)/i);
  if (shipMatch) return shipMatch[1].trim();

  const text = getText(shipsFromSelectors);
  const match = text.match(/ships from\s+([^.,\n]+)/i);
  return match ? match[1].trim() : null;
}

function getRetailer(): string {
  return window.location.hostname.replace(/^www\./, "");
}

export function scrapeProductData(): ProductData {
  const productName = getProductTitle().trim() || "Unknown Title";
  const title = productName;
  const brand = getText(brandSelectors).trim();
  const category = getCategory().trim();
  const seller = getSeller().trim();
  const shipsFrom = getShipsFrom();
  const itemLocation = getItemLocation().trim();
  const deliveryText = getDeliveryText().trim();
  const retailer = getRetailer();
  const shipping = getText(shippingSelectors).trim();
  const description = getText(descriptionSelectors).trim();
  const components = extractComponentsFromDescription(description);
  const imageUrl = getImage(imageSelectors);
  const ingredients = getText(ingredientsSelectors).trim();
  const country = getCountry();
  const componentCountry = getComponentCountry();
  const shippingZipcode = getShippingZipcode();
  const weightKg = getWeightKg();

  return {
    productName,
    title,
    price: getText(priceSelectors).trim(),
    brand,
    category,
    seller,
    shipsFrom,
    itemLocation,
    deliveryText,
    retailer,
    imageUrl,
    shipping,
    description,
    url: window.location.href,
    domain: window.location.hostname,
    ingredients,
    country,
    componentCountry,
    shippingZipcode,
    weightKg,
    components,
  };
}

