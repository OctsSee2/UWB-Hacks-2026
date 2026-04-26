# CLAUDE.md

## Backend flow (current)

The backend currently uses a single Express server defined in:

- `/home/runner/work/UWB-Hacks-2026/UWB-Hacks-2026/backend/server.ts`

Execution flow:

1. `dotenv.config()` initializes environment values.
2. `express()` creates the app instance.
3. `express.json()` middleware is enabled globally.
4. `GET /` returns `Backend running`.
5. `app.listen(3000)` starts the server and logs the local URL.
