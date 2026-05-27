-- Migration: move org-wide Google project creds down to each business's
-- Google integration, then drop org_integration_settings.
-- Idempotent: guarded on to_regclass so a re-run after the table is gone is a
-- clean no-op (the UPDATE references org_integration_settings, so it can't run
-- once the table is dropped). '||' is a top-level jsonb merge: org keys fill in
-- without clobbering any existing per-business config_json keys. Transaction
-- is included in this file.

begin;

do $$
begin
  if to_regclass('public.org_integration_settings') is not null then
    -- Copy each org's stored Google config onto every Google integration row.
    update integrations i
       set config_json = coalesce(i.config_json, '{}'::jsonb) || s.config,
           updated_at  = now()
      from org_integration_settings s
     where s.org_id   = i.org_id
       and s.provider = 'google'
       and i.provider = 'google';

    drop table org_integration_settings;  -- no IF EXISTS: existence just checked
  end if;
end $$;

commit;
