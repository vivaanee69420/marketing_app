import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

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
        <strong>Marketing Command Centre</strong>
        <p>Spend, revenue, ROI, AI reports and tasks across every business — in one calm place.</p>
      </div>
    </aside>
  );
}
