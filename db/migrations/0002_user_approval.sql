-- 0002_user_approval.sql — superadmin-gated signup approval.
-- Adds an approval status + superadmin flag to profiles. New signups land as
-- 'pending' and cannot log in until a superadmin approves them. Existing users
-- are grandfathered to 'approved' so the rollout locks nobody out.
-- Idempotent.

alter table profiles
  add column if not exists status        text    not null default 'pending',
  add column if not exists is_superadmin boolean not null default false;

alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Grandfather every existing account (all rows took the 'pending' default when
-- the column was added) to 'approved'.
update profiles set status = 'approved' where status = 'pending';

-- Bootstrap the operator as the first superadmin (already approved above).
update profiles set is_superadmin = true where username = 'ruhith';
