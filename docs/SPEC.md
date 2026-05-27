# Technical Specification — Marketing ROI Command Center (SaaS)

Companion to [`PRD.md`](./PRD.md). This is the engineering contract: stack,
architecture, data model, API surface, sync/attribution/AI logic, and the
section inventory. Greenfield build — no code from `m1/` is reused, but its
behavior is the functional reference.

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 19 + Vite** | SPA, React Router. No SSR. |
| Routing | React Router v6 | Client-side, nested layouts |
| State/data | TanStack Query | Server-state cache over REST |
| Styling | Plain CSS + CSS variables | Port the `m1` design tokens (see `DESIGN.md`). No Tailwind/UI lib. |
| Backend | **Node.js + Express** (TypeScript) | REST API, separate service |
| DB | **Supabase (PostgreSQL)** | Managed Postgres + RLS + storage |
| DB access | **`pg` (node-postgres) + raw SQL**, or `@supabase/supabase-js` | **No ORM.** SQL files for schema/migrations. |
| Auth | **Supabase Auth** | Users in `auth.users`, Organizations (tenants), sessions, JWT |
| AI | **Anthropic Claude** (`@anthropic-ai/sdk`) | Default `claude-sonnet-4-6`; heuristic fallback |
| Email | **Resend** | Morning digest |
| Validation | **Zod** | Every API input validated (m1 had none — fix) |
| Ad APIs | Meta Graph `v20.0`, Google Ads `v17` | Live OAuth + sync |
| Deploy | Frontend: static host (Vercel/Netlify/Cloudflare). Backend: Node host (Railway/Render/Fly). DB: Supabase. | |
| Runtime | Node 20+ | |

### Why no ORM
Raw SQL keeps the data layer transparent for tenant scoping and RLS, avoids
ORM/RLS friction, and is easy for an AI agent to reason about. Use a thin
typed query helper (`db.query<T>(sql, params)`), parameterized always.

---

## 2. System architecture

```
┌─────────────────┐   Supabase JWT     ┌──────────────────────┐
│  React SPA      │ ─────────────────► │  Node/Express API    │
│  (Vite)         │ ◄───────────────── │  (TypeScript, Zod)   │
│  Supabase Auth  │      REST/JSON     │  JWT verify          │
└─────────────────┘                    │  (SUPABASE_JWT_SECRET│
                                       └──────────┬───────────┘
                                                   │ raw SQL (pg), RLS on
                                                   ▼
                                         ┌──────────────────────┐
                                         │  Supabase Postgres    │
                                         │  RLS by org_id        │
                                         └──────────────────────┘
        External (server-to-server, from API/cron worker):
        Meta Graph v20.0 · Google Ads v17 · Anthropic · Resend
```

- **Frontend** never holds third-party secrets. It calls the API; the API holds
  Meta/Google/Anthropic/Resend keys and the DB connection.
- **Cron** hits secret-protected API routes (host scheduler or Supabase cron /
  external cron). Three jobs: sync, report, email.
- **Multi-tenancy**: Active org resolved from the user's `memberships` row → set on a Postgres
  session var (`SET LOCAL app.current_org = $orgUuid`) so RLS policies filter every query.

---

## 3. Data model (PostgreSQL, multi-tenant)

Full DDL in [`../db/schema.sql`](../db/schema.sql). Every domain table has
`org_id uuid not null` (references `organizations.id`) and an RLS policy. IDs are
`uuid` (default `gen_random_uuid()`). Money is `numeric(12,2)`, default currency
GBP.

### Tables

