import React from "react";
import { createRoot } from "react-dom/client";
import { CarbonCartApp } from "./App";
import { allowedSites, mountId } from "./config";
import { getProductTitle } from "./scraper";
import { contentState } from "./state";

const isAllowedSite = allowedSites.some((site) =>
  window.location.hostname.includes(site)
);

if (!isAllowedSite) {
  unmountCarbonCart();
} else {
  initializeCarbonCart();
}

function initializeCarbonCart() {
  if (contentState.initialized) return;
  contentState.initialized = true;

  const refresh = () => {
    const onProductPage = isLikelyProductPage();
    if (!onProductPage) {
      unmountCarbonCart();
      contentState.lastMountedTitle = "";
      return;
    }

    const title = getProductTitle();
    const existing = document.getElementById(mountId);
    if (!existing || title !== contentState.lastMountedTitle) {
      mountCarbonCart(title);
      contentState.lastMountedTitle = title;
    }
  };

  const scheduleRefresh = () => {
    clearTimeout(contentState.refreshTimer);
    contentState.refreshTimer = setTimeout(refresh, 160);
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
      if (window.location.href !== contentState.lastUrl) {
        contentState.lastUrl = window.location.href;
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

function mountCarbonCart(productTitle) {
  unmountCarbonCart();

  const rootElement = document.createElement("div");
  rootElement.id = mountId;
  rootElement.className = "cc-root cc-fixed";
  document.body.appendChild(rootElement);

  contentState.reactRoot = createRoot(rootElement);
  contentState.reactRoot.render(<CarbonCartApp productTitle={productTitle} />);
}

function unmountCarbonCart() {
  const rootElement = document.getElementById(mountId);
  if (contentState.reactRoot) {
    contentState.reactRoot.unmount();
    contentState.reactRoot = null;
  }

  rootElement?.remove();
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
