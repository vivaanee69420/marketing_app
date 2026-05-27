# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Frontend — Vite + React 19 SPA, served as static files by nginx.
# Railway service.
#
#   build    ──►  node:22-alpine, `npm run build` → /app/dist
#   runtime  ──►  nginx:alpine serves /dist with SPA fallback, listens on $PORT
#
# VITE_API_BASE_URL is baked into the JS bundle AT BUILD TIME (Vite inlines
# import.meta.env.* at build). Railway injects the service variable of the same
# name as a build ARG. Set it to the backend service's public URL, e.g.
#   VITE_API_BASE_URL = https://<backend>.up.railway.app
# Changing the backend URL later requires a frontend rebuild (redeploy).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Build-time only. Railway passes the same-named service var as a build arg.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Railway injects PORT at runtime; nginx must listen on it. The official nginx
# image envsubst's /etc/nginx/templates/*.template at startup. Filter to PORT
# only so nginx runtime vars ($uri, $host, ...) are left untouched.
ENV PORT=80
ENV NGINX_ENVSUBST_FILTER=^PORT$

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]
