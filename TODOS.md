# TODOs

## Stale sync_runs janitor

**What:** Cron-style sweep that flips `sync_runs` rows stuck in `running` for
more than ~15 min to `status='error'` with a generic `"sync crashed before
finalize"` message, plus marks the related integration row.

**Why:** The 3-txn refactor in `backend/services/syncService.js` opens tx1
(start) and tx3 (finish) separately so tx3 can always commit on a fresh
client (the whole reason we no longer surface "current transaction is aborted").
The tradeoff: if the Node process is killed between tx1 and tx3, the run
row stays `running` forever and the UI sees a permanent "Syncing…" pill.

**Pros:** Self-healing UI. Visibility into crashes via dashboard_issues.
**Cons:** Adds a small cron job and a janitor query.
**Context:** Threshold ~15 min covers worst-case Meta + Google sync time
(measured under one minute in current data sizes; 15× headroom).
**Depends on / blocked by:** Nothing. Independent small PR.
**Effort:** human ~1h / CC ~10min.

## Meta reconnect deep-link (proper OAuth)

**What:** Replace the "Reconnect required" notice's "paste a fresh token below"
copy with a real `Reconnect Meta` button that opens Facebook Login OAuth, gets
a fresh long-lived user/system-user token, and writes it server-side.

**Why:** Today the user manually issues a system-user token in Meta Business
Manager and pastes it. That's fine for internal/BYO setups but rough as a
product flow. The `TOKEN_EXPIRED` tag from `backend/providers/meta.js` already
flags the moment it's needed.

**Pros:** Self-serve reconnect, no Business Manager spelunking.
**Cons:** Requires a Facebook app + OAuth callback route + token-exchange
logic. Plus token storage policy (already encrypted at rest, so cheap).
**Depends on / blocked by:** Need a configured Meta app id/secret (the
schema already has `app_id` / `app_secret_enc` columns in `integrations.config_json`).
**Effort:** human ~1d / CC ~1h.

## Google reconnect deep-link (proper OAuth)

**What:** Same as above for Google — `invalid_grant` (TOKEN_EXPIRED) triggers
a `Reconnect Google` button that runs the Google OAuth consent flow against
the per-business client id/secret already stored in `integrations.config_json`.

**Why:** Refresh tokens go stale (user revokes consent, password change,
180-day inactivity). Without a one-click reconnect, users have to
hand-issue a new refresh token via gcloud / OAuth playground.

**Pros:** Self-serve. Refresh tokens auto-store.
**Cons:** Need a redirect URI per env, plus a tiny `/api/oauth/google/callback`.
**Depends on / blocked by:** Google project must add the redirect URI.
**Effort:** human ~1d / CC ~1h.

## Backend integration tests for syncService 3-txn refactor

**What:** Spin up a test DB (Supabase branch or local pg) and write a
regression test that forces a SQL error inside tx2 (e.g. corrupt a row
mid-insert) and asserts:
- the final `sync_runs.status` is `error`
- `sync_runs.error_message` contains the actual SQL failure
- the message is NOT `"current transaction is aborted, commands ignored
  until end of transaction block"`
- `integrations.last_sync_status` and `dashboard_issues` are written

**Why:** Today only unit-level tests cover the 3-txn split (provider
tagging + controller decideSyncStatus). The transaction-isolation claim
itself is unverified by automated tests — it relies on manual dogfood.

**Pros:** Locks in the bugfix for the next refactor.
**Cons:** Needs DB plumbing in CI.
**Depends on / blocked by:** Supabase branching or a CI-side pg fixture.
**Effort:** human ~3h / CC ~30min once branching is wired.
