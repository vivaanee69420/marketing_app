// Standalone DB connectivity check: `npm run db:ping`
import { testConnection, pool } from "./db.js";

try {
  const info = await testConnection();
  console.log("✅ Connected to Supabase Postgres");
  console.log("   time:", info.now);
  console.log("   role:", info.role);
} catch (err) {
  console.error("❌ DB connection failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
