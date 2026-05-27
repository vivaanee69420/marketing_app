import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { InputField } from './Field.jsx';
import Button from './Button.jsx';
import Notice from './Notice.jsx';

// One form, two modes — DRY across login/signup (only signup adds email).
//   mode='login'  → { username, password }      → POST /api/auth/login
//   mode='signup' → { username, email, password}→ POST /api/auth/signup
// On success the backend sets the httpOnly cookie; we redirect to where the
// user was headed (or Overview).

const FRIENDLY = {
  invalid_credentials: 'Wrong username or password.',
  username_taken: 'That username is already taken.',
  email_taken: 'An account with that email already exists.',
  no_org_membership: 'Your account is not attached to any organisation yet.',
  missing_token: 'Please sign in.',
};

export default function AuthForm({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [fields, setFields] = useState(null); // per-field zod errors from the API
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setFields(null);
    setBusy(true);
    try {
      const payload = isSignup
        ? { username: form.username, email: form.email, password: form.password }
        : { username: form.username, password: form.password };
      await (isSignup ? signup(payload) : login(payload));
      navigate(dest, { replace: true });
    } catch (err) {
      if (err.status === 400 && err.data?.fields) {
        setFields(err.data.fields);
      } else {
        setError(FRIENDLY[err.message] || err.message || 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  }

  const fieldErr = (k) => fields?.[k]?.[0];

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="brand-mark">RC</div>
        <h1>{isSignup ? 'Create your account' : 'Sign in'}</h1>
        <p className="subtle">
          {isSignup ? 'ROI Command — Marketing Command Centre' : 'Welcome back to ROI Command'}
        </p>

        {error && <Notice tone="issue">{error}</Notice>}

        <InputField
          label="Username"
          name="username"
          autoComplete="username"
          value={form.username}
          onChange={set('username')}
          required
        />
        {fieldErr('username') && <span className="field-error">{fieldErr('username')}</span>}

        {isSignup && (
          <>
            <InputField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              required
            />
            {fieldErr('email') && <span className="field-error">{fieldErr('email')}</span>}
          </>
        )}

        <InputField
          label="Password"
          type="password"
          name="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={form.password}
          onChange={set('password')}
          required
        />
        {fieldErr('password') && <span className="field-error">{fieldErr('password')}</span>}

        <Button type="submit" variant="primary" disabled={busy} className="auth-submit">
          {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
        </Button>

        <p className="subtle auth-switch">
          {isSignup ? (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          ) : (
            <>New here? <Link to="/signup">Create an account</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
