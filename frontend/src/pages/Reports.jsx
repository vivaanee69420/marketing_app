import { PageHeader, Card, SoftCard, SectionHead, Badge, EmptyState } from '../components/index.js';
import * as mock from '../lib/mock.js';

function InsightColumn({ title, items }) {
  return (
    <SoftCard>
      <div className="cell-strong" style={{ marginBottom: 6 }}>{title}</div>
      <ul className="list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </SoftCard>
  );
}

export default function Reports() {
  const reports = mock.reports ?? [];

  return (
    <div className="stack">
      <PageHeader
        title="AI Reports"
        description="Daily Claude analysis per business and across the group."
      />

      {reports.length === 0 ? (
        <EmptyState>No reports yet — generate one from the Overview.</EmptyState>
      ) : (
        reports.map((r) => (
          <Card key={r.id}>
            <SectionHead
              title={r.business}
              description={r.date}
              actions={<Badge>{r.type}</Badge>}
            />
            <p>{r.summary}</p>
            <div className="grid cols-3">
              <InsightColumn title="What is working" items={r.wins} />
              <InsightColumn title="What is not working" items={r.losses} />
              <InsightColumn title="Needs improvement" items={r.issues} />
              <InsightColumn title="What to look at" items={r.opportunities} />
              <InsightColumn title="Creative ideas" items={r.creativeIdeas} />
              <InsightColumn title="Ad copy ideas" items={r.adCopyIdeas} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
