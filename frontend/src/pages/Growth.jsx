import { useState } from 'react';
import {
  PageHeader, Card, SoftCard, SectionHead, Notice, Pill, Tabs, KpiGrid,
  DataTable, Button,
} from '../components/index.js';
import { currency, number } from '../lib/format.js';
import * as mock from '../lib/mock.js';

const TABS = [
  { value: 'patients', label: 'Patients' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'loyalty', label: 'Loyalty & Members' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'booking', label: 'Online Booking' },
  { value: 'benchmark', label: 'Benchmark' },
];

const g = mock.growth;

// --- per-tab views --------------------------------------------------------
function Patients() {
  return (
    <Card>
      <SectionHead title="Practices & patients" description="Per-practice performance this period" />
      <div className="grid cols-4">
        {g.patients.map((p) => (
          <SoftCard key={p.business}>
            <div className="cell-strong" style={{ marginBottom: 10 }}>{p.business}</div>
            <div className="stack" style={{ gap: 6 }}>
              <Row label="New Patients" value={number(p.newPatients)} />
              <Row label="Appointments" value={number(p.appointments)} />
              <Row label="Completed" value={number(p.completed)} />
              <Row label="Revenue" value={currency(p.revenue)} />
            </div>
          </SoftCard>
        ))}
      </div>
    </Card>
  );
}

function Marketing() {
  const m = g.marketing;
  return (
    <div className="stack">
      <KpiGrid metrics={m.summary} cols={3} />
      <Card>
        <SectionHead title="Source breakdown" description="Spend → revenue by business" />
        <DataTable
          rowKey="business"
          rows={m.sources}
          columns={[
            { key: 'business', header: 'Business', className: 'cell-strong' },
            { key: 'spend', header: 'Spend', render: (r) => currency(r.spend) },
            { key: 'revenue', header: 'Revenue', render: (r) => currency(r.revenue) },
            { key: 'converted', header: 'Converted' },
            { key: 'avgValue', header: 'Avg Value', render: (r) => currency(r.avgValue) },
            { key: 'pipeline', header: 'Pipeline', render: (r) => currency(r.pipeline) },
          ]}
        />
      </Card>
      <Card>
        <SectionHead title="Treatment-mix & offer value" description="Primary offer and suggested next step" />
        <DataTable
          rowKey="business"
          rows={m.offers}
          columns={[
            { key: 'business', header: 'Business', className: 'cell-strong' },
            { key: 'offer', header: 'Primary Offer' },
            { key: 'revenue', header: 'Tracked Revenue', render: (r) => currency(r.revenue) },
            { key: 'nextStep', header: 'Suggested Next Step' },
          ]}
        />
      </Card>
    </div>
  );
}

function Loyalty() {
  const l = g.loyalty;
  return (
    <div className="stack">
      <KpiGrid metrics={l.summary} cols={4} />
      <Card>
        <SectionHead title="Membership tiers" />
        <div className="grid cols-3">
          {l.tiers.map((t) => (
            <SoftCard key={t.name}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="cell-strong">{t.name}</span>
                <Pill tone="ok">{t.price}</Pill>
              </div>
              <p style={{ marginTop: 8 }}>{t.benefits}</p>
              <div className="subtle" style={{ marginTop: 8 }}>{number(t.members)} members</div>
            </SoftCard>
          ))}
        </div>
      </Card>
      <div className="grid cols-2">
        <Card>
          <SectionHead title="Automated rewards" description="Lifecycle journeys" />
          <ul className="list">{l.journeys.map((j) => <li key={j}>{j}</li>)}</ul>
        </Card>
        <Card>
          <SectionHead title="Campaign performance" />
          <Notice tone="good">Win-back journey recovered 38 lapsed members this month.</Notice>
        </Card>
      </div>
    </div>
  );
}

