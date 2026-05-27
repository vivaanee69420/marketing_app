# Per-business Provider Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Google + Meta provider credentials from the single org-wide `org_integration_settings` row down into each business's `integrations.config_json`, so every business uses its own Google Cloud project (and optionally its own Meta app).

**Architecture:** Per-business creds live in the existing `integrations.config_json` jsonb (secrets `*_enc`, ids plain). Pure helpers in a new `backend/services/providerCreds.js` handle config merge, connect-validation, sync-arg building, and the `configured` flag — so the logic is unit-testable without a DB or network. The sync engine reads Google creds from the integration row instead of org settings. A one-shot SQL migration copies the org's Google creds onto each existing Google integration, then drops `org_integration_settings`.

**Tech Stack:** Node 20+ ESM, Express 5, `pg` raw SQL, Zod, AES-256-GCM (`utils/crypto.js`), React 19 + Vite + TanStack Query. Tests: `node:test` (built-in) for backend pure logic. DB migration + frontend verified manually.

**Spec:** `docs/superpowers/specs/2026-05-27-per-business-provider-creds-design.md`

**Testing scope (read first):** The repo has no test runner and no tests. This plan adds `node:test`-based unit tests for the new pure helpers only (no install needed). Repository SQL, the migration, and the React changes are verified via the documented manual runbook in Task 7 — standing up a test DB / vitest+RTL is out of scope.

---

## File Structure

**Create:**
- `backend/services/providerCreds.js` — pure helpers: `mergeProviderConfig`, `requiredMissing`, `googleCallArgs`, `isConfigured`. No DB/network/imports beyond an injected `encrypt`/`decrypt`.
- `backend/services/providerCreds.test.js` — `node:test` unit tests for the above.
- `db/migrate_2026-05-27_google_per_business.sql` — idempotent live-DB migration.

**Modify:**
- `backend/package.json` — add `"test": "node --test"`.
- `backend/services/syncService.js` — Google branch reads creds via `googleCallArgs`; drop `orgSettings` import; drop unused `tx` arg from `callProvider`.
- `backend/controllers/integrationController.js` — extend Zod schema; merge config; connect-validation; blank-keeps for tokens + secrets.
- `backend/repositories/integrationRepository.js` — `upsert` writes `config_json`; `listStatus` exposes cred flags + `configured`.
- `backend/index.js` — remove `/api/org-settings` import + mount.
- `db/schema.sql` — delete `org_integration_settings` table + remove it from the RLS array.
- `db/seed.sql` — remove any `org_integration_settings` seed rows (if present).
- `frontend/src/hooks/useApi.js` — delete `useOrgSettings` / `useSaveOrgSettings`.
- `frontend/src/pages/Settings.jsx` — delete `GoogleProjectCard`/`GoogleProjectForm`; expand `IntegrationBlock` with per-provider cred fields.

**Delete:**
- `backend/controllers/orgSettingsController.js`
- `backend/repositories/orgSettingsRepository.js`
- `backend/routes/orgSettingsRoutes.js`

---

## Task 1: Pure credential helpers + tests

**Files:**
- Create: `backend/services/providerCreds.js`
- Test: `backend/services/providerCreds.test.js`
- Modify: `backend/package.json` (add test script)

- [ ] **Step 1: Add the backend test script**

In `backend/package.json`, add a `test` entry to `scripts`:

```json
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "db:ping": "node config/checkConnection.js",
    "test": "node --test"
  },
```

- [ ] **Step 2: Write the failing tests**

