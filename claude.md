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
Webpage Scraper → ScrapedData
        │
        ▼
Barcode IDs Anchor Table  ──→  fill missing fields from ScrapedData
        │
        ▼
DB Anchor Table  ──→  query external APIs for remaining fields
        │
        ▼
AI inference layer  ──→  RawDataInference → AIInterpretedInference
        │
        ▼
Push Inferences to frontend
```

See `backend_flow.txt` for the detailed control-flow spec.

## Key concepts

- **Broad product categories** — high-level buckets like Clothing, Electronics. See `product_types.txt` and `types/product_types.ts` (`ProductType` enum).
- **ScrapedData** — raw fields extracted from the product webpage (title, components, features, weight, reviews, origin).
- **RawDataInference** — enriched data object after API queries (company reputation, country of origin, and more fields planned).
- **AIInterpretedInference** — AI-generated layer on top of raw data; interface is currently a placeholder.
- **Inferences** — the full output object delivered to the frontend, combining raw and AI-interpreted data.

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

See `AGENTS.md` for field-level documentation of each type.

## Branch layout

- `overview` — planning docs and TypeScript type definitions (no runnable app yet)
- Feature branches branch off `overview`

## Development notes

- No build/lint/test commands exist yet — this branch is pre-implementation.
- When executable code is added, update `AGENTS.md` with setup and test commands.
- Keep terminology consistent across `backend_flow.txt`, `AGENTS.md`, and this file.
