import { withOrg } from "../config/db.js";
import { decrypt } from "../utils/crypto.js";
import * as integrations from "../repositories/integrationRepository.js";
import * as orgSettings from "../repositories/orgSettingsRepository.js";
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

async function callProvider(tx, provider, integration, window) {
  if (provider === "meta") {
    return fetchMeta({
      accessToken: decrypt(integration.access_token_enc),
      accountId: integration.external_account_id,
      ...window,
    });
  }
  // Google: BYO per tenant — the API project creds come from the org's settings.
  const cfg = (await orgSettings.getProviderSettings(tx, "google"))?.config || {};
  if (!cfg.client_id || !cfg.client_secret_enc || !cfg.developer_token_enc) {
    throw new Error(
      "Google API project not configured for this organisation (Settings → Integrations → Google API project)"
    );
  }
  return fetchGoogle({
    refreshToken: decrypt(integration.refresh_token_enc),
    customerId: integration.external_account_id,
    clientId: cfg.client_id,
    clientSecret: decrypt(cfg.client_secret_enc),
    developerToken: decrypt(cfg.developer_token_enc),
    loginCustomerId: cfg.login_customer_id || null,
    ...window,
  });
}

/**
 * Sync one business+provider. Whole thing runs in a single transaction; provider
 * failures are caught INSIDE the txn so the sync_runs row + dashboard_issue
 * commit (rethrowing would roll them back). Returns a result object.
 */
export async function syncOne(businessId, provider, windowOverride) {
  const window = windowOverride || defaultWindow();
  const issueKey = `sync:${provider}:${businessId}`;

  return withOrg(async (tx) => {
    const integration = await integrations.getByBusinessProvider(tx, businessId, provider);
    const runId = await sync.startSyncRun(tx, { businessId, provider, syncType: "manual" });

    try {
      if (!integration) throw new Error(`${provider} is not connected for this business`);
      const tokenCol = provider === "meta" ? integration.access_token_enc : integration.refresh_token_enc;
      if (!tokenCol) throw new Error(`${provider} credentials missing`);

      const rows = await callProvider(tx, provider, integration, window);

      // Resolve external→internal ids once per entity.
      const campaignIds = new Map();
      const adSetIds = new Map();
      const adIds = new Map();

      await sync.deleteMetricsWindow(tx, { businessId, provider, ...window });

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

        await sync.insertDailyMetric(tx, {
          businessId, provider, campaignId, adSetId, adId,
          date: r.date, spend: r.spend, clicks: r.clicks,
          impressions: r.impressions, conversions: r.conversions,
        });
      }

      await sync.finishSyncRun(tx, { id: runId, status: "completed", recordsSynced: rows.length });
      await integrations.markSync(tx, { businessId, provider, status: "completed" });
      await sync.resolveIssue(tx, { key: issueKey });

      return { businessId, provider, status: "completed", records: rows.length, window };
    } catch (err) {
      // Fail loud, not silent: record the failure (commits with the txn).
      await sync.finishSyncRun(tx, { id: runId, status: "error", error: err.message });
      await integrations.markSync(tx, { businessId, provider, status: "error", error: err.message });
      await sync.raiseIssue(tx, {
        key: issueKey, scope: `business:${businessId}`, severity: "error",
        title: `${provider} sync failed`, message: err.message,
      });
      return { businessId, provider, status: "error", error: err.message, window };
    }
  });
}

/** Sync a business across providers, isolating per-provider faults. */
export async function syncBusiness(businessId, providers = PROVIDERS) {
  const results = [];
  for (const p of providers) {
    try {
      results.push(await syncOne(businessId, p));
    } catch (err) {
      // withOrg itself failed (e.g. DB) — still don't block the other provider.
      results.push({ businessId, provider: p, status: "error", error: err.message });
    }
  }
  return results;
}
