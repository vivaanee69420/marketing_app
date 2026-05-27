import { useState } from 'react';
import {
  PageHeader, Card, SoftCard, SectionHead, Notice, Pill, Button,
  DataTable, InputField, TextAreaField, SelectField,
} from '../components/index.js';
import { currency } from '../lib/format.js';
import * as mock from '../lib/mock.js';
import {
  useBusinesses, useIntegrations, useSaveIntegration, useSync,
  useOrgSettings, useSaveOrgSettings,
} from '../hooks/useApi.js';

// ── Morning automation ────────────────────────────────────────────────────────

function MorningAutomation() {
  const [aiModel, setAiModel] = useState('claude-sonnet-4-6');
  const [emailProvider, setEmailProvider] = useState('Resend');
  const [emailReminder, setEmailReminder] = useState(true);
  const [smsReminder, setSmsReminder] = useState(false);
  const [whatsappReminder, setWhatsappReminder] = useState(false);
  const [teamEmails, setTeamEmails] = useState('');

  return (
    <Card>
      <SectionHead title="Morning automation" description="Configure the daily digest and reminder channels." />
      <div className="stack">
        <div className="grid cols-2">
          <InputField
            label="AI Model"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
          />
          <InputField
            label="Email Provider"
            value={emailProvider}
            onChange={(e) => setEmailProvider(e.target.value)}
          />
        </div>
        <div className="grid cols-3">
          <SoftCard>
            <div className="stack">
              <strong>Email</strong>
              <label className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={emailReminder}
                  onChange={(e) => setEmailReminder(e.target.checked)}
                />
                <span>Send email reminder</span>
              </label>
            </div>
          </SoftCard>
          <SoftCard>
            <div className="stack">
              <strong>SMS</strong>
              <label className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={smsReminder}
                  onChange={(e) => setSmsReminder(e.target.checked)}
                />
                <span>Send SMS reminder</span>
              </label>
              <span className="subtle">Phase 2</span>
            </div>
          </SoftCard>
          <SoftCard>
            <div className="stack">
              <strong>WhatsApp</strong>
              <label className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={whatsappReminder}
                  onChange={(e) => setWhatsappReminder(e.target.checked)}
                />
                <span>Send WhatsApp reminder</span>
              </label>
              <span className="subtle">Phase 2</span>
            </div>
          </SoftCard>
        </div>
        <TextAreaField
          label="Team Emails"
          value={teamEmails}
          onChange={(e) => setTeamEmails(e.target.value)}
          placeholder="comma-separated email addresses"
        />
        <div>
          <Button variant="primary">Save</Button>
        </div>
      </div>
    </Card>
  );
}

// ── Schedule ─────────────────────────────────────────────────────────────────

function Schedule() {
  const [jobs, setJobs] = useState(
    mock.scheduleJobs.map((j) => ({ ...j })),
  );

  function update(idx, field, value) {
    setJobs((prev) => prev.map((j, i) => (i === idx ? { ...j, [field]: value } : j)));
  }

  return (
    <Card>
      <SectionHead title="Schedule" description="Adjust the cron timing for each automated job." />
      <div className="stack">
        {jobs.map((job, idx) => (
          <div key={job.name} className="grid cols-3">
            <InputField
              label="Job Name"
              value={job.name}
              onChange={(e) => update(idx, 'name', e.target.value)}
            />
            <InputField
              label="Run Time"
              type="time"
              value={job.time}
              onChange={(e) => update(idx, 'time', e.target.value)}
            />
            <InputField
              label="Timezone"
              value={job.tz}
              onChange={(e) => update(idx, 'tz', e.target.value)}
            />
          </div>
        ))}
        <div>
          <Button variant="primary">Save Schedule</Button>
        </div>
      </div>
    </Card>
  );
}

// ── Integrations ─────────────────────────────────────────────────────────────

const STATUS_LABEL = { completed: 'Synced', error: 'Sync error', running: 'Syncing…' };

function statusPill(integration) {
  if (!integration) return <Pill tone="err">Not connected</Pill>;
  const tone = integration.last_sync_status === 'error' ? 'warn' : 'ok';
  return <Pill tone={tone}>{STATUS_LABEL[integration.last_sync_status] || 'Connected'}</Pill>;
}

