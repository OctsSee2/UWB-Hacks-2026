# Backend Agent Flow Documentation

## Updated backend flow

Source of truth: `backend/server.ts`

1. Load environment variables with `dotenv.config()`.
2. Create an Express app.
3. Register JSON body parsing with `app.use(express.json())`.
4. Expose a health/root route: `GET /` responds with `Backend running`.
5. Start the backend on port `3000` and log `Server running on http://localhost:3000`.
