# PRD — Marketing ROI Command Center (SaaS)

**Status:** Draft v1 · **Owner:** ruhithpasha · **Date:** 2026-05-27
**Type:** Multi-tenant B2B SaaS · **Stage:** Greenfield rebuild

---

## 1. Summary

A multi-tenant SaaS that gives marketing-driven businesses (initially dental
practices, clinics, and the agencies that serve them) a single command center
for **marketing ROI**. It pulls ad spend from Meta and Google Ads, captures
conversions/revenue (manual + CSV + future API), matches conversions back to the
campaigns that produced them, computes ROI/ROAS, and every morning has Claude
write a plain-English performance report that auto-generates a task list and
emails the team.

This is a ground-up rebuild of an internal single-group tool (`m1/`) as a
product any organization can sign up for and run on their own isolated data.

### One-liner
> "Connect your ad accounts, log your conversions, and wake up to an AI report
> that tells you what's working, what's wasting money, and exactly what to do
> about it — across every location you run."

---

## 2. Problem

Marketing-led businesses (especially multi-location healthcare like dental
groups) spend heavily on Meta and Google Ads but cannot reliably answer:

- **What is each pound of ad spend actually returning?** Spend lives in ad
  platforms; revenue lives in the practice/PMS/spreadsheet. Nothing joins them.
- **Which campaigns and ad sets drive real patients vs. vanity clicks?**
  Attribution is manual, inconsistent, and rarely done.
- **What should we do today?** Owners get dashboards, not decisions. Insight
  doesn't convert into assigned, tracked actions.
- **How do we compare locations?** Multi-practice groups have no shared,
  apples-to-apples ROI view across sites.

Existing tools are either pure ad dashboards (no revenue/attribution), generic
BI (too heavy, no domain logic), or agency spreadsheets (manual, fragile).

---

## 3. Goals & non-goals

### Goals (v1)
1. Self-serve signup → organization → first connected ad account in < 15 min.
2. Live Meta + Google Ads spend sync per business, per org, daily.
3. Conversion capture: manual entry + CSV bulk import, with UTM-based
   attribution matching.
4. Per-business and roll-up ROI/ROAS/cost-per-conversion.
5. Daily Claude-generated morning report (wins / losses / issues /
   opportunities / creative & copy ideas / next actions).
6. Auto-generated task queue from each report + manual tasks.
7. Morning email digest to the team.
8. Growth Hub: patients, marketing, loyalty/members, reviews, bookings,
   benchmarks (manual/CSV-fed in v1).
9. Strict tenant isolation — an org can never see another org's data.

### Non-goals (v1, explicitly deferred)
- **Billing / subscriptions** — auth only for v1; Stripe plans are Phase 2.
- SMS / WhatsApp delivery (UI toggles exist; only email sends).
- Native PMS/EHR integrations (Dentally, SOE, etc.).
- Mobile native apps.
- In-app creative generation / image generation.
- Real-time streaming dashboards (daily cadence is enough).

---

## 4. Target users & personas

| Persona | Role | Primary need |
|---|---|---|
| **Group Owner / Principal** | Buyer, daily reader | "Is my marketing making money? What do I do today?" |
| **Marketing Manager** | Power user | Connect accounts, log conversions, manage tasks, read reports |
| **Practice Manager (per location)** | Contributor | Enter conversions/bookings for their site |
| **Agency Operator** | Multi-client power user | Run several client orgs, compare, report |

**Tenancy:** an **Organization** is the tenant, owned in our own `organizations` table. An org owns
many **Businesses** (locations/brands). Users belong to one or more orgs via the `memberships` table
(org_id, user_id → auth.users, role). All data is scoped to `org_id`.

---

## 5. Core user journeys

### J1 — Onboarding
Sign up (Supabase Auth) → create/join Organization → create first Business → connect
Meta and/or Google via OAuth → set conversion types & values → see dashboard
populate after first sync.

### J2 — Daily operating loop (automated)
`07:30` spend sync → `08:00` Claude report + auto-tasks → `08:05` email digest.
Owner opens dashboard, reads report, works the task queue.

### J3 — Conversion capture
Staff log a lead/patient (name, value, date, UTMs) on `/conversions`, or bulk
upload a CSV on `/imports`. System matches each conversion to a campaign/ad set.

### J4 — Multi-location review
Owner compares all businesses on one table (spend / revenue / ROI / connection
health) and drills into the Growth Hub per site.

---

## 6. Functional requirements

### 6.1 Auth & tenancy (Supabase Auth)
- Email/password + OAuth social logins, sessions, optional MFA via Supabase Auth.
- **Organizations** = tenants, owned in our own `organizations` table; `memberships` (org_id, user_id → `auth.users`, role) is the source of truth. Org switcher in the UI lets a user switch between their orgs.
- Roles: `admin` (manage integrations, billing-later, members, settings),
  `member` (enter data, read reports, manage tasks).
- Backend verifies the Supabase access-token JWT on every API call; resolves `org_id` from the user's `memberships`.
- Every domain table carries `org_id`; Supabase **RLS** enforces isolation.

### 6.2 Businesses
- CRUD businesses within an org (name, slug, timezone, active).
- No fixed seed of 6 — orgs create their own. Optional demo-data seeder.

### 6.3 Integrations (Meta + Google Ads) — **live in v1**
- OAuth connect per business per provider (start + callback).
- Store account id, account name, access/refresh tokens, expiry, status,
  last sync, last error. **Tokens encrypted at rest** (see §9).
