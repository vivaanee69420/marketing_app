# Website Leads + GHL + Google Reviews — TODO

Planning notes from investigation on 2026-05-28. Pick up **Monday 2026-06-01**.

Three related features, all map onto the existing `integrations` (per-business) and
`conversions` / `conversion_matches` tables. No new core tables needed except a
`reviews` table for reputation data.

---

## 1. Google Reviews (DECIDED — Route 2: Business Profile API)

Display + reply to Google reviews, the way GoHighLevel does. NOTE: reviews come from
**Google Business Profile** (formerly Google My Business — the star reviews on Google
Maps / the business listing), **NOT Google Ads**. Different API from the Ads
integration already built.

### Decision
- **Business Profile API** (full reviews + ability to reply), not the Places API
  shortcut (Places caps at 5 read-only reviews).
- Endpoint: `accounts.locations.reviews` (list), `.../reviews/{reviewId}/reply` (reply).

### Blockers / prerequisites (start these Monday — they have lead time)
- [ ] **Apply for Google Business Profile API access** (allowlisting / quota request).
      Approval can take weeks — file this first so it runs in the background.
      https://developers.google.com/my-business/content/prereqs
- [ ] OAuth per business (the business owner must have **verified ownership** of the
      Google listing). Cannot read reviews for a listing the connected account
      doesn't manage.
- [ ] Token refresh handling (reviews OAuth is separate scope from Ads OAuth, even
      though both are Google).

### Implementation
- [ ] New provider `backend/providers/googleReviews.js`, version-const at top
      (mirror `meta.js` / `google.js` shape). Wrap the Business Profile API version.
- [ ] New table `reviews`:
      ```sql
      create table reviews (
        id           uuid primary key default gen_random_uuid(),
        org_id       uuid not null references organizations(id) on delete cascade,
        business_id  uuid not null references businesses(id) on delete cascade,
        provider     text not null,           -- 'google_reviews' (later 'facebook_reviews')
        external_id  text not null,            -- Google review id, for dedupe
        author       text,
        rating       integer,                  -- 1..5
        review_text  text,
        reply_text   text,
        review_date  timestamptz not null,
        created_at   timestamptz not null default now(),
        updated_at   timestamptz not null default now(),
        unique (org_id, business_id, provider, external_id)
      );
      ```
- [ ] Store `location_id` (Business Profile location resource name) in
      `integrations.config_json` for the business. Reuse the `integrations` row with a
      `'google_reviews'` provider, encrypt OAuth tokens in `access_token_enc` (rule 3).
- [ ] Sync into `reviews` (cron, per-org/per-business try-catch, rule 11).
- [ ] `GET /api/reviews` (list) + `POST /api/reviews/:id/reply` (write reply back via
      Business Profile API). Zod-validate (rule 4).
- [ ] Frontend reviews page/card through the TanStack mock seam.
- [ ] Fail-loud → `dashboard_issues` on sync/reply errors (rule 5).

### Later
- [ ] Facebook page reviews = Meta Graph `/{page-id}/ratings` (separate API; GHL
      combines Google + Facebook into one reputation view). Same `reviews` table,
      provider `'facebook_reviews'`.

---

## 2. GoHighLevel lead integration (DECIDED — both webhook + pull)

Pull leads/contacts from GoHighLevel into `conversions`. Method: **both** — real-time
webhook plus a periodic pull as a backstop.

### API notes
- Use the **V2 API**: `https://services.leadconnectorhq.com`, `Version: 2021-07-28`
  header. The V1 API (`rest.gohighlevel.com`) is deprecated — do not build on it.
- Auth: V2 **Private Integration Token** (GHL → Settings → Private Integrations,
  location-scoped). Closest to "just an API key" without a full marketplace OAuth app.
  Store encrypted in `integrations.access_token_enc`.