| Table | Purpose | Key columns |
|---|---|---|
| `organizations` | Tenant org (id uuid, name, created) | `id uuid` (`gen_random_uuid()`) |
| `memberships` | User↔org role (`org_id uuid`, `user_id uuid` references `auth.users`, `role`) — source of truth | `org_id, user_id, role` |
| `businesses` | Locations/brands within an org | `org_id, name, slug, timezone, is_active` |
| `integrations` | Meta/Google connection per business | `org_id, business_id, provider, status, external_account_id, account_name, access_token_enc, refresh_token_enc, token_expires_at, last_sync_at, last_sync_status, last_error, config_json` |
| `campaigns` | Synced campaigns | `org_id, business_id, provider, external_id, name, status` |
| `ad_sets` | Synced ad sets / ad groups | `+ campaign_id` |
| `ads` | Synced ads | `+ campaign_id, ad_set_id` |
| `daily_metrics` | Daily spend/clicks/impressions per node | `org_id, business_id, provider, campaign_id?, ad_set_id?, ad_id?, metric_date, currency, spend, clicks, impressions, conversions` |
| `conversion_types` | Configurable lead/revenue types | `org_id, business_id, name, category, default_value, is_active` |
| `conversions` | Captured leads/revenue | `org_id, business_id, conversion_type_id?, name, email, phone, conversion_value, conversion_date, source_notes, utm_source, utm_campaign, utm_ad_set, created_by` |
| `conversion_matches` | Attribution result (1:1 with conversion) | `org_id, conversion_id (unique), provider?, campaign_id?, ad_set_id?, ad_id?, matched_by_rule, confidence, is_manual_override` |
| `sync_runs` | Sync audit log | `org_id, business_id, provider, sync_type, status, started_at, completed_at, records_synced, error_message` |
| `ai_reports` | Generated reports | `org_id, business_id?, report_date, report_type, status, summary, insights jsonb` |
| `scheduled_jobs` | Per-org job schedule | `org_id, name, job_type, run_time, timezone, is_active, last_run_at, next_run_at` |
| `notification_recipients` | Email digest recipients | `org_id, email, name, role, is_active` |
| `dashboard_issues` | Surfaced failures | `org_id, key (unique per org), scope, severity, title, message, status, last_seen_at, resolved_at, metadata` |
| `tasks` | Task queue | `org_id, business_id?, title, description, category, priority, status, source, source_report_id?, due_date, completed_at, assigned_to?, created_by?, metadata` |
| `reviews` | Growth Hub reviews | `org_id, business_id?, platform, author_name, rating, body, review_date, responded, response_text` |
| `organic_metrics` | Growth Hub organic stats | `org_id, business_id?, channel, stat_date, followers, reach, impressions, engagements, website_clicks, sessions` |
| `booking_records` | Growth Hub bookings | `org_id, business_id?, patient_name, service, starts_at, deposit, status, source` |
| `benchmark_metrics` | Industry benchmarks | `org_id, metric_name, industry_avg, business_val, variance, status, note` |
| `membership_tiers` | Loyalty tiers | `org_id, business_id?, name, monthly_price, member_count, monthly_revenue, benefits, is_active` |
| `app_settings` | Per-org key/value settings | `org_id, key, value` (keys: `ai_model`, `email_provider`, `reminder_email_enabled`, `reminder_sms_enabled`, `reminder_whatsapp_enabled`) |
| `audit_logs` | Sensitive-action log | `org_id, actor_user_id?, business_id?, action, target_type, target_id, metadata` |

### Differences from `m1` schema
- **Added `org_id` everywhere** + RLS (new tenancy).
- **`User` table dropped** — Supabase `auth.users` owns users. Nullable `created_by`/
  `assigned_to` are **uuid** FKs referencing `auth.users` (not text strings).
- **Tokens stored encrypted** (`*_enc` columns), not plaintext.
- `dashboard_issues.key` unique **per org**, not globally.
- Settings (`app_settings`) and several uniques scoped per org.

---

## 4. RLS pattern

```sql
alter table businesses enable row level security;
create policy org_isolation on businesses
  using (org_id = current_setting('app.current_org', true)::uuid)
  with check (org_id = current_setting('app.current_org', true)::uuid);
```

API sets `SET LOCAL app.current_org = $1` (a uuid resolved from the verified Supabase JWT via `memberships`) at
the start of each request transaction. Same policy shape on every domain table.

---

## 5. REST API surface

All routes under `/api`, all require a valid Supabase Auth session (except health and
cron). Org is resolved from the JWT via `memberships` — never from the request body. All inputs
Zod-validated.

### Auth context
- `GET /api/me` — current user + orgs + active org + role.

### Businesses
- `GET /api/businesses`
- `POST /api/businesses` `{ name, timezone }`
- `PATCH /api/businesses/:id`
- `DELETE /api/businesses/:id`

