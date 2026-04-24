const isAllowedSite = CarbonCartConfig.allowedSites.some((site) =>
  window.location.hostname.includes(site)
);

if (!isAllowedSite) {
  document.getElementById(CarbonCartConfig.mountId)?.remove();
} else {
  initializeCarbonCart();
}

function initializeCarbonCart() {
  if (CarbonCartState.initialized) return;
  CarbonCartState.initialized = true;

  const refresh = () => {
    const onProductPage = isLikelyProductPage();
    if (!onProductPage) {
      document.getElementById(CarbonCartConfig.mountId)?.remove();
      CarbonCartState.lastMountedTitle = "";
      return;
    }

    const title = getProductTitle();
    const existing = document.getElementById(CarbonCartConfig.mountId);
    if (!existing || title !== CarbonCartState.lastMountedTitle) {
      mountCarbonCart(title);
      CarbonCartState.lastMountedTitle = title;
    }
  };

  const scheduleRefresh = () => {
    clearTimeout(CarbonCartState.refreshTimer);
    CarbonCartState.refreshTimer = setTimeout(refresh, 160);
  };

  const start = () => {
    refresh();

    const observer = new MutationObserver(() => {
      scheduleRefresh();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("popstate", scheduleRefresh);
    window.addEventListener("hashchange", scheduleRefresh);

    setInterval(() => {
      if (window.location.href !== CarbonCartState.lastUrl) {
        CarbonCartState.lastUrl = window.location.href;
        scheduleRefresh();
      }
    }, 800);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

function isLikelyProductPage() {
  const host = window.location.hostname;
  const path = window.location.pathname.toLowerCase();

  if (host.includes("amazon.com")) {
    if (path.includes("/dp/") || path.includes("/gp/product/")) return true;
    return Boolean(
      document.querySelector(
        "#productTitle, #add-to-cart-button, [name='submit.add-to-cart']"
      )
    );
  }

  if (host.includes("target.com")) {
    if (path.includes("/p/")) return true;
    return Boolean(
      document.querySelector(
        "[data-test='product-title'], [data-test='addToCartButton']"
      )
    );
  }

  if (host.includes("walmart.com")) {
    if (path.includes("/ip/")) return true;
    return Boolean(
      document.querySelector(
        "[itemprop='name'], [data-automation-id='add-to-cart-button']"
      )
    );
  }

  return false;
}
