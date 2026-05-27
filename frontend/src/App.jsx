import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './components/index.js';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Overview from './pages/Overview.jsx';
import Setup from './pages/Setup.jsx';
import Growth from './pages/Growth.jsx';
import Tasks from './pages/Tasks.jsx';
import Businesses from './pages/Businesses.jsx';
import Conversions from './pages/Conversions.jsx';
import Imports from './pages/Imports.jsx';
import Audit from './pages/Audit.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

// Gate the app behind a session. While the boot /me is in flight we render
// nothing (avoids a flash of the login screen for already-signed-in users).
// No session → redirect to /login, remembering where they were headed.
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-screen" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

// Signed-in users shouldn't see login/signup — bounce them to Overview.
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-screen" />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="setup" element={<Setup />} />
        <Route path="growth" element={<Growth />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="businesses" element={<Businesses />} />
        <Route path="conversions" element={<Conversions />} />
        <Route path="imports" element={<Imports />} />
        <Route path="audit" element={<Audit />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
