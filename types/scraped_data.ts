// import ProductType from "./product_types";
import ProductComponent from "./product_component";
import ProductFeature from "./product_feature";
import ProductWeight from "./product_weight";
import Country from "./country";
import MiscOrigin from "./misc_origin";

export interface ScrapedData {
  productTitle: string;
  // productType: ProductType;

  // keywords: string[];
  components: ProductComponent[]; // 2nd type -> ingredients. parts, fabric types, etc...
  features: ProductFeature[];
  weight: ProductWeight;
  reviewsRating: number;
  reviewsCount: number;
  overallOrigin: Country | null | string;
}
