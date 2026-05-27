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
            coalesce(sum(dm.clicks),0)::int as clicks,
            coalesce(sum(dm.conversions),0)::int as conversions
       from businesses b
       left join daily_metrics dm on dm.business_id = b.id
      group by b.id, b.name
      order by spend desc, b.name asc`
  );
  return rows;
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
