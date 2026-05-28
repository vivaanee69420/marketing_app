-- Marketing ROI Command Center (SaaS) — Supabase / PostgreSQL schema
-- Multi-tenant: every domain table carries org_id (our Organization id) + RLS.
-- No ORM. Apply via Supabase SQL editor or migration runner.
-- IDs: uuid. Money: numeric(12,2). Default currency GBP.

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ── Tenancy helper ──────────────────────────────────────────────
-- Auth is Supabase Auth: users live in auth.users (uuid). Orgs are owned here
-- (not mirrored from any external system). The API verifies the Supabase JWT,
-- resolves the active org from `memberships`, then per request runs:
--   SET LOCAL app.current_org = '<org uuid>';
-- RLS policies filter on that. memberships maps auth.users → organizations.

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table memberships (
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,  -- Supabase user id
  role        text not null default 'member',  -- admin | member
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ── Core domain ─────────────────────────────────────────────────

create table businesses (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  slug        text not null,
  timezone    text not null default 'Europe/London',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, slug)
);

create table integrations (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizations(id) on delete cascade,
  business_id          uuid not null references businesses(id) on delete cascade,
  provider             text not null,         -- meta | google
  status               text not null default 'not_connected',
  external_account_id  text,
  account_name         text,
  access_token_enc     text,                  -- AES-256-GCM ciphertext (never plaintext)
  refresh_token_enc    text,
  token_expires_at     timestamptz,
  last_sync_at         timestamptz,
  last_sync_status     text,
  last_error           text,
  config_json          jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (org_id, business_id, provider)
);

create table campaigns (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  provider    text not null,
  external_id text not null,
  name        text not null,
  status      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, provider, external_id)
);

create table ad_sets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  provider    text not null,
  external_id text not null,
  name        text not null,
  status      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, provider, external_id)
);

create table ads (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  ad_set_id   uuid references ad_sets(id) on delete set null,
  provider    text not null,
  external_id text not null,
  name        text not null,
  status      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, provider, external_id)
);

create table daily_metrics (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  provider    text not null,
  campaign_id uuid references campaigns(id) on delete set null,
  ad_set_id   uuid references ad_sets(id) on delete set null,
  ad_id       uuid references ads(id) on delete set null,
  metric_date date not null,
  currency    text not null default 'GBP',
  spend       numeric(12,2) not null default 0,
  clicks      integer not null default 0,
  impressions integer not null default 0,
  conversions numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);
create index on daily_metrics (org_id, business_id, metric_date);

create table conversion_types (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  business_id   uuid not null references businesses(id) on delete cascade,
  name          text not null,
  category      text not null,
  default_value numeric(12,2) not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table conversions (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organizations(id) on delete cascade,
  business_id        uuid not null references businesses(id) on delete cascade,
  conversion_type_id uuid references conversion_types(id) on delete set null,
  name               text not null,
  email              text,
  phone              text,
  conversion_value   numeric(12,2) not null,
  conversion_date    timestamptz not null,
  source_notes       text,
  utm_source         text,
  utm_campaign       text,
  utm_ad_set         text,
  created_by         uuid references auth.users(id) on delete set null,  -- Supabase user id
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on conversions (org_id, business_id, conversion_date);

create table conversion_matches (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organizations(id) on delete cascade,
  conversion_id      uuid not null unique references conversions(id) on delete cascade,
  provider           text,
  campaign_id        uuid references campaigns(id) on delete set null,
  ad_set_id          uuid references ad_sets(id) on delete set null,
  ad_id              uuid references ads(id) on delete set null,
  matched_by_rule    text,
  confidence         numeric(5,2),
  is_manual_override boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table sync_runs (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  business_id    uuid not null references businesses(id) on delete cascade,
  provider       text not null,
  sync_type      text not null,
  status         text not null,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  records_synced integer not null default 0,
  error_message  text
);

create table ai_reports (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,  -- null = master/all-businesses
  report_date date not null,
  report_type text not null,                 -- morning | morning_master
  status      text not null default 'completed',
  summary     text,
  insights    jsonb not null,
  created_at  timestamptz not null default now()
);
create index on ai_reports (org_id, business_id, report_date);

create table scheduled_jobs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  job_type    text not null,                 -- sync | report | email
  run_time    text not null,                 -- HH:MM
  timezone    text not null default 'Europe/London',
  is_active   boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (org_id, name)
);

create table notification_recipients (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'team',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, email)
);

create table dashboard_issues (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  key         text not null,                 -- unique per org
  scope       text not null,
  severity    text not null default 'warning',
  title       text not null,
  message     text not null,
  status      text not null default 'open',
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, key)
);

