import {
  brandSelectors,
  descriptionSelectors,
  imageSelectors,
  priceSelectors,
  shippingSelectors,
} from "./config";
import { getImage, getText } from "./utils";
import type { ProductData } from "./types";

export function getPrice(): string {
  return getText(priceSelectors);
}

export function getProductTitle(): string {
  return (
    document.querySelector("#productTitle")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title
  );
}

export function scrapeProductData(): ProductData {
  // Real scraped data from the visible product page.
  const title = getProductTitle();
  const brand = getText(brandSelectors);
  const shipping = getText(shippingSelectors);
  const description = getText(descriptionSelectors);
  const imageUrl = getImage(imageSelectors);

  return {
    title,
    price: getPrice(),
    brand,
    category: "",
    imageUrl,
    shipping,
    description,
    url: window.location.href,
    domain: window.location.hostname,
  };
}
