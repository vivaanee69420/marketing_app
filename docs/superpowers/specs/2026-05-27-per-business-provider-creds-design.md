# Per-business provider credentials (Google + Meta)

**Date:** 2026-05-27
**Status:** Approved — ready for implementation plan

## Problem

Today the Google API project (OAuth client id/secret, developer token, optional
login customer id) is a **single org-wide row** in `org_integration_settings`,
reused by every business's Google connection. A user with **multiple Google
organisational accounts** — distinct Cloud projects / developer tokens per
client — cannot model that: there is exactly one project per org.

The fix: move provider project/app credentials **down to each business's
integration row**, so every business is self-contained and can use its own
Google Cloud project (and, symmetrically, its own Meta app).

## Decision summary

- **One project per business, inline.** No shared org-level project, no pool.
- **Google:** each business stores `client_id`, `client_secret_enc`,
  `developer_token_enc`, optional `login_customer_id`. These **feed the sync**.
- **Meta:** each business additionally stores `app_id` + `app_secret_enc`
  (optional). Meta's Graph insights call uses only the access token today, so
  these are **stored but not wired into sync** — captured for future
  token-exchange/refresh use. Existing token-only Meta connections keep working.
- **Remove `org_integration_settings` entirely**, migrating its Google creds
  down into each existing Google integration so the live businesses keep working.
- **Remove `/api/org-settings`** routes/controller/repository — only Google sync
  consumed it; Meta never did.

## Storage

Credentials live in the existing `integrations.config_json` jsonb column —
mirrors the shape `org_integration_settings.config` already used for Google, so
the encrypt/merge logic and the migration are near-verbatim ports. No new
columns.

`integrations.config_json` per provider:

```jsonc
// provider = 'google'
{
  "client_id":           "…",                 // plain
  "client_secret_enc":   "iv:tag:cipher",      // AES-256-GCM
  "developer_token_enc": "iv:tag:cipher",
  "login_customer_id":   "…"                   // plain, optional
}

// provider = 'meta'
{
  "app_id":        "…",            // plain, optional
  "app_secret_enc": "iv:tag:cipher" // optional
}
```

Account-level creds are unchanged and stay as columns on `integrations`:
- `external_account_id` — Google customer id / Meta `act_<id>`
- `refresh_token_enc` — Google OAuth refresh token (required for Google)
- `access_token_enc` — Meta access token (required for Meta)

Rejected alternatives: dedicated columns on `integrations` (more DDL, more
rigid); a separate `google_projects` table (a pool — explicitly rejected, since
the relationship is one project per business).

## Migration

`db/` has no numbered migrations — a canonical `schema.sql` + `seed.sql`. So:

1. **`schema.sql`** (fresh installs): delete the `org_integration_settings`
   table definition and remove `'org_integration_settings'` from the RLS
   `foreach` table-array.
2. **`db/migrate_2026-05-27_google_per_business.sql`** (live DB, idempotent):
   merge each org's stored Google config into every Google integration row, then
   drop the table.

```sql
-- Copy org Google project creds onto each business's Google integration.
-- '||' is a top-level jsonb merge: only keys present in the org config
-- overwrite, so re-running is safe.
update integrations i
   set config_json = coalesce(i.config_json, '{}'::jsonb) || s.config,
       updated_at  = now()
  from org_integration_settings s
 where s.org_id   = i.org_id
   and s.provider = 'google'
   and i.provider = 'google';

drop table if exists org_integration_settings;
```

After migration the existing ~6 businesses inherit the exact creds they were
already syncing with — no behavior change for them.

## Backend changes

