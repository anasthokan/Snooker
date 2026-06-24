import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFeatures } from '../api';
import ThemeToggle from './ThemeToggle';
import './AppLayout.css';

const superAdminNav = [
  { to: '/super', label: 'Dashboard' },
  { to: '/super/tenants', label: 'Tenants' },
  { to: '/super/plans', label: 'Subscription Plans' },
  { to: '/super/metrics', label: 'System Metrics' },
];

const tenantNavAll = [
  { to: '/tenant', label: 'Tables', feature: 'dashboard' as const },
  { to: '/tenant/overview', label: 'Overview', feature: 'dashboard' as const },
  { to: '/tenant/game-types', label: 'Game Types' },
  { to: '/tenant/game-units', label: 'Game Units' },
  { to: '/tenant/products', label: 'Products' },
  { to: '/tenant/customers', label: 'Customers' },
  { to: '/tenant/customer-accounts', label: 'Customer Accounts' },
  { to: '/tenant/start-game', label: 'Start Game' },
  { to: '/tenant/tournament', label: 'Keep Tournament Going' },
  { to: '/tenant/sessions', label: 'Active Sessions' },
  { to: '/tenant/completed-sessions', label: 'Completed Sessions' },
  { to: '/tenant/reports', label: 'Reports', feature: 'reports' as const },
  { to: '/tenant/roles', label: 'Role Management', feature: 'role_management' as const },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [features, setFeatures] = useState<{ dashboard?: boolean; reports?: boolean; role_management?: boolean } | null>(null);
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin && user) {
      getFeatures()
        .then((res) => setFeatures(res.data ?? {}))
        .catch(() => setFeatures({}));
    } else {
      setFeatures(null);
    }
  }, [isSuperAdmin, user]);

  const tenantNav = tenantNavAll.filter((item) => {
    if (!item.feature) return true;
    if (features == null) return true;
    const val = features[item.feature];
    return val !== false;
  });

  const nav = isSuperAdmin ? superAdminNav : tenantNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🎮</span>
          <span className="brand-text">GameHub Pro</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end={to === '/super' || to === '/tenant'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role?.replace('_', ' ')}</span>
            <NavLink
              to={isSuperAdmin ? '/super/profile' : '/tenant/profile'}
              className={({ isActive }) => `profile-link ${isActive ? 'active' : ''}`}
            >
              Profile
            </NavLink>
          </div>
          <button type="button" className="btn btn-ghost logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-header">
          <h1 className="page-title">{document.title || 'GameHub Pro'}</h1>
          <ThemeToggle />
        </header>
        <div className="app-content">
          <div className="page-wrapper">{children}</div>
        </div>
      </main>
    </div>
  );
}
