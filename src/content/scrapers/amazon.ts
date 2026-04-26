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
} from "../config";
import { getDefaultProductTitle, scrapeWithSelectors } from "./shared";
import type { ProductScraper, SelectorSet } from "./types";

const amazonSelectors: SelectorSet = {
  brand: brandSelectors,
  category: categorySelectors,
  componentCountry: componentCountrySelectors,
  country: countrySelectors,
  deliveryText: deliveryTextSelectors,
  description: descriptionSelectors,
  image: imageSelectors,
  ingredients: ingredientsSelectors,
  itemLocation: itemLocationSelectors,
  price: priceSelectors,
  seller: sellerSelectors,
  shipsFrom: shipsFromSelectors,
  shipping: shippingSelectors,
  shippingZipcode: shippingZipcodeSelectors,
  title: ["#productTitle", "h1"],
  weight: weightSelectors,
};

export const amazonScraper: ProductScraper = {
  id: "amazon",
  hostMatches: (host) => host.includes("amazon.com"),
  isProductPage: () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("/dp/") || path.includes("/gp/product/")) return true;

    return Boolean(
      document.querySelector(
        "#productTitle, #add-to-cart-button, [name='submit.add-to-cart']"
      )
    );
  },
  getProductTitle: () => getDefaultProductTitle(amazonSelectors.title),
  scrapeProductData: () => scrapeWithSelectors(amazonSelectors),
};
