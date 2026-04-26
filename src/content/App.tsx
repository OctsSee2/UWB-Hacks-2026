import { useEffect, useMemo, useRef, useState } from "react";
import { onboardingKey } from "./config";
import { readTotalCO2Saved } from "./co2Storage";
import { setupDraggableBubble } from "./drag";
import { calculateProductAnalysis, getDemoAnalysisData } from "./emissions";
import { IconArrow, IconBolt, IconCheck, IconInfo, IconLeaf, IconLogo } from "./icons";
import { scrapeProductData } from "./scraper";
import type { DemoAnalysisData, ViewName } from "./types";

type CarbonCartAppProps = {
  productTitle: string;
};

type HeaderProps = {
  onClose: () => void;
};

type TabsProps = {
  view: ViewName;
  onChange: (view: ViewName) => void;
};

type OnboardingPanelProps = {
  active: boolean;
  onStart: () => void;
};

type AnalysisPanelProps = {
  active: boolean;
  analysis: DemoAnalysisData;
  productTitle: string;
  onSeeAlternatives: () => void;
  showAudit: boolean;
  onToggleAudit: () => void;
};

type DemoPanelProps = {
  active: boolean;
  analysis: DemoAnalysisData;
};

type ImpactPanelProps = {
  active: boolean;
  analysis: DemoAnalysisData;
  totalCO2Saved: number;
  onSetTotalCO2Saved: (value: number) => void;
};

type TabView = Exclude<ViewName, "onboarding">;

export function CarbonCartApp({ productTitle }: CarbonCartAppProps) {
  const badgeRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewName>("analysis");
  const [suppressToggleUntil, setSuppressToggleUntil] = useState(0);
  const [isOnboarded, setIsOnboarded] = useState(
    () => localStorage.getItem(onboardingKey) === "1"
  );
  const [totalCO2Saved, setTotalCO2Saved] = useState(() => readTotalCO2Saved());

  const handleSetCO2 = (value: number) => {
    setTotalCO2Saved(value);
    // Persist to storage
    const CO2_KEY = "carboncart_co2saved_v1";
    localStorage.setItem(CO2_KEY, String(value));
    void chrome.storage.local.set({ emissionSavingsPercent: value });
  };

  const productData = useMemo(() => scrapeProductData(), [productTitle]);
  const initialAnalysis = useMemo(() => getDemoAnalysisData(productData), [productData]);
  const [analysis, setAnalysis] = useState<DemoAnalysisData>(initialAnalysis);
  const [showAudit, setShowAudit] = useState(false);
  const displayTitle = analysis.productTitle || productTitle;

  useEffect(() => {
    setAnalysis(initialAnalysis);
    setShowAudit(false);
  }, [initialAnalysis]);

  useEffect(() => {
    console.log("Scraped Product:", productData);

    chrome.runtime.sendMessage({
      type: "PRODUCT_SCRAPED",
      data: productData,
    });
  }, [productData]);

  useEffect(() => {
    let isActive = true;

    calculateProductAnalysis(productData)
      .then((nextAnalysis) => {
        if (isActive) {
          setAnalysis(nextAnalysis);
        }
      })
      .catch((error) => {
        console.error("Product emissions analysis failed:", error);
      });

    return () => {
      isActive = false;
    };
  }, [productData]);

  useEffect(() => {
    if (!isOnboarded) {
      setOpen(true);
      setView("onboarding");
    }
  }, [isOnboarded]);

  useEffect(() => {
    const root = badgeRef.current?.closest(".cc-root");
    const badge = badgeRef.current;
    if (!(root instanceof HTMLElement) || !badge) return undefined;

    return setupDraggableBubble(root, badge, () => {
      setSuppressToggleUntil(Date.now() + 250);
    });
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const setPanelView = (nextView: ViewName) => {
    setView(nextView);
  };

  const togglePopup = () => {
    if (Date.now() < suppressToggleUntil) return;

    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
      setPanelView("analysis");
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem(onboardingKey, "1");
    setIsOnboarded(true);
    setPanelView("analysis");
  };

  const onboardingMode = view === "onboarding";

  return (
    <>
      <button ref={badgeRef} className="cc-float-badge" aria-label="Open CarbonCart" onClick={togglePopup}>
        <div className="cc-float-circle">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "15px", lineHeight: 1 }}>{analysis.carbonKg}</div>
            <div style={{ fontSize: "9px", fontWeight: 500, opacity: 0.9 }}>kg</div>
          </div>
        </div>
        <div className="cc-float-mid">
          <div className="cc-float-label">{analysis.emissionsLevel}</div>
          <div className="cc-float-alt"><IconLeaf size={11} /> {analysis.alternativesCount} alternatives</div>
        </div>
      </button>

      <section className={`cc-popup-shell ${open ? "" : "cc-hidden"}`} aria-live="polite">
        <div className="cc-popup-pointer" />
        <div className={`cc-popup ${onboardingMode ? "cc-onboarding-mode" : ""}`}>
          <Header onClose={() => setOpen(false)} />
          <Tabs view={view} onChange={setPanelView} />
          <OnboardingPanel active={view === "onboarding"} onStart={completeOnboarding} />
          <AnalysisPanel
            active={view === "analysis"}
            analysis={analysis}
            productTitle={displayTitle}
            onSeeAlternatives={() => setPanelView("alternatives")}
            showAudit={showAudit}
            onToggleAudit={() => setShowAudit((current) => !current)}
          />
          <AlternativesPanel active={view === "alternatives"} analysis={analysis} />
          <ImpactPanel active={view === "impact"} analysis={analysis} totalCO2Saved={totalCO2Saved} onSetTotalCO2Saved={handleSetCO2} />
        </div>
      </section>
    </>
  );
}