function Reviews() {
  const r = g.reviews;
  return (
    <div className="stack">
      <KpiGrid metrics={r.summary} cols={4} />
      <div className="grid cols-2">
        <Card>
          <SectionHead title="Reviews by source" />
          <DataTable
            rowKey="source"
            rows={r.bySource}
            columns={[
              { key: 'source', header: 'Source', className: 'cell-strong' },
              { key: 'count', header: 'Reviews', render: (x) => number(x.count) },
              { key: 'avg', header: 'Avg Rating' },
            ]}
          />
        </Card>
        <Card>
          <SectionHead title="Reviews by practice" />
          <DataTable
            rowKey="business"
            rows={r.byPractice}
            columns={[
              { key: 'business', header: 'Practice', className: 'cell-strong' },
              { key: 'count', header: 'Reviews', render: (x) => number(x.count) },
              { key: 'avg', header: 'Avg Rating' },
            ]}
          />
        </Card>
      </div>
      <Card>
        <SectionHead title="Recent reviews" />
        <div className="stack">
          {r.recent.map((rv, i) => (
            <SoftCard key={i}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="cell-strong">{rv.author} · {rv.platform}</span>
                <Pill tone={rv.responded ? 'ok' : 'warn'}>{rv.responded ? 'Responded' : 'Needs reply'}</Pill>
              </div>
              <div className="subtle" style={{ marginTop: 4 }}>{rv.business} · {rv.date}</div>
              <p style={{ marginTop: 8 }}>{rv.body}</p>
            </SoftCard>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Booking() {
  const b = g.booking;
  return (
    <div className="stack">
      <KpiGrid metrics={b.summary} cols={4} />
      <Card>
        <SectionHead title="Recent bookings" />
        <DataTable
          rowKey={(r, i) => i}
          rows={b.recent}
          columns={[
            { key: 'datetime', header: 'Date/Time', className: 'cell-strong' },
            { key: 'practice', header: 'Practice' },
            { key: 'patient', header: 'Patient' },
            { key: 'service', header: 'Service' },
            { key: 'deposit', header: 'Deposit', render: (r) => currency(r.deposit) },
            { key: 'status', header: 'Status', render: (r) => <Pill tone={r.status === 'Confirmed' ? 'ok' : 'warn'}>{r.status}</Pill> },
          ]}
        />
      </Card>
    </div>
  );
}

function Benchmark() {
  const bm = g.benchmark;
  return (
    <div className="stack">
      <KpiGrid metrics={bm.summary} cols={3} />
      <Card>
        <SectionHead title="Performance vs UK industry" />
        <DataTable
          rowKey="metric"
          rows={bm.vsIndustry}
          columns={[
            { key: 'metric', header: 'Metric', className: 'cell-strong' },
            { key: 'ukAvg', header: 'UK Avg' },
            { key: 'you', header: 'You' },
            { key: 'variance', header: 'Variance' },
            { key: 'status', header: 'Status', render: (r) => <Pill tone={r.status}>{r.status === 'ok' ? 'Ahead' : 'Watch'}</Pill> },
          ]}
        />
      </Card>
      <Card>
        <SectionHead title="Top improvement opportunities" />
        <ul className="list">{bm.opportunities.map((o) => <li key={o}>{o}</li>)}</ul>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="subtle">{label}</span>
      <span className="cell-strong">{value}</span>
    </div>
  );
}

const VIEWS = {
  patients: Patients, marketing: Marketing, loyalty: Loyalty,
  reviews: Reviews, booking: Booking, benchmark: Benchmark,
};

export default function Growth() {
  const [tab, setTab] = useState('patients');
  const [business, setBusiness] = useState('All');
  const View = VIEWS[tab];

  return (
    <div className="stack">
      <PageHeader
        title="Growth Hub"
        description="Patients, marketing, loyalty, reviews, bookings and benchmarks — the manual + CSV-fed signals that feed AI reports and tasks."
      />

      <Card>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <div className="row" style={{ marginTop: 14 }}>
          {['All', ...mock.businesses].map((b) => (
            <Button key={b} variant={business === b ? 'primary' : 'secondary'} onClick={() => setBusiness(b)}>
              {b === 'All' ? 'All businesses' : b}
            </Button>
          ))}
        </div>
      </Card>

      <View />

      {/* Footer — all tabs */}
      <div className="grid cols-2">
        <Card>
          <SectionHead title="Organic snapshot" description="Unpaid channel reach" />
          <DataTable
            rowKey="channel"
            rows={g.organic}
            columns={[
              { key: 'channel', header: 'Channel', className: 'cell-strong' },
              { key: 'reach', header: 'Reach', render: (r) => number(r.reach) },
              { key: 'engagements', header: 'Engagements', render: (r) => number(r.engagements) },
              { key: 'sessions', header: 'Sessions', render: (r) => number(r.sessions) },
            ]}
          />
        </Card>
        <Card>
          <SectionHead title="What this powers" />
          <ul className="list">
            <li>Growth signals enrich each business's daily AI report context.</li>
            <li>Low review-response or high no-show rates auto-generate tasks.</li>
            <li>Benchmark gaps surface as improvement opportunities.</li>
            <li>Loyalty MRR + LTV feed the group ROI picture.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