- Daily + on-demand sync. Per business/provider fault isolation (one failure
  never stops the run).
- Meta: Graph API `v20.0` `/act_<id>/insights` (campaign→adset→ad, spend,
  clicks, impressions, daily).
- Google Ads: `v17` `googleAds:searchStream` GAQL (`LAST_30_DAYS`,
  `ad_group_ad` level, `cost_micros`/1e6).

### 6.4 Conversions & attribution
- Manual entry: business, type, name, email, phone, value, date, UTM
  source/campaign/adset, notes.
- CSV bulk import for conversions, reviews, bookings, organic.
- Matching cascade: `utm-adset` (conf 0.91) → `utm-campaign` (0.82) →
  business-date fallback (0.55). One match per conversion; manual override flag.
- Re-match runs after every sync and every new conversion.

### 6.5 ROI engine
- `roas = revenue / spend`; `roi% = (revenue − spend) / spend × 100`;
  `costPerConversion = spend / conversions`. Guard divide-by-zero.
- Computed per business and rolled up per org.

### 6.6 AI reports (Anthropic Claude)
- Daily per-business + one "All Businesses" master report.
- Input: business name, per-campaign rows (spend/revenue/conversions), totals.
- Output JSON: `summary`, `wins`, `losses`, `issues`, `opportunities`,
  `creativeIdeas`, `adCopyIdeas`, `nextActions`.
- **Heuristic fallback** if no API key or call fails — never hard-fails.
- Model configurable (default `claude-sonnet-4-6`).

### 6.7 Tasks
- Auto-created from report `issues` + `nextActions` + `creativeIdeas` (cap 8 per
  report, deduped). Manual create too.
- Auto category (creative / tracking / optimization / automation / general) and
  priority (high / medium / low) derived from text keywords.
- Status: todo → in_progress → done (sets completedAt).

### 6.8 Email digest (Resend)
- `08:05` morning email to active recipients with summary + wins + losses +
  next actions. Raises a visible issue if no recipients / no report / send fail.

### 6.9 Growth Hub (manual/CSV-fed v1)
Tabs: **Patients · Marketing · Loyalty & Members · Reviews · Online Booking ·
Benchmark**, each with a business filter. Feeds the AI report and task manager.

### 6.10 Scheduled jobs
- Three secret-protected cron endpoints: `/sync` (07:30), `/report` (08:00),
  `/email` (08:05), local timezone. Editable schedule per org.

### 6.11 Issue tracking
- Failed sync/report/email surface as dashboard issues (key, scope, severity,
  status open/resolved) instead of failing silently. Auto-resolve on success.

### 6.12 Setup / readiness
- `/setup` shows env/connection readiness, checklist, live endpoints, and
  per-business connection status with Connect buttons.

---

## 7. Application sections (scope map)

The product is **11 pages / 10 nav destinations / ~56 distinct UI sections**.
Full enumeration in [`SECTIONS.md`](./SECTIONS.md). Nav order:

1. Overview (Dashboard) · 2. Setup · 3. Growth Hub · 4. Task Manager ·
5. Businesses · 6. Website Leads (Conversions) · 7. Import / Bulk ·
8. Account Audit · 9. Reports · 10. Settings.

---

## 8. Success metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Time-to-first-connected-account | < 15 min median |
| Orgs with ≥1 live ad integration | ≥ 70% of signups |
| Daily report open rate (email) | ≥ 50% |
| Tasks created from reports actioned | ≥ 30% moved past todo |
| Tenant data-isolation incidents | **0** (hard requirement) |
| Sync success rate | ≥ 95% of scheduled runs |

---

## 9. Security & compliance requirements

1. **Tenant isolation** — `org_id` on every row + Supabase RLS keyed to the verified Supabase access-token JWT and the user's `memberships`. No cross-org reads. Verified by automated tests.
2. **Token encryption at rest** — OAuth access/refresh tokens encrypted with a
   server-side key (`ENCRYPTION_KEY`, AES-256-GCM). Never stored plaintext.
   (This was a known flaw in `m1/` — must not be repeated.)
3. **Cron auth** — secret query/header on all cron endpoints; reject otherwise.
4. **Secrets** — only in env / secret manager, never in client bundle.
5. **PII** — conversions hold patient name/email/phone. Encrypt in transit
   (TLS), restrict by RLS, support per-org deletion (GDPR-style).
6. **Auditing** — `audit_logs` for sensitive actions (integration changes,
   member changes, data deletes).

---

## 10. Assumptions & open questions

- **Billing model** (deferred): plan tiers, limits (# businesses, # ad
  accounts) via Stripe — decide before Phase 2.
- Org → business limits for the free/auth-only phase (proposed: soft cap, warn
  only).
- Conversion currency: default GBP; multi-currency is Phase 2.
- Review/booking/organic data sources beyond CSV (Google Business Profile API?)
  — Phase 2.

---

## 11. Phasing

| Phase | Scope |
|---|---|
| **P0 (this PRD / MVP)** | Supabase Auth + orgs, businesses, Meta+Google OAuth + sync, conversions + CSV, attribution, ROI, Claude reports + fallback, tasks, email digest, Growth Hub (manual), issues, setup, RLS isolation, token encryption. |
| **P1** | Stripe billing + plan limits, role-based UI gating polish, in-app onboarding wizard. |
| **P2** | SMS/WhatsApp delivery, GBP→multi-currency, Google Business Profile reviews API, PMS integrations, scheduled report PDF export. |

See [`ROADMAP.md`](./ROADMAP.md) for the build order.
</content>
</invoke>