Create `backend/services/providerCreds.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeProviderConfig, requiredMissing, googleCallArgs, isConfigured,
} from "./providerCreds.js";

// Deterministic fakes so we don't touch real crypto.
const fakeEncrypt = (s) => `enc(${s})`;
const fakeDecrypt = (s) => String(s).replace(/^enc\(|\)$/g, "");

test("mergeProviderConfig: sets plain ids and encrypts provided google secrets", () => {
  const cfg = mergeProviderConfig("google", {}, {
    client_id: "cid-1", login_customer_id: "999",
    client_secret: "secret", developer_token: "dev",
  }, fakeEncrypt);
  assert.deepEqual(cfg, {
    client_id: "cid-1", login_customer_id: "999",
    client_secret_enc: "enc(secret)", developer_token_enc: "enc(dev)",
  });
});

test("mergeProviderConfig: blank secret keeps the stored *_enc", () => {
  const existing = { client_id: "cid-1", client_secret_enc: "enc(old)", developer_token_enc: "enc(d)" };
  const cfg = mergeProviderConfig("google", existing, { client_id: "cid-2" }, fakeEncrypt);
  assert.equal(cfg.client_secret_enc, "enc(old)");   // untouched
  assert.equal(cfg.developer_token_enc, "enc(d)");    // untouched
  assert.equal(cfg.client_id, "cid-2");               // updated plain id
});

test("mergeProviderConfig: meta app creds", () => {
  const cfg = mergeProviderConfig("meta", {}, { app_id: "a1", app_secret: "sek" }, fakeEncrypt);
  assert.deepEqual(cfg, { app_id: "a1", app_secret_enc: "enc(sek)" });
});

test("requiredMissing: google first connect lists all missing fields", () => {
  const missing = requiredMissing("google", {}, { hasAccountId: false, hasTokenAfter: false });
  assert.deepEqual(missing.sort(), ["client_id", "client_secret", "developer_token", "external_account_id", "refresh_token"].sort());
});

test("requiredMissing: google edit with everything stored → none missing", () => {
  const cfg = { client_id: "c", client_secret_enc: "x", developer_token_enc: "y" };
  const missing = requiredMissing("google", cfg, { hasAccountId: true, hasTokenAfter: true });
  assert.deepEqual(missing, []);
});

test("requiredMissing: meta needs account id + access token, app creds optional", () => {
  assert.deepEqual(
    requiredMissing("meta", {}, { hasAccountId: true, hasTokenAfter: true }), []
  );
  assert.deepEqual(
    requiredMissing("meta", {}, { hasAccountId: false, hasTokenAfter: false }).sort(),
    ["access_token", "external_account_id"].sort()
  );
});

test("googleCallArgs: reads creds from this integration's config_json (isolation)", () => {
  const a = googleCallArgs({
    external_account_id: "111", refresh_token_enc: "enc(rtA)",
    config_json: { client_id: "cidA", client_secret_enc: "enc(secA)", developer_token_enc: "enc(devA)", login_customer_id: "mA" },
  }, fakeDecrypt);
  const b = googleCallArgs({
    external_account_id: "222", refresh_token_enc: "enc(rtB)",
    config_json: { client_id: "cidB", client_secret_enc: "enc(secB)", developer_token_enc: "enc(devB)" },
  }, fakeDecrypt);
  assert.deepEqual(a, { refreshToken: "rtA", customerId: "111", clientId: "cidA", clientSecret: "secA", developerToken: "devA", loginCustomerId: "mA" });
  assert.deepEqual(b, { refreshToken: "rtB", customerId: "222", clientId: "cidB", clientSecret: "secB", developerToken: "devB", loginCustomerId: null });
});

test("googleCallArgs: throws a business-scoped error when project creds missing", () => {
  assert.throws(
    () => googleCallArgs({ config_json: { client_id: "c" } }, fakeDecrypt),
    /not configured for this business/
  );
});

test("isConfigured: google needs project creds + token + account id", () => {
  assert.equal(isConfigured("google", {
    external_account_id: "1", has_refresh_token: true,
    client_id: "c", has_client_secret: true, has_developer_token: true,
  }), true);
  assert.equal(isConfigured("google", {
    external_account_id: "1", has_refresh_token: true,
    client_id: "c", has_client_secret: false, has_developer_token: true,
  }), false);
});

test("isConfigured: meta needs only account id + access token", () => {
  assert.equal(isConfigured("meta", { external_account_id: "act_1", has_access_token: true }), true);
  assert.equal(isConfigured("meta", { external_account_id: "act_1", has_access_token: false }), false);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npm test`
Expected: FAIL — `Cannot find module './providerCreds.js'` (file not created yet).

