// Profiles + memberships. These run on the base pool (not withOrg): username→
// email resolution and "which orgs is this user in" happen BEFORE an org is
// known, so they can't be org-scoped. Under the current Supabase `postgres`
// role this is fine (RLS bypassed). When the non-superuser app role lands
// (db/migrations/0001_auth_hardening.sql), these queries need a SECURITY DEFINER
// function or a user-scoped policy — see that file.
//
// profiles maps Supabase auth.users → an app-level, login-by-username handle:
//   profiles(user_id uuid pk, username citext unique, email text)
// email is denormalized from auth.users so login is a single-table lookup
// (username → email) without reaching into the auth schema.

import { pool, query } from "../config/db.js";

/** Resolve a login email from a username. Returns { user_id, email } or null. */
export async function findLoginByUsername(username) {
  const { rows } = await query(
    `select user_id, email from profiles where username = $1`,
    [username]
  );
  return rows[0] || null;
}

/** True if the username is already taken (case-insensitive via citext). */
export async function usernameExists(username) {
  const { rows } = await query(`select 1 from profiles where username = $1`, [username]);
  return rows.length > 0;
}

/**
 * Create the profile row + attach the user to the default org in one transaction.
 * Called right after the Supabase user is created at signup. If either insert
 * fails the whole thing rolls back, so we never leave a half-provisioned user.
 */
export async function provisionUser({ userId, username, email, orgId, role = "admin" }) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into profiles (user_id, username, email) values ($1, $2, $3)`,
      [userId, username, email]
    );
    await client.query(
      `insert into memberships (org_id, user_id, role) values ($1, $2, $3)
         on conflict (org_id, user_id) do nothing`,
      [orgId, userId, role]
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * The user's active org = their first membership (single-org phase). Returns the
 * org uuid or null if the user belongs to no org. Ordered by created_at for a
 * stable pick.
 */
export async function firstOrgForUser(userId) {
  const { rows } = await query(
    `select org_id from memberships where user_id = $1 order by created_at asc limit 1`,
    [userId]
  );
  return rows[0]?.org_id || null;
}