### Integrations
- `GET /api/businesses/:id/integrations`
- `POST /api/businesses/:id/integrations` (manual token save) `{ provider, accountName, externalAccountId, accessToken, refreshToken, notes }`
- `GET /api/oauth/meta/start?businessId=` → redirect
- `GET /api/oauth/meta/callback?code=&state=`
- `GET /api/oauth/google/start?businessId=` → redirect
- `GET /api/oauth/google/callback?code=&state=`

### Conversions & imports
- `GET /api/conversions?businessId=`
- `POST /api/conversions` (full conversion payload)
- `GET /api/conversion-types?businessId=`
- `POST /api/conversion-types` `{ businessId, name, category, defaultValue }`
- `POST /api/imports` (multipart CSV) `{ businessId, feedType: conversions|reviews|bookings|organic, file }`

### Reports & sync
- `GET /api/reports`
- `POST /api/sync/run` (on-demand sync, all businesses in org)
- `POST /api/reports/run` (on-demand report gen)

### Tasks
- `GET /api/tasks`
- `POST /api/tasks` `{ businessId?, title, description, category, priority, dueDate? }`
- `PATCH /api/tasks/:id` `{ status }`

### Settings
- `GET /api/settings`
- `PUT /api/settings/notifications` `{ aiModel, emailProvider, reminderEmail, reminderSms, reminderWhatsapp, teamEmails[] }`
- `PUT /api/settings/schedule/:jobId` `{ runTime, timezone }`
- `GET /api/recipients` · `PUT /api/recipients`

### Growth Hub
- `GET /api/growth/patients?businessId=`
- `GET /api/growth/marketing?businessId=`
- `GET /api/growth/loyalty` · `/reviews` · `/bookings` · `/benchmark`

### Dashboard / audit / setup
- `GET /api/dashboard` (totals, businesses, issues, jobs, recipients, tasks, recent reports)
- `GET /api/audit` (per-business connection + last sync + issue)
- `GET /api/setup/readiness` (env + connection checks)
- `GET /api/issues`

### System (no auth / cron-secret)
- `GET /api/health` → `{ ok, timestamp }`
- `POST /api/cron/sync?secret=` — sync all orgs/businesses
- `POST /api/cron/report?secret=` — generate reports all orgs
- `POST /api/cron/email?secret=` — send digests all orgs

> **Cron multi-tenancy:** cron iterates every org, sets the org session var per
> org, runs the job. One org's failure never blocks others (per-org try/catch).

---

## 6. Core logic specs

### 6.1 Sync (`syncProviderForBusiness`)
1. Load integration; require `external_account_id` + decrypted access token.
2. Open `sync_runs` row (status `running`).
3. Fetch metrics (Meta or Google provider fn).
4. For each row: upsert campaign → ad_set → ad (by `provider+external_id`),
   insert `daily_metrics`.
5. Re-match every conversion for the business.
6. Update integration (status, last_sync_at, last_sync_status, last_error=null),
   resolve `sync:{provider}:{businessId}` issue, complete `sync_runs`.
7. On error: mark integration `error` + last_error, raise dashboard issue,
   fail `sync_runs`, rethrow (caller swallows to continue the run).

### 6.2 Providers
- **Meta** — `GET graph.facebook.com/v20.0/act_<id>/insights?level=ad&time_increment=1&fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,clicks,impressions,date_start`. Normalize to `{campaignExternalId,campaignName,adSetExternalId,adSetName,adExternalId,adName,spend,clicks,impressions,date}`.
- **Google Ads** — `POST googleads.googleapis.com/v17/customers/<id>/googleAds:searchStream` with GAQL selecting campaign/ad_group/ad_group_ad + `metrics.cost_micros,clicks,impressions,segments.date FROM ad_group_ad WHERE segments.date DURING LAST_30_DAYS`. Headers: `Authorization: Bearer`, `developer-token`, optional `login-customer-id`. `spend = cost_micros / 1_000_000`.

### 6.3 Attribution (`rematchConversion`)
Cascade, highest confidence wins:
1. `utm_ad_set` → match ad_set by name contains (insensitive), `confidence 0.91`, rule `utm-adset`.
2. `utm_campaign` → match campaign by name contains, `0.82`, `utm-campaign`.
3. Fallback: most-recent campaign + its most-recent ad_set for the business, `0.55`, `business-date-fallback`.
Upsert one `conversion_matches` row per conversion. Respect `is_manual_override`.