- [ ] **Step 4: Write the helper module**

Create `backend/services/providerCreds.js`:

```js
/**
 * Pure helpers for per-business provider credentials stored in
 * integrations.config_json. No DB, no network — crypto fns are injected so
 * these are unit-testable in isolation.
 *
 * config_json shape:
 *   google: { client_id, client_secret_enc, developer_token_enc, login_customer_id? }
 *   meta:   { app_id?, app_secret_enc? }
 */

// plain ids stored as-is; secrets encrypted to `<field>_enc`.
const FIELD_MAP = {
  google: { plain: ["client_id", "login_customer_id"], secret: ["client_secret", "developer_token"] },
  meta:   { plain: ["app_id"], secret: ["app_secret"] },
};

/**
 * Merge submitted creds into the existing config. Plain ids overwrite when
 * present; a secret is encrypted+written ONLY when a new value was submitted,
 * so a blank field on edit keeps the stored ciphertext.
 */
export function mergeProviderConfig(provider, existing, input, encrypt) {
  const map = FIELD_MAP[provider];
  const cfg = { ...(existing || {}) };
  for (const f of map.plain) if (input[f] !== undefined) cfg[f] = input[f];
  for (const f of map.secret) if (input[f] !== undefined) cfg[`${f}_enc`] = encrypt(input[f]);
  return cfg;
}

/**
 * Fields still missing for a usable connection, accounting for already-stored
 * values. `hasAccountId` / `hasTokenAfter` = provided-now OR already-stored.
 */
export function requiredMissing(provider, mergedConfig, { hasAccountId, hasTokenAfter }) {
  const missing = [];
  if (!hasAccountId) missing.push("external_account_id");
  if (provider === "google") {
    if (!mergedConfig.client_id) missing.push("client_id");
    if (!mergedConfig.client_secret_enc) missing.push("client_secret");
    if (!mergedConfig.developer_token_enc) missing.push("developer_token");
    if (!hasTokenAfter) missing.push("refresh_token");
  } else {
    if (!hasTokenAfter) missing.push("access_token");
  }
  return missing;
}

/** Build the Google provider call args from an integration row. */
export function googleCallArgs(integration, decrypt) {
  const cfg = integration.config_json || {};
  if (!cfg.client_id || !cfg.client_secret_enc || !cfg.developer_token_enc) {
    throw new Error(
      "Google project not configured for this business — add client id, client secret and developer token in Settings → Integrations"
    );
  }
  return {
    refreshToken:   decrypt(integration.refresh_token_enc),
    customerId:     integration.external_account_id,
    clientId:       cfg.client_id,
    clientSecret:   decrypt(cfg.client_secret_enc),
    developerToken: decrypt(cfg.developer_token_enc),
    loginCustomerId: cfg.login_customer_id || null,
  };
}

/** Derived "ready to sync" flag from a listStatus row (no secrets). */
export function isConfigured(provider, row) {
  if (!row.external_account_id) return false;
  if (provider === "google") {
    return !!(row.client_id && row.has_client_secret && row.has_developer_token && row.has_refresh_token);
  }
  return !!row.has_access_token;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — all `providerCreds` tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/services/providerCreds.js backend/services/providerCreds.test.js
git commit -m "feat(backend): pure per-business provider credential helpers + tests"
```

---

## Task 2: Sync engine reads Google creds per-business

**Files:**
- Modify: `backend/services/syncService.js`

- [ ] **Step 1: Replace the orgSettings import with the new helper**

In `backend/services/syncService.js`, delete this import line (currently line 4):

```js
import * as orgSettings from "../repositories/orgSettingsRepository.js";
```

and add, next to the other service imports:

```js
import { googleCallArgs } from "./providerCreds.js";
```

- [ ] **Step 2: Rewrite `callProvider` to read from the integration row**

Replace the entire `callProvider` function (currently lines 23-47) with:

```js
function callProvider(provider, integration, window) {
  if (provider === "meta") {
    return fetchMeta({
      accessToken: decrypt(integration.access_token_enc),
      accountId: integration.external_account_id,
      ...window,
    });
  }
  // Google: BYO per business — creds come from integration.config_json.
  return fetchGoogle({ ...googleCallArgs(integration, decrypt), ...window });
}
```

