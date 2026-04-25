import CompanyReputation from "./company_reputation";
import Country from "./country";

export default interface RawDataInference {
  // - Company reputation
  // - Country of origin
  // - Functionality
  // - Price
  // - Ingredients
  // - User reviews sentiment
  //    - Individual user reviews
  // - Alternative products on other platforms
  //    - *Inferences* on those alternative products
  // - Healthiness
  // - FDA information
  // - Product recalls
  // - Shipping information
  //    - Shipping environment impact
  //    - Shipping fuel usage
  // - Carbon footprint
  // - Overall ethicalness rating for labor conditions, environment, animal cruelty, etc...
  companyReputation: CompanyReputation;
  countryOrigin: Country | null;
  // TODO: add more
}
