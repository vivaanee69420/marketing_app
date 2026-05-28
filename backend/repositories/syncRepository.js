// Sync persistence: upsert campaign→adset→ad tree, delete-then-insert
// daily_metrics per window (m1 plain-inserted → double-counted on re-sync),
// record sync_runs, raise/resolve dashboard_issues. org_id always from the
// session var set by withOrg.

const ORG = `nullif(current_setting('app.current_org', true), '')::uuid`;

export async function upsertCampaign(tx, { provider, businessId, externalId, name }) {
  const { rows } = await tx.query(
    `insert into campaigns (org_id, business_id, provider, external_id, name, updated_at)
     values (${ORG}, $1, $2, $3, $4, now())
     on conflict (org_id, provider, external_id) do update
       set name = excluded.name, updated_at = now()
     returning id`,
    [businessId, provider, externalId, name || externalId]
  );
  return rows[0].id;
}

export async function upsertAdSet(tx, { provider, businessId, campaignId, externalId, name }) {
  const { rows } = await tx.query(
    `insert into ad_sets (org_id, business_id, campaign_id, provider, external_id, name, updated_at)
     values (${ORG}, $1, $2, $3, $4, $5, now())
     on conflict (org_id, provider, external_id) do update
       set name = excluded.name, campaign_id = excluded.campaign_id, updated_at = now()
     returning id`,
    [businessId, campaignId, provider, externalId, name || externalId]
  );
  return rows[0].id;
}

export async function upsertAd(tx, { provider, businessId, campaignId, adSetId, externalId, name }) {
  const { rows } = await tx.query(
    `insert into ads (org_id, business_id, campaign_id, ad_set_id, provider, external_id, name, updated_at)
     values (${ORG}, $1, $2, $3, $4, $5, $6, now())
     on conflict (org_id, provider, external_id) do update
       set name = excluded.name, campaign_id = excluded.campaign_id,
           ad_set_id = excluded.ad_set_id, updated_at = now()
     returning id`,
    [businessId, campaignId, adSetId, provider, externalId, name || externalId]
  );
  return rows[0].id;
}

export async function deleteMetricsWindow(tx, { businessId, provider, since, until }) {
  await tx.query(
    `delete from daily_metrics
      where business_id = $1 and provider = $2
        and metric_date between $3 and $4`,
    [businessId, provider, since, until]
  );
}

export async function insertDailyMetric(tx, m) {
  await tx.query(
    `insert into daily_metrics
       (org_id, business_id, provider, campaign_id, ad_set_id, ad_id,
        metric_date, currency, spend, clicks, impressions, conversions)
     values (${ORG}, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [m.businessId, m.provider, m.campaignId, m.adSetId, m.adId, m.date,
     m.currency || "GBP", m.spend, m.clicks, m.impressions, m.conversions]
  );
}

/**
 * Bulk variant — collapses N round-trips into one. Critical for Supabase
 * pooler latency: a single sync used to be 1248 separate INSERTs over the
 * pooled connection (~5 inserts/sec → 6+ minutes per business). This sends
 * one statement with a multi-row VALUES list. Pg parameter limit is 65535;
 * with 11 placeholders per row that's ~5950 rows per batch — we chunk at
 * 1000 to stay well clear and keep statement size reasonable.
 *
 * Returns the number of rows inserted.
 */
export async function insertDailyMetricsBatch(tx, metrics) {
  if (!Array.isArray(metrics) || metrics.length === 0) return 0;
  const CHUNK = 1000;
  let inserted = 0;
  for (let start = 0; start < metrics.length; start += CHUNK) {
    const slice = metrics.slice(start, start + CHUNK);
    const values = [];
    const params = [];
    for (let i = 0; i < slice.length; i++) {
      const m = slice[i];
      const base = i * 11;
      values.push(
        `(${ORG}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, ` +
        `$${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, ` +
        `$${base + 10}, $${base + 11})`
      );
      params.push(
        m.businessId, m.provider, m.campaignId, m.adSetId, m.adId, m.date,
        m.currency || "GBP", m.spend, m.clicks, m.impressions, m.conversions
      );
    }
    await tx.query(
      `insert into daily_metrics
         (org_id, business_id, provider, campaign_id, ad_set_id, ad_id,
          metric_date, currency, spend, clicks, impressions, conversions)
       values ${values.join(", ")}`,
      params,
    );
    inserted += slice.length;
  }
  return inserted;
}

/**
 * Check if a sync is already in flight for this business+provider. Used as a
 * lightweight concurrency guard so a double-click on the Sync button doesn't
 * spawn parallel runs that fight for pool connections.
 */
export async function hasRunningSync(tx, { businessId, provider, maxAgeMin = 15 }) {
  const { rows } = await tx.query(
    `select id from sync_runs
      where business_id = $1 and provider = $2 and status = 'running'
        and started_at > now() - ($3 || ' minutes')::interval
      limit 1`,
    [businessId, provider, String(maxAgeMin)],
  );
  return rows.length > 0;
}

export async function startSyncRun(tx, { businessId, provider, syncType }) {
  const { rows } = await tx.query(
    `insert into sync_runs (org_id, business_id, provider, sync_type, status)
     values (${ORG}, $1, $2, $3, 'running') returning id`,
    [businessId, provider, syncType]
  );
  return rows[0].id;
}

export async function finishSyncRun(tx, { id, status, recordsSynced, error }) {
  await tx.query(
    `update sync_runs
        set status = $2, records_synced = $3, error_message = $4, completed_at = now()
      where id = $1`,
    [id, status, recordsSynced || 0, error || null]
  );
}

export async function raiseIssue(tx, { key, scope, severity, title, message }) {
  await tx.query(
    `insert into dashboard_issues (org_id, key, scope, severity, title, message, status, last_seen_at, updated_at)
     values (${ORG}, $1, $2, $3, $4, $5, 'open', now(), now())
     on conflict (org_id, key) do update
       set status = 'open', severity = excluded.severity, title = excluded.title,
           message = excluded.message, last_seen_at = now(), resolved_at = null, updated_at = now()`,
    [key, scope, severity || "error", title, message]
  );
}

export async function resolveIssue(tx, { key }) {
  await tx.query(
    `update dashboard_issues
        set status = 'resolved', resolved_at = now(), updated_at = now()
      where key = $1 and status = 'open'`,
    [key]
  );
}
