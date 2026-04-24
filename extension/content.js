const allowedSites = ["amazon.com", "target.com", "walmart.com"];
const mountId = "carbon-cart-root";
const onboardingKey = "carboncart_onboarded_v1";
const bubblePositionKey = "carboncart_bubble_position_v1";

const isAllowedSite = allowedSites.some((site) =>
  window.location.hostname.includes(site)
);

if (!isAllowedSite) {
  document.getElementById(mountId)?.remove();
} else {
  initializeCarbonCart();
}

function initializeCarbonCart() {
  if (window.__carbonCartInitialized) return;
  window.__carbonCartInitialized = true;

  let refreshTimer = null;
  let lastUrl = window.location.href;
  let lastMountedTitle = "";

  const refresh = () => {
    const onProductPage = isLikelyProductPage();
    if (!onProductPage) {
      document.getElementById(mountId)?.remove();
      lastMountedTitle = "";
      return;
    }

    const title = getProductTitle();
    const existing = document.getElementById(mountId);
    if (!existing || title !== lastMountedTitle) {
      mountCarbonCart(title);
      lastMountedTitle = title;
    }
  };

  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 160);
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
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
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

function getProductTitle() {
  return (
    document.querySelector("#productTitle")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function iconLeaf(size = 11) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4c-4 0-11 1.5-14 6a7 7 0 0 0 8 10c4.5-1.5 6-8.5 6-16Z"></path><path d="M4 20c4-6 8-9 14-13"></path></svg>`;
}

function iconArrow(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>`;
}

function iconBolt(size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"></path></svg>`;
}

function iconCheck(size = 12) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>`;
}

function iconLogo(size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 9h14l-1 11H6L5 9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="rgba(167,201,87,0.15)"></path><path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M12 7c0-2 1-3.5 3-4 0 2-1 3.5-3 4Z" fill="currentColor"></path></svg>`;
}

