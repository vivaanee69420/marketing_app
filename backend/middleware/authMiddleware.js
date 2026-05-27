import { supabaseAuth } from "../config/supabase.js";

/**
 * Validate the Supabase JWT server-side. Frontend never talks to Supabase —
 * it sends `Authorization: Bearer <access_token>` to this API, and we ask
 * Supabase to resolve the user. Sets req.user on success, 401 otherwise.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "invalid_token" });
    }
    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: "auth_failed", message: err.message });
  }
}
