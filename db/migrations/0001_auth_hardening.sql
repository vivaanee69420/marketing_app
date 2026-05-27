-- 0001_auth_hardening.sql — multi-tenant auth: username login + real RLS.
-- DO NOT APPLY YET. Run at the end, after the other session's schema/seed work,
-- against the live DB. Idempotent where practical.
--
-- This file is intentionally separate from db/schema.sql (owned by the
-- schema/seed task) so the two streams don't collide. Once both land, the
-- profiles table can be folded into schema.sql if desired.
--
-- What this adds:
--   1. profiles            — maps Supabase auth.users → a login-by-username handle
--   2. (deferred) app role — a non-superuser role so RLS actually enforces
--
-- The app already resolves org from memberships and runs
-- `set_config('app.current_org', …)` per request. But the API connects as the
-- Supabase `postgres`/service role, which BYPASSES RLS — so tenant isolation is
-- not truly enforced until step 2 swaps DATABASE_URL to the role below.

create extension if not exists citext;

-- ── 1. profiles ────────────────────────────────────────────────────
-- username is citext (case-insensitive unique → logins aren't case-sensitive).
-- email is denormalized from auth.users so login is a single-table lookup
-- (username → email) without reaching into the auth schema. user_id is the
-- Supabase user. No org_id: a profile is global to the user, resolved BEFORE an
-- org is known (at login). Not org-scoped, so no org_isolation policy here.
create table if not exists profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   citext not null unique,
  email      text not null,
  created_at timestamptz not null default now()
);

-- ── 2. DEFERRED: non-superuser app role (the real isolation switch) ──
-- Until this is applied AND DATABASE_URL points at it, RLS does not bite.
-- Sketch (review before running on Supabase; role mgmt is environment-specific):
--
--   create role app_authenticated nologin;            -- group role, NOT superuser, no BYPASSRLS
--   grant usage on schema public to app_authenticated;
--   grant select, insert, update, delete on all tables in schema public to app_authenticated;
--   alter default privileges in schema public
--     grant select, insert, update, delete on tables to app_authenticated;
--
--   -- A login role the API connects as, inheriting the group:
--   create role app_api login password '<set-me>' in role app_authenticated;
--
-- Then point backend/.env DATABASE_URL at app_api. RLS org_isolation (already
-- defined in schema.sql) will then filter every domain table on app.current_org.
--
-- Two pre-auth queries run WITHOUT an org context and must keep working under
-- the non-superuser role:
--   • profiles lookup (username → email): profiles has no RLS, so a plain
--     grant select is enough.
--   • memberships lookup (firstOrgForUser): memberships HAS org_isolation, which
--     would hide rows when app.current_org is unset. Add a self-scoped policy so
--     a user can read their own memberships, keyed off a per-request setting:
--
--       -- requireOrg would also run: set_config('app.current_user', <uid>, true)
--       create policy own_memberships on memberships
--         for select
--         using (user_id = nullif(current_setting('app.current_user', true), '')::uuid);
--
--     (Or wrap firstOrgForUser in a security definer function.) Wire the
--     app.current_user setting in middleware when this role is adopted.
--
-- No membership seed needed: the signup flow provisions profile + membership
-- automatically (services/authService.js → authRepository.provisionUser),
-- attaching new users to DEFAULT_ORG_ID. Ensure that org exists (seed.sql).
