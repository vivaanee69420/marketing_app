# Marketing ROI Command Center — SaaS

Multi-tenant B2B SaaS. Organizations connect their **Meta** and **Google Ads**
accounts, log conversions/revenue, and every morning get a **Claude-written**
performance report that auto-generates a task list and emails the team — across
every business (location) they run.

Greenfield rebuild of the internal tool in `../m1` (functional reference).

## Stack
React 19 + Vite (SPA) · Node.js + Express (TS) · Supabase / PostgreSQL
(**no ORM**, raw SQL) · **Supabase Auth** (auth + Organizations = tenants) ·
**Anthropic Claude** (AI) · Resend (email) · Zod (validation).

## Status
Planning / docs. No code yet. Billing deferred to Phase 2 (auth-only MVP).

## Docs (read in this order)
| Doc | What |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements — problem, users, features, phasing, success metrics |
| [`docs/SPEC.md`](docs/SPEC.md) | Technical spec — architecture, data model, REST API, core logic |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design system — colors, type, spacing, component specs |
| [`docs/SECTIONS.md`](docs/SECTIONS.md) | Exhaustive UI inventory — 11 pages, ~56 sections |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Dependency-ordered build milestones |
| [`CLAUDE.md`](CLAUDE.md) | Rules + conventions for AI agents building this |
| [`db/schema.sql`](db/schema.sql) | Supabase DDL + RLS (multi-tenant) |
| [`.env.example`](.env.example) | All env vars (frontend + backend) |

## At a glance
- **11 pages / 10 nav links / ~56 UI sections** (see `SECTIONS.md`).
- **Tenancy:** Organizations (owned in our tables); every row scoped by `org_id` + Supabase RLS.
  Zero cross-org data leakage is a hard requirement.
- **Integrations live in v1:** Meta Graph v20.0, Google Ads v17, full OAuth +
  daily sync.
- **AI:** daily per-business + master report, Claude with heuristic fallback.
- **Automation:** cron at 07:30 (sync) / 08:00 (report+tasks) / 08:05 (email),
  per org.

## Getting started (once code exists)
1. Create a Supabase project; apply `db/schema.sql`.
2. Create a Supabase project; enable Auth providers (email + chosen OAuth); apply `db/schema.sql`.
3. Copy `.env.example` → `.env`, fill values.
4. `apps/api`: `npm i && npm run dev` · `apps/web`: `npm i && npm run dev`.
5. Sign up → create org → create a business → connect Meta/Google → sync.

See `docs/ROADMAP.md` for the build order.
</content>
