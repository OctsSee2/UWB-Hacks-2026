import { getDefaultProductTitle, scrapeWithSelectors } from "./shared";
import type { ProductScraper, SelectorSet } from "./types";

const walmartSelectors: SelectorSet = {
  brand: [
    "[data-testid='product-brand']",
    "a[href*='/brand/']",
    "[itemprop='brand']",
  ],
  category: [
    "nav[aria-label='breadcrumb'] a:last-child",
    "[data-testid='breadcrumb'] a:last-child",
    "ol li a:last-child",
  ],
  componentCountry: [
    "[data-testid='product-specifications']",
    "[data-testid='product-description']",
  ],
  country: [
    "[data-testid='product-specifications']",
    "[data-testid='product-description']",
  ],
  deliveryText: [
    "[data-testid='fulfillment-shipping-text']",
    "[data-testid='shipping-delivery-date']",
    "[data-automation-id='fulfillment-shipping-text']",
  ],
  description: [
    "[data-testid='product-description']",
    "[data-automation-id='product-description']",
    "[itemprop='description']",
  ],
  image: [
    "[data-testid='hero-image'] img",
    "img[data-testid='productTileImage']",
    "img[loading='eager']",
  ],
  ingredients: [
    "[data-testid='product-specifications']",
    "[data-testid='product-description']",
  ],
  itemLocation: [
    "[data-testid='fulfillment-shipping-text']",
    "[data-automation-id='fulfillment-shipping-text']",
  ],
  price: [
    "[itemprop='price']",
    "[data-testid='price-wrap']",
    "[data-automation-id='product-price']",
  ],
  seller: [
    "[data-testid='seller-name']",
    "[data-automation-id='seller-name']",
    "[data-testid='product-seller-info']",
  ],
  shipsFrom: [
    "[data-testid='fulfillment-shipping-text']",
    "[data-automation-id='fulfillment-shipping-text']",
  ],
  shipping: [
    "[data-testid='fulfillment-shipping-text']",
    "[data-automation-id='fulfillment-shipping-text']",
  ],
  shippingZipcode: [
    "[data-testid='fulfillment-shipping-text']",
    "[data-automation-id='fulfillment-shipping-text']",
  ],
  title: [
    "[itemprop='name']",
    "h1",
  ],
  weight: [
    "[data-testid='product-specifications']",
    "[data-testid='product-description']",
  ],
};

export const walmartScraper: ProductScraper = {
  id: "walmart",
  hostMatches: (host) => host.includes("walmart.com"),
  isProductPage: () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("/ip/")) return true;

    return Boolean(
      document.querySelector("[itemprop='name'], [data-automation-id='add-to-cart-button']")
    );
  },
  getProductTitle: () => getDefaultProductTitle(walmartSelectors.title),
  scrapeProductData: () => scrapeWithSelectors(walmartSelectors),
};
