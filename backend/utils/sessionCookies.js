// Session transport = httpOnly cookies (chosen for XSS safety: the token is
// never readable by JS). The frontend never sees or stores the token; it sends
// requests with `credentials: 'include'` and the browser attaches the cookie.
// No @supabase/* import here on purpose, so this stays unit-testable without env.

export const ACCESS_COOKIE = "mkt_at";
export const REFRESH_COOKIE = "mkt_rt";

// Refresh token lives longer than the access token so a session survives access
// expiry. 30 days, in ms.
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const isProd = () => process.env.NODE_ENV === "production";

/**
 * Cookie options. SameSite=Lax means the cookie is NOT sent on cross-site
 * subrequests (a form/fetch from evil.com), which is what blunts CSRF here; it
 * IS sent on same-site requests including the SPA's cross-port fetch in dev
 * (localhost:5173 → localhost:4000 are same-site, different origin). Secure is
 * on in production only so http://localhost dev still works.
 */
export function buildCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: maxAgeMs,
  };
}

/**
 * Access-token max age derived from Supabase's `expires_at` (unix seconds).
 * Falls back to 1h if absent or already past. Returns ms.
 */
export function accessMaxAgeMs(expiresAt, now = Date.now()) {
  const oneHour = 60 * 60 * 1000;
  if (!expiresAt) return oneHour;
  const ms = expiresAt * 1000 - now;
  return ms > 0 ? ms : oneHour;
}

/** Set both session cookies from a Supabase session. */
export function setSession(res, { access_token, refresh_token, expires_at }) {
  res.cookie(ACCESS_COOKIE, access_token, buildCookieOptions(accessMaxAgeMs(expires_at)));
  if (refresh_token) {
    res.cookie(REFRESH_COOKIE, refresh_token, buildCookieOptions(REFRESH_MAX_AGE_MS));
  }
}

/** Clear both session cookies (logout). Options must match to actually delete. */
export function clearSession(res) {
  const opts = { httpOnly: true, sameSite: "lax", secure: isProd(), path: "/" };
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

/**
 * Parse a Cookie header into a map. Avoids a cookie-parser dependency. Values
 * are URL-decoded; malformed pairs are skipped.
 */
export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

/**
 * Resolve the access token from the request: httpOnly cookie first, then an
 * `Authorization: Bearer` header (kept for curl/tooling and tests). Null if none.
 */
export function readAccessToken(req) {
  const fromCookie = parseCookies(req.headers?.cookie)[ACCESS_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}
