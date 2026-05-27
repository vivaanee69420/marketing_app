// Read-only aggregates over daily_metrics. All org-scoped via withOrg + RLS.

export async function summary(tx, { businessId } = {}) {
  const params = [];
  let where = "";
  if (businessId) { params.push(businessId); where = `where business_id = $1`; }

  const totals = await tx.query(
    `select coalesce(sum(spend),0)::float as spend,
            coalesce(sum(clicks),0)::int as clicks,
            coalesce(sum(impressions),0)::int as impressions,
            coalesce(sum(conversions),0)::int as conversions
       from daily_metrics ${where}`,
    params
  );
  const byProvider = await tx.query(
    `select provider,
            coalesce(sum(spend),0)::float as spend,
            coalesce(sum(conversions),0)::int as conversions
       from daily_metrics ${where}
      group by provider`,
    params
  );
  return { totals: totals.rows[0], byProvider: byProvider.rows };
}

export async function byBusiness(tx) {
  const { rows } = await tx.query(
    `select b.id, b.name,
            coalesce(sum(dm.spend),0)::float as spend,
            coalesce(sum(dm.spend) filter (where dm.provider = 'google'),0)::float as google_spend,
            coalesce(sum(dm.spend) filter (where dm.provider = 'meta'),0)::float   as meta_spend,
            coalesce(sum(dm.clicks),0)::int as clicks,
            coalesce(sum(dm.conversions),0)::int as conversions
       from businesses b
       left join daily_metrics dm on dm.business_id = b.id
      group by b.id, b.name
      order by spend desc, b.name asc`
  );
  return rows;
}

// Per-campaign rollup for the Campaign Performance table. One row per campaign
// with its business name + provider and summed metrics over all of its
// daily_metrics. Campaigns with no metrics yet show zeros (left join).
export async function campaigns(tx) {
  const { rows } = await tx.query(
    `select c.id, c.name as campaign, c.provider, b.name as business,
            coalesce(sum(dm.spend),0)::float as spend,
            coalesce(sum(dm.clicks),0)::int as clicks,
            coalesce(sum(dm.conversions),0)::int as conversions
       from campaigns c
       join businesses b on b.id = c.business_id
       left join daily_metrics dm on dm.campaign_id = c.id
      group by c.id, c.name, c.provider, b.name
      order by spend desc, c.name asc`
  );
  return rows;
}

// Highest-ROI business + its headline stats. ROAS = revenue / spend, where
// revenue = sum(conversions.conversion_value) and spend = sum(daily_metrics.spend).
// Guarded for divide-by-zero; ties broken by revenue then name. Returns null
// when the org has no businesses.
export async function hero(tx) {
  const top = await tx.query(
    `with rev as (
       select business_id,
              coalesce(sum(conversion_value),0)::float as revenue,
              count(*)::int as conversions
         from conversions group by business_id
     ),
     sp as (
       select business_id, coalesce(sum(spend),0)::float as spend
         from daily_metrics group by business_id
     )
     select b.id, b.name,
            coalesce(sp.spend,0)::float    as spend,
            coalesce(rev.revenue,0)::float as revenue,
            coalesce(rev.conversions,0)::int as conversions,
            case when coalesce(sp.spend,0) > 0
                 then coalesce(rev.revenue,0) / sp.spend else 0 end::float as roas
       from businesses b
       left join rev on rev.business_id = b.id
       left join sp  on sp.business_id  = b.id
      order by roas desc, revenue desc, b.name asc
      limit 1`
  );
  if (!top.rows.length) return null;
  const b = top.rows[0];

  const [report, tasks, issues] = await Promise.all([
    tx.query(`select max(report_date) as report_date from ai_reports where business_id = $1`, [b.id]),
    tx.query(`select count(*)::int as n from tasks where business_id = $1 and status <> 'done'`, [b.id]),
    tx.query(`select count(*)::int as n from dashboard_issues where status = 'open'`),
  ]);

  return {
    business: { id: b.id, name: b.name, spend: b.spend, revenue: b.revenue, roas: b.roas, conversions: b.conversions },
    reportDate: report.rows[0].report_date,
    openTasks: tasks.rows[0].n,
    openIssues: issues.rows[0].n,
  };
}

// Scheduled-automation health. The one job that runs today (manual/cron sync)
// is reflected from the latest sync_runs row; any registered scheduled_jobs are
// listed with a freshness-derived status. No rows -> empty card (honest).
export async function jobHealth(tx) {
  const STALE_HOURS = 26;
  const jobs = [];

  const lastSync = await tx.query(
    `select status, coalesce(completed_at, started_at) as last_run_at
       from sync_runs order by started_at desc limit 1`
  );
  if (lastSync.rows.length) {
    const s = lastSync.rows[0];
    const tone = s.status === "completed" || s.status === "running" ? "ok"
               : s.status === "error" ? "err" : "warn";
    jobs.push({ name: "Data Sync", time: null, tz: null, lastRun: s.last_run_at, status: tone });
  }

  const scheduled = await tx.query(
    `select name, run_time, timezone, last_run_at
       from scheduled_jobs
      where is_active = true and job_type <> 'sync'
      order by run_time asc`
  );
  for (const j of scheduled.rows) {
    const ageMs = j.last_run_at ? Date.now() - new Date(j.last_run_at).getTime() : Infinity;
    jobs.push({
      name: j.name, time: j.run_time, tz: j.timezone,
      lastRun: j.last_run_at, status: ageMs <= STALE_HOURS * 3600_000 ? "ok" : "warn",
    });
  }

  return jobs;
}

export async function trend(tx, { months = 6 } = {}) {
  const { rows } = await tx.query(
    `select date_trunc('month', metric_date) as m,
            to_char(date_trunc('month', metric_date), 'Mon') as month,
            coalesce(sum(spend),0)::float as spend,
            coalesce(sum(conversions),0)::int as conversions
       from daily_metrics
      where metric_date >= (date_trunc('month', now()) - ($1::int - 1) * interval '1 month')
      group by 1, 2
      order by 1 asc`,
    [months]
  );
  return rows.map(({ month, spend, conversions }) => ({ month, spend, conversions }));
}
