import { PageHeader, Card, SectionHead, Notice, Pill, DataTable } from '../components/index.js';
import * as mock from '../lib/mock.js';

const pillLabel = { ok: 'Healthy', warn: 'Warning', err: 'Error' };

const columns = [
  {
    key: 'business',
    header: 'Business',
    className: 'cell-strong',
  },
  {
    key: 'meta',
    header: 'Meta',
    render: (row) => <Pill tone={row.meta}>{pillLabel[row.meta]}</Pill>,
  },
  {
    key: 'google',
    header: 'Google',
    render: (row) => <Pill tone={row.google}>{pillLabel[row.google]}</Pill>,
  },
  {
    key: 'lastSync',
    header: 'Last Sync',
  },
  {
    key: 'issue',
    header: 'Issue',
    render: (row) =>
      row.issue === '—' ? (
        <span className="subtle">None</span>
      ) : (
        row.issue
      ),
  },
];

export default function Audit() {
  const errorCount = mock.auditRows.filter(
    (r) => r.meta === 'err' || r.google === 'err' || r.issue !== '—'
  ).length;

  return (
    <div className="stack">
      <PageHeader
        title="Account Audit"
        description="Connection health and outstanding issues per business."
      />

      {errorCount > 0 ? (
        <Notice tone="issue">{errorCount} businesses need attention</Notice>
      ) : (
        <Notice tone="good">All accounts healthy</Notice>
      )}

      <Card>
        <SectionHead title="Account status" />
        <DataTable
          columns={columns}
          rows={mock.auditRows}
          rowKey="business"
          empty="No accounts found."
        />
      </Card>
    </div>
  );
}
