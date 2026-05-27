import { supabaseAuth } from "../config/supabase.js";
import { orgContext } from "../config/db.js";
import { readAccessToken } from "../utils/sessionCookies.js";
import { firstOrgForUser, getProfileFlags } from "../repositories/authRepository.js";

/**
 * Validate the Supabase JWT server-side. The frontend never talks to Supabase —
 * the token rides in an httpOnly cookie (or a Bearer header for tooling), and we
 * ask Supabase to resolve the user. Sets req.user on success, 401 otherwise.
 */
export async function requireAuth(req, res, next) {
  const token = readAccessToken(req);
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

/**
 * Resolve the tenant from the authenticated user's membership (first org for
 * now) and run the rest of the request inside orgContext, so every downstream
 * withOrg((tx) => ...) call is scoped to this org without passing an id. 403 if
 * the user belongs to no org. MUST run after requireAuth.
 */
export async function requireOrg(req, res, next) {
  try {
    const orgId = await firstOrgForUser(req.user.id);
    if (!orgId) {
      return res.status(403).json({ error: "no_org_membership" });
    }
    req.orgId = orgId;
    orgContext.run({ orgId, userId: req.user.id }, () => next());
  } catch (err) {
    next(err);
  }
}

/**
 * Gate to superadmins only. MUST run after requireAuth. The is_superadmin flag
 * is read server-side from profiles every request — the client copy is never
 * trusted for access control. 403 otherwise.
 */
export async function requireSuperadmin(req, res, next) {
  try {
    const flags = await getProfileFlags(req.user.id);
    if (!flags?.is_superadmin) {
      return res.status(403).json({ error: "not_superadmin" });
    }
    next();
  } catch (err) {
    next(err);
  }
}
