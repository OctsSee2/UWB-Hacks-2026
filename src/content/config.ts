export const allowedSites: string[] = [
  "amazon.com",
  "target.com",
  "walmart.com",
  "shein.com",
];
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
