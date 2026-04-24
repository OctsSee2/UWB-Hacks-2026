# AGENTS.md for CarbonCart (UWB Hacks 2026)

This file is the working guide for coding agents in this repository.

It combines:
- The hackathon product specification (CarbonCart_Project_Specification.docx)
- The current codebase state in this repo

Use this as the source of truth for implementation decisions unless the user gives newer instructions.

## 1) Project Mission

CarbonCart is a Chrome extension that makes shopping emissions visible at decision time.

When users view products online, CarbonCart should:
- Estimate product carbon footprint (kg CO2e)
- Show an ethics score
- Explain delivery speed impact on emissions
- Recommend lower-emission alternatives (Etsy/local)
- Track personal cumulative impact

Primary tone:
- Informative and empowering
- No guilt language
- Red means data signal (high emissions), not moral judgment

## 2) Hackathon Context

Event:
- UWB Hacks 26 (48-hour build)

Track fit:
- Climate: emissions estimation and reduction education
- City and Society: local maker alternatives and community economy support

Sponsor intent in spec:
- Gemma 4: classification and scoring
- ElevenLabs: optional voice summary
- Auth0: optional account identity for sync
- DigitalOcean: backend hosting

## 3) Current Repository State (Important)

Current top-level files/folders:
- `extension/manifest.json`
- `extension/content.js`
- `extension/styles.css`
- `index.tsx` (empty)

What is implemented now:
- Manifest V3 content script + CSS injection
- UI rendered directly from `extension/content.js`
- Floating bubble exists and is draggable
- Popup panel appears fixed near top-right
- Product-page heuristics and refresh logic are present

Current site scope in code:
- Amazon, Target, Walmart

Important mismatch vs spec:
- Spec prioritizes Amazon + Shein (+ Temu stretch)
- Repo currently does not include Shein/Temu selectors in manifest or logic

When implementing new work, prefer to align runtime support with spec priorities unless user overrides.

## 4) Product Requirements Summary

### 4.1 Core user-facing features

1. Real-time product footprint:
- Total estimated kg CO2e
- Traffic-light display (green/amber/red)
- Real-world equivalencies
- Source attribution text

2. Ethics score:
- Score out of 100
- Signal tags (materials, supply chain, shipping mode, transparency)

3. Delivery speed impact:
- Show speed multipliers compared to standard
- Communicate same-day penalty clearly

4. Etsy alternatives:
- Top 3 alternatives with image, seller location, CO2e, ethics, price
- Explain expected CO2e savings

5. Personal impact tracker:
- Cumulative CO2e saved
- Purchases switched
- Streak
- Milestones (Seedling/Sapling/Tree/Forest)

### 4.2 UX principles from spec

- Educational, not preachy
- No moralizing copy
- Keep major numbers visually dominant
- Include equivalency near every major CO2e number
- Minimum readable typography (>= 11px)

## 5) Design Tokens and Visual Rules

Primary palette from spec:
- Moss: `#386641`
- Sage: `#6A994E`
- Leaf: `#A7C957`
- Linen: `#F2E8DC`
- White surface: `#FFFFFF`

Traffic-light ranges:
- Low: 0-4 kg CO2e
- Medium: 4-12 kg CO2e
- High: 12+ kg CO2e

Current stylesheet already defines an adapted token set in `extension/styles.css`. Keep edits consistent with those tokens unless asked to redesign.

## 6) Emissions Methodology (Spec)

Use this conceptual formula:

`Total CO2e = (Base x CountryMultiplier) + (Shipping x SpeedMultiplier) + LastMile + Packaging`

Data layers described in spec:
- Product base factors from EPA USEEIO v1.3 (NAICS mapped)
- Country grid multiplier (IEA/OWID-derived lookup)
- Shipping leg by mode x distance x weight
- Delivery speed multiplier (MIT research)
- Packaging constant

Current status:
- UI currently uses placeholder values
- Back-end/API data flow is not yet implemented in this repo

