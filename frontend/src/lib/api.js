// Thin fetch wrapper around the Express API. Auth = httpOnly session cookie set
// by the backend; the token is never readable here. `credentials: 'include'`
// makes the browser send/receive that cookie cross-origin (SPA → API).

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
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
  signup: (body) => api.post('/api/auth/signup', body).then((d) => d.user),
  login: (body) => api.post('/api/auth/login', body).then((d) => d.user),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me').then((d) => d.user),
};
