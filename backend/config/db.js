import pg from "pg";
import dotenv from "dotenv";
import { AsyncLocalStorage } from "node:async_hooks";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to backend/.env");
}

// Supabase requires SSL. The pooler/direct certs are public; rejectUnauthorized
// false is the standard setting for Supabase connection strings.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("[db] unexpected idle client error:", err.message);
});

// Fallback tenant for non-request work (cron, scripts) where no authenticated
// user resolved an org. Must be a uuid (org_id columns are uuid). Override via
// APP_ORG_ID. Request handlers get their org from the auth middleware instead,
// carried through orgContext (below) — see middleware/authMiddleware.js.
const APP_ORG_ID =
  process.env.APP_ORG_ID || "00000000-0000-0000-0000-000000000000";

// Per-request tenant context. requireOrg resolves the org from the user's
// membership and runs the rest of the request inside orgContext.run({orgId}).
// withOrg then reads it — so every existing `withOrg((tx) => ...)` call site
// (businesses, integrations, metrics, sync) becomes org-scoped with no change.
//
//   request → requireAuth → requireOrg → orgContext.run({orgId}, next)
//                                              │
//                          controller → withOrg((tx) => repo...) ── reads orgId
//
export const orgContext = new AsyncLocalStorage();

/**
 * Simple parameterized query against the pool. Use for non-tenant or admin
 * queries (e.g. health checks). For tenant data, use withOrg.
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run `fn(client)` inside a transaction with the tenant set for RLS.
 * Uses set_config(..., true) = transaction-local (like SET LOCAL but
 * parameterizable, so injection-safe). Every tenant query goes through here.
 *
 * orgId precedence: explicit arg → orgContext store (set by requireOrg) →
 * APP_ORG_ID fallback (cron/scripts). This is why request handlers don't pass
 * an orgId: the authenticated org rides in via orgContext.
 *
 * Note: RLS only enforces if DATABASE_URL uses a role subject to RLS. The
 * Supabase `postgres` role bypasses RLS — so isolation is NOT yet enforced at
 * the DB layer until the non-superuser app role lands (see
 * db/migrations/0001_auth_hardening.sql, applied at the end). Until then,
 * set_config still scopes any query that filters on app.current_org, but a
 * query without an org_id predicate would see all orgs under the superuser role.
 */
export async function withOrg(fn, orgId = orgContext.getStore()?.orgId ?? APP_ORG_ID) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.current_org', $1, true)", [orgId]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Returns true if the DB answers. Throws on failure. */
export async function testConnection() {
  const { rows } = await pool.query("select now() as now, current_user as role");
  return rows[0];
}
