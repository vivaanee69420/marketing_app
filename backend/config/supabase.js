import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set in backend/.env");
}

const authOpts = { auth: { autoRefreshToken: false, persistSession: false } };

// Public client (anon key): password sign-in + token validation (getUser).
export const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, authOpts);

// Admin client (service_role): privileged user management. Server-side ONLY.
// Falls back to anon if the service key is not set yet (admin calls will fail
// with a clear error until you add SUPABASE_SERVICE_ROLE_KEY).
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  authOpts
);

export const hasServiceRole = Boolean(SUPABASE_SERVICE_ROLE_KEY);
