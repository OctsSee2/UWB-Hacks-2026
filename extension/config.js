var CarbonCartConfig = {
  allowedSites: ["amazon.com", "target.com", "walmart.com"],
  mountId: "carbon-cart-root",
  onboardingKey: "carboncart_onboarded_v1",
  bubblePositionKey: "carboncart_bubble_position_v1",

  priceSelectors: [
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-price .a-offscreen",
    "[itemprop='price']",
    ".price",
  ],

  brandSelectors: ["#bylineInfo", ".po-brand .a-span9", ".brand"],

  shippingSelectors: [
    "#deliveryBlockMessage",
    "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE",
    ".shipping",
  ],

  descriptionSelectors: ["#feature-bullets", "#productDescription", ".description"],

  imageSelectors: ["#landingImage", "#imgTagWrapperId img", "img"],
};
