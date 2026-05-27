import { z } from "zod";

// Username rules: 3–30 chars, letters/digits/underscore/dot/hyphen, must start
// with a letter or digit. Stored case-insensitively (citext) so logins aren't
// case-sensitive. Kept here (no Supabase import) so it's unit-testable.
export const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,29}$/;

const username = z
  .string()
  .trim()
  .regex(USERNAME_RE, "username must be 3-30 chars: letters, digits, _ . - (start alphanumeric)");

// Password: min 8. Supabase Auth hashes + per-user salts with bcrypt server-side
// (no DIY crypto). We only gate length/shape here.
const password = z.string().min(8, "password must be at least 8 characters");

export const signupSchema = z.object({
  username,
  email: z.string().trim().email(),
  password,
});

export const loginSchema = z.object({
  username,
  password: z.string().min(1, "password is required"),
});

/** Normalize a username for storage/lookup: trim + lowercase. */
export function normalizeUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}
