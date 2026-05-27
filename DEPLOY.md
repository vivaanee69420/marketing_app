# Railway Deployment

Two Railway services from this one repo (git root = `marketing_app/`):

| Service    | Root Directory | Builder    | Serves                         | Healthcheck |
|------------|----------------|------------|--------------------------------|-------------|
| `backend`  | `backend`      | Dockerfile | Express API (`/api/*`, `:$PORT`) | `/health`   |
| `frontend` | `frontend`     | Dockerfile | nginx static SPA (`dist/`)       | `/healthz`  |

Postgres + Auth are external (Supabase). No DB service on Railway.

```
  browser
     │  static + /api fetch (CORS)
     ▼
┌──────────┐        ┌──────────┐        ┌──────────────────┐
│ frontend │ ─────► │ backend  │ ─────► │ Supabase (extern)│
│  nginx   │  CORS  │ Express  │   pg   │ Postgres + Auth  │
└──────────┘        └──────────┘        └──────────────────┘
```

## One-time setup

1. **New project → Deploy from GitHub repo.** Point at this repo.
2. **Create two services** from the same repo. For each, set **Settings → Root Directory**:
   - backend service → `backend`
   - frontend service → `frontend`
   Railway auto-detects each service's `railway.json` + `Dockerfile`.
3. Set env vars (below), then deploy **backend first** (frontend build needs its URL).

## Backend service — Variables

| Var | Value |
|-----|-------|
| `DATABASE_URL` | Supabase Postgres connection string (direct/pooled) |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only) |
| `ENCRYPTION_KEY` | 32-byte hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `APP_ORG_ID` | seeded `organizations.id` (uuid) |
| `NODE_ENV` | `production` (marks session cookies Secure) |
| `WEB_ORIGIN` | frontend public URL — set as reference var `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |

`PORT` is injected by Railway — do not set it (`index.js` reads `process.env.PORT`).

## Frontend service — Variables

| Var | Value |
|-----|-------|
| `VITE_API_BASE_URL` | backend public URL — reference var `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}` |

`VITE_API_BASE_URL` is a **build-time** value (Vite inlines it into the bundle). The
Dockerfile reads it as a build `ARG`; Railway passes the same-named service variable in
at build. **Changing the backend URL requires a frontend redeploy** (rebuild).

## URL ordering (chicken-and-egg)

Both services need each other's public URL. Railway reference variables
(`${{service.RAILWAY_PUBLIC_DOMAIN}}`) resolve this without hardcoding:

1. Deploy backend → it gets a public domain.
2. Set frontend `VITE_API_BASE_URL = https://${{backend.RAILWAY_PUBLIC_DOMAIN}}`, deploy frontend.
3. Set backend `WEB_ORIGIN = https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}`, redeploy backend.

After step 3, CORS on the backend allows the real frontend origin (it allows exactly one
origin with `credentials:true`, so the value must be exact — no trailing slash).

## Local Docker sanity check

```bash
# backend
cd backend && docker build -t mkt-api . && \
  docker run --rm -p 4000:4000 --env-file .env mkt-api

# frontend (bake the API URL at build)
cd frontend && docker build --build-arg VITE_API_BASE_URL=http://localhost:4000 -t mkt-web . && \
  docker run --rm -p 8080:80 mkt-web   # → http://localhost:8080
```