function IntegrationBlock({ provider, businessId, integration }) {
  const isMeta = provider === 'meta';
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [token, setToken] = useState('');
  const save = useSaveIntegration();

  function submit(e) {
    e.preventDefault();
    save.mutate({
      business_id: businessId,
      provider,
      external_account_id: accountId,
      account_name: accountName || undefined,
      ...(isMeta ? { access_token: token } : { refresh_token: token }),
    });
  }

  return (
    <SoftCard>
      <form className="stack" onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{isMeta ? 'Meta' : 'Google'}</strong>
          {statusPill(integration)}
        </div>
        <InputField label="Account Name" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="optional label" />
        <InputField label={isMeta ? 'Ad Account ID (act_…)' : 'Customer ID'} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        <InputField label={isMeta ? 'Access Token' : 'OAuth Refresh Token'} type="password" value={token} onChange={(e) => setToken(e.target.value)} />
        {isMeta && <span className="subtle">Use a Meta Business Manager System User token (set non-expiring). No app id/secret needed.</span>}
        {!isMeta && <span className="subtle">Set your org’s Google API project (client id/secret, developer token) once in the card above.</span>}
        <div className="row">
          <Button variant="primary" type="submit" disabled={save.isPending || !businessId || !accountId || !token}>
            {save.isPending ? 'Saving…' : 'Save & connect'}
          </Button>
        </div>
        {save.isError && <Notice tone="issue">{save.error.message}</Notice>}
        {save.isSuccess && <Notice tone="good">Saved. Run a sync to pull data.</Notice>}
      </form>
    </SoftCard>
  );
}

// Org-wide Google API project credentials (BYO). Entered once per organisation.
function GoogleProjectCard() {
  const settingsQ = useOrgSettings('google');
  if (settingsQ.isLoading) {
    return <SoftCard><span className="subtle">Loading Google project…</span></SoftCard>;
  }
  // Remount (fresh initial state) when the loaded settings identity changes.
  return <GoogleProjectForm settings={settingsQ.data || {}} />;
}

function GoogleProjectForm({ settings }) {
  const save = useSaveOrgSettings('google');
  const [clientId, setClientId] = useState(settings.client_id || '');
  const [clientSecret, setClientSecret] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loginCid, setLoginCid] = useState(settings.login_customer_id || '');

  function submit(e) {
    e.preventDefault();
    save.mutate({
      client_id: clientId,
      login_customer_id: loginCid,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      ...(devToken ? { developer_token: devToken } : {}),
    });
  }

  return (
    <SoftCard>
      <form className="stack" onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Google API project (organisation-wide)</strong>
          {settings.configured ? <Pill tone="ok">Configured</Pill> : <Pill tone="err">Not set</Pill>}
        </div>
        <span className="subtle">Your own Google Cloud OAuth client + Google Ads developer token. Entered once for this organisation; reused by every business’s Google connection.</span>
        <div className="grid cols-2">
          <InputField label="OAuth Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} />
          <InputField label="Login Customer ID (optional)" value={loginCid} onChange={(e) => setLoginCid(e.target.value)} placeholder="manager account, digits only" />
          <InputField label="OAuth Client Secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={settings.has_client_secret ? '•••• saved — blank keeps it' : ''} />
          <InputField label="Developer Token" type="password" value={devToken} onChange={(e) => setDevToken(e.target.value)} placeholder={settings.has_developer_token ? '•••• saved — blank keeps it' : ''} />
        </div>
        <div>
          <Button variant="primary" type="submit" disabled={save.isPending || !clientId}>
            {save.isPending ? 'Saving…' : 'Save Google project'}
          </Button>
        </div>
        {save.isError && <Notice tone="issue">{save.error.message}</Notice>}
        {save.isSuccess && <Notice tone="good">Saved. Now connect each business’s Google customer id + refresh token below.</Notice>}
      </form>
    </SoftCard>
  );
}

function Integrations() {
  const businessesQ = useBusinesses();
  const integrationsQ = useIntegrations();
  const sync = useSync();
  const [businessId, setBusinessId] = useState('');

  const businesses = businessesQ.data || [];
  const selected = businessId || businesses[0]?.id || '';
  const byKey = new Map((integrationsQ.data || []).map((i) => [`${i.business_id}:${i.provider}`, i]));

  return (
    <Card>
      <SectionHead
        title="Integrations"
        description="Connect Meta and Google Ads per business, then sync to pull spend."
        actions={(
          <Button variant="secondary" disabled={!selected || sync.isPending} onClick={() => sync.mutate({ business_id: selected })}>
            {sync.isPending ? 'Syncing…' : 'Run sync'}
          </Button>
        )}
      />
      <div className="stack">
        <GoogleProjectCard />
        <SelectField
          label="Business"
          options={businesses.map((b) => ({ value: b.id, label: b.name }))}
          value={selected}
          onChange={(e) => setBusinessId(e.target.value)}
        />
        <div className="grid cols-2">
          <IntegrationBlock key={`meta:${selected}`} provider="meta" businessId={selected} integration={byKey.get(`${selected}:meta`)} />
          <IntegrationBlock key={`google:${selected}`} provider="google" businessId={selected} integration={byKey.get(`${selected}:google`)} />
        </div>
        {sync.isSuccess && (
          <Notice tone={sync.data.results?.some((r) => r.status === 'completed') ? 'good' : 'issue'}>
            {sync.data.results?.map((r) => `${r.provider}: ${r.status}${r.records != null ? ` (${r.records} rows)` : ''}${r.error ? ` — ${r.error}` : ''}`).join(' · ')}
          </Notice>
        )}
        {sync.isError && <Notice tone="issue">{sync.error.message}</Notice>}
      </div>
    </Card>
  );
}

