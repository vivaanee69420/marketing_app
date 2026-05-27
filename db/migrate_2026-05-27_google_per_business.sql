-- Migration: move org-wide Google project creds down to each business's
-- Google integration, then drop org_integration_settings.
-- Idempotent: '||' is a top-level jsonb merge (only org keys overwrite), and
-- DROP ... IF EXISTS makes re-runs safe. Run inside a transaction.

begin;

-- Copy each org's stored Google config onto every Google integration row.
update integrations i
   set config_json = coalesce(i.config_json, '{}'::jsonb) || s.config,
       updated_at  = now()
  from org_integration_settings s
 where s.org_id   = i.org_id
   and s.provider = 'google'
   and i.provider = 'google';

drop table if exists org_integration_settings;

commit;
