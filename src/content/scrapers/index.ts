import { amazonScraper } from "./amazon";
import { getDefaultProductTitle, scrapeWithSelectors } from "./shared";
import { targetScraper } from "./target";
import type { ProductScraper, SelectorSet } from "./types";
import { walmartScraper } from "./walmart";

const genericSelectors: SelectorSet = {
  brand: [".brand", "[itemprop='brand']"],
  category: [".breadcrumb li:last-child", "[data-test='breadcrumb'] a:last-child", ".category"],
  componentCountry: [".component-origin", ".product-details", "[itemprop='description']"],
  country: [".country-of-origin", ".product-details", "[itemprop='description']"],
  deliveryText: [".delivery-message", ".shipping", "[data-test*='delivery']"],
  description: ["[itemprop='description']", ".description", "#productDescription"],
  image: ["[itemprop='image']", "main img", "img"],
  ingredients: [".ingredients", ".product-details", "[itemprop='description']"],
  itemLocation: [".item-location", ".shipping", ".product-details"],
  price: ["[itemprop='price']", ".price", "[data-test*='price']"],
  seller: [".seller", "[data-test*='seller']", "#merchant-info"],
  shipsFrom: [".shipping", ".delivery-message", ".product-details"],
  shipping: [".shipping", ".delivery-message", "[data-test*='shipping']"],
  shippingZipcode: [".shipping", ".delivery-message", ".product-details"],
  title: ["[itemprop='name']", "h1"],
  weight: [".product-weight", ".product-details", "[itemprop='description']"],
};

const genericScraper: ProductScraper = {
  id: "generic",
  hostMatches: () => true,
  isProductPage: () => Boolean(document.querySelector("[itemprop='name'], h1")),
  getProductTitle: () => getDefaultProductTitle(genericSelectors.title),
  scrapeProductData: () => scrapeWithSelectors(genericSelectors),
};

export const platformScrapers: ProductScraper[] = [
  amazonScraper,
  targetScraper,
  walmartScraper,
];

export function getCurrentScraper(): ProductScraper {
  const host = window.location.hostname;
  return platformScrapers.find((scraper) => scraper.hostMatches(host)) ?? genericScraper;
}

export function isSupportedProductPage(): boolean {
  return getCurrentScraper().isProductPage();
}
