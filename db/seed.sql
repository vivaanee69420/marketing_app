-- Seed for the single-workspace phase (auth via Supabase, one org).
-- Idempotent. Apply after schema.sql.

insert into organizations (id, name) values ('org_default', 'GM Dental Group')
on conflict (id) do nothing;

insert into businesses (org_id, name, slug, timezone) values
  ('org_default', 'GM Dental Barnet', 'gm-dental-barnet', 'Europe/London'),
  ('org_default', 'GM Dental Ashford', 'gm-dental-ashford', 'Europe/London'),
  ('org_default', 'GM Dental Rochester', 'gm-dental-rochester', 'Europe/London'),
  ('org_default', 'Fixed Teeth Solutions', 'fixed-teeth-solutions', 'Europe/London'),
  ('org_default', 'Warwick Lodge Dental & Implant Centre', 'warwick-lodge', 'Europe/London'),
  ('org_default', 'Plan 4 Growth Academy', 'plan-4-growth-academy', 'Europe/London')
on conflict (org_id, slug) do nothing;
