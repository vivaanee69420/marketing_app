import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/index.js';
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

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
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