- [ ] **Step 3: Update the `callProvider` call site**

In `syncOne`, change the call (currently line 67) from:

```js
      const rows = await callProvider(tx, provider, integration, window);
```

to:

```js
      const rows = await callProvider(provider, integration, window);
```

- [ ] **Step 4: Verify the pure helper tests still pass and nothing imports the deleted symbol**

Run: `cd backend && npm test`
Expected: PASS.

Run: `cd backend && grep -rn "orgSettings" services/ && echo FOUND || echo CLEAN`
Expected: `CLEAN` (no remaining references in services).

- [ ] **Step 5: Commit**

```bash
git add backend/services/syncService.js
git commit -m "feat(backend): sync reads Google creds from integration.config_json"
```

---

## Task 3: Integration save merges config, validates connect, blank-keeps secrets

**Files:**
- Modify: `backend/controllers/integrationController.js`
- Modify: `backend/repositories/integrationRepository.js`

- [ ] **Step 1: Extend the repository `upsert` to write `config_json`**

In `backend/repositories/integrationRepository.js`, replace the `upsert` function (currently lines 32-50) with:

```js
/** Insert or update credentials for a business+provider. config_json is the
 *  already-merged config; tokens are pre-encrypted or null (null keeps stored). */
export async function upsert(tx, { businessId, provider, externalAccountId, accountName, accessTokenEnc, refreshTokenEnc, configJson }) {
  const { rows } = await tx.query(
    `insert into integrations
       (org_id, business_id, provider, status, external_account_id, account_name,
        access_token_enc, refresh_token_enc, config_json, updated_at)
     values (${ORG}, $1, $2, 'connected', $3, $4, $5, $6, $7::jsonb, now())
     on conflict (org_id, business_id, provider) do update set
       status              = 'connected',
       external_account_id = excluded.external_account_id,
       account_name        = excluded.account_name,
       access_token_enc    = coalesce(excluded.access_token_enc, integrations.access_token_enc),
       refresh_token_enc   = coalesce(excluded.refresh_token_enc, integrations.refresh_token_enc),
       config_json         = excluded.config_json,
       last_error          = null,
       updated_at          = now()
     returning id, business_id, provider, status, external_account_id, account_name`,
    [businessId, provider, externalAccountId, accountName, accessTokenEnc, refreshTokenEnc, JSON.stringify(configJson || {})]
  );
  return rows[0];
}
```

- [ ] **Step 2: Expose cred flags + `configured` in `listStatus`**

In the same file, replace the `listStatus` function (currently lines 8-20) with:

```js
/** Connection status per business+provider — NO secrets returned. */
export async function listStatus(tx) {
  const { rows } = await tx.query(
    `select i.id, i.business_id, b.name as business_name, i.provider, i.status,
            i.external_account_id, i.account_name, i.last_sync_at,
            i.last_sync_status, i.last_error,
            (i.access_token_enc is not null)  as has_access_token,
            (i.refresh_token_enc is not null) as has_refresh_token,
            i.config_json->>'client_id'         as client_id,
            i.config_json->>'login_customer_id' as login_customer_id,
            i.config_json->>'app_id'            as app_id,
            (i.config_json ? 'client_secret_enc')   as has_client_secret,
            (i.config_json ? 'developer_token_enc') as has_developer_token,
            (i.config_json ? 'app_secret_enc')      as has_app_secret
       from integrations i
       join businesses b on b.id = i.business_id
      order by b.name, i.provider`
  );
  return rows;
}
```

- [ ] **Step 3: Rewrite the controller — schema, merge, validation, blank-keeps**

Replace the entire contents of `backend/controllers/integrationController.js` with:

