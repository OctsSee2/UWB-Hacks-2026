import type { ProductData } from "../types";

export type SelectorSet = {
  brand: string[];
  category: string[];
  componentCountry: string[];
  country: string[];
  deliveryText: string[];
  description: string[];
  image: string[];
  ingredients: string[];
  itemLocation: string[];
  price: string[];
  seller: string[];
  shipsFrom: string[];
  shipping: string[];
  shippingZipcode: string[];
  title: string[];
  weight: string[];
};

export type ProductScraper = {
  id: string;
  hostMatches: (host: string) => boolean;
  isProductPage: () => boolean;
  getProductTitle: () => string;
  scrapeProductData: () => ProductData;
};
