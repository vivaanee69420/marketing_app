import pg from "pg";
import dotenv from "dotenv";

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

// Auth deferred: fixed tenant for now. Swap for the org resolved from the
// Supabase JWT + memberships later. Must be a uuid (org_id columns are uuid);
// seed an organization with this id. Override via APP_ORG_ID.
const APP_ORG_ID =
  process.env.APP_ORG_ID || "00000000-0000-0000-0000-000000000000";

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
 * Note: RLS only enforces if DATABASE_URL uses a role subject to RLS. The
 * Supabase `postgres` role bypasses RLS — fine for the single-org slice, but
 * revisit when multi-tenant auth lands.
 */
export async function withOrg(fn, orgId = APP_ORG_ID) {
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