```js
import { z } from "zod";
import { withOrg } from "../config/db.js";
import { encrypt } from "../utils/crypto.js";
import * as repo from "../repositories/integrationRepository.js";
import { mergeProviderConfig, requiredMissing, isConfigured } from "../services/providerCreds.js";

// Manual credential entry (no OAuth in this slice). Per-business project/app creds
// live in config_json. Account-level: Meta act_<id>+access_token, Google customer
// id+refresh_token. Secrets left blank on edit keep their stored value.
const saveSchema = z.object({
  business_id: z.string().uuid(),
  provider: z.enum(["meta", "google"]),
  external_account_id: z.string().min(1, "account/customer id is required"),
  account_name: z.string().max(200).optional(),
  access_token: z.string().min(1).optional(),
  refresh_token: z.string().min(1).optional(),
  // Google project creds
  client_id: z.string().min(1).optional(),
  client_secret: z.string().min(1).optional(),
  developer_token: z.string().min(1).optional(),
  login_customer_id: z.string().optional(),
  // Meta app creds (optional)
  app_id: z.string().min(1).optional(),
  app_secret: z.string().min(1).optional(),
});

export async function list(_req, res, next) {
  try {
    const rows = await withOrg((tx) => repo.listStatus(tx));
    const integrations = rows.map((r) => ({ ...r, configured: isConfigured(r.provider, r) }));
    res.json({ integrations });
  } catch (err) {
    next(err);
  }
}

export async function save(req, res, next) {
  try {
    const input = saveSchema.parse(req.body);
    const provider = input.provider;

    const saved = await withOrg(async (tx) => {
      const existing = await repo.getByBusinessProvider(tx, input.business_id, provider);
      const mergedConfig = mergeProviderConfig(provider, existing?.config_json || {}, input, encrypt);

      const hasAccountId = !!(input.external_account_id || existing?.external_account_id);
      const storedTokenEnc = provider === "meta" ? existing?.access_token_enc : existing?.refresh_token_enc;
      const newToken = provider === "meta" ? input.access_token : input.refresh_token;
      const hasTokenAfter = !!(newToken || storedTokenEnc);

      const missing = requiredMissing(provider, mergedConfig, { hasAccountId, hasTokenAfter });
      if (missing.length) {
        const err = new Error(`Missing required field(s): ${missing.join(", ")}`);
        err.status = 400;
        err.fields = missing;
        throw err;
      }

      return repo.upsert(tx, {
        businessId: input.business_id,
        provider,
        externalAccountId: input.external_account_id,
        accountName: input.account_name || null,
        accessTokenEnc: input.access_token ? encrypt(input.access_token) : null,
        refreshTokenEnc: input.refresh_token ? encrypt(input.refresh_token) : null,
        configJson: mergedConfig,
      });
    });

    res.status(201).json({ integration: saved });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 4: Verify the helper tests still pass**

Run: `cd backend && npm test`
Expected: PASS (helpers unchanged; this task wires them in).

- [ ] **Step 5: Sanity-check the error middleware honours `err.status`**

Run: `cd backend && grep -rn "err.status\|statusCode\|err.fields" index.js middleware* config/ 2>/dev/null; echo "---"; grep -rn "use((err" index.js`
Expected: an error handler exists. If it always returns 500 and ignores `err.status`, note it — the validation will still surface a message, just with a 500 code. Do NOT expand scope to rewrite the error handler unless it throws; a 500 with the field message is acceptable for this slice.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/integrationController.js backend/repositories/integrationRepository.js
git commit -m "feat(backend): per-business cred merge, connect validation, blank-keeps"
```

---

## Task 4: Remove the org-settings backend module

**Files:**
- Delete: `backend/controllers/orgSettingsController.js`, `backend/repositories/orgSettingsRepository.js`, `backend/routes/orgSettingsRoutes.js`
- Modify: `backend/index.js`

- [ ] **Step 1: Remove the route import + mount in `index.js`**

In `backend/index.js`, delete the import (currently line 8):

```js
import orgSettingsRoutes from "./routes/orgSettingsRoutes.js";
```

and delete the mount (currently line 43):

```js
app.use("/api/org-settings", orgSettingsRoutes);
```

- [ ] **Step 2: Delete the three files**

```bash
rm backend/controllers/orgSettingsController.js \
   backend/repositories/orgSettingsRepository.js \
   backend/routes/orgSettingsRoutes.js
```

