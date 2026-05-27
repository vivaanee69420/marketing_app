# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Backend — Express 5 API (ESM, raw SQL via pg → Supabase Postgres)
# Railway service. DB is external (Supabase), so no DB container here.
#
#   build  ──►  install prod deps only (drops nodemon)
#   run    ──►  node index.js, listens on $PORT (Railway injects PORT)
#
# Required Railway env vars (Service → Variables):
#   DATABASE_URL  SUPABASE_URL  SUPABASE_ANON_KEY  SUPABASE_SERVICE_ROLE_KEY
#   ENCRYPTION_KEY  APP_ORG_ID  NODE_ENV=production
#   WEB_ORIGIN = the frontend service public URL (for CORS)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install prod deps first for layer caching. package-lock.json present → npm ci.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# App source (node_modules excluded via .dockerignore).
COPY . .

# Documentation only — Railway routes to whatever $PORT the process binds.
EXPOSE 4000

CMD ["node", "index.js"]
