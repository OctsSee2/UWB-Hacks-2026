import Country from "./country";

export default interface ProductComponent {
  name: string;
  details: string[];
  countryOrigin: Country | null;
}
