export const allowedSites = ["amazon.com", "target.com", "walmart.com"];
export const mountId = "carbon-cart-root";
export const onboardingKey = "carboncart_onboarded_v1";
export const bubblePositionKey = "carboncart_bubble_position_v1";

export const priceSelectors = [
  "#priceblock_ourprice",
  "#priceblock_dealprice",
  ".a-price .a-offscreen",
  "[itemprop='price']",
  ".price",
];

export const brandSelectors = ["#bylineInfo", ".po-brand .a-span9", ".brand"];

export const shippingSelectors = [
  "#deliveryBlockMessage",
  "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE",
  ".shipping",
];

export const descriptionSelectors = [
  "#feature-bullets",
  "#productDescription",
  ".description",
];

export const imageSelectors = ["#landingImage", "#imgTagWrapperId img", "img"];
