import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function AppShell() {
  return (
    <div className="shell">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
