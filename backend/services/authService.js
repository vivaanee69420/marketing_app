import { supabaseAuth, supabaseAdmin, hasServiceRole } from "../config/supabase.js";

/**
 * Create a user via the admin API (auto-confirmed, no email step), then sign in
 * to return a session. Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export async function signUp({ email, password, name }) {
  if (!hasServiceRole) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — signup is disabled");
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { name } : {},
  });
  if (createErr) {
    const conflict = /already.*registered|exists/i.test(createErr.message);
    const e = new Error(createErr.message);
    e.status = conflict ? 409 : 400;
    throw e;
  }

  const session = await signIn({ email, password });
  return { user: created.user, ...session };
}

/** Email/password sign-in. Returns the user + tokens. */
export async function signIn({ email, password }) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    const e = new Error(error?.message || "invalid_credentials");
    e.status = 401;
    throw e;
  }
  return {
    user: data.user,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };
}