### 6.4 ROI
```
roas = spend > 0 ? revenue / spend : 0
roi  = spend > 0 ? (revenue - spend) / spend * 100 : 0
cpc  = conversions > 0 ? spend / conversions : 0
```
Computed per business and rolled up per org.

### 6.5 AI report (Anthropic)
- Build per-campaign rows: spend (sum daily_metrics), revenue (sum matched
  conversions), conversions (count matches). Totals per business + master.
- Call Claude Messages API, model from `app_settings.ai_model` (default
  `claude-sonnet-4-6`), with a system prompt instructing **JSON-only** output of
  `{summary, wins, losses, issues, opportunities, creativeIdeas, adCopyIdeas, nextActions}`.
- Parse; on missing key or any error → **heuristic fallback** (rank rows by
  revenue/spend, canned suggestions). Persist to `ai_reports`.
- After persist → `createTasksFromReport`.

### 6.6 Tasks from report
- Take `issues + nextActions + creativeIdeas`, cap 8, dedupe by
  `reportId + text`. Derive category (creative/copy→creative;
  track/utm/match→tracking; budget/scale/pause→optimization; else general) and
  priority (failed/fix/pause/urgent→high; test/review/refresh→medium; else low).

### 6.7 Email digest (Resend)
- Load active recipients; if none → issue `email:no-recipients`.
- Load latest `morning_master` report; if none → issue `email:no-report`.
- `POST api.resend.com/emails` with HTML (summary + wins + losses + nextActions).
- Resolve issues on success; raise `email:send-failed` on failure.

### 6.8 CSV import
- Custom parser (normalize headers lowercase, strip non-alphanumerics).
- `conversions` → match `conversion_type_id` by name, insert + rematch.
- `reviews` / `bookings` / `organic` → bulk insert respective tables.
- Column guide surfaced in UI (`/imports`).

---

## 7. Application sections

11 pages, 10 nav destinations, **~56 distinct UI sections**. See
[`SECTIONS.md`](./SECTIONS.md) for the exhaustive panel-by-panel list. Summary:

| # | Route | Page | Sections |
|---|---|---|---|
| 1 | `/` | Overview (Dashboard) | 11 |
| 2 | `/setup` | Connection Setup | 6 |
| 3 | `/growth` | Growth Hub (6 tabs) | ~7 base + per-tab |
| 4 | `/tasks` | Task Manager | 4 |
| 5 | `/businesses` | Businesses | 2 |
| 6 | `/conversions` | Website Leads | 3 |
| 7 | `/imports` | Import / Bulk | 7 |
| 8 | `/audit` | Account Audit | 2 |
| 9 | `/reports` | AI Reports | 4 |
| 10 | `/settings` | Settings | 8 |

---

## 8. Validation, errors, conventions

- **Every** API input → Zod schema; 400 with field errors on fail. (m1 had no
  validation — do not repeat.)
- Org resolved from JWT only; reject if no active org.
- Money as `numeric`; format on the client (`Intl.NumberFormat`, GBP, 0 dp).
- Dates: store UTC; display `dd MMM yyyy` en-GB.
- Failures that affect the daily loop → `dashboard_issues`, not silent.
- Parameterized SQL only; never string-concat user input.

---

## 9. Testing

- Unit: ROI math, attribution cascade, heuristic fallback, CSV parser, task
  derivation.
- Integration: API + RLS — **prove an org cannot read another org's rows.**
- Contract: provider response normalizers against fixture payloads.
- (m1 shipped with zero tests — v1 must not.)

---

## 10. Env vars

See [`../.env.example`](../.env.example). Required for backend: `DATABASE_URL`
(Supabase), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
`CRON_SECRET`, `ENCRYPTION_KEY`. Integrations: Meta/Google client + secret +
redirect (+ Google dev token). AI: `ANTHROPIC_API_KEY`, `AI_MODEL`. Email:
`RESEND_API_KEY`, `EMAIL_FROM`. Frontend: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`.
</content>
