# Build Roadmap — vibe-coding order

Dependency-ordered milestones for building the SaaS from scratch. Each milestone
ends in something runnable + verifiable. Build in this order; don't skip ahead.

---

## Repo shape (monorepo)

```
marketing_app/
  apps/
    web/        # Vite + React SPA (Supabase Auth, React Router, TanStack Query)
    api/        # Node + Express (TS), pg, Zod, Supabase JWT verify, providers, cron
  db/
    schema.sql  # Supabase DDL + RLS (already drafted)
    migrations/ # incremental SQL
    seed.sql    # optional demo data (one demo org)
  docs/         # PRD, SPEC, DESIGN, SECTIONS, ROADMAP
  .env.example
  CLAUDE.md
```

---

## M0 — Foundations
- Init monorepo (`apps/web`, `apps/api`). TypeScript strict everywhere.
- Supabase project; apply `db/schema.sql` + RLS. Enable Supabase Auth providers (email + chosen OAuth). Wire `.env` from `.env.example`.
- API: Express skeleton, `GET /api/health`, Supabase JWT middleware (verifying `SUPABASE_JWT_SECRET`), resolves active `org_id` from `memberships`, a `db.query`
  helper that opens a transaction and runs `SET LOCAL app.current_org = $org`.
- Web: Vite + React + `@supabase/supabase-js` client, sign-in/up via Supabase Auth UI or custom forms, our own org-switcher component over the user's memberships.
- **Verify:** sign up → create org → `GET /api/me` returns user + active org.

## M1 — Tenancy + Businesses (prove isolation)
- `organizations`/`memberships` populated on org creation / invite acceptance (our own flow); lazy-upsert membership on first authenticated request is acceptable.
- Businesses CRUD API + Businesses page UI.
- **Verify (gate):** integration test proving Org A cannot read Org B's
  businesses via RLS. This is the hard requirement — do not pass M1 without it.

## M2 — Design system + app shell
- Port `DESIGN.md` tokens into `globals.css`. Build the component inventory
  (AppShell, Sidebar w/ 10 nav links + OrgSwitcher (our own) + UserButton,
  PageHeader, Card, KpiCard, RoiCardSet, HeroCard, Notice, Pill, Badge,
  DataTable, Tabs, form fields, Button, TrendChart).
- Route skeletons for all 11 pages with empty states.
- **Verify:** every nav link routes; visuals match `DESIGN.md`.

## M3 — Conversions + attribution + ROI
- Conversion types CRUD; conversion entry form + list; ROI helpers
  (`roas/roi/cpc`); attribution cascade (`utm-adset` → `utm-campaign` →
  fallback). CSV import (conversions/reviews/bookings/organic) with column guide.
- **Verify:** unit tests for ROI + attribution + CSV parser; manual entry
  matches to a campaign.

## M4 — Integrations (Meta + Google live)
- OAuth start/callback for both providers; encrypt tokens at rest.
- Provider fetchers (Meta Graph v20.0 insights, Google Ads v17 searchStream).
- Sync engine: upsert campaign→adset→ad tree, write daily_metrics, re-match
  conversions, per-business/provider fault isolation, sync_runs + issues.
- Settings → Integrations card; Setup + Audit pages.
- **Verify:** connect a real/sandbox account, run on-demand sync, see metrics.

## M5 — AI reports + tasks + email
- Anthropic client; per-business + master report; JSON output + heuristic
  fallback. Reports page (6-column insight grid). Task generation from report
  (cap 8, dedupe, category/priority derivation). Task Manager page. Resend
  morning digest. Issue tracking for report/email failures.
- **Verify:** run report → reports render → tasks appear → digest sends (or
  raises the right issue).

## M6 — Growth Hub + Dashboard + cron
- Growth Hub 6 tabs (manual/CSV-fed). Dashboard aggregation (totals, hero,
  trend chart, job health, comparison table, recent reports, task queue).
- Cron endpoints (sync 07:30 / report 08:00 / email 08:05), secret-protected,
  iterate every org. Schedule editing in Settings.
- **Verify:** cron runs across multiple orgs without cross-talk; dashboard
  populates.

## M7 — Hardening + ship
- Zod on every endpoint; audit logs on sensitive actions; error states; loading
  states; RLS test suite green; secrets only server-side.
- Deploy: web (static host), api (Node host), DB (Supabase), cron (scheduler).
- **Verify:** `/api/health` green in prod; end-to-end smoke on a fresh org.

---

## Phase 2 (post-MVP, deferred)
Stripe billing + plan limits · SMS/WhatsApp delivery · multi-currency · Google
Business Profile reviews API · PMS integrations · report PDF export.

---

## Definition of done (per milestone)
1. Feature works end-to-end on a fresh org.
2. Tenant isolation intact (no cross-org leakage).
3. Inputs validated; failures surface as issues, not silent.
4. Tests for the milestone's core logic pass.
</content>
