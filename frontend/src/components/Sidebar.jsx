import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// 10 nav links, in docs/SECTIONS.md order.
const NAV = [
  { to: '/', label: 'Overview', icon: 'LayoutDashboard', end: true },
  { to: '/setup', label: 'Setup', icon: 'PlugZap' },
  { to: '/growth', label: 'Growth Hub', icon: 'Sprout' },
  { to: '/tasks', label: 'Task Manager', icon: 'ListChecks' },
  { to: '/businesses', label: 'Businesses', icon: 'Building2' },
  { to: '/conversions', label: 'Website Leads', icon: 'Globe' },
  { to: '/imports', label: 'Import / Bulk', icon: 'Upload' },
  { to: '/audit', label: 'Account Audit', icon: 'ShieldCheck' },
  { to: '/reports', label: 'Reports', icon: 'FileText' },
  { to: '/settings', label: 'Settings', icon: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">RC</div>
        <div>
          <div className="brand-name">ROI Command</div>
          <div className="brand-sub">Marketing Command Centre</div>
        </div>
      </div>

      {/* Org switcher slot — wired to Supabase Auth (org from JWT) once auth lands. */}
      <div className="soft-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="subtle">Organisation</span>
        <strong style={{ fontSize: 13, color: 'var(--heading)' }}>GM Group ▾</strong>
      </div>

      <nav className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
                   className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon name={n.icon} className="nav-icon" size={18} />
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="account-row">
          <div>
            <div className="subtle" style={{ color: 'rgba(236,230,221,0.75)' }}>Signed in as</div>
            <strong style={{ fontSize: 13, color: '#f2e6bf' }}>
              {user?.username || user?.email || '—'}
            </strong>
          </div>
          <button type="button" className="btn" onClick={logout}>
            <Icon name="LogOut" size={16} /> Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
