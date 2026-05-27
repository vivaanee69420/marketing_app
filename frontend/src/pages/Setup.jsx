import { PageHeader, Card, SectionHead, Notice, Pill, Button, DataTable } from '../components/index.js';
import * as mock from '../lib/mock.js';

const statusPill = (status) => {
  if (status === 'set') return <Pill tone="ok">Set</Pill>;
  if (status === 'required') return <Pill tone="err">Required</Pill>;
  return <Pill tone="warn">Optional</Pill>;
};

const connectionLabel = (tone) => {
  if (tone === 'ok') return 'Connected';
  if (tone === 'warn') return 'Action needed';
  return 'Disconnected';
};

const envColumns = [
  { key: 'variable', header: 'Variable', className: 'cell-strong' },
  { key: 'purpose', header: 'Purpose' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => statusPill(row.status),
  },
];

const connectionColumns = [
  { key: 'business', header: 'Business', className: 'cell-strong' },
  {
    key: 'meta',
    header: 'Meta',
    render: (row) => <Pill tone={row.meta}>{connectionLabel(row.meta)}</Pill>,
  },
  {
    key: 'google',
    header: 'Google',
    render: (row) => <Pill tone={row.google}>{connectionLabel(row.google)}</Pill>,
  },
  {
    key: 'actions',
    header: 'Actions',
    render: () => (
      <span className="row">
        <Button variant="secondary">Connect Meta</Button>
        <Button variant="secondary">Connect Google</Button>
      </span>
    ),
  },
];

export default function Setup() {
  return (
    <div className="stack">
      <PageHeader
        title="Setup"
        description="Connect your integrations, configure environment variables, and verify deployment readiness."
        actions={
          <>
            <Button variant="secondary">Open Settings</Button>
            <Button variant="secondary">Open Manual Feed</Button>
            <Button variant="primary">Open Task Manager</Button>
          </>
        }
      />

      <Notice tone="good">
        Core environment variables are set. Integration credentials (Meta, Google Ads) are pending — add them to unlock full sync and AI reporting.
      </Notice>

      <div className="grid cols-2">
        <Card>
          <SectionHead title="Deployment Checklist" description="Complete these steps in order to go live." />
          <ol className="list">
            {mock.setupChecklist.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Card>

        <Card>
          <SectionHead title="Live Endpoints" description="Available API routes exposed by the backend." />
          <ul className="list">
            {mock.liveEndpoints.map((ep, i) => (
              <li key={i}>{ep}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="stack">
        {mock.envGroups.map((group) => (
          <Card key={group.name}>
            <SectionHead title={group.name} description={`Environment variables for ${group.name.toLowerCase()} configuration.`} />
            <DataTable
              columns={envColumns}
              rows={group.rows}
              rowKey="variable"
              empty="No variables defined."
            />
          </Card>
        ))}
      </div>

      <Card>
        <SectionHead title="Business Connections" description="OAuth connection status for each business across platforms." />
        <DataTable
          columns={connectionColumns}
          rows={mock.connectionRows}
          rowKey="business"
          empty="No businesses configured."
        />
      </Card>
    </div>
  );
}