function Header({ onClose }: HeaderProps) {
  return (
    <div className="cc-header">
      <div className="cc-logo">
        <span className="cc-logo-mark"><IconLogo size={22} /></span>
        <span>CarbonCart</span>
      </div>
      <div className="cc-header-right">
        <span className="cc-badge-pill high">
          <span className="cc-pill-dot" />
          HIGH EMISSIONS
        </span>
        <button className="cc-close" aria-label="Close CarbonCart" onClick={onClose}>{"\u00d7"}</button>
      </div>
    </div>
  );
}

function Tabs({ view, onChange }: TabsProps) {
  const tabs: { id: TabView; label: string }[] = [
    { id: "analysis", label: "Analysis" },
    { id: "alternatives", label: "Alternatives" },
    { id: "impact", label: "My Impact" },
  ];

  return (
    <div className="cc-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`cc-tab ${view === tab.id ? "active" : ""}`}
          data-tab={tab.id}
          aria-selected={view === tab.id ? "true" : "false"}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function OnboardingPanel({ active, onStart }: OnboardingPanelProps) {
  return (
    <div className={`cc-panel cc-panel-onboarding ${active ? "" : "cc-hidden"}`} data-view="onboarding">
      <div className="cc-onb-hero">
        <svg viewBox="0 0 160 160" width="140" height="140" style={{ position: "relative", zIndex: 1 }}>
          <path d="M36 60 h88 l-8 84 h-72 Z" fill="#A7C957" stroke="#386641" strokeWidth="3" strokeLinejoin="round" />
          <path d="M60 60 V46 a20 20 0 0 1 40 0 V60" fill="none" stroke="#386641" strokeWidth="3" strokeLinecap="round" />
          <path d="M80 46 C80 30 88 18 100 16" stroke="#386641" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M100 16 C116 16 124 26 118 40 C108 42 98 34 100 16 Z" fill="#6A994E" stroke="#386641" strokeWidth="3" strokeLinejoin="round" />
          <path d="M84 36 C74 36 68 30 70 22 C80 22 86 28 84 36 Z" fill="#A7C957" stroke="#386641" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="cc-onb-content">
        <h1 className="cc-onb-h">Shop with the full picture</h1>
        <div className="cc-onb-body">
          CarbonCart shows you the carbon footprint of what you're buying and suggests better local alternatives.
        </div>
        <button className="cc-cta js-start" onClick={onStart}>Get started <IconArrow size={14} /></button>
      </div>
    </div>
  );
}

function AnalysisPanel({
  active,
  analysis,
  productTitle,
  onSeeAlternatives,
  showAudit,
  onToggleAudit,
}: AnalysisPanelProps) {
  return (
    <div className={`cc-panel ${active ? "" : "cc-hidden"}`} data-view="analysis">
      <div className="cc-product-strip">
        <div>Analyzing: <strong>{productTitle}</strong></div>
        <div className="cc-est">Estimated from material, category, and shipping profile</div>
      </div>

      <div className="cc-body">
        <div className="cc-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <div className="cc-label">Carbon footprint</div>
            <button
              type="button"
              onClick={onToggleAudit}
              aria-expanded={showAudit}
              aria-label="Show carbon calculation details"
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", padding: 0 }}
            >
              <IconInfo size={14} />
            </button>
          </div>
          <div className="cc-bignum-row">
            <span className="cc-bignum high">{analysis.carbonKg}</span>
            <span className="cc-bignum-unit">kg CO2e</span>
          </div>
          <div className="cc-progress"><div className="cc-progress-fill high" style={{ width: `${analysis.carbonPercent}%` }} /></div>
          {showAudit && (
            <div style={{ marginTop: "12px", padding: "12px", background: "rgba(255,255,255,0.08)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "10px" }}>Calculation details</div>
              {analysis.auditTrail.map((entry) => (
                <div key={entry.title} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "13px", fontWeight: 600 }}>
                    <span>{entry.title}</span>
                    <span style={{ textAlign: "right" }}>{entry.value}</span>
                  </div>
                  {entry.description ? (
                    <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8 }}>{entry.description}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <div className="cc-pill-row">
            <span className="cc-pill">{"\u2248"} {analysis.drivingEquivalent}</span>
            <span className="cc-pill">{"\u2248"} {analysis.treeGrowthEquivalent}</span>
            <span className="cc-pill">{"\u2248"} {analysis.phoneChargeEquivalent}</span>
          </div>
          <div className="cc-source">{analysis.source}</div>
        </div>

        <div className="cc-card">
          <div className="cc-label">Ethics score</div>
          <div className="cc-bignum-row">
            <span className="cc-bignum high">{analysis.ethicsScore}</span>
            <span className="cc-bignum-suffix">/100</span>
          </div>
          <div className="cc-progress"><div className="cc-progress-fill high" style={{ width: `${analysis.ethicsScore}%` }} /></div>
          <div className="cc-pill-row">
            {analysis.ethicsTags.map((tag) => <span key={tag} className="cc-pill ghost">{tag}</span>)}
          </div>
        </div>

        <div className="cc-delivery">
          <div className="cc-delivery-icon"><IconBolt size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="cc-delivery-head">Delivery speed adds emissions</div>
            <div className="cc-delivery-body">{analysis.deliveryNote}</div>
            <div className="cc-compare">
              <span className="cc-pill red">{analysis.deliverySpeed}: {analysis.deliveryIncrease}</span>
              <span className="cc-pill sage">Standard: baseline</span>
            </div>
          </div>
        </div>

        <button className="cc-cta js-see-alternatives" onClick={onSeeAlternatives}>
          See {analysis.alternativesCount} greener alternatives <IconArrow size={14} />
        </button>
      </div>
    </div>
  );
}

function AlternativesPanel({ active, analysis }: DemoPanelProps) {
  return (
    <div className={`cc-panel ${active ? "" : "cc-hidden"}`} data-view="alternatives">
      <div className="cc-body">
        <div className="cc-cap" style={{ padding: "4px 2px 0" }}>Greener choices near you</div>

        {analysis.alternatives.map((alternative) => (
          <div className="cc-alt" key={alternative.name}>
            <div className="cc-alt-top">
              <div className="cc-alt-thumb"><IconLogo size={20} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cc-alt-name">{alternative.name}</div>
                <div className="cc-alt-maker">{alternative.maker}</div>
              </div>
            </div>
            <div className="cc-alt-data">
              <span className="cc-pill sage">{alternative.carbon}</span>
              <span className="cc-pill sage">{alternative.ethics}</span>
              <span className="cc-pill ghost">{alternative.price}</span>
            </div>
            <div className="cc-alt-tags">{alternative.tags}</div>
          </div>
        ))}

        <div className="cc-save-banner">
          <div className="cc-save-banner-icon"><IconCheck size={12} /></div>
          <div>{analysis.savingsText}<strong>{analysis.savingsAmount}</strong>{analysis.savingsComparison}</div>
        </div>
      </div>
    </div>
  );
}

function ImpactPanel({ active, analysis, totalCO2Saved, onSetTotalCO2Saved }: ImpactPanelProps) {
  const impact = analysis.impact;

  return (
    <div className={`cc-panel ${active ? "" : "cc-hidden"}`} data-view="impact">
      <div className="cc-body">
        {/* DEV: Emissions savings percent slider */}
        <div className="cc-dev-slider">
          <div style={{ fontSize: "11px", color: "var(--cc-text-secondary)", marginBottom: "6px", fontWeight: 500 }}>
            DEV: Emissions Savings (%)
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={totalCO2Saved}
              onChange={(e) => onSetTotalCO2Saved(parseFloat(e.target.value))}
              style={{ flex: 1, cursor: "pointer" }}
            />
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--cc-moss)", minWidth: "28px" }}>
              {totalCO2Saved.toFixed(0)}
            </div>
          </div>
        </div>

        <div className="cc-hero-saved">
          <div className="cc-label" style={{ marginBottom: "6px" }}>You've saved</div>
          <div className="cc-big">{impact.savedKg}<span className="cc-big-unit">kg CO2</span></div>
          <div className="cc-milestone-row"><span>{impact.nextMilestone}</span><span style={{ color: "var(--cc-sage)", fontWeight: 600 }}>{impact.progress}%</span></div>
          <div className="cc-progress cc-progress--thin"><div className="cc-progress-fill sage" style={{ width: `${impact.progress}%` }} /></div>
        </div>

        <div className="cc-grid-2x3">
          <div className="cc-stat"><div className="cc-stat-num">{impact.milesNotDriven}</div><div className="cc-stat-label">miles not driven</div></div>
          <div className="cc-stat"><div className="cc-stat-num">{impact.dayStreak}</div><div className="cc-stat-label">day streak</div></div>
          <div className="cc-stat"><div className="cc-stat-num">{impact.treesWorth}</div><div className="cc-stat-label">trees' worth</div></div>
          <div className="cc-stat"><div className="cc-stat-num">{impact.purchasesSwitched}</div><div className="cc-stat-label">purchases switched</div></div>
        </div>

        <div className="cc-stat cc-stat--flight">
          <div className="cc-stat-num">{impact.flightAmount}</div>
          <div className="cc-stat-label">{impact.flightLabel}</div>
        </div>
      </div>
    </div>
  );
}