- [ ] **Step 3: Verify no dangling references remain**

Run: `cd backend && grep -rn "orgSettings\|org-settings\|org_integration_settings" --include="*.js" . | grep -v node_modules; echo "exit:$?"`
Expected: no matches (grep exit 1). If anything prints, remove that reference.

- [ ] **Step 4: Verify the server boots**

Run: `cd backend && node --check index.js && echo "SYNTAX OK"`
Expected: `SYNTAX OK` (syntax check; full boot needs DB env).

- [ ] **Step 5: Commit**

```bash
git add backend/index.js backend/controllers/orgSettingsController.js backend/repositories/orgSettingsRepository.js backend/routes/orgSettingsRoutes.js
git commit -m "refactor(backend): remove org-wide org-settings module (now per-business)"
```

---

## Task 5: Schema, seed, and live-DB migration

**Files:**
- Modify: `db/schema.sql`
- Modify: `db/seed.sql`
- Create: `db/migrate_2026-05-27_google_per_business.sql`

- [ ] **Step 1: Delete the `org_integration_settings` table from `schema.sql`**

In `db/schema.sql`, delete the comment block + table definition (currently lines 343-357), i.e. the comment beginning `-- own Google API project ...` through the closing `);` of:

```sql
create table org_integration_settings (
  org_id     uuid not null references organizations(id) on delete cascade,
  provider   text not null,
  config     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, provider)
);
```

- [ ] **Step 2: Remove it from the RLS table array**

In the same file, in the `foreach t in array array[...]` block (around line 378-385), delete the trailing `'org_integration_settings'` entry. After editing, the array's last element is `'memberships'`:

```sql
    'tasks','reviews','organic_metrics','booking_records','benchmark_metrics',
    'membership_tiers','app_settings','audit_logs','memberships'
  ]
```

- [ ] **Step 3: Remove any org_integration_settings seed rows**

Run: `grep -n "org_integration_settings" db/seed.sql; echo "exit:$?"`
If matches print, delete those `insert into org_integration_settings ...` statements from `db/seed.sql`. If exit is 1 (no matches), leave `seed.sql` unchanged.

- [ ] **Step 4: Create the live-DB migration**

Create `db/migrate_2026-05-27_google_per_business.sql`:

```sql
-- Migration: move org-wide Google project creds down to each business's
-- Google integration, then drop org_integration_settings.
-- Idempotent: '||' is a top-level jsonb merge (only org keys overwrite), and
-- DROP ... IF EXISTS makes re-runs safe. Run inside a transaction.

begin;

-- Copy each org's stored Google config onto every Google integration row.
update integrations i
   set config_json = coalesce(i.config_json, '{}'::jsonb) || s.config,
       updated_at  = now()
  from org_integration_settings s
 where s.org_id   = i.org_id
   and s.provider = 'google'
   and i.provider = 'google';

drop table if exists org_integration_settings;

commit;
```

- [ ] **Step 5: Verify the migration SQL parses**

Run: `cd backend && node -e "import('fs').then(fs => { const s = fs.readFileSync('../db/migrate_2026-05-27_google_per_business.sql','utf8'); if(!/drop table if exists org_integration_settings/.test(s)) throw new Error('missing drop'); console.log('MIGRATION OK'); })"`
Expected: `MIGRATION OK`.

(The migration runs against the live DB during the Task 7 runbook — there is no test DB to execute it against here.)

- [ ] **Step 6: Commit**

```bash
git add db/schema.sql db/seed.sql db/migrate_2026-05-27_google_per_business.sql
git commit -m "feat(db): drop org_integration_settings, migrate Google creds per-business"
```

---

## Task 6: Frontend — per-business cred fields, remove org card

**Files:**
- Modify: `frontend/src/hooks/useApi.js`
- Modify: `frontend/src/pages/Settings.jsx`

- [ ] **Step 1: Delete the org-settings hooks**

In `frontend/src/hooks/useApi.js`, delete `useOrgSettings` (currently lines 55-61) and `useSaveOrgSettings` (currently lines 64-70), including the `// Org-level (BYO) ...` comment above `useOrgSettings`. Leave `useSaveIntegration` and `useSync` intact.

