import { supabaseAuth, supabaseAdmin, hasServiceRole } from "../config/supabase.js";
import { normalizeUsername } from "../utils/authValidation.js";
import { loginBlockCode } from "./authPolicy.js";
import * as authRepo from "../repositories/authRepository.js";

// New signups join this org (single-org phase). A real "create your own org"
// flow replaces this later. Must match a seeded organizations.id (uuid).
const DEFAULT_ORG_ID =
  process.env.DEFAULT_ORG_ID ||
  process.env.APP_ORG_ID ||
  "00000000-0000-0000-0000-000000000000";

const httpError = (message, status) => Object.assign(new Error(message), { status });

/**
 * Signup = username + email + password.
 *
 *   Zod (controller) → username free? → Supabase createUser (bcrypt+salt) →
 *   provision profile + membership (txn)
 *
 * The profile is created 'pending' (profiles.status default) and we do NOT
 * issue a session — a superadmin must approve the account before it can log in.
 * Password hashing/salting is handled by Supabase Auth (GoTrue, bcrypt) — we
 * never see or store the password. If provisioning fails after the Supabase
 * user exists, we delete that user so a retry is clean (no orphaned auth row).
 */
export async function signUp({ username, email, password }) {
  if (!hasServiceRole) {
    throw httpError("SUPABASE_SERVICE_ROLE_KEY is not set — signup is disabled", 500);
  }

  const uname = normalizeUsername(username);

  // Fast pre-check for a friendly error; the DB unique index is the real guard
  // against the race between check and insert.
  if (await authRepo.usernameExists(uname)) {
    throw httpError("username_taken", 409);
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: uname },
  });
  if (createErr) {
    const conflict = /already.*registered|exists|duplicate/i.test(createErr.message);
    throw httpError(conflict ? "email_taken" : createErr.message, conflict ? 409 : 400);
  }

  const userId = created.user.id;
  try {
    await authRepo.provisionUser({ userId, username: uname, email, orgId: DEFAULT_ORG_ID });
  } catch (err) {
    // Roll back the Supabase user so the username/email can be reused on retry.
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    if (err.code === "23505") throw httpError("username_taken", 409); // lost the race
    throw err;
  }

  // No session: the account is pending until a superadmin approves it.
  return { user: created.user, status: "pending" };
}

/**
 * Login = username + password. Resolve the email from profiles, then let
 * Supabase verify the password. Same 401 for "no such username" and "wrong
 * password" so we don't leak which usernames exist.
 */
export async function signIn({ username, password }) {
  const uname = normalizeUsername(username);
  const profile = await authRepo.findLoginByUsername(uname);
  if (!profile) {
    throw httpError("invalid_credentials", 401);
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: profile.email,
    password,
  });
  if (error || !data?.session) {
    throw httpError("invalid_credentials", 401);
  }

  // Password is correct — now enforce the approval gate. Status is only checked
  // AFTER a valid password, so we never reveal account state to anonymous users.
  const blocked = loginBlockCode(profile.status);
  if (blocked) {
    throw httpError(blocked, 403);
  }

  return {
    user: data.user,
    is_superadmin: !!profile.is_superadmin,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };
}