// ── Conversion values form ────────────────────────────────────────────────────

function ConversionValuesForm() {
  const [business, setBusiness] = useState(mock.businesses[0]);
  const [convName, setConvName] = useState('');
  const [category, setCategory] = useState(mock.taskCategories[0]);
  const [defaultValue, setDefaultValue] = useState('');

  return (
    <Card>
      <SectionHead title="Add conversion value" description="Define a default monetary value for a conversion type." />
      <div className="stack">
        <SelectField
          label="Business"
          options={mock.businesses}
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
        />
        <InputField
          label="Conversion Name"
          value={convName}
          onChange={(e) => setConvName(e.target.value)}
        />
        <SelectField
          label="Category"
          options={mock.taskCategories}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <InputField
          label="Default Value"
          type="number"
          value={defaultValue}
          onChange={(e) => setDefaultValue(e.target.value)}
        />
        <div>
          <Button variant="primary">Add Conversion Type</Button>
        </div>
      </div>
    </Card>
  );
}

// ── Conversion values table ───────────────────────────────────────────────────

const conversionCols = [
  { key: 'business', header: 'Business', className: 'cell-strong' },
  { key: 'type', header: 'Type' },
  { key: 'value', header: 'Value', render: (r) => currency(r.value) },
];

function ConversionValuesTable() {
  return (
    <Card>
      <SectionHead title="Conversion values" description="Current default values used in ROI attribution." />
      <DataTable
        columns={conversionCols}
        rows={mock.conversionValues}
        rowKey={(r, i) => `${r.business}-${r.type}-${i}`}
        empty="No conversion values configured yet."
      />
    </Card>
  );
}

// ── Review automation ─────────────────────────────────────────────────────────

function ReviewAutomation() {
  return (
    <Card>
      <SectionHead title="Review automation" description="Automated monitoring and response tools for patient reviews." />
      <div className="stack">
        <ul className="list">
          <li>AI-generated suggested responses for new reviews</li>
          <li>Sentiment analysis across Google, Facebook and Trustpilot</li>
          <li>Automated alerts for reviews rated 3 stars or below</li>
          <li>Weekly review velocity and rating trend digest</li>
          <li>Manual feed for reviews outside tracked platforms</li>
        </ul>
        <div className="row">
          <Button variant="secondary">Open Manual Feed Hub</Button>
          <Button variant="secondary">Open Reviews Dashboard</Button>
        </div>
      </div>
    </Card>
  );
}

// ── Implementation status ─────────────────────────────────────────────────────

function ImplementationStatus() {
  return (
    <Card>
      <SectionHead title="Implementation status" description="Current build state of each platform feature." />
      <ul className="list">
        {mock.implementationStatus.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

// ── Members (SaaS) ────────────────────────────────────────────────────────────

const memberRows = [
  { name: 'Ruhith Pasha', email: 'ruhith@plan4growth.com', role: 'Owner' },
  { name: 'Sarah Mitchell', email: 's.mitchell@plan4growth.com', role: 'Admin' },
  { name: 'James Owusu', email: 'j.owusu@plan4growth.com', role: 'Member' },
];

const memberCols = [
  { key: 'name', header: 'Name', className: 'cell-strong' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
];

function Members() {
  return (
    <Card>
      <SectionHead title="Members" description="Organisation members and role assignments." />
      <div className="stack">
        <Notice tone="warn">
          Org members &amp; roles backed by Supabase Auth (wiring deferred).
        </Notice>
        <DataTable
          columns={memberCols}
          rows={memberRows}
          rowKey={(r) => r.email}
          empty="No members found."
        />
      </div>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="stack">
      <PageHeader
        title="Settings"
        description="Configure automation, integrations, schedules, conversion values and organisation members."
      />

      <MorningAutomation />

      <Schedule />

      <Integrations />

      <div className="grid cols-2">
        <ConversionValuesForm />
        <ConversionValuesTable />
      </div>

      <div className="grid cols-2">
        <ReviewAutomation />
        <ImplementationStatus />
      </div>

      <Members />
    </div>
  );
}
