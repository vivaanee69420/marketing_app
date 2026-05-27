# User Approval Gate — Design

**Date:** 2026-05-27
**Status:** Approved (design), pending implementation

## Problem

Anyone can sign up and immediately enter the dashboard. We want a superadmin to
approve each new account before it can access anything. New users sign up, then
wait; until a superadmin approves them they cannot log in.

## Decisions (locked with the user)

- **Superadmin** is a DB flag: `profiles.is_superadmin`. Bootstrapped for the
  existing operator account `ruhith`.
- **Pending UX:** block at login. A not-yet-approved account cannot obtain a
  session; login fails with a clear "awaiting approval" message. No gated
  in-app screen.
- **Existing users grandfathered:** all current profiles backfilled to
  `approved` so nobody is locked out. Only new signups start `pending`.
- **Admin actions:** approve + reject. No revoke (out of scope).

## Data model

Migration `db/migrations/0002_user_approval.sql` (idempotent):

```sql
alter table profiles
  add column if not exists status text not null default 'pending',
  add column if not exists is_superadmin boolean not null default false;

alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('pending','approved','rejected'));

-- Grandfather every existing account so the rollout locks nobody out.
update profiles set status = 'approved' where status = 'pending';

-- Bootstrap the operator as superadmin (also approved by the line above).
update profiles set is_superadmin = true where username = 'ruhith';
```

Note: `default 'pending'` applies to NEW rows; the backfill flips the existing
rows (which momentarily took the default) to `approved`. New signups after the
migration are `pending`.

## Backend

### Signup (`authService.signUp`, `authController.signup`)
- Still: Supabase `createUser` → `provisionUser` (profile + membership).
- Profile is created with `status='pending'` (column default).
- **No auto sign-in, no session cookie.** Return `{ status: 'pending' }`.
- Controller responds `201 { status: 'pending' }` (no `setSession`).

### Login (`authService.signIn`)
- After Supabase verifies the password, read the profile's `status`:
  - `pending`  → throw `httpError('pending_approval', 403)`
  - `rejected` → throw `httpError('account_rejected', 403)`
  - `approved` → issue session as today.
- Status is only revealed to a caller who already passed the password check, so
  this does not leak account existence to anonymous users.

### `/me` (`authController.me`)
- Include `is_superadmin` in the returned user so the SPA can show the admin
  area. Requires a profile-flags lookup for `req.user.id`.

### Repository (`authRepository`)
- Extend the login lookup to also return `status` and `is_superadmin`
  (`findLoginByUsername`), or add a dedicated query — implementation detail.
- `getProfileFlags(userId)` → `{ status, is_superadmin }` for `/me` and
  `requireSuperadmin`.
- `listUsers()` → all profiles: `user_id, username, email, status,
  is_superadmin, created_at` (pending first, then by created_at).
- `setUserStatus(userId, status)` → update + return the row. Guard: cannot
  change your own status; cannot reject a superadmin.

### Middleware (`authMiddleware`)
- `requireSuperadmin` (runs after `requireAuth`): 403 `not_superadmin` unless
  `getProfileFlags(req.user.id).is_superadmin` is true.

### Routes
- `GET  /api/admin/users`             — list users
- `POST /api/admin/users/:id/approve` — set status `approved`
- `POST /api/admin/users/:id/reject`  — set status `rejected`
- All under `requireAuth` + `requireSuperadmin`. Mounted in `index.js`.
- `:id` validated as uuid (Zod).

## Frontend

### `lib/api.js`
- `authApi.signup` returns the pending result (no user object / no session).
- New `adminApi`: `listUsers()`, `approve(userId)`, `reject(userId)`.

### `hooks/useApi.js`
- `useUsers()` (admin list query), `useApproveUser()`, `useRejectUser()`
  mutations that invalidate the users query.

### `context/AuthContext.jsx`
- Carry `is_superadmin` on the in-memory user (from `/me` and `login`).

### `App.jsx`
- New `RequireSuperadmin` wrapper: authed + `user.is_superadmin`, else
  `<Navigate to="/" />`.
- `/admin` route → `Admin` page inside the app shell, wrapped in
  `RequireSuperadmin`.

### Pages
- **`Signup.jsx`**: on success show "Account created — waiting for admin
  approval" and route to `/login`. Do not enter the app.
- **`Login.jsx`**: map `pending_approval` / `account_rejected` error messages to
  friendly copy.
- **`Admin.jsx`** (new): table of users (pending first) with Approve / Reject
  buttons, status pills, superadmin badge. Uses the component lib + plain CSS
  (matches the rest of the app, not Tailwind).
- **Nav** (`AppShell`/sidebar): show an "Admin" link only when
  `user.is_superadmin`.

## Privilege boundary

`is_superadmin` is authoritative server-side only. Every admin request
re-checks the flag via `requireSuperadmin`; the client flag is display-only and
never trusted for access control.

## Testing

Backend (`node --test`):
- `signIn` throws `pending_approval` for a pending profile, `account_rejected`
  for rejected, succeeds for approved.
- `signUp` returns `{status:'pending'}` and never calls `setSession`.
- `requireSuperadmin` 403s a non-superadmin, calls `next()` for a superadmin
  (mock `getProfileFlags`).
- `setUserStatus` flips status; refuses to change own status / reject a
  superadmin.

Frontend: build must stay green; manual flow check (signup → pending → approve →
login).

## Out of scope

- Revoke / re-pending an approved user.
- Pending-user in-app dashboard (we block at login instead).
- Email notification on approval/rejection.
- Self-service org creation (still single default org).

## Rollout

1. Apply migration to the live Supabase project (`brljzlftdhzdymgulekn`).
2. Deploy backend + frontend.
3. Verify: `ruhith` logs in + sees Admin; `test` still logs in (grandfathered);
   a fresh signup is blocked until approved from the Admin page.
