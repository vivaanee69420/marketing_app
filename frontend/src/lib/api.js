// Thin fetch wrapper around the Express API. Auth = httpOnly session cookie set
// by the backend; the token is never readable here. `credentials: 'include'`
// makes the browser send/receive that cookie cross-origin (SPA → API).

// Normalize VITE_API_BASE_URL so a misconfigured value can't silently turn into
// a relative path. Railway reference vars resolve to a bare domain (no scheme);
// without "https://" the browser treats `${BASE}${path}` as relative and posts
// to the frontend origin instead (→ nginx 405). Force a scheme and drop any
// trailing slash so we never emit a double slash.
function normalizeBase(raw) {
  const v = (raw || 'http://localhost:4000').trim();
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return withScheme.replace(/\/+$/, '');
}

const BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL);

// Bearer-token auth. The httpOnly session cookie can't be relied on when the
// SPA and API live on different Railway domains, so the access token is stored
// here and sent as `Authorization: Bearer` on every request (the backend's
// readAccessToken accepts either cookie or Bearer). localStorage so the session
// survives reloads. Tradeoff vs httpOnly cookie: readable by JS → keep the app
// XSS-clean. credentials:'include' stays so the cookie still works same-origin.
const TOKEN_KEY = 'mkt_token';
let authToken = null;
try { authToken = localStorage.getItem(TOKEN_KEY); } catch { /* no storage */ }

export function setAuthToken(token) {
  authToken = token || null;
  try {
    if (authToken) localStorage.setItem(TOKEN_KEY, authToken);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* no storage */ }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    // Sync returns 502 with a {results:[...]} body (no top-level error). Surface
    // the per-provider failure reasons instead of a bare "HTTP 502".
    const fromResults = Array.isArray(data?.results)
      ? data.results.filter((r) => r.status === 'error' && r.error)
          .map((r) => `${r.provider}: ${r.error}`).join(' · ')
      : '';
    const msg = (data && (data.error || data.message)) || fromResults || `HTTP ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : 'request_failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
};

// Auth endpoints. Tokens live in the httpOnly cookie, so these return the user
// only. `me` is used on boot to learn whether a session cookie is still valid.
export const authApi = {
  // Signup no longer logs in — returns { status: 'pending' }; the account waits
  // for superadmin approval before it can log in.
  signup: (body) => api.post('/api/auth/signup', body),
  login: (body) => api.post('/api/auth/login', body).then((d) => { setAuthToken(d.token); return d.user; }),
  logout: () => api.post('/api/auth/logout').finally(() => setAuthToken(null)),
  me: () => api.get('/api/auth/me').then((d) => d.user),
};

// Superadmin-only user moderation.
export const adminApi = {
  listUsers: () => api.get('/api/admin/users').then((d) => d.users),
  approve: (userId) => api.post(`/api/admin/users/${userId}/approve`).then((d) => d.user),
  reject: (userId) => api.post(`/api/admin/users/${userId}/reject`).then((d) => d.user),
};
