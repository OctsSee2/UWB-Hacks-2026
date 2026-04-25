# AGENTS.md

This file guides coding agents working in the **UWB-Hacks-2026 overview branch context**.

## Project context

This branch currently contains planning/reference documents, not executable app code:

- `backend_flow.txt` — product inference and control-flow design
- `data_sources.txt` — candidate external APIs by domain
- `demo_products.txt` — sample product URLs for demo/testing scenarios

Use these files as source-of-truth context unless the user gives newer instructions.

## What this project is building

The project vision is a shopping assistant that:

- Detects products from frontend pages
- Enriches product data using barcode/category anchors and external APIs
- Produces product **inferences** (reputation, origin, functionality, pricing, reviews, ethics, environmental impact, recalls, etc.)
- Returns those inferences to frontend UX

## Agent priorities

1. Keep changes scoped to the user’s request.
2. Preserve and improve clarity of planning artifacts.
3. Prefer editing existing docs over creating duplicate files.
4. Keep terminology consistent across all three context files.

## Editing rules for this branch

- Maintain the existing plain-text, outline-style format.
- Keep category groupings stable (`Food`, `Electronics`, `Generic`, `Environmental`, `Other`) unless explicitly asked to restructure.
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
