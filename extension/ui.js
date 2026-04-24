function mountCarbonCart(productTitle) {
  const productData = scrapeProductData();
  const analysis = getDemoAnalysisData(productData);
  console.log("Scraped Product:", productData);

  chrome.runtime.sendMessage({
    type: "PRODUCT_SCRAPED",
    data: productData,
  });

  const old = document.getElementById(CarbonCartConfig.mountId);
  if (old) old.remove();

  // Real scraped product title when available; demo data fills the analysis.
  const safeTitle = escapeHtml(analysis.productTitle || productTitle);
  const root = document.createElement("div");
  root.id = CarbonCartConfig.mountId;
  root.className = "cc-root";

  root.innerHTML = `
    <button class="cc-float-badge" aria-label="Open CarbonCart">
      <div class="cc-float-circle">
        <div style="text-align:center;">
          <div style="font-size:15px;line-height:1;">${analysis.carbonKg}</div>
          <div style="font-size:9px;font-weight:500;opacity:0.9;">kg</div>
        </div>
      </div>
      <div class="cc-float-mid">
        <div class="cc-float-label">${analysis.emissionsLevel}</div>
        <div class="cc-float-alt">${iconLeaf(11)} ${analysis.alternativesCount} alternatives</div>
      </div>
    </button>

    <section class="cc-popup-shell cc-hidden" aria-live="polite">
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
            <button class="cc-close" aria-label="Close CarbonCart">&times;</button>
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
                <span class="cc-bignum high">${analysis.carbonKg}</span>
                <span class="cc-bignum-unit">kg CO2e</span>
              </div>
              <div class="cc-progress"><div class="cc-progress-fill high" style="width:${analysis.carbonPercent}%"></div></div>
              <div class="cc-pill-row">
                <span class="cc-pill">&asymp; ${analysis.drivingEquivalent}</span>
                <span class="cc-pill">&asymp; ${analysis.treeGrowthEquivalent}</span>
                <span class="cc-pill">&asymp; ${analysis.phoneChargeEquivalent}</span>
              </div>
              <div class="cc-source">${analysis.source}</div>
            </div>

            <div class="cc-card">
              <div class="cc-label">Ethics score</div>
              <div class="cc-bignum-row">
                <span class="cc-bignum high">${analysis.ethicsScore}</span>
                <span class="cc-bignum-suffix">/100</span>
              </div>
              <div class="cc-progress"><div class="cc-progress-fill high" style="width:${analysis.ethicsScore}%"></div></div>
              <div class="cc-pill-row">
                ${analysis.ethicsTags.map((tag) => `<span class="cc-pill ghost">${escapeHtml(tag)}</span>`).join("")}
              </div>
            </div>

            <div class="cc-delivery">
              <div class="cc-delivery-icon">${iconBolt(20)}</div>
              <div style="flex:1;">
                <div class="cc-delivery-head">Delivery speed adds emissions</div>
                <div class="cc-delivery-body">${analysis.deliveryNote}</div>
                <div class="cc-compare">
                  <span class="cc-pill red">${analysis.deliverySpeed}: ${analysis.deliveryIncrease}</span>
                  <span class="cc-pill sage">Standard: baseline</span>
                </div>
              </div>
            </div>

            <button class="cc-cta js-see-alternatives">See ${analysis.alternativesCount} greener alternatives ${iconArrow(14)}</button>
          </div>
        </div>

        <div class="cc-panel cc-hidden" data-view="alternatives">
          <div class="cc-body">
            <div class="cc-cap" style="padding:4px 2px 0;">Greener choices near you</div>

            ${analysis.alternatives.map((alternative) => `
              <div class="cc-alt">
                <div class="cc-alt-top">
                  <div class="cc-alt-thumb">${iconLogo(20)}</div>
                  <div style="flex:1;min-width:0;">
                    <div class="cc-alt-name">${escapeHtml(alternative.name)}</div>
                    <div class="cc-alt-maker">${escapeHtml(alternative.maker)}</div>
                  </div>
                </div>
                <div class="cc-alt-data">
                  <span class="cc-pill sage">${escapeHtml(alternative.carbon)}</span>
                  <span class="cc-pill sage">${escapeHtml(alternative.ethics)}</span>
                  <span class="cc-pill ghost">${escapeHtml(alternative.price)}</span>
                </div>
                <div class="cc-alt-tags">${escapeHtml(alternative.tags)}</div>
              </div>
            `).join("")}

            <div class="cc-save-banner">
              <div class="cc-save-banner-icon">${iconCheck(12)}</div>
              <div>${analysis.savingsText}<strong>${analysis.savingsAmount}</strong>${analysis.savingsComparison}</div>
            </div>
          </div>
        </div>

        <div class="cc-panel cc-hidden" data-view="impact">
          <div class="cc-body">
            <div class="cc-hero-saved">
              <div class="cc-label" style="margin-bottom:6px;">You've saved</div>
              <div class="cc-big">${analysis.impact.savedKg}<span class="cc-big-unit">kg CO2</span></div>
              <div class="cc-milestone-row"><span>${analysis.impact.nextMilestone}</span><span style="color:var(--cc-sage);font-weight:600;">${analysis.impact.progress}%</span></div>
              <div class="cc-progress cc-progress--thin"><div class="cc-progress-fill sage" style="width:${analysis.impact.progress}%"></div></div>
            </div>

            <div class="cc-grid-2x3">
              <div class="cc-stat"><div class="cc-stat-num">${analysis.impact.milesNotDriven}</div><div class="cc-stat-label">miles not driven</div></div>
              <div class="cc-stat"><div class="cc-stat-num">${analysis.impact.dayStreak}</div><div class="cc-stat-label">day streak</div></div>
              <div class="cc-stat"><div class="cc-stat-num">${analysis.impact.treesWorth}</div><div class="cc-stat-label">trees' worth</div></div>
              <div class="cc-stat"><div class="cc-stat-num">${analysis.impact.purchasesSwitched}</div><div class="cc-stat-label">purchases switched</div></div>
            </div>

            <div class="cc-stat cc-stat--flight">
              <div class="cc-stat-num">${analysis.impact.flightAmount}</div>
              <div class="cc-stat-label">${analysis.impact.flightLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  root.classList.add("cc-fixed");
  document.body.appendChild(root);

  wireInteractions(root);
}

function wireInteractions(root) {
  const badge = root.querySelector(".cc-float-badge");
  const popup = root.querySelector(".cc-popup-shell");
  const close = root.querySelector(".cc-close");
  const tabs = root.querySelectorAll(".cc-tab");
  const panels = root.querySelectorAll(".cc-panel");
  const seeAlternatives = root.querySelector(".js-see-alternatives");
  const startBtn = root.querySelector(".js-start");
  const isOnboarded = localStorage.getItem(CarbonCartConfig.onboardingKey) === "1";
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
    popup?.classList.remove("cc-hidden");
    root.classList.add("cc-open");
    setView(view);
  };

  const closePopup = () => {
    popup?.classList.add("cc-hidden");
    root.classList.remove("cc-open");
  };

  badge?.addEventListener("click", () => {
    if (Date.now() < suppressToggleUntil) return;

    const hidden = popup?.classList.contains("cc-hidden");
    if (hidden) {
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
    localStorage.setItem(CarbonCartConfig.onboardingKey, "1");
    setView("analysis");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopup();
  });

  if (!isOnboarded) {
    openPopup("onboarding");
  }
}
