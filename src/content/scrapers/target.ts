import { getDefaultProductTitle, scrapeWithSelectors } from "./shared";
import type { ProductScraper, SelectorSet } from "./types";

const targetSelectors: SelectorSet = {
  brand: [
    "[data-test='product-brand']",
    "[data-test='product-title'] a",
    ".ProductDetails-title a",
  ],
  category: [
    "nav[aria-label='breadcrumb'] a:last-child",
    "[data-test='breadcrumb'] a:last-child",
    "a[href*='/c/']:last-child",
  ],
  componentCountry: [
    "[data-test='item-details']",
    "[data-test='product-details']",
  ],
  country: [
    "[data-test='item-details']",
    "[data-test='product-details']",
  ],
  deliveryText: [
    "[data-test='fulfillment-cell-shipping']",
    "[data-test='shippingBlock']",
    "[data-test='deliveryText']",
  ],
  description: [
    "[data-test='item-details-description']",
    "[data-test='product-description']",
    "[data-test='item-details']",
  ],
  image: [
    "[data-test='product-image'] img",
    "picture img",
    "img[alt][src*='target.scene7.com']",
  ],
  ingredients: [
    "[data-test='ingredients']",
    "[data-test='item-details']",
  ],
  itemLocation: [
    "[data-test='fulfillment-cell-shipping']",
    "[data-test='shippingBlock']",
  ],
  price: [
    "[data-test='product-price']",
    "[data-test='current-price']",
    "[data-test='price']",
  ],
  seller: [
    "[data-test='sold-by']",
    "[data-test='seller-name']",
  ],
  shipsFrom: [
    "[data-test='fulfillment-cell-shipping']",
    "[data-test='shippingBlock']",
  ],
  shipping: [
    "[data-test='fulfillment-cell-shipping']",
    "[data-test='shippingBlock']",
  ],
  shippingZipcode: [
    "[data-test='fulfillment-cell-shipping']",
    "[data-test='shippingBlock']",
  ],
  title: [
    "[data-test='product-title']",
    "h1",
  ],
  weight: [
    "[data-test='item-details']",
    "[data-test='product-specifications']",
  ],
};

export const targetScraper: ProductScraper = {
  id: "target",
  hostMatches: (host) => host.includes("target.com"),
  isProductPage: () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("/p/")) return true;

    return Boolean(
      document.querySelector("[data-test='product-title'], [data-test='addToCartButton']")
    );
  },
  getProductTitle: () => getDefaultProductTitle(targetSelectors.title),
  scrapeProductData: () => scrapeWithSelectors(targetSelectors),
};