create table tasks (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  business_id      uuid references businesses(id) on delete set null,
  title            text not null,
  description      text,
  category         text not null,
  priority         text not null default 'medium',
  status           text not null default 'todo',
  source           text not null default 'manual',  -- manual | ai_report
  source_report_id uuid references ai_reports(id) on delete set null,
  due_date         timestamptz,
  completed_at     timestamptz,
  assigned_to      uuid references auth.users(id) on delete set null,  -- Supabase user id
  created_by       uuid references auth.users(id) on delete set null,
  metadata         jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on tasks (org_id, status, priority);
create index on tasks (org_id, business_id, status);

-- ── Growth Hub ──────────────────────────────────────────────────

create table reviews (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  business_id   uuid references businesses(id) on delete set null,
  platform      text not null,
  author_name   text not null,
  rating        integer not null,
  body          text not null,
  review_date   timestamptz not null,
  responded     boolean not null default false,
  response_text text,
  created_at    timestamptz not null default now()
);
create index on reviews (org_id, business_id, review_date);

create table organic_metrics (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  business_id    uuid references businesses(id) on delete set null,
  channel        text not null,
  stat_date      timestamptz not null,
  followers      integer not null default 0,
  reach          integer not null default 0,
  impressions    integer not null default 0,
  engagements    integer not null default 0,
  website_clicks integer not null default 0,
  sessions       integer not null default 0,
  created_at     timestamptz not null default now()
);
create index on organic_metrics (org_id, business_id, stat_date);

create table booking_records (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  business_id  uuid references businesses(id) on delete set null,
  patient_name text not null,
  service      text not null,
  starts_at    timestamptz not null,
  deposit      numeric(12,2) not null default 0,
  status       text not null default 'booked',
  source       text not null default 'widget',
  created_at   timestamptz not null default now()
);
create index on booking_records (org_id, business_id, starts_at);

create table benchmark_metrics (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  metric_name  text not null,
  industry_avg text not null,
  business_val text not null,
  variance     text not null,
  status       text not null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, metric_name)
);

create table membership_tiers (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  business_id     uuid references businesses(id) on delete set null,
  name            text not null,
  monthly_price   numeric(12,2) not null,
  member_count    integer not null default 0,
  monthly_revenue numeric(12,2) not null default 0,
  benefits        text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table app_settings (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  key        text not null,
  value      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, key)
);

create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,  -- Supabase user id
  business_id   uuid references businesses(id) on delete set null,
  action        text not null,
  target_type   text not null,
  target_id     text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

-- ── Row Level Security ──────────────────────────────────────────
-- Apply org-isolation policy to every domain table. Example shown;
-- repeat the pattern for each table below.

do $$
declare t text;
begin
  foreach t in array array[
    'businesses','integrations','campaigns','ad_sets','ads','daily_metrics',
    'conversion_types','conversions','conversion_matches','sync_runs',
    'ai_reports','scheduled_jobs','notification_recipients','dashboard_issues',
    'tasks','reviews','organic_metrics','booking_records','benchmark_metrics',
    'membership_tiers','app_settings','audit_logs','memberships'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$
      create policy org_isolation on %I
        using (org_id = nullif(current_setting('app.current_org', true), '')::uuid)
        with check (org_id = nullif(current_setting('app.current_org', true), '')::uuid);
    $f$, t);
  end loop;
end $$;

-- NOTE: org_id columns are uuid. current_setting returns text, so cast with
-- nullif(...,'')::uuid — the nullif makes an unset session var fail closed
-- (matches no rows) instead of erroring on an empty-string cast. The API runs:
--   SET LOCAL app.current_org = $orgUuid;  (resolved from the Supabase JWT +
-- memberships) inside the request transaction, using a non-superuser role so
-- RLS actually bites. The Supabase `postgres`/service role bypasses RLS.
</content>
