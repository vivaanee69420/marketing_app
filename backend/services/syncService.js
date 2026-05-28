import { withOrg } from "../config/db.js";
import { decrypt } from "../utils/crypto.js";
import * as integrations from "../repositories/integrationRepository.js";
import { googleCallArgs } from "./providerCreds.js";
import * as sync from "../repositories/syncRepository.js";
import { fetchInsights as fetchMeta } from "../providers/meta.js";
import { fetchInsights as fetchGoogle } from "../providers/google.js";

const PROVIDERS = ["meta", "google"];

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

/** Default 30-day window ending today (UTC). */
function defaultWindow() {
  const until = new Date();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  return { since: ymd(since), until: ymd(until) };
}

function callProvider(provider, integration, window) {
  if (provider === "meta") {
    return fetchMeta({
      accessToken: decrypt(integration.access_token_enc),
      accountId: integration.external_account_id,
      ...window,
    });
  }
  return fetchGoogle({ ...googleCallArgs(integration, decrypt), ...window });
}

/**
 * Sync one business+provider.
 *
 * Why three transactions instead of one:
 *   tx1 commits the sync_runs row so it survives a later crash (a janitor can
 *   sweep stale "running" rows). tx2 is the atomic data swap (delete-window +
 *   upserts + inserts) — if anything in tx2 throws (constraint violation,
 *   type error, etc.), Postgres aborts that txn ONLY. tx3 then writes the
 *   failure bookkeeping on a fresh client, so it can never hit the
 *   "current transaction is aborted, commands ignored until end of
 *   transaction block" footgun that the old single-txn version suffered.
 *
 * onProgress is invoked at phase boundaries with { phase, done, total, ... }
 * so the SSE route can stream real progress to the client.
 */