If you add data logic, keep all outputs labeled as estimates.

## 7) Delivery Speed Multipliers (Spec)

- Same-day: x1.56 (about +56%)
- Next-day: x1.40
- 2-day: x1.20
- Standard: x1.00
- Economy: x0.80

Use these as constants unless user provides an updated source table.

## 8) Store Support Priorities

Target priority from spec:
1. Amazon
2. Shein
3. Temu

Current code support:
1. Amazon
2. Target
3. Walmart

When updating store support:
- Update both `extension/manifest.json` match patterns and `extension/content.js` detection/selectors
- Keep selectors isolated by store section for maintainability

## 9) Architecture Guidance

Spec target architecture:
- Content script: scrape product data from DOM
- Background/service worker: orchestrate API and storage
- Popup UI: 3-tab extension popup
- Floating in-page badge
- Backend API (Node/FastAPI) for AI + Etsy + emissions calls

Current repository architecture:
- Single content script renders both badge and popup UI inline
- No background worker file yet
- No backend code in this repo yet

If adding architecture pieces, do incremental PR-sized changes and preserve current working behavior.

## 10) Data Sources and Integrations (Spec Intent)

Planned sources:
- EPA USEEIO v1.3 (CSV, baked at build-time)
- Etsy Open API
- Climatiq freight endpoint (optional/fallback ready)
- Gemma/Gemini for classification + scoring
- IEA/OWID country grid data
- Carbon Catalogue for validation/tuning

Integration policy for agents:
- Prefer deterministic local constants/fallbacks when APIs fail
- Do not block UI rendering on external API failures
- Show user-safe fallback language when data is unavailable

## 11) Transparency and Trust Rules

Always:
- Mark values as estimated
- Keep source attribution visible where practical
- Use approximate formatting (for example `~14 kg`, not false precision)
- Avoid claims of live audited product LCAs unless actually supported

Never:
- Use shaming language
- Present uncertain numbers as exact facts

## 12) 48-Hour Build Prioritization

Suggested implementation order from spec:
1. Stable extension scaffold and scraping
2. Core emissions estimate path
3. Alternatives flow
4. Impact tracker
5. Polish and demo hardening

For this repo specifically, preferred near-term sequence:
1. Align store scope with spec (Amazon + Shein, Temu stretch)
2. Replace static values with structured estimate pipeline
3. Introduce background worker for cleaner architecture
4. Add resilient API/fallback handling

## 13) Agent Workflow Rules for This Repo

- Keep changes minimal and scoped to user ask.
- Do not commit temporary artifacts (zip handoffs, `.DS_Store`, extracted folders).
- Preserve existing class names and UI structure unless redesign is requested.
- For content script logic, guard against dynamic SPA navigation and delayed DOM loads.
- Prefer constants/util helpers over magic numbers.
- Keep extension behavior safe on unsupported pages (remove/hide injected UI).

## 14) Local Run and Verification

This repo is a Chrome extension, not a packaged web app currently.

Manual run flow:
1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked extension from the `extension/` folder
4. Refresh target product page after script/style changes

Verification checklist for UI changes:
- Bubble appears only on product pages
- Bubble is draggable and remains on screen bounds
- Popup opens/closes cleanly and aligns near top-right
- No overlap with critical buy/cart controls
- No console errors on load

## 15) Demo Narrative (Spec)

Suggested short demo flow:
1. Open high-emission product page
2. Show CarbonCart analysis score and delivery impact
3. Open alternatives and show lower-emission options
4. Open impact tab and show cumulative savings

Use concrete equivalencies and concise explanation of user benefit.

## 16) Out of Scope (Unless User Asks)

- Browser ports beyond Chrome
- Full social features
- Carbon offsets checkout integrations
- Claims of real-time audited product LCA accuracy

---

If a request conflicts with this file, follow direct user instructions first, then update this file to reflect the new source of truth.