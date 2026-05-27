import { PageHeader, Card, SectionHead, Pill, Button, DataTable, EmptyState } from '../components/index.js';
import { currency, number } from '../lib/format.js';
import { useBusinesses, useMetricsByBusiness, useIntegrations } from '../hooks/useApi.js';

// integration status → pill tone + label, per provider, for a business.
function connTone(integration) {
  if (!integration) return { tone: 'err', label: 'Not connected' };
  if (integration.last_sync_status === 'error') return { tone: 'warn', label: 'Sync error' };
  if (integration.last_sync_status === 'completed') return { tone: 'ok', label: 'Synced' };
  return { tone: 'ok', label: 'Connected' };
}

export default function Businesses() {
  const businessesQ = useBusinesses();
  const metricsQ = useMetricsByBusiness();
  const integrationsQ = useIntegrations();

  const metricsById = new Map((metricsQ.data || []).map((m) => [m.id, m]));
  const integrationsByKey = new Map(
    (integrationsQ.data || []).map((i) => [`${i.business_id}:${i.provider}`, i])
  );

  const rows = (businessesQ.data || []).map((b) => {
    const m = metricsById.get(b.id) || { spend: 0, clicks: 0, conversions: 0 };
    return {
      ...b,
      spend: m.spend,
      clicks: m.clicks,
      conversions: m.conversions,
      cpc: m.conversions > 0 ? m.spend / m.conversions : 0,
      meta: integrationsByKey.get(`${b.id}:meta`),
      google: integrationsByKey.get(`${b.id}:google`),
    };
  });

  const columns = [
    { key: 'name', header: 'Business', className: 'cell-strong' },
    { key: 'spend', header: 'Spend', render: (r) => currency(r.spend) },
    { key: 'clicks', header: 'Clicks', render: (r) => number(r.clicks) },
    { key: 'conversions', header: 'Conversions', render: (r) => number(r.conversions) },
    { key: 'cpc', header: 'Cost / Conv', render: (r) => currency(r.cpc) },
    { key: 'meta', header: 'Meta', render: (r) => { const c = connTone(r.meta); return <Pill tone={c.tone}>{c.label}</Pill>; } },
    { key: 'google', header: 'Google', render: (r) => { const c = connTone(r.google); return <Pill tone={c.tone}>{c.label}</Pill>; } },
    { key: 'timezone', header: 'Timezone' },
  ];

  return (
    <div className="stack">
      <PageHeader
        title="Businesses"
        description="Every location you run marketing for. Spend and conversions are live from connected Meta + Google accounts."
        actions={<Button variant="primary">Create Business</Button>}
      />
      <Card>
        <SectionHead title="All businesses" description="Connect accounts in Settings → Integrations, then run a sync." />
        {businessesQ.isLoading ? (
          <EmptyState>Loading businesses…</EmptyState>
        ) : businessesQ.isError ? (
          <EmptyState>Failed to load: {businessesQ.error.message}. Is the API running on :4000?</EmptyState>
        ) : (
          <DataTable columns={columns} rows={rows} rowKey="id" empty="No businesses yet." />
        )}
      </Card>
    </div>
  );
}
