import type { ProductData } from "./types";
import { getCurrentScraper, isSupportedProductPage } from "./scrapers";

export function getProductTitle(): string {
  return getCurrentScraper().getProductTitle();
}

export function scrapeProductData(): ProductData {
  return getCurrentScraper().scrapeProductData();
}

export { getCurrentScraper, isSupportedProductPage };

const SCRAPER_REQUEST_MESSAGE = "__carbonCartScrapeProductDataRequest";
const SCRAPER_RESPONSE_MESSAGE = "__carbonCartScrapeProductDataResponse";

window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    event.origin !== window.location.origin ||
    !event.data ||
    event.data.type !== SCRAPER_REQUEST_MESSAGE
  ) {
    return;
  }

  const data = scrapeProductData();
  window.postMessage({ type: SCRAPER_RESPONSE_MESSAGE, payload: data }, window.location.origin);
});