function mountCarbonCart(productTitle) {
  const old = document.getElementById(mountId);
  if (old) old.remove();

  const safeTitle = escapeHtml(productTitle);
  const root = document.createElement("div");
  root.id = mountId;
  root.className = "cc-root";

  root.innerHTML = `
    <button class="cc-float-badge" aria-label="Open CarbonCart">
      <div class="cc-float-circle">
        <div style="text-align:center;">
          <div style="font-size:15px;line-height:1;">14.2</div>
          <div style="font-size:9px;font-weight:500;opacity:0.9;">kg</div>
        </div>
      </div>
      <div class="cc-float-mid">
        <div class="cc-float-label">High emissions</div>
        <div class="cc-float-alt">${iconLeaf(11)} 3 alternatives</div>
      </div>
    </button>

    <section class="cc-popup-shell" aria-live="polite">
      <div class="cc-popup-pointer"></div>
      <div class="cc-popup">
        <div class="cc-header">
          <div class="cc-logo">
            <span class="cc-logo-mark">${iconLogo(22)}</span>
            <span>CarbonCart</span>
          </div>
          <div class="cc-header-right">
            <span class="cc-badge-pill high">
              <span class="cc-pill-dot"></span>
              HIGH EMISSIONS
            </span>
            <button class="cc-close" aria-label="Close CarbonCart">×</button>
          </div>
        </div>

        <div class="cc-tabs">
          <button class="cc-tab active" data-tab="analysis">Analysis</button>
          <button class="cc-tab" data-tab="alternatives">Alternatives</button>
          <button class="cc-tab" data-tab="impact">My Impact</button>
        </div>

        <div class="cc-panel cc-panel-onboarding cc-hidden" data-view="onboarding">
          <div class="cc-onb-hero">
            <svg viewBox="0 0 160 160" width="140" height="140" style="position:relative;z-index:1;">
              <path d="M36 60 h88 l-8 84 h-72 Z" fill="#A7C957" stroke="#386641" stroke-width="3" stroke-linejoin="round"></path>
              <path d="M60 60 V46 a20 20 0 0 1 40 0 V60" fill="none" stroke="#386641" stroke-width="3" stroke-linecap="round"></path>
              <path d="M80 46 C80 30 88 18 100 16" stroke="#386641" stroke-width="3" stroke-linecap="round" fill="none"></path>
              <path d="M100 16 C116 16 124 26 118 40 C108 42 98 34 100 16 Z" fill="#6A994E" stroke="#386641" stroke-width="3" stroke-linejoin="round"></path>
              <path d="M84 36 C74 36 68 30 70 22 C80 22 86 28 84 36 Z" fill="#A7C957" stroke="#386641" stroke-width="2.5" stroke-linejoin="round"></path>
            </svg>
          </div>
          <div class="cc-onb-content">
            <h1 class="cc-onb-h">Shop with the full picture</h1>
            <div class="cc-onb-body">
              CarbonCart shows you the carbon footprint of what you're buying and suggests better local alternatives.
            </div>
            <button class="cc-cta js-start">Get started ${iconArrow(14)}</button>
          </div>
        </div>

        <div class="cc-panel" data-view="analysis">
          <div class="cc-product-strip">
            <div>Analyzing: <strong>${safeTitle}</strong></div>
            <div class="cc-est">Estimated from material, category, and shipping profile</div>
          </div>

          <div class="cc-body">
            <div class="cc-card">
              <div class="cc-label">Carbon footprint</div>
              <div class="cc-bignum-row">
                <span class="cc-bignum high">14.2</span>
                <span class="cc-bignum-unit">kg CO2e</span>
              </div>
              <div class="cc-progress"><div class="cc-progress-fill high" style="width:78%"></div></div>
              <div class="cc-pill-row">
                <span class="cc-pill">≈ 35 miles driven</span>
                <span class="cc-pill">≈ 3 months tree growth</span>
                <span class="cc-pill">≈ 7 phone charges</span>
              </div>
              <div class="cc-source">Based on EPA USEEIO v1.3 + MIT delivery research</div>
            </div>

            <div class="cc-card">
              <div class="cc-label">Ethics score</div>
              <div class="cc-bignum-row">
                <span class="cc-bignum high">34</span>
                <span class="cc-bignum-suffix">/100</span>
              </div>
              <div class="cc-progress"><div class="cc-progress-fill high" style="width:34%"></div></div>
              <div class="cc-pill-row">
                <span class="cc-pill ghost">Synthetic materials</span>
                <span class="cc-pill ghost">Long supply chain</span>
                <span class="cc-pill ghost">Air shipped</span>
              </div>
            </div>

            <div class="cc-delivery">
              <div class="cc-delivery-icon">${iconBolt(20)}</div>
              <div style="flex:1;">
                <div class="cc-delivery-head">Delivery speed adds emissions</div>
                <div class="cc-delivery-body">Same-day adds ~40% more CO2 vs standard. You selected: Same-day.</div>
                <div class="cc-compare">
                  <span class="cc-pill red">Same-day: +40%</span>
                  <span class="cc-pill sage">Standard: baseline</span>
                </div>
              </div>
            </div>

            <button class="cc-cta js-see-alternatives">See 3 greener alternatives ${iconArrow(14)}</button>
          </div>
        </div>

        <div class="cc-panel cc-hidden" data-view="alternatives">
          <div class="cc-body">
            <div class="cc-cap" style="padding:4px 2px 0;">Greener choices near you</div>

            <div class="cc-alt">
              <div class="cc-alt-top">
                <div class="cc-alt-thumb">${iconLogo(20)}</div>
                <div style="flex:1;min-width:0;">
                  <div class="cc-alt-name">Handmade canvas sneakers - Seattle maker</div>
                  <div class="cc-alt-maker">GreenStitch Studio - Seattle, WA</div>
                </div>
              </div>
              <div class="cc-alt-data">
                <span class="cc-pill sage">1.2 kg CO2e</span>
                <span class="cc-pill sage">Ethics 91/100</span>
                <span class="cc-pill ghost">$68</span>
              </div>
              <div class="cc-alt-tags">Local - Natural materials - Ground shipped</div>
            </div>

            <div class="cc-alt">
              <div class="cc-alt-top">
                <div class="cc-alt-thumb">${iconLogo(20)}</div>
                <div style="flex:1;min-width:0;">
                  <div class="cc-alt-name">Recycled-hemp low-tops - small batch</div>
                  <div class="cc-alt-maker">Kindred Footwork - Portland, OR</div>
                </div>
              </div>
              <div class="cc-alt-data">
                <span class="cc-pill sage">2.4 kg CO2e</span>
                <span class="cc-pill sage">Ethics 88/100</span>
                <span class="cc-pill ghost">$94</span>
              </div>
              <div class="cc-alt-tags">Recycled - Vegan - Ground shipped</div>
            </div>

            <div class="cc-save-banner">
              <div class="cc-save-banner-icon">${iconCheck(12)}</div>
              <div>Switching saves ~<strong>13 kg CO2</strong> - like not driving 32 miles</div>
            </div>
          </div>
        </div>

        <div class="cc-panel cc-hidden" data-view="impact">
          <div class="cc-body">
            <div class="cc-hero-saved">
              <div class="cc-label" style="margin-bottom:6px;">You've saved</div>
              <div class="cc-big">56<span class="cc-big-unit">kg CO2</span></div>
              <div class="cc-milestone-row"><span>56 of 100 kg to next milestone</span><span style="color:var(--cc-sage);font-weight:600;">56%</span></div>
              <div class="cc-progress cc-progress--thin"><div class="cc-progress-fill sage" style="width:56%"></div></div>
            </div>

            <div class="cc-grid-2x3">
              <div class="cc-stat"><div class="cc-stat-num">248</div><div class="cc-stat-label">miles not driven</div></div>
              <div class="cc-stat"><div class="cc-stat-num">7</div><div class="cc-stat-label">day streak</div></div>
              <div class="cc-stat"><div class="cc-stat-num">3</div><div class="cc-stat-label">trees' worth</div></div>
              <div class="cc-stat"><div class="cc-stat-num">7</div><div class="cc-stat-label">purchases switched</div></div>
            </div>

            <div class="cc-stat cc-stat--flight">
              <div class="cc-stat-num">1/2 flight</div>
              <div class="cc-stat-label">SEA to LAS - about half a one-way ticket's emissions</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  root.classList.add("cc-fixed");
  document.body.appendChild(root);

  wireInteractions(root);

  requestAnimationFrame(() => {
    root.querySelectorAll(".cc-progress-fill").forEach((bar) => {
      const target = bar.style.width;
      bar.style.transition = "none";
      bar.style.width = "0";
      requestAnimationFrame(() => {
        bar.style.transition = "";
        bar.style.width = target;
      });
    });
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readBubblePosition() {
  try {
    const raw = localStorage.getItem(bubblePositionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.left === "number" && typeof parsed?.top === "number") {
      return parsed;
    }
  } catch (_) {
    return null;
  }

  return null;
}

function writeBubblePosition(left, top) {
  localStorage.setItem(bubblePositionKey, JSON.stringify({ left, top }));
}

function getClampedPosition(left, top, badge) {
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - badge.offsetWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - badge.offsetHeight - margin);

  return {
    left: clamp(left, margin, maxLeft),
    top: clamp(top, margin, maxTop),
  };
}

function applyBubblePosition(root, left, top) {
  root.style.left = `${left}px`;
  root.style.top = `${top}px`;
  root.style.right = "auto";
  root.style.bottom = "auto";
}

function setupDraggableBubble(root, badge, onDragEnd) {
  const saved = readBubblePosition();
  if (saved) {
    const clamped = getClampedPosition(saved.left, saved.top, badge);
    applyBubblePosition(root, clamped.left, clamped.top);
  }

  let drag = null;

  const onPointerDown = (event) => {
    if (event.button !== 0) return;

    const rect = root.getBoundingClientRect();
    drag = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };

    root.classList.add("cc-dragging");
    badge.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!drag) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(deltaX) + Math.abs(deltaY) > 4) {
      drag.moved = true;
    }

    if (!drag.moved) return;

    event.preventDefault();
    const next = getClampedPosition(
      drag.startLeft + deltaX,
      drag.startTop + deltaY,
      badge
    );
    applyBubblePosition(root, next.left, next.top);
  };

  const onPointerUp = (event) => {
    if (!drag) return;

    badge.releasePointerCapture?.(event.pointerId);
    root.classList.remove("cc-dragging");

    if (drag.moved) {
      const rect = root.getBoundingClientRect();
      const clamped = getClampedPosition(rect.left, rect.top, badge);
      applyBubblePosition(root, clamped.left, clamped.top);
      writeBubblePosition(clamped.left, clamped.top);
      onDragEnd();
    }

    drag = null;
  };

  const onResize = () => {
    const rect = root.getBoundingClientRect();
    const clamped = getClampedPosition(rect.left, rect.top, badge);
    applyBubblePosition(root, clamped.left, clamped.top);
    writeBubblePosition(clamped.left, clamped.top);
  };

  badge.addEventListener("pointerdown", onPointerDown);
  badge.addEventListener("pointermove", onPointerMove);
  badge.addEventListener("pointerup", onPointerUp);
  badge.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", onResize);
}

function wireInteractions(root) {
  const badge = root.querySelector(".cc-float-badge");
  const popup = root.querySelector(".cc-popup-shell");
  const close = root.querySelector(".cc-close");
  const tabs = root.querySelectorAll(".cc-tab");
  const panels = root.querySelectorAll(".cc-panel");
  const seeAlternatives = root.querySelector(".js-see-alternatives");
  const startBtn = root.querySelector(".js-start");
  const isOnboarded = localStorage.getItem(onboardingKey) === "1";
  let suppressToggleUntil = 0;

  if (badge) {
    setupDraggableBubble(root, badge, () => {
      suppressToggleUntil = Date.now() + 250;
    });
  }

  const setView = (view) => {
    const onboardingMode = view === "onboarding";
    root.querySelector(".cc-popup")?.classList.toggle("cc-onboarding-mode", onboardingMode);

    tabs.forEach((tab) => {
      const active = tab.dataset.tab === view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      panel.classList.toggle("cc-hidden", panel.dataset.view !== view);
    });
  };

  const openPopup = (view = "analysis") => {
    popup?.classList.add("cc-popup-visible");
    root.classList.add("cc-open");
    setView(view);
  };

  const closePopup = () => {
    popup?.classList.remove("cc-popup-visible");
    root.classList.remove("cc-open");
  };

  badge?.addEventListener("click", () => {
    if (Date.now() < suppressToggleUntil) return;

    const isOpen = popup?.classList.contains("cc-popup-visible");
    if (!isOpen) {
      openPopup("analysis");
    } else {
      closePopup();
    }
  });

  close?.addEventListener("click", closePopup);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.tab));
  });

  seeAlternatives?.addEventListener("click", () => setView("alternatives"));

  startBtn?.addEventListener("click", () => {
    localStorage.setItem(onboardingKey, "1");
    setView("analysis");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopup();
  });

  if (!isOnboarded) {
    openPopup("onboarding");
  }
}