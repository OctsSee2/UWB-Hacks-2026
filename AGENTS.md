# AGENTS.md

This file guides coding agents working in the **UWB-Hacks-2026 overview branch context**.

## Project context

This branch contains planning/reference documents and TypeScript type definitions:

- `backend_flow.txt` — product inference and control-flow design
- `data_sources_old.txt` — candidate external APIs by domain
- `demo_products_old.txt` — sample product URLs for demo/testing scenarios
- `product_types.txt` — broad product category taxonomy
- `purpose.txt` — problem statement and UVP
- `types/` — TypeScript interfaces and enums defining the data model

Use these files as source-of-truth context unless the user gives newer instructions.

## What this project is building

The project vision is a shopping assistant that:

- Detects products from frontend pages
- Enriches product data using barcode/category anchors and external APIs
- Produces product **inferences** (reputation, origin, functionality, pricing, reviews, ethics, environmental impact, recalls, etc.)
- Builds an **AuditTrail** of every calculation step and source used
- Returns `RawDataInferences` and `CalculationData` to the frontend UX
  
##TypeScript types reference

All types live in `types/`. Agents should read these before generating or editing any data-model code.

### `ProductType` (`types/product_types.ts`)
Enum of broad product categories (e.g. Tables, Bananas, Gaming PCs, Lip Gloss, Blenders, Shelves, TVs). Current values: `Clothing`, `Electronic`.
More specific subtypes are listed in `product_types.txt` and should be added to this enum as the model matures.

### `ScrapedData` (`types/scraped_data.ts`)
Data extracted directly from a product webpage before any AI enrichment:
- `productTitle: string`
- `components: ProductComponent[]` — ingredients, parts, fabric types, etc.
- `features: ProductFeature[]`
- `weight: ProductWeight`
- `reviewsRating: number`
- `reviewsCount: number`
- `overallOrigin: Country | null | string`

### `RawDataInference` (`types/raw_data_inferences.ts`)
Structured enrichment object built after querying external APIs. Fields currently defined:
- `companyReputation: CompanyReputation`
- `countryOrigin: Country | null`

Fields to be added (per `backend_flow.txt`):
- `functionality`
- `price`
- `ingredients`
- `userReviewSentiment` — aggregate sentiment plus individual user reviews
- `alternativeProducts` — alternatives on other platforms, each with their own inferences
- `healthiness`
- `fdaInformation`
- `productRecalls`
- `shippingInfo` — includes environment impact and fuel usage
- `carbonFootprint`
- `overallEthicsRating` — covers labor conditions, environment, animal cruelty, etc.

### `CalculationData` (`types/calculation_data.ts`) — planned
Object that documents the reasoning behind a single inference entry:
- `steps: CalculationStep[]`
- `sources: CalculationSource[]`

### `CalculationStep` (`types/calculation_step.ts`) — planned
A single action performed during a calculation, described in plain English:
- `action: string`

### `CalculationSource` (`types/calculation_source.ts`) — planned
A linkable source (URL, API, or other) used during a calculation:
- `source: string` — URL, API name, or other reference

### `AuditTrail` (`types/audit_trail.ts`) — planned
Array of `CalculationData` objects sorted in reverse chronological order (most recent first). Pushed to the frontend alongside `RawDataInferences` so users can inspect how each inference was derived.

### `AIInterpretedInference` (`types/ai_interpreted_inference.ts`)
AI-generated layer on top of `RawDataInference`. Currently an empty interface — to be filled as the AI interpretation layer is designed.

### `CompanyReputation` (`types/company_reputation.ts`)
- `normalizedRating: number` — 0.0 to 1.0
- `description: string`

### `ProductComponent` (`types/product_component.ts`)
Represents one ingredient, part, or material:
- `name: string`
- `details: string[]`
- `countryOrigin: Country | null`

### `ProductFeature` (`types/product_feature.ts`)
A single product feature:
- `name: string`
- `description: string`

### `ProductWeight` (`types/product_weight.ts`)
- `value: number`
- `unit: WeightUnit`

### `WeightUnit` (`types/weight_unit.ts`)
Union type: `"gram" | "pound" | "ton" | "kilogram"`

### `Country` (`types/country.ts`)
ISO 3166-1 alpha-2 union type covering all recognized country codes (e.g. `"US"`, `"CN"`, `"DE"`).

## Agent priorities

1. Keep changes scoped to the user’s request.
2. Preserve and improve clarity of planning artifacts.
3. Prefer editing existing docs over creating duplicate files.
4. Keep terminology consistent across all three context files.

## Editing rules for this branch

- Maintain the existing plain-text, outline-style format.
- Keep category groupings in `data_sources.txt` stable (`Food`, `Electronics`, `Generic`, `Environmental`, `Other`) unless explicitly asked to restructure.
- When adding data sources, include both:
  - purpose/domain
  - URL (and whether account/auth is required when known)
- When adding demo products, keep examples diverse across categories and retailers.

## Validation expectations

Because this branch is documentation-only today:

- There are currently no repository lint/build/test commands to run.
- Validate by checking internal consistency:
  - no contradictory flow steps
  - no broken structure in section hierarchies
  - no duplicate/conflicting source entries

## PR/change expectations for agents

- Use concise, descriptive commit messages.
- In change summaries, state exactly which planning assumptions were updated.
- If new implementation assumptions are introduced, add them explicitly to the relevant context file.

## If scope changes

If executable code is later added to this branch, update this file with:

- concrete setup commands
- lint/build/test commands
- language/framework-specific development conventions
