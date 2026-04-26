import React from "react";
import { createRoot } from "react-dom/client";
import { CarbonCartApp } from "./App";
import { allowedSites, mountId } from "./config";
import { PolarBearPet } from "./polarBearPet";
import { getProductTitle, isSupportedProductPage } from "./scraper";
import { contentState } from "./state";

const isAllowedSite = allowedSites.some((site) =>
  window.location.hostname.includes(site)
);

let polarBearPet: PolarBearPet | null = null;

if (!isAllowedSite) {
  unmountCarbonCart();
  destroyPolarBearPet();
} else {
  initializeCarbonCart();
}

function initializeCarbonCart(): void {
  if (contentState.initialized) return;
  contentState.initialized = true;

  const refresh = () => {
    const onProductPage = isSupportedProductPage();
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
    if (contentState.refreshTimer !== null) {
      clearTimeout(contentState.refreshTimer);
    }
    contentState.refreshTimer = setTimeout(refresh, 160);
  };

  const start = () => {
    ensurePolarBearPet();
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

function ensurePolarBearPet(): void {
  if (polarBearPet) return;

  polarBearPet = new PolarBearPet({
    spritePath: "assets/sprites/polar-bear-sheet.png",
    storageArea: "local",
    percentKey: "emissionSavingsPercent",
  });

  polarBearPet.start().catch((err) => {
    console.warn("[PolarBearPet] Start failed:", err);
  });
}

function destroyPolarBearPet(): void {
  if (!polarBearPet) return;
  polarBearPet.destroy();
  polarBearPet = null;
}

function mountCarbonCart(productTitle: string): void {
  unmountCarbonCart();

  const rootElement = document.createElement("div");
  rootElement.id = mountId;
  rootElement.className = "cc-root cc-fixed";
  document.body.appendChild(rootElement);

  contentState.reactRoot = createRoot(rootElement);
  contentState.reactRoot.render(<CarbonCartApp productTitle={productTitle} />);
}

function unmountCarbonCart(): void {
  const rootElement = document.getElementById(mountId);
  if (contentState.reactRoot) {
    contentState.reactRoot.unmount();
    contentState.reactRoot = null;
  }

  rootElement?.remove();
}

