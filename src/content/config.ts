export const allowedSites: string[] = ["amazon.com", "target.com", "walmart.com"];
export const mountId = "carbon-cart-root";
export const onboardingKey = "carboncart_onboarded_v1";
export const bubblePositionKey = "carboncart_bubble_position_v1";

export const priceSelectors: string[] = [
  "#priceblock_ourprice",
  "#priceblock_dealprice",
  ".a-price .a-offscreen",
  "[itemprop='price']",
  ".price",
];

export const brandSelectors: string[] = ["#bylineInfo", ".po-brand .a-span9", ".brand"];

export const shippingSelectors: string[] = [
  "#deliveryBlockMessage",
  "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE",
  ".shipping",
];

export const descriptionSelectors: string[] = [
  "#feature-bullets",
  "#productDescription",
  ".description",
];

export const imageSelectors: string[] = ["#landingImage", "#imgTagWrapperId img", "img"];

export const categorySelectors: string[] = [
  "#wayfinding-breadcrumbs_feature_div li:last-child",
  "#wayfinding-breadcrumbs_container li:last-child",
  "#wayfinding-breadcrumbs_container .a-breadcrumb:last-child",
  "#wayfinding-breadcrumbs_feature_div .a-breadcrumb:last-child",
  "#wayfinding-breadcrumbs_feature_div .a-unordered-list li:last-child",
  ".breadcrumb li:last-child",
  "[data-test='breadcrumb'] a:last-child",
  ".category",
];

export const ingredientsSelectors: string[] = [
  "#productDetails .ingredients",
  ".ingredients",
  "#productDescription",
  ".product-details",
];

export const countrySelectors: string[] = [
  "#productDetails .country",
  ".country-of-origin",
  "#productDescription",
  ".product-details",
];

export const componentCountrySelectors: string[] = [
  "#productDetails .component-country",
  ".component-origin",
  "#productDescription",
  ".product-details",
];

export const sellerSelectors: string[] = [
  "#merchant-info",
  ".tabular-buybox-text",
  ".a-spacing-none .a-row",
  "#sellerProfileTriggerId",
];

export const itemLocationSelectors: string[] = [
  "#itemLocation",
  ".item-location",
  "#detailBullets_feature_div",
  "#productDetails_detailBullets_sections1",
];

export const deliveryTextSelectors: string[] = [
  "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE",
  "#deliveryBlockMessage",
  ".shipping",
  ".delivery-message",
];

export const shippingZipcodeSelectors: string[] = [
  "#shipping-zipcode",
  ".shipping-from input",
  "#productDetails .shipping-zip",
  "#contextualIngressPtLabel_deliveryShortLine",
];

export const weightSelectors: string[] = [
  "#productDetails .weight",
  ".product-weight",
  "#productDescription",
  ".product-details",
];

export const shipsFromSelectors: string[] = [
  "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE",
  "#merchant-info",
  ".a-section.a-spacing-none.a-padding-none",
  "[data-feature-name='delivery']",
  ".a-row.a-spacing-mini",
];
