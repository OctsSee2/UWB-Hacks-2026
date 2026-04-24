function getPrice() {
  return getText(CarbonCartConfig.priceSelectors);
}

function getProductTitle() {
  return (
    document.querySelector("#productTitle")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title
  );
}

function scrapeProductData() {
  // Real scraped data from the visible product page.
  const title = getProductTitle();
  const brand = getText(CarbonCartConfig.brandSelectors);
  const shipping = getText(CarbonCartConfig.shippingSelectors);
  const description = getText(CarbonCartConfig.descriptionSelectors);
  const imageUrl = getImage(CarbonCartConfig.imageSelectors);

  return {
    title,
    price: getPrice(),
    brand,
    category: "",
    imageUrl,
    shipping,
    description,
    url: window.location.href,
    domain: window.location.hostname,
  };
}
