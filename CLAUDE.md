# CLAUDE.md — Marketing ROI Command Center (SaaS)

Guide for AI agents building this repo. Read before writing code. Pair with
`docs/PRD.md`, `docs/SPEC.md`, `docs/DESIGN.md`, `docs/SECTIONS.md`,
`docs/ROADMAP.md`.

## What we're building
Multi-tenant B2B SaaS marketing-ROI command center. Orgs sign up, connect Meta +
Google Ads, log conversions, get a daily Claude report + auto-tasks + email
digest, across many businesses (locations). Greenfield rebuild of `../m1` (the
functional reference — read it for behavior, don't copy its stack).

## Stack (non-negotiable for this project)
- **Frontend:** React 19 + **Vite** SPA · React Router · TanStack Query · plain
  CSS + CSS variables (NO Tailwind/UI kit).
- **Backend:** **Node.js + Express** (TypeScript).
- **DB:** **Supabase / PostgreSQL**. **NO ORM** — raw parameterized SQL via `pg`
  (or `@supabase/supabase-js`). Schema/migrations are `.sql` files in `db/`.
- **Auth:** **Supabase Auth** (users in `auth.users`). **Organizations** = tenants,
  owned in our own tables (`organizations`/`memberships`), not an external mirror.
- **AI:** **Anthropic Claude** (`@anthropic-ai/sdk`), default `claude-sonnet-4-6`.
- **Email:** Resend. **Validation:** Zod (every endpoint). **Runtime:** Node 20+.

## Hard rules
1. **Tenant isolation is sacred.** Every domain row has `org_id`. Supabase RLS
   filters on `current_setting('app.current_org')`. The API verifies the **Supabase
   JWT**, resolves org from the user's **`memberships`** (active-org claim or
   selection) — never from request body/query. Open a transaction per request
   and `SET LOCAL app.current_org = $orgUuid`. No endpoint returns another org's
   data. Prove it with tests.
2. **No ORM.** Parameterized SQL only. Never string-concatenate user input.
3. **Encrypt OAuth tokens at rest** (AES-256-GCM, `ENCRYPTION_KEY`). The `*_enc`
   columns hold ciphertext. `m1` stored plaintext — that bug must not return.
4. **Validate every input with Zod.** `m1` had none; 400 with field errors.
5. **Fail loud, not silent.** Sync/report/email failures → `dashboard_issues`
   (raise/auto-resolve), never swallow without a trace.
6. **Heuristic AI fallback.** If `ANTHROPIC_API_KEY` is missing or the call
   fails, the report engine returns heuristic insights — never hard-fail.
7. **Secrets stay server-side.** Only `VITE_`-prefixed vars reach the client.

## Conventions
- TypeScript strict. Shared types for API request/response in a `packages/`
  or duplicated `types.ts` — keep web and api in sync.
- Money: `numeric(12,2)` in DB; format on client with `Intl.NumberFormat`
  (GBP, 0 decimals). Dates: store UTC; display `dd MMM yyyy` en-GB.
- DB access through one helper: `withOrg(orgId, async (tx) => ...)` that sets the
  session var and runs queries in a transaction.
- Attribution confidences are fixed: utm-adset 0.91, utm-campaign 0.82,
  fallback 0.55. ROI math: `roas=rev/spend`, `roi%=(rev-spend)/spend*100`,
  `cpc=spend/conv`, all guarded for divide-by-zero.
- Cron iterates every org with per-org try/catch; one org's failure never blocks
  the rest. Endpoints gated by `CRON_SECRET`.

## Reference APIs (live in v1)
- Meta Graph **v20.0** `/act_<id>/insights` (level=ad, time_increment=1).
- Google Ads **v17** `googleAds:searchStream` GAQL (`ad_group_ad`,
  `LAST_30_DAYS`, `cost_micros`/1e6).
- Anthropic Messages API — JSON-only system prompt for report shape:
  `{summary, wins, losses, issues, opportunities, creativeIdeas, adCopyIdeas, nextActions}`.
- Resend `POST /emails`.

## App shape
11 pages / 10 nav links / ~56 sections — full inventory in `docs/SECTIONS.md`.
Design tokens + component specs in `docs/DESIGN.md`. Build in the order in
`docs/ROADMAP.md`; each milestone must be runnable + isolation-safe before moving on.

## What changed vs m1 (so you don't copy mistakes)
- Added multi-tenancy (`org_id` + RLS) — m1 was single-tenant.
- Supabase Auth replaces basic-auth + the `User` table (users live in `auth.users`).
- Supabase + raw SQL replaces Prisma/Postgres.
- Anthropic replaces the OpenAI responses API.
- Vite SPA + Express replaces Next.js App Router.
- Tokens encrypted (m1 stored plaintext). Zod validation added (m1 had none).
  Tests required (m1 had none).
</content>