### Implementation
- [ ] Add `'gohighlevel'` as a valid `provider` on `integrations` (per-business row).
- [ ] `config_json`: `{ location_id, webhook_secret }`.
- [ ] Provider `backend/providers/gohighlevel.js`:
      `fetchContacts({ token, locationId, since })` →
      `GET /contacts/?locationId=...&startAfter=...`, paginated. Map contact →
      conversion fields (name/email/phone; opportunity value → `conversion_value`).
- [ ] **Push (real-time):** `POST /api/webhooks/ghl`.
      - Verify shared `webhook_secret` from header BEFORE trusting the body
        (trust-boundary rule).
      - Resolve business by `location_id` → org_id **server-side** (never from body,
        rule 1).
      - Upsert into `conversions`, dedupe on GHL contact id.
      - GHL setup: Workflow → trigger "Contact Created" → Webhook action → this URL.
- [ ] **Pull (backstop):** add a GHL branch to the existing cron. Poll `fetchContacts`
      since `last_sync_at`, same upsert/dedupe. Catches anything the webhook dropped.
- [ ] Attribution: if the GHL contact carries UTM custom fields, fill
      `utm_source/campaign/ad_set` → feeds the 0.91 / 0.82 / 0.55 confidence match into
      `conversion_matches`. No UTMs → falls to 0.55 fallback.
- [ ] Fail-loud → `dashboard_issues` (rule 5).

---

## 3. Website leads — custom site (OPEN — needs a decision Monday)

The website is a **custom build, not connected to GHL or any CMS/platform**. So it is
its own lead source. Leads land in `conversions` (provider `'website'`).

### OPEN DECISION: where should website leads end up?
Depends on whether the sales team works leads inside GHL.

- **Option A — App only.** Website form posts straight to a backend endpoint.
  Best attribution (we control the payload incl. UTMs), simplest. Sales would NOT see
  website leads in GHL.
- **Option B — GHL only.** Website creates a GHL contact; the GHL webhook (feature #2)
  catches it. One CRM, but must forward UTMs into GHL custom fields or attribution
  drops to 0.55.
- **Option C — Both (fan-out).** Form posts to the app (full attribution) AND to GHL
  (sales visibility). Most robust, most wiring.

Recommendation pending the answer to: *does the sales team work leads in GHL, or only
in this app?*

### Implementation (Option A / C — the backend endpoint)
- [ ] `POST /api/leads/ingest` (provider `'website'`). Public endpoint.
- [ ] Auth: per-business **ingest key** in `integrations.config_json`, sent as header
      (public endpoint can't use the Supabase JWT). Resolve org_id from the key
      server-side, never from body (rule 1).
- [ ] Payload: `{ name, email, phone, value?, utm_source, utm_campaign, utm_ad_set }`.
- [ ] **UTM capture (attribution win):** on the landing page, JS reads
      `location.search`, stashes UTMs in a cookie / localStorage, attaches them on form
      submit. This is the whole reason to capture at the website — GHL strips UTMs
      otherwise, and they drive the confidence rules.
- [ ] Upsert into `conversions`, dedupe on email + date (or a generated external id).
- [ ] **Security (public endpoint = abuse target):** Zod-validate (rule 4), per-business
      write key, rate-limit, honeypot field for spam bots.

### To check before building (was unanswered)
- [ ] Confirm the custom site's stack (React / PHP / plain HTML) — affects how the UTM
      snippet + form submit are wired.
- [ ] Confirm whether the form currently posts anywhere today (own DB / email).

---

## Cross-cutting reminders (from marketing_app/CLAUDE.md hard rules)
- Tenant isolation: every domain row has `org_id`; resolve org from memberships
  server-side; use `withOrg(orgId, tx => ...)`.
- No ORM — parameterized SQL only.
- Encrypt all OAuth/API tokens at rest (AES-256-GCM, `*_enc` cols).
- Zod-validate every endpoint (400 with field errors).
- Fail loud → `dashboard_issues`; never swallow sync/webhook errors.
- BYO creds live per-business in `integrations.config_json` — no org-level settings table.
