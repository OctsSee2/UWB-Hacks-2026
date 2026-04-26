# CLAUDE.md

## Backend Server Architecture

The backend currently uses a single Express server defined in:

- `backend/server.ts`

Use `AGENTS.md` as the canonical backend flow reference for route order and startup sequence.

Claude-specific guardrails:

1. Keep the root health route `GET /` returning `Backend running` unless requirements change.
2. Preserve JSON middleware registration before adding request handlers.
3. Keep server bootstrap centered in `backend/server.ts` unless a refactor is requested.