export async function syncOne(businessId, provider, windowOverride, onProgress = () => {}) {
  const window = windowOverride || defaultWindow();
  const issueKey = `sync:${provider}:${businessId}`;

  onProgress({ phase: "start", businessId, provider });

  // Resolve integration outside the data txn. Skip cleanly if not connected.
  const integration = await withOrg(async (tx) =>
    integrations.getByBusinessProvider(tx, businessId, provider)
  );
  const tokenCol = integration && (provider === "meta"
    ? integration.access_token_enc
    : integration.refresh_token_enc);
  if (!integration || !tokenCol) {
    onProgress({ phase: "skipped" });
    return { businessId, provider, status: "skipped", reason: "not connected", window };
  }

  // Reject if a sync is already in flight for this business+provider. Stops
  // a double-click (or curl + browser racing) from piling up parallel runs
  // that exhaust the pg pool.
  const busy = await withOrg(async (tx) =>
    sync.hasRunningSync(tx, { businessId, provider }),
  );
  if (busy) {
    onProgress({ phase: "skipped", reason: "already running" });
    return { businessId, provider, status: "skipped", reason: "already running", window };
  }

  // tx1: open sync_runs (status=running). Commits independently.
  const runId = await withOrg(async (tx) =>
    sync.startSyncRun(tx, { businessId, provider, syncType: "manual" })
  );

  let rows = null;
  let dataErr = null;
  try {
    onProgress({ phase: "fetching" });
    rows = await callProvider(provider, integration, window);
    onProgress({ phase: "fetched", total: rows.length });

    // tx2: atomic data swap. If anything throws, rollback wipes the
    // partial state and the error is handed to tx3 below.
    //
    // Strategy: upserts stay one-row-at-a-time (small N after dedup — usually
    // a few hundred), but daily_metrics goes via a single bulk INSERT. Going
    // row-by-row over the Supabase pooler measured at ~5 rows/sec; one batched
    // INSERT for 1248 rows lands in well under a second.
    await withOrg(async (tx) => {
      const campaignIds = new Map();
      const adSetIds = new Map();
      const adIds = new Map();
      const metrics = [];

      await sync.deleteMetricsWindow(tx, { businessId, provider, ...window });

      const total = rows.length;
      let resolved = 0;
      for (const r of rows) {
        let campaignId = null, adSetId = null, adId = null;

        if (r.campaign?.externalId) {
          if (!campaignIds.has(r.campaign.externalId)) {
            campaignIds.set(r.campaign.externalId,
              await sync.upsertCampaign(tx, { provider, businessId, externalId: r.campaign.externalId, name: r.campaign.name }));
          }
          campaignId = campaignIds.get(r.campaign.externalId);
        }
        if (r.adSet?.externalId) {
          if (!adSetIds.has(r.adSet.externalId)) {
            adSetIds.set(r.adSet.externalId,
              await sync.upsertAdSet(tx, { provider, businessId, campaignId, externalId: r.adSet.externalId, name: r.adSet.name }));
          }
          adSetId = adSetIds.get(r.adSet.externalId);
        }
        if (r.ad?.externalId) {
          if (!adIds.has(r.ad.externalId)) {
            adIds.set(r.ad.externalId,
              await sync.upsertAd(tx, { provider, businessId, campaignId, adSetId, externalId: r.ad.externalId, name: r.ad.name }));
          }
          adId = adIds.get(r.ad.externalId);
        }

        metrics.push({
          businessId, provider, campaignId, adSetId, adId,
          date: r.date, spend: r.spend, clicks: r.clicks,
          impressions: r.impressions, conversions: r.conversions,
        });

        resolved += 1;
        // Resolve phase progress: 1st, every 25 rows, last. This is the part
        // that takes real time (per-row upsert round-trips). Phase 'writing'
        // is reused so the frontend bar mapping doesn't need a new band.
        if (resolved === 1 || resolved === total || resolved % 25 === 0) {
          onProgress({ phase: "writing", done: resolved, total });
        }
      }

      // Bulk write. One emit before and after.
      onProgress({ phase: "writing", done: total, total });
      await sync.insertDailyMetricsBatch(tx, metrics);
    });
  } catch (err) {
    dataErr = err;
  }

  // tx3: bookkeeping. Always commits on a fresh client.
  onProgress({ phase: "finalizing" });
  const finalStatus = dataErr
    ? (dataErr.code === "TOKEN_EXPIRED" ? "token_expired" : "error")
    : "completed";

  await withOrg(async (tx) => {
    await sync.finishSyncRun(tx, {
      id: runId,
      status: dataErr ? "error" : "completed",
      recordsSynced: rows ? rows.length : 0,
      error: dataErr ? dataErr.message : null,
    });
    await integrations.markSync(tx, {
      businessId, provider, status: finalStatus, error: dataErr ? dataErr.message : null,
    });
    if (dataErr) {
      await sync.raiseIssue(tx, {
        key: issueKey, scope: `business:${businessId}`,
        severity: finalStatus === "token_expired" ? "warning" : "error",
        title: finalStatus === "token_expired"
          ? `${provider} reconnect required`
          : `${provider} sync failed`,
        message: dataErr.message,
      });
    } else {
      await sync.resolveIssue(tx, { key: issueKey });
    }
  });

  if (dataErr) {
    onProgress({ phase: "error", error: dataErr.message, code: dataErr.code || null });
    return {
      businessId, provider, status: finalStatus,
      error: dataErr.message, code: dataErr.code || null, window,
    };
  }
  onProgress({ phase: "done", total: rows.length });
  return { businessId, provider, status: "completed", records: rows.length, window };
}

/** Sync a business across providers, isolating per-provider faults. */
export async function syncBusiness(businessId, providers = PROVIDERS, onProgress = () => {}) {
  const results = [];
  for (const p of providers) {
    try {
      results.push(await syncOne(businessId, p, undefined, onProgress));
    } catch (err) {
      // withOrg itself failed (e.g. DB) — still don't block the other provider.
      onProgress({ phase: "error", provider: p, error: err.message });
      results.push({ businessId, provider: p, status: "error", error: err.message });
    }
  }
  return results;
}
