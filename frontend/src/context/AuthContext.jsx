import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../lib/api.js';

// Session lives in an httpOnly cookie (not readable by JS). So on boot we ask
// the backend /me whether the cookie is still a valid session, and keep only
// the resulting user object in memory. No token is ever held in JS state.
//
//   boot ──> GET /me ──> 200 user  ──> authed
//                   └──> 401        ──> show login
//
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the boot /me settles

  useEffect(() => {
    let alive = true;
    authApi
      .me()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null)) // 401 = no/expired session
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (creds) => {
    const u = await authApi.login(creds);
    setUser(u);
    return u;
  }, []);

  // Signup does NOT establish a session — the account is pending superadmin
  // approval. Return the result so the form can show the pending message; the
  // user stays signed-out and must log in after approval.
  const signup = useCallback(async (creds) => {
    return authApi.signup(creds);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