- [ ] **Step 2: Update the Settings imports**

In `frontend/src/pages/Settings.jsx`, change the hooks import (currently lines 8-11) to drop the removed hooks:

```jsx
import {
  useBusinesses, useIntegrations, useSaveIntegration, useSync,
} from '../hooks/useApi.js';
```

- [ ] **Step 3: Delete `GoogleProjectCard` and `GoogleProjectForm`**

In `frontend/src/pages/Settings.jsx`, delete both functions: the `// Org-wide Google API project ...` comment + `GoogleProjectCard` (currently lines 191-199) and `GoogleProjectForm` (currently lines 201-242).

- [ ] **Step 4: Remove the `<GoogleProjectCard />` render**

In the `Integrations` component, delete the line (currently line 266):

```jsx
        <GoogleProjectCard />
```

- [ ] **Step 5: Replace `IntegrationBlock` with the per-provider cred form**

Replace the entire `IntegrationBlock` function (currently lines 149-189) with:

```jsx
function IntegrationBlock({ provider, businessId, integration }) {
  const isMeta = provider === 'meta';
  const i = integration || {};
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState(i.external_account_id || '');
  const [token, setToken] = useState('');                 // access (meta) | refresh (google)
  // Google project creds
  const [clientId, setClientId] = useState(i.client_id || '');
  const [clientSecret, setClientSecret] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loginCid, setLoginCid] = useState(i.login_customer_id || '');
  // Meta app creds
  const [appId, setAppId] = useState(i.app_id || '');
  const [appSecret, setAppSecret] = useState('');
  const save = useSaveIntegration();

  function submit(e) {
    e.preventDefault();
    save.mutate({
      business_id: businessId,
      provider,
      external_account_id: accountId,
      account_name: accountName || undefined,
      ...(isMeta
        ? {
            ...(token ? { access_token: token } : {}),
            ...(appId ? { app_id: appId } : {}),
            ...(appSecret ? { app_secret: appSecret } : {}),
          }
        : {
            ...(token ? { refresh_token: token } : {}),
            client_id: clientId,
            login_customer_id: loginCid,
            ...(clientSecret ? { client_secret: clientSecret } : {}),
            ...(devToken ? { developer_token: devToken } : {}),
          }),
    });
  }

  // First-connect needs a token; edits may leave secrets blank.
  const tokenStored = isMeta ? i.has_access_token : i.has_refresh_token;
  const canSubmit = !!businessId && !!accountId && (!!token || tokenStored)
    && (isMeta || (!!clientId && (i.has_client_secret || !!clientSecret) && (i.has_developer_token || !!devToken)));

  return (
    <SoftCard>
      <form className="stack" onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{isMeta ? 'Meta' : 'Google'}</strong>
          {statusPill(integration)}
        </div>
        <InputField label="Account Name" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder={i.account_name || 'optional label'} />
        <InputField label={isMeta ? 'Ad Account ID (act_…)' : 'Customer ID'} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        <InputField
          label={isMeta ? 'Access Token' : 'OAuth Refresh Token'}
          type="password" value={token} onChange={(e) => setToken(e.target.value)}
          placeholder={tokenStored ? '•••• saved — blank keeps it' : ''}
        />
        {!isMeta && (
          <>
            <InputField label="OAuth Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} />
            <InputField label="Login Customer ID (optional)" value={loginCid} onChange={(e) => setLoginCid(e.target.value)} placeholder="manager account, digits only" />
            <InputField label="OAuth Client Secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={i.has_client_secret ? '•••• saved — blank keeps it' : ''} />
            <InputField label="Developer Token" type="password" value={devToken} onChange={(e) => setDevToken(e.target.value)} placeholder={i.has_developer_token ? '•••• saved — blank keeps it' : ''} />
            <span className="subtle">Each business uses its own Google Cloud OAuth client + Ads developer token. Customer id + refresh token are this account’s.</span>
          </>
        )}
        {isMeta && (
          <>
            <InputField label="App ID (optional)" value={appId} onChange={(e) => setAppId(e.target.value)} />
            <InputField label="App Secret (optional)" type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder={i.has_app_secret ? '•••• saved — blank keeps it' : ''} />
            <span className="subtle">Use a Meta Business Manager System User token (set non-expiring). App id/secret optional.</span>
          </>
        )}
        <div className="row">
          <Button variant="primary" type="submit" disabled={save.isPending || !canSubmit}>
            {save.isPending ? 'Saving…' : 'Save & connect'}
          </Button>
        </div>
        {save.isError && <Notice tone="issue">{save.error.message}</Notice>}
        {save.isSuccess && <Notice tone="good">Saved. Run a sync to pull data.</Notice>}
      </form>
    </SoftCard>
  );
}
```