### `services/syncService.js`
- Google branch of `callProvider` reads creds from `integration.config_json`
  instead of `orgSettings.getProviderSettings`. Validate `client_id`,
  `client_secret_enc`, `developer_token_enc` present; if missing, throw a clear
  error naming the business ("Google project not configured for this business —
  add client id, client secret and developer token in Settings → Integrations").
- Remove the `orgSettings` import. Meta branch unchanged.

### `controllers/integrationController.js` + `repositories/integrationRepository.js`
- Extend the save schema (Zod):
  - Google: optional `client_id`, `client_secret`, `developer_token`,
    `login_customer_id` in addition to existing fields.
  - Meta: optional `app_id`, `app_secret`.
- Encrypt secrets (`client_secret`, `developer_token`, `app_secret`) into
  `config_json`; store plain ids (`client_id`, `login_customer_id`, `app_id`)
  as-is. **Merge** into existing `config_json` so a **blank secret on edit keeps
  the saved value** — same pattern the old `orgSettingsController` used. Only
  include a `*_enc` key when a new secret was actually submitted.
- Apply the same blank-keeps rule to the access/refresh tokens (only encrypt +
  overwrite when provided), fixing the current unconditional
  `encrypt(input.refresh_token)` on Meta saves.
- **First-connect validation** (no existing row/config): Google requires
  `client_id` + `client_secret` + `developer_token` + customer id +
  refresh_token. Meta requires account id + access_token (app creds optional).
  On edit, secrets may be blank. Controller reads the existing integration in
  the transaction to know whether it is first-connect.
- `listStatus` (and the `list` response) exposes, without leaking secrets:
  `config_json->>'client_id'`, `config_json->>'login_customer_id'`,
  `config_json ? 'client_secret_enc'` as `has_client_secret`,
  `config_json ? 'developer_token_enc'` as `has_developer_token`,
  `config_json->>'app_id'`, `config_json ? 'app_secret_enc'` as
  `has_app_secret`, plus a derived `configured` flag per provider.

### Removals
- Delete `controllers/orgSettingsController.js`,
  `repositories/orgSettingsRepository.js`, `routes/orgSettingsRoutes.js`.
- Remove the `/api/org-settings` mount and import in `backend/index.js`.

## Frontend changes (`frontend/src/pages/Settings.jsx`, `hooks/useApi.js`)

- **Remove** `GoogleProjectCard`, `GoogleProjectForm`, and the `useOrgSettings`
  / `useSaveOrgSettings` hooks.
- **`IntegrationBlock`** gains provider-specific project fields, pre-filled from
  the integration row (plain ids) with password fields blank + "•••• saved —
  blank keeps it" placeholders for stored secrets:
  - Google: OAuth Client ID, OAuth Client Secret, Developer Token, Login
    Customer ID (optional) — plus existing Customer ID + Refresh Token.
  - Meta: App ID (optional), App Secret (optional) — plus existing Ad Account ID
    + Access Token.
- Submit sends only the fields entered; blank secrets are omitted so the backend
  keeps the stored value.
- Replace the "set your org's Google project above" hint with per-business help
  text. The per-business "Configured" pill reflects the derived `configured`
  flag from the integration row.
- Connect form layout: all fields in the single existing `IntegrationBlock`
  (no collapsible split) — confirmed acceptable.

## Testing

- **Sync isolation:** two Google businesses with different `client_id`s in
  `config_json` resolve to their own creds (mock the provider, assert the creds
  passed per business).
- **Sync validation:** a Google integration missing project creds fails with the
  business-named error; Meta sync unaffected by absence of app creds.
- **Save first-connect:** Google save without project creds → 400 with field
  errors; Meta save without app creds → succeeds.
- **Save edit blank-keeps:** saving with a blank `client_secret` /
  `developer_token` / `app_secret` retains the previously stored ciphertext.
- **Migration:** seed an org config + Google integrations, run the migration,
  assert each integration's `config_json` carries the creds and the table is
  dropped; re-running is a no-op.

## Out of scope

- Wiring Meta `app_id`/`app_secret` into the Graph call (token exchange) — stored
  only.
- The deferred multi-tenant auth hardening (org resolution / non-superuser DB
  role / RLS enforcement) tracked separately.
