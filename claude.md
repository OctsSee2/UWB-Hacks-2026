# UWB-Hacks-2026 — Project Context

## What this project is

An ethical shopping assistant that helps online consumers make informed purchasing decisions. It detects products on shopping pages, enriches them with data from external APIs, and surfaces structured **inferences** (origin, labor ethics, environmental impact, recalls, company reputation, etc.) in a frontend UX.

## Problem & audience

- Ethical product research is time-consuming and fragmented across many sources.
- Target users: online shoppers who care about ethics, sustainability, or specific causes.
- Goal: surface all relevant data in one click, at whatever depth the user wants.

## Architecture overview

```
Frontend detects product
        │
        ▼
Webpage Scraper → ScrapedData          ┐
        │                              │  Each step that queries an API,
        ▼                              │  does math, or uses AI reasoning
Barcode IDs Anchor Table               │  compiles a CalculationData object
  ──→  fill missing fields             │
        │                              │
        ▼                              │
DB Anchor Table                        │
  ──→  query external APIs             │
        │                              │
        ▼                              │
Build RawDataInferences object         ┘
        │
        ├──→ Push RawDataInferences to frontend
        └──→ Push CalculationData (AuditTrail) to frontend
```

See `backend_flow.txt` for the detailed control-flow spec.

## Key concepts

- **Broad product categories** — high-level buckets like Tables, Bananas, Gaming PCs, Lip Gloss, Blenders, Shelves, TVs. See `product_types.txt` and `types/product_types.ts` (`ProductType` enum).
- **ScrapedData** — raw fields extracted from the product webpage (title, components, features, weight, reviews, origin).
- **RawDataInference** — enriched data object after API queries (company reputation, country of origin, functionality, price, ingredients, reviews, healthiness, FDA info, recalls, shipping, carbon footprint, ethics rating).
- **CalculationData** — documents every step and source used to derive a single inference entry; an array of these forms the AuditTrail.
- **CalculationStep** — a single action performed during a calculation, described in plain English.
- **CalculationSource** — a linkable source (URL, API, etc.) used during a calculation.
- **AuditTrail** — array of `CalculationData` objects in reverse chronological order; pushed to frontend alongside `RawDataInferences`.
- **AIInterpretedInference** — AI-generated layer on top of raw data; interface is currently a placeholder.

## TypeScript data model (`types/`)

| File | Export | Purpose |
|---|---|---|
| `product_types.ts` | `ProductType` (enum) | Broad product category |
| `scraped_data.ts` | `ScrapedData` (interface) | Webpage-extracted fields |
| `raw_data_inferences.ts` | `RawDataInference` (interface) | API-enriched inference object |
| `ai_interpreted_inference.ts` | `AIInterpretedInference` (interface) | AI layer (placeholder) |
| `company_reputation.ts` | `CompanyReputation` (interface) | Normalized rating + description |
| `product_component.ts` | `ProductComponent` (interface) | Ingredient / part / material |
| `product_feature.ts` | `ProductFeature` (interface) | Named product feature |
| `product_weight.ts` | `ProductWeight` (interface) | value + unit |
| `weight_unit.ts` | `WeightUnit` (type) | `"gram" \| "pound" \| "ton" \| "kilogram"` |
| `country.ts` | `Country` (type) | ISO 3166-1 alpha-2 union |
| `misc_origin.ts` | `MiscOrigin` (type) | `"imported"` fallback |
| `calculation_data.ts` | `CalculationData` (interface) — planned | Steps + sources for one inference entry |
| `calculation_step.ts` | `CalculationStep` (interface) — planned | Single action described in English |
| `calculation_source.ts` | `CalculationSource` (interface) — planned | Linkable source (URL, API, etc.) |
| `audit_trail.ts` | `AuditTrail` (type) — planned | `CalculationData[]` in reverse-chron order |

See `AGENTS.md` for field-level documentation of each type.

## Branch layout

- `overview` — planning docs and TypeScript type definitions (no runnable app yet)
- Feature branches branch off `overview`

## Development notes

- No build/lint/test commands exist yet — this branch is pre-implementation.
- When executable code is added, update `AGENTS.md` with setup and test commands.
- Keep terminology consistent across `backend_flow.txt`, `AGENTS.md`, and this file.