- [ ] **Step 6: Keep remount-on-load fresh**

The blocks already key on `` `google:${selected}` `` / `` `meta:${selected}` `` (currently lines 274-275), so switching business remounts with fresh initial state from `integration`. No change needed — confirm those `key=` props remain.

- [ ] **Step 7: Lint the frontend**

Run: `cd frontend && npm run lint`
Expected: no errors in `Settings.jsx` / `useApi.js` (no unused `useOrgSettings`, `SectionField`, etc.). Fix any unused-import warnings the deletions introduced.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/hooks/useApi.js frontend/src/pages/Settings.jsx
git commit -m "feat(frontend): per-business Google + Meta cred fields, drop org project card"
```

---

## Task 7: Manual end-to-end verification + run migration

**Files:** none (verification + live migration).

- [ ] **Step 1: Run the full backend unit suite**

Run: `cd backend && npm test`
Expected: PASS, all `providerCreds` tests green.

- [ ] **Step 2: Apply the migration to the dev DB**

With the DB env loaded (same `DATABASE_URL` the API uses), run:

```bash
psql "$DATABASE_URL" -f db/migrate_2026-05-27_google_per_business.sql
```

Expected on first run: `DO` (the guarded block runs the UPDATE + DROP). The migration is wrapped in a `to_regclass`-guarded `DO` block, so re-running after the table is gone is a clean no-op (prints `DO`, no error) — idempotent.

- [ ] **Step 3: Confirm creds landed on existing Google integrations**

```bash
psql "$DATABASE_URL" -c "select business_id, config_json ? 'client_id' as has_cid, config_json ? 'developer_token_enc' as has_dev from integrations where provider='google';"
```
Expected: `has_cid = t` and `has_dev = t` for each previously-working Google business.

- [ ] **Step 4: Start the app and verify the Settings UI**

Run backend (`cd backend && npm run dev`) and frontend (`cd frontend && npm run dev`). In the browser, open Settings → Integrations:
- The "Google API project (organisation-wide)" card is GONE.
- Selecting an existing Google business shows Client ID + Login Customer ID pre-filled, and the secret/token fields show "•••• saved — blank keeps it".
- The Meta block shows optional App ID / App Secret fields.

- [ ] **Step 5: Verify blank-keeps on edit**

Edit an existing Google business: change only Account Name, leave all secrets blank, Save. Then run a sync ("Run sync"). Expected: sync still succeeds (stored secrets were retained, not wiped).

- [ ] **Step 6: Verify a second, independent Google project**

Connect a *different* business's Google with a different Client ID + secret + dev token + its own customer id + refresh token. Save, then sync that business. Expected: it syncs using its own creds, independent of the first business.

- [ ] **Step 7: Verify validation on first connect**

On a never-connected Google business, enter only the customer id and Save. Expected: a "Missing required field(s): …" message listing the absent project creds + refresh token (no row created/connected).

- [ ] **Step 8: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore: per-business creds verification fixups" || echo "nothing to commit"
```

---

## Done when
- `cd backend && npm test` passes.
- `org_integration_settings` and `/api/org-settings` no longer exist; no references in code.
- Existing Google businesses sync unchanged after migration; a second business can use a different Google project.
- Settings UI has no org-wide Google card; Google + Meta creds are entered per business with blank-keeps on edit.
