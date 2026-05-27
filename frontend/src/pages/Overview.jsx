import { useState } from 'react';
import {
  PageHeader, KpiGrid, HeroCard, Notice, Card, SectionHead, Tabs,
  DataTable, Pill, Button, FilterSelect, TrendChart, EmptyState,
} from '../components/index.js';
import { currency, number } from '../lib/format.js';
import * as mock from '../lib/mock.js';
import { useBusinesses, useIntegrations, useMetricsSummary, useMetricsByBusiness, useTrend, useSync } from '../hooks/useApi.js';

const TABS = [
  { value: 'business', label: 'Business Performance' },
  { value: 'campaign', label: 'Campaign Performance' },
  { value: 'automation', label: 'Automation Health' },
];

const TREND_SERIES = [
  { key: 'spend', label: 'Spend', color: 'var(--gold)' },
  { key: 'conversions', label: 'Conversions', color: '#b7a77a' },
];

const liveBusinessCols = [
  { key: 'name', header: 'Business', className: 'cell-strong' },
  { key: 'spend', header: 'Spend', render: (r) => currency(r.spend) },
  { key: 'clicks', header: 'Clicks', render: (r) => number(r.clicks) },
  { key: 'conversions', header: 'Conversions', render: (r) => number(r.conversions) },
  { key: 'cpc', header: 'Cost / Conv', render: (r) => (r.conversions > 0 ? currency(r.spend / r.conversions) : '—') },
];

const campaignCols = [
  { key: 'business', header: 'Business', className: 'cell-strong' },
  { key: 'platform', header: 'Platform' },
  { key: 'campaign', header: 'Campaign' },
  { key: 'spend', header: 'Spend', render: (r) => currency(r.spend) },
  { key: 'clicks', header: 'Clicks' },
  { key: 'conversions', header: 'Conversions' },
];

export default function Overview() {
  const [tab, setTab] = useState('business');
  const businessesQ = useBusinesses();
  const integrationsQ = useIntegrations();
  const summaryQ = useMetricsSummary();
  const byBusinessQ = useMetricsByBusiness();
  const trendQ = useTrend();
  const sync = useSync();

  const totals = summaryQ.data?.totals || { spend: 0, clicks: 0, impressions: 0, conversions: 0 };
  const connected = (integrationsQ.data || []).filter((i) => i.status === 'connected').length;
  const trend = trendQ.data || [];

  const kpis = [
    { label: 'Total Spend', value: totals.spend, kind: 'currency', note: 'Meta + Google (30d)', icon: 'PoundSterling' },
    { label: 'Conversions', value: totals.conversions, kind: 'number', note: 'Attributed actions', icon: 'Target' },
    { label: 'Clicks', value: totals.clicks, kind: 'number', note: 'All campaigns', icon: 'TrendingUp' },
    { label: 'Impressions', value: totals.impressions, kind: 'number', note: 'All campaigns', icon: 'TrendingUp' },
    { label: 'Cost / Conv', value: totals.conversions > 0 ? currency(totals.spend / totals.conversions) : '—', kind: 'text', note: 'Spend / conversions', icon: 'Percent' },
    { label: 'Connected Accounts', value: connected, kind: 'number', note: 'Meta + Google links', icon: 'Mail' },
  ];

  async function runSyncAll() {
    const businesses = businessesQ.data || [];
    for (const b of businesses) {
      try { await sync.mutateAsync({ business_id: b.id }); } catch { /* per-business isolated */ }
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Overview"
        description="Live marketing spend across every business — pulled from connected Meta + Google accounts."
        actions={(
          <>
            <FilterSelect options={['All Businesses', ...(businessesQ.data || []).map((b) => b.name)]} />
            <FilterSelect options={['Last 30 Days']} />
            <Button onClick={runSyncAll} disabled={sync.isPending || !(businessesQ.data || []).length}>
              {sync.isPending ? 'Syncing…' : 'Run Sync'}
            </Button>
            <Button variant="primary">Generate Report</Button>
          </>
        )}
      />

      {summaryQ.isError && (
        <Notice tone="issue">Couldn’t reach the API ({summaryQ.error.message}). Start it with `npm run dev` in /backend.</Notice>
      )}

      <KpiGrid metrics={kpis} cols={6} />

      <HeroCard business={mock.hero.business} stats={mock.hero.stats} />

      {totals.spend === 0 && (
        <Notice tone="warn">No spend yet. Connect Meta/Google in Settings → Integrations, then Run Sync.</Notice>
      )}

      <div className="grid chart-layout">
        <Card>
          <SectionHead title="Spend vs Conversions" description="Monthly trend, last 6 months" />
          {trend.length ? <TrendChart data={trend} series={TREND_SERIES} /> : <EmptyState>No trend data yet — run a sync.</EmptyState>}
        </Card>
        <Card>
          <SectionHead title="Job health" description="Scheduled automation (mock)" />
          <div className="stack">
            {mock.jobHealth.map((j) => (
              <div className="soft-card" key={j.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="cell-strong">{j.name}</div>
                  <div className="subtle">{j.time} · {j.tz}</div>
                </div>
                <Pill tone={j.status}>{j.status === 'ok' ? 'Healthy' : 'Delayed'}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHead title="Performance" actions={<Tabs tabs={TABS} value={tab} onChange={setTab} />} />
        {tab === 'business' && (
          byBusinessQ.isLoading
            ? <EmptyState>Loading…</EmptyState>
            : <DataTable columns={liveBusinessCols} rows={byBusinessQ.data || []} rowKey="id" empty="No data yet — run a sync." />
        )}
        {tab === 'campaign' && (
          <DataTable columns={campaignCols} rows={mock.campaignPerformance} rowKey="campaign" />
        )}
        {tab === 'automation' && (
          <div className="stack">
            {mock.jobHealth.map((j) => (
              <Notice key={j.name} tone={j.status === 'ok' ? 'good' : 'warn'}>
                <strong>{j.name}</strong> — runs {j.time} {j.tz}. Last run {j.lastRun}.
              </Notice>
            ))}
          </div>
        )}
      </Card>

      <div className="grid cols-2">
        <Card>
          <SectionHead title="Latest AI reports" description="Mock — Reports slice next" />
          <div className="stack">
            {mock.reports.map((r) => (
              <div className="soft-card" key={r.id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong className="cell-strong">{r.business}</strong>
                  <span className="subtle">{r.type} · {r.date}</span>
                </div>
                <p style={{ marginTop: 6 }}>{r.summary}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHead title="Operational suggestions" description="Mock" />
          <ul className="list">
            {mock.operationalSuggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
