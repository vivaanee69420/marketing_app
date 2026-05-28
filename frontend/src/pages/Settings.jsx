import { useState, useEffect } from 'react';
import {
  PageHeader, Card, SoftCard, SectionHead, Notice, Pill, Button,
  DataTable, InputField, TextAreaField, SelectField, SyncModal,
} from '../components/index.js';
import { currency } from '../lib/format.js';
import * as mock from '../lib/mock.js';
import {
  useBusinesses, useIntegrations, useSaveIntegration, useStreamSync, useGoogleAccounts,
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

const STATUS_LABEL = {
  completed: 'Synced',
  error: 'Sync error',
  running: 'Syncing…',
  token_expired: 'Reconnect required',
};

function statusPill(integration) {
  if (!integration) return <Pill tone="err">Not connected</Pill>;
  const status = integration.last_sync_status;
  let tone = 'ok';
  if (status === 'error') tone = 'warn';
  if (status === 'token_expired') tone = 'err';
  return <Pill tone={tone}>{STATUS_LABEL[status] || 'Connected'}</Pill>;
}

function IntegrationBlock({ provider, businessId, integration, onSync, syncing }) {
  const isMeta = provider === 'meta';
  const i = integration || {};
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState(i.external_account_id || '');
  const [token, setToken] = useState('');                 // access (meta) | refresh (google)
  // Google project creds
  const [clientId, setClientId] = useState(i.client_id || '');
  const [clientSecret, setClientSecret] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loginCid, setLoginCid] = useState(i.login_customer_id || '');
  // Meta app creds
  const [appId, setAppId] = useState(i.app_id || '');
  const [appSecret, setAppSecret] = useState('');
  const save = useSaveIntegration();
  const accountsM = useGoogleAccounts();

  function submit(e) {
    e.preventDefault();
    save.mutate({
      business_id: businessId,
      provider,
      external_account_id: accountId,
      account_name: accountName || undefined,
      ...(isMeta
        ? {
            ...(token ? { access_token: token } : {}),
            ...(appId ? { app_id: appId } : {}),
            ...(appSecret ? { app_secret: appSecret } : {}),
          }
        : {
            ...(token ? { refresh_token: token } : {}),
            client_id: clientId,
            login_customer_id: loginCid,
            ...(clientSecret ? { client_secret: clientSecret } : {}),
            ...(devToken ? { developer_token: devToken } : {}),
          }),
    });
  }

  // First-connect needs a token; edits may leave secrets blank.
  const tokenStored = isMeta ? i.has_access_token : i.has_refresh_token;
  const canSubmit = !!businessId && !!accountId && (!!token || tokenStored)
    && (isMeta || (!!clientId && (i.has_client_secret || !!clientSecret) && (i.has_developer_token || !!devToken)));

  const connected = !!integration && tokenStored;
  const tokenExpired = integration?.last_sync_status === 'token_expired';
  const canSync = !!businessId && connected && !syncing;

  return (
    <SoftCard>
      <form className="stack" onSubmit={submit}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{isMeta ? 'Meta' : 'Google'}</strong>
          {statusPill(integration)}
        </div>
        {tokenExpired && (
          <Notice tone="issue">
            {isMeta
              ? 'Meta access token has expired. Paste a fresh token below and click Save & connect, then sync again.'
              : 'Google refresh token is revoked or expired. Re-issue and paste it below, then save and sync.'}
          </Notice>
        )}
        {integration?.last_sync_status === 'error' && integration.last_error && (
          <Notice tone="issue">{integration.last_error}</Notice>
        )}
        {connected && !tokenExpired && (
          <div className="row">
            <Button
              variant="secondary" type="button"
              disabled={!canSync}
              onClick={() => onSync?.(provider)}
            >
              {syncing ? 'Syncing…' : `Sync ${isMeta ? 'Meta' : 'Google'}`}
            </Button>
          </div>
        )}
        <InputField label="Account Name" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder={i.account_name || 'optional label'} />
        <InputField label={isMeta ? 'Ad Account ID (act_…)' : 'Customer ID'} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        <InputField
          label={isMeta ? 'Access Token' : 'OAuth Refresh Token'}
          type="password" value={token} onChange={(e) => setToken(e.target.value)}
          placeholder={tokenStored ? '•••• saved — blank keeps it' : ''}
        />
        {!isMeta && (
          <>
            <InputField label="OAuth Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} />
            <InputField label="Login Customer ID (optional)" value={loginCid} onChange={(e) => setLoginCid(e.target.value)} placeholder="manager account, digits only" />
            <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
              <Button
                variant="secondary" type="button"
                disabled={!tokenStored || accountsM.isPending}
                onClick={() => accountsM.mutate(businessId)}
              >
                {accountsM.isPending ? 'Loading…' : 'Load accounts'}
              </Button>
              <span className="subtle">Pick a client account under your manager — metrics can't be pulled from the manager itself.</span>
            </div>
            {accountsM.isSuccess && accountsM.data.length > 0 && (
              <SelectField
                label="Client account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={accountsM.data.map((a) => ({
                  value: a.id,
                  label: `${a.name || a.id} · ${a.id}${a.manager ? ' (manager — no metrics)' : ''}`,
                }))}
              />
            )}
            {accountsM.isSuccess && accountsM.data.length === 0 && (
              <Notice tone="issue">No accounts found under this manager.</Notice>
            )}
            {accountsM.isError && <Notice tone="issue">{accountsM.error.message}</Notice>}
            <InputField label="OAuth Client Secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={i.has_client_secret ? '•••• saved — blank keeps it' : ''} />
            <InputField label="Developer Token" type="password" value={devToken} onChange={(e) => setDevToken(e.target.value)} placeholder={i.has_developer_token ? '•••• saved — blank keeps it' : ''} />
            <span className="subtle">Each business uses its own Google Cloud OAuth client + Ads developer token. Customer id + refresh token are this account's.</span>
          </>
        )}
        {isMeta && (
          <>
            <InputField label="App ID (optional)" value={appId} onChange={(e) => setAppId(e.target.value)} />
            <InputField label="App Secret (optional)" type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder={i.has_app_secret ? '•••• saved — blank keeps it' : ''} />
            <span className="subtle">Use a Meta Business Manager System User token (set non-expiring). App id/secret optional.</span>
          </>
        )}
        <div className="row">
          <Button variant="primary" type="submit" disabled={save.isPending || !canSubmit}>
            {save.isPending ? 'Saving…' : 'Save & connect'}
          </Button>
        </div>
        {save.isError && <Notice tone="issue">{save.error.message}</Notice>}
        {save.isSuccess && <Notice tone="good">Saved. Run a sync to pull data.</Notice>}
      </form>
    </SoftCard>
  );
}

