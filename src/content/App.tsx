import { useEffect, useMemo, useRef, useState } from "react";
import { goalKey, onboardingKey, zipKey } from "./config";
import { readTotalCO2Saved } from "./co2Storage";
import { setupDraggableBubble } from "./drag";
import { calculateProductAnalysis, getDemoAnalysisData } from "./emissions";
import { IconArrow, IconBolt, IconCheck, IconInfo, IconLeaf, IconLogo } from "./icons";
import { scrapeProductData } from "./scraper";
import type { DemoAnalysisData, ViewName } from "./types";

// ── Types ────────────────────────────────────────────────────

type CarbonCartAppProps = { productTitle: string };

type HeaderProps = {
  onClose: () => void;
  emissionsLevel: string;
  emissionsLevelClass: EmissionsLevelClass;
};

type TabsProps = {
  view: ViewName;
  onChange: (view: ViewName) => void;
};

type OnboardingPanelProps = {
  active: boolean;
  onComplete: (zip: string, goalKg: number) => void;
};

type AnalysisPanelProps = {
  active: boolean;
  analysis: DemoAnalysisData;
  productTitle: string;
  alternativesCount: number;
  isAnalyzing: boolean;
  onSeeAlternatives: () => void;
  showAudit: boolean;
  onToggleAudit: () => void;
  emissionsLevelClass: EmissionsLevelClass;
  ethicsScoreClass: EmissionsLevelClass;
};

type DemoPanelProps = {
  active: boolean;
  analysis: DemoAnalysisData;
  isAnalyzing?: boolean;
};

type ImpactPanelProps = { active: boolean; analysis: DemoAnalysisData };

type SettingsPanelProps = {
  active: boolean;
  zip: string;
  goalKg: number;
  totalCO2Saved: number;
  onSave: (zip: string, goalKg: number) => void;
  onSetTotalCO2Saved: (val: number) => void;
};

type TabView = Exclude<ViewName, "onboarding">;
type EmissionsLevelClass = "low" | "medium" | "high" | "loading";

// ── Constants ────────────────────────────────────────────────

const GOAL_OPTIONS: { kg: number; context: string }[] = [
  { kg: 30,  context: "≈ 120 miles not driven" },
  { kg: 50,  context: "≈ 200 miles not driven" },
  { kg: 100, context: "≈ 400 miles not driven" },
  { kg: 200, context: "≈ 800 miles not driven" },
];

// ── Helpers ──────────────────────────────────────────────────

function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

function getEmissionsLevelClass(level: string): EmissionsLevelClass {
  const n = level.toLowerCase();
  if (n.includes("low")) return "low";
  if (n.includes("medium")) return "medium";
  return "high";
}

function getEthicsScoreClass(score: number): EmissionsLevelClass {
  if (score >= 60) return "low";
  if (score > 30) return "medium";
  return "high";
}

