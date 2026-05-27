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