function Integrations() {
  const businessesQ = useBusinesses();
  const integrationsQ = useIntegrations();
  const stream = useStreamSync();
  // Empty default — user MUST pick. Prevents accidentally syncing the wrong
  // business when many exist.
  const [businessId, setBusinessId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const businesses = businessesQ.data || [];
  const selected = businessId;
  const byKey = new Map((integrationsQ.data || []).map((i) => [`${i.business_id}:${i.provider}`, i]));

  // Auto-close the modal a moment after a clean success so the user isn't
  // forced to click Close on the happy path. Errors and token_expired stay
  // visible until the user dismisses them.
  useEffect(() => {
    if (!stream.isDone || stream.isError) return;
    const anyFailed = stream.result?.results?.some((r) => r.status === 'error' || r.status === 'token_expired');
    if (anyFailed) return;
    const t = setTimeout(() => { setModalOpen(false); stream.reset(); }, 1200);
    return () => clearTimeout(t);
  }, [stream.isDone, stream.isError, stream.result, stream]);

  function runSync(provider) {
    if (!selected || stream.isRunning) return;
    setModalOpen(true);
    stream.start({ business_id: selected, provider }).catch(() => { /* state captured in hook */ });
  }

  function closeModal() {
    if (stream.isRunning) return;
    setModalOpen(false);
    stream.reset();
  }

  return (
    <Card>
      <SectionHead
        title="Integrations"
        description="Connect Meta and Google Ads per business, then sync each provider on its own."
      />
      <div className="stack">
        <SelectField
          label="Business"
          options={[
            { value: '', label: '— Select a business —' },
            ...businesses.map((b) => ({ value: b.id, label: b.name })),
          ]}
          value={selected}
          onChange={(e) => setBusinessId(e.target.value)}
        />
        {!selected && (
          <Notice tone="warn">Pick a business above to view its Meta and Google connections.</Notice>
        )}
        {selected && (
          <div className="grid cols-2">
            <IntegrationBlock
              key={`meta:${selected}`}
              provider="meta"
              businessId={selected}
              integration={byKey.get(`${selected}:meta`)}
              onSync={runSync}
              syncing={stream.isRunning && stream.provider === 'meta'}
            />
            <IntegrationBlock
              key={`google:${selected}`}
              provider="google"
              businessId={selected}
              integration={byKey.get(`${selected}:google`)}
              onSync={runSync}
              syncing={stream.isRunning && stream.provider === 'google'}
            />
          </div>
        )}
      </div>
      <SyncModal
        open={modalOpen}
        provider={stream.provider}
        phase={stream.phase}
        percent={stream.percent}
        done={stream.done}
        total={stream.total}
        isRunning={stream.isRunning}
        isDone={stream.isDone}
        isError={stream.isError}
        result={stream.result}
        error={stream.error}
        onClose={closeModal}
      />
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