// ── CarbonCartApp ────────────────────────────────────────────
function cleanDisplayBrand(rawBrand: string | undefined): string {
  return (rawBrand || "")
    .replace(/^visit\s+the\s+/i, "")
    .replace(/\s+store$/i, "")
    .replace(/^brand:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDisplayProductTitle(rawTitle: string, brand?: string): string {
  const normalized = rawTitle
    .replace(/^visit\s+the\s+.+?\s+store\s*/i, "")
    .replace(/\bvisit\s+the\s+.+?\s+store\b/gi, "")
    .replace(/\bamazon\.?com\b/gi, "")
    .replace(/\bamazon\s+fire\s+tv\s+store\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\((newest model|latest model|with [^)]+)\)/gi, "")
    .replace(/\b(renewed|amazon choice|prime eligible)\b/gi, "")
    .trim();

  const beforeFirstComma = normalized.split(",")[0]?.trim() || normalized;
  const beforeFeaturePhrase = beforeFirstComma
    .split(/\b(with|featuring|includes)\b/i)[0]
    ?.trim() || beforeFirstComma;

  const words = beforeFeaturePhrase.split(" ").filter(Boolean);
  const shortWords = words.slice(0, 6).join(" ");
  const cleanedBrand = cleanDisplayBrand(brand);

  if (!shortWords) return cleanedBrand || "this product";
  if (!cleanedBrand) return shortWords;

  const startsWithBrand = shortWords.toLowerCase().startsWith(cleanedBrand.toLowerCase());
  return startsWithBrand ? shortWords : `${cleanedBrand} ${shortWords}`;
}

export function CarbonCartApp({ productTitle }: CarbonCartAppProps) {
  const badgeRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewName>("analysis");
  const [suppressToggleUntil, setSuppressToggleUntil] = useState(0);
  const [isOnboarded, setIsOnboarded] = useState(
    () => localStorage.getItem(onboardingKey) === "1"
  );
  const [zip, setZip] = useState(() => localStorage.getItem(zipKey) || "");
  const [goalKg, setGoalKg] = useState(() => {
    const saved = localStorage.getItem(goalKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [totalCO2Saved, setTotalCO2Saved] = useState(() => readTotalCO2Saved());

  const productData = useMemo(() => scrapeProductData(), [productTitle]);
  const initialAnalysis = useMemo(
    () => getDemoAnalysisData(productData, zip || undefined),
    [productData, zip]
  );
  const [analysis, setAnalysis] = useState<DemoAnalysisData>(initialAnalysis);
  const [showAudit, setShowAudit] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const clickableAlternativesCount = useMemo(
    () =>
      isAnalyzing
        ? 0
        : analysis.alternatives.filter((alternative) => isLikelyHttpUrl(alternative.url)).length,
    [analysis.alternatives, isAnalyzing]
  );
  const displayTitle = useMemo(
    () => buildDisplayProductTitle(analysis.productTitle || productTitle, productData.brand),
    [analysis.productTitle, productTitle, productData.brand]
  );
  const emissionsLevelClass = getEmissionsLevelClass(analysis.emissionsLevel);
  const ethicsScoreClass = getEthicsScoreClass(analysis.ethicsScore);

  useEffect(() => {
    setIsAnalyzing(true);
    setAnalysis(initialAnalysis);
    setShowAudit(false);
  }, [initialAnalysis]);

  useEffect(() => {
    console.log("Scraped Product:", productData);
    chrome.runtime.sendMessage({ type: "PRODUCT_SCRAPED", data: productData });
  }, [productData]);

  useEffect(() => {
    let isActive = true;
    setIsAnalyzing(true);

    calculateProductAnalysis(productData, zip || undefined)
      .then((nextAnalysis) => {
        if (isActive) {
          setAnalysis(nextAnalysis);
          setIsAnalyzing(false);
        }
      })
      .catch((error) => {
        console.error("Product emissions analysis failed:", error);
        if (isActive) {
          setIsAnalyzing(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [productData, zip]);

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
    return setupDraggableBubble(root, badge, () => setSuppressToggleUntil(Date.now() + 250));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const setPanelView = (v: ViewName) => setView(v);

  const togglePopup = () => {
    if (Date.now() < suppressToggleUntil) return;
    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
      setPanelView("analysis");
    }
  };

  const completeOnboarding = (newZip: string, newGoalKg: number) => {
    localStorage.setItem(zipKey, newZip);
    localStorage.setItem(goalKey, String(newGoalKg));
    localStorage.setItem(onboardingKey, "1");
    setZip(newZip);
    setGoalKg(newGoalKg);
    setIsOnboarded(true);
    setPanelView("analysis");
  };

  const handleSettingsSave = (newZip: string, newGoalKg: number) => {
    localStorage.setItem(zipKey, newZip);
    localStorage.setItem(goalKey, String(newGoalKg));
    setZip(newZip);
    setGoalKg(newGoalKg);
  };

  const handleSetCO2 = (value: number) => {
    setTotalCO2Saved(value);
    const CO2_KEY = "carboncart_co2saved_v1";
    localStorage.setItem(CO2_KEY, String(value));
    void chrome.storage.local.set({ emissionSavingsPercent: value });
  };

  const onboardingMode = view === "onboarding";
  const visibleEmissionsLevel = isAnalyzing ? "Analyzing" : analysis.emissionsLevel;
  const visibleEmissionsLevelClass = isAnalyzing ? "loading" : emissionsLevelClass;

  return (
    <>
      <button ref={badgeRef} className="cc-float-badge" aria-label="Open CarbonCart" onClick={togglePopup}>
        <div className={`cc-float-circle ${visibleEmissionsLevelClass}`}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "15px", lineHeight: 1 }}>{isAnalyzing ? "..." : analysis.carbonKg}</div>
            <div style={{ fontSize: "9px", fontWeight: 500, opacity: 0.9 }}>{isAnalyzing ? "" : "kg"}</div>
          </div>
        </div>
        <div className="cc-float-mid">
          <div className="cc-float-label">{visibleEmissionsLevel}</div>
          <div className="cc-float-alt"><IconLeaf size={11} /> {isAnalyzing ? "Collecting data" : `${clickableAlternativesCount} alternatives`}</div>
        </div>
      </button>

      <section className={`cc-popup-shell ${open ? "" : "cc-hidden"}`} aria-live="polite">
        <div className="cc-popup-pointer" />
        <div className={`cc-popup ${onboardingMode ? "cc-onboarding-mode" : ""}`}>
          <Header
            onClose={() => setOpen(false)}
            emissionsLevel={visibleEmissionsLevel}
            emissionsLevelClass={visibleEmissionsLevelClass}
          />
          <Tabs view={view} onChange={setPanelView} />
          <OnboardingPanel active={view === "onboarding"} onComplete={completeOnboarding} />
          <AnalysisPanel
            active={view === "analysis"}
            analysis={analysis}
            productTitle={displayTitle}
            alternativesCount={clickableAlternativesCount}
            isAnalyzing={isAnalyzing}
            onSeeAlternatives={() => setPanelView("alternatives")}
            showAudit={showAudit}
            onToggleAudit={() => setShowAudit((c) => !c)}
            emissionsLevelClass={emissionsLevelClass}
            ethicsScoreClass={ethicsScoreClass}
          />
          <AlternativesPanel active={view === "alternatives"} analysis={analysis} isAnalyzing={isAnalyzing} />
          <ImpactPanel active={view === "impact"} analysis={analysis} />
          <SettingsPanel
            active={view === "settings"}
            zip={zip}
            goalKg={goalKg}
            totalCO2Saved={totalCO2Saved}
            onSave={handleSettingsSave}
            onSetTotalCO2Saved={handleSetCO2}
          />
        </div>
      </section>
    </>
  );
}

// ── Header ───────────────────────────────────────────────────

function Header({ onClose, emissionsLevel, emissionsLevelClass }: HeaderProps) {
  return (
    <div className="cc-header">
      <div className="cc-logo">
        <span className="cc-logo-mark"><IconLogo size={22} /></span>
        <span>CarbonCart</span>
      </div>
      <div className="cc-header-right">
        <span className={`cc-badge-pill ${emissionsLevelClass}`}>
          <span className="cc-pill-dot" />
          {emissionsLevel}
        </span>
        <button className="cc-close" aria-label="Close CarbonCart" onClick={onClose}>{"×"}</button>
      </div>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────

function Tabs({ view, onChange }: TabsProps) {
  const tabs: { id: TabView; label: string }[] = [
    { id: "analysis",     label: "Analysis"  },
    { id: "alternatives", label: "Alternatives" },
    { id: "impact",       label: "My Impact" },
    { id: "settings",     label: "Settings"  },
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

// ── OnboardingPanel ──────────────────────────────────────────

function OnboardingPanel({ active, onComplete }: OnboardingPanelProps) {
  const [zip, setZipVal] = useState("");
  const [zipTouched, setZipTouched] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);

  const zipError = zipTouched && !isValidZip(zip) ? "Enter a valid 5-digit US zip code" : "";
  const canSubmit = isValidZip(zip) && selectedGoal !== null;

  return (
    <div className={`cc-panel cc-panel-onboarding ${active ? "" : "cc-hidden"}`} data-view="onboarding">
      <div className="cc-onb-hero">
        <svg viewBox="0 0 160 160" width="120" height="120" style={{ position: "relative", zIndex: 1 }}>
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
          CarbonCart shows you the carbon footprint of what you're buying and suggests greener alternatives.
        </div>

        <div className="cc-onb-form">
          <div>
            <label className="cc-field-label" htmlFor="cc-onb-zip">Your zip code</label>
            <input
              id="cc-onb-zip"
              className={`cc-input${zipError ? " error" : ""}`}
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 98011"
              value={zip}
              onChange={(e) => setZipVal(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onBlur={() => setZipTouched(true)}
            />
            {zipError && <div className="cc-field-error">{zipError}</div>}
          </div>

          <div>
            <label className="cc-field-label">Your carbon savings goal</label>
            <div className="cc-goal-grid">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.kg}
                  type="button"
                  className={`cc-goal-chip${selectedGoal === opt.kg ? " selected" : ""}`}
                  onClick={() => setSelectedGoal(opt.kg)}
                >
                  <div className="cc-goal-chip-kg">{opt.kg} kg CO₂</div>
                  <div className="cc-goal-chip-ctx">{opt.context}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="cc-cta"
          disabled={!canSubmit}
          onClick={() => { if (canSubmit) onComplete(zip, selectedGoal!); }}
        >
          Get started <IconArrow size={14} />
        </button>
      </div>
    </div>
  );
}

// ── AnalysisPanel ────────────────────────────────────────────

function isLikelyHttpUrl(value: string | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function AnalysisPanel({
  active,
  analysis,
  productTitle,
  alternativesCount,
  isAnalyzing,
  onSeeAlternatives,
  showAudit,
  onToggleAudit,
  emissionsLevelClass,
  ethicsScoreClass,
}: AnalysisPanelProps) {
  if (isAnalyzing) {
    return (
      <div className={`cc-panel ${active ? "" : "cc-hidden"}`} data-view="analysis">
        <div className="cc-product-strip">
          <div>Analyzing: <strong>{productTitle}</strong></div>
          <div className="cc-est">Collecting product data and calculating emissions...</div>
        </div>

        <div className="cc-body">
          <div className="cc-card cc-loading-card">
            <div className="cc-label">Analysis in progress</div>
            <div className="cc-loading-row">
              <span className="cc-loading-dot" />
              <span>Checking category, components, shipping, and greener alternatives.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <span className={`cc-bignum ${emissionsLevelClass}`}>{analysis.carbonKg}</span>
            <span className="cc-bignum-unit">kg CO2e</span>
          </div>
          <div className="cc-progress">
            <div className={`cc-progress-fill ${emissionsLevelClass}`} style={{ width: `${analysis.carbonPercent}%` }} />
          </div>
          {showAudit && (
            <div style={{ marginTop: "12px", padding: "12px", background: "rgba(255,255,255,0.08)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "10px" }}>Calculation details</div>
              {analysis.auditTrail.map((entry) => (
                <div key={entry.title} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "13px", fontWeight: 600 }}>
                    <span>{entry.title}</span>
                    <span style={{ textAlign: "right" }}>{entry.value}</span>
                  </div>
                  {entry.description && (
                    <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8 }}>{entry.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="cc-pill-row">
            <span className="cc-pill">{"≈"} {analysis.drivingEquivalent}</span>
            <span className="cc-pill">{"≈"} {analysis.treeGrowthEquivalent}</span>
            <span className="cc-pill">{"≈"} {analysis.phoneChargeEquivalent}</span>
          </div>
          <div className="cc-source">{analysis.source}</div>
        </div>

        <div className="cc-card">
          <div className="cc-label">Ethics score</div>
          <div className="cc-bignum-row">
            <span className={`cc-bignum ${ethicsScoreClass}`}>{analysis.ethicsScore}</span>
            <span className="cc-bignum-suffix">/100</span>
          </div>
          <div className="cc-progress">
            <div className={`cc-progress-fill ${ethicsScoreClass}`} style={{ width: `${analysis.ethicsScore}%` }} />
          </div>
          <div className="cc-pill-row">
            {analysis.ethicsTags.map((tag) => <span key={tag} className="cc-pill ghost">{tag}</span>)}
          </div>
        </div>

        <div className="cc-delivery">
          <div className="cc-delivery-icon"><IconBolt size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="cc-delivery-head">Shipping estimate</div>
            <div className="cc-delivery-body">{analysis.deliveryNote}</div>
            <div className="cc-compare">
              <span className="cc-pill ghost">{analysis.deliverySpeed}</span>
              <span className="cc-pill sage">{analysis.deliveryIncrease}</span>
            </div>
          </div>
        </div>

        <button className="cc-cta js-see-alternatives" onClick={onSeeAlternatives}>
          See {alternativesCount} greener alternatives <IconArrow size={14} />
        </button>
      </div>
    </div>
  );
}

// ── AlternativesPanel ────────────────────────────────────────

function AlternativesPanel({ active, analysis, isAnalyzing = false }: DemoPanelProps) {
  const clickableAlternatives = analysis.alternatives.filter((alternative) =>
    isLikelyHttpUrl(alternative.url)
  );

  return (
    <div className={`cc-panel ${active ? "" : "cc-hidden"}`} data-view="alternatives">
      <div className="cc-body">
        <div className="cc-cap" style={{ padding: "4px 2px 0" }}>Greener choices near you</div>
        <div className="cc-verify-note">
          Showing only alternatives with direct listing links.
        </div>

        {isAnalyzing ? (
          <div className="cc-verify-missing">Alternatives are still loading.</div>
        ) : null}

        {!isAnalyzing && clickableAlternatives.length === 0 ? (
          <div className="cc-verify-missing">No linked alternatives available for this product yet.</div>
        ) : null}

        {!isAnalyzing && clickableAlternatives.map((alternative) => (
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
            <a
              className="cc-verify-link"
              href={alternative.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open product
            </a>
          </div>
        ))}

        {analysis.savingsAmount ? (
          <div className="cc-save-banner">
            <div className="cc-save-banner-icon"><IconCheck size={12} /></div>
            <div>{analysis.savingsText}<strong>{analysis.savingsAmount}</strong>{analysis.savingsComparison}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── ImpactPanel ──────────────────────────────────────────────

function ImpactPanel({ active, analysis }: ImpactPanelProps) {
  const impact = analysis.impact;
  return (
    <div className={`cc-panel ${active ? "" : "cc-hidden"}`} data-view="impact">
      <div className="cc-body">
        <div className="cc-hero-saved">
          <div className="cc-label" style={{ marginBottom: "6px" }}>You've saved</div>
          <div className="cc-big">{impact.savedKg}<span className="cc-big-unit">kg CO2</span></div>
          <div className="cc-milestone-row">
            <span>{impact.nextMilestone}</span>
            <span style={{ color: "var(--cc-sage)", fontWeight: 600 }}>{impact.progress}%</span>
          </div>
          <div className="cc-progress cc-progress--thin">
            <div className="cc-progress-fill sage" style={{ width: `${impact.progress}%` }} />
          </div>
        </div>

        <div className="cc-grid-2x3">
          <div className="cc-stat"><div className="cc-stat-num">{impact.milesNotDriven}</div><div className="cc-stat-label">miles not driven</div></div>
          <div className="cc-stat"><div className="cc-stat-num">{impact.dayStreak}</div><div className="cc-stat-label">day streak</div></div>
          <div className="cc-stat"><div className="cc-stat-num">{impact.treesWorth}</div><div className="cc-stat-label">trees' worth</div></div>
          <div className="cc-stat"><div className="cc-stat-num">{impact.purchasesSwitched}</div><div className="cc-stat-label">purchases switched</div></div>
        </div>

      </div>
    </div>
  );
}

// ── SettingsPanel ────────────────────────────────────────────

function SettingsPanel({ active, zip, goalKg, totalCO2Saved, onSave, onSetTotalCO2Saved }: SettingsPanelProps) {
  const [draftZip, setDraftZip] = useState(zip);
  const [draftGoal, setDraftGoal] = useState<number | null>(goalKg || null);
  const [zipTouched, setZipTouched] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraftZip(zip);
    setDraftGoal(goalKg || null);
    setZipTouched(false);
  }, [zip, goalKg]);

  const zipError = zipTouched && !isValidZip(draftZip) ? "Enter a valid 5-digit US zip code" : "";
  const canSave = isValidZip(draftZip);

  const handleSave = () => {
    if (!canSave) return;
    onSave(draftZip, draftGoal ?? goalKg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`cc-panel ${active ? "" : "cc-hidden"}`} data-view="settings">
      <div className="cc-settings-body">

        <div className="cc-settings-section">
          <div className="cc-settings-section-title">Your location</div>
          <label className="cc-field-label" htmlFor="cc-settings-zip">Zip code</label>
          <input
            id="cc-settings-zip"
            className={`cc-input${zipError ? " error" : ""}`}
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 98011"
            value={draftZip}
            onChange={(e) => setDraftZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            onBlur={() => setZipTouched(true)}
          />
          {zipError && <div className="cc-field-error">{zipError}</div>}
        </div>

        <div className="cc-settings-section">
          <div className="cc-settings-section-title">Carbon savings goal</div>
          <div className="cc-goal-grid">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.kg}
                type="button"
                className={`cc-goal-chip${draftGoal === opt.kg ? " selected" : ""}`}
                onClick={() => setDraftGoal(opt.kg)}
              >
                <div className="cc-goal-chip-kg">{opt.kg} kg CO₂</div>
                <div className="cc-goal-chip-ctx">{opt.context}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="cc-settings-save-row">
          <button className="cc-cta" style={{ flex: 1 }} disabled={!canSave} onClick={handleSave}>
            {saved ? "Saved ✓" : "Save settings"}
          </button>
        </div>

        <div className="cc-dev-section">
          <div className="cc-settings-section-title">Dev tools</div>
          <div style={{ fontSize: "11px", color: "var(--cc-text-secondary)", marginBottom: "6px", fontWeight: 500 }}>
            CO₂ Saved
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
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--cc-moss)", minWidth: "36px" }}>
              {totalCO2Saved.toFixed(0)} kg
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
