import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFeatures } from '../api';
import ThemeToggle from './ThemeToggle';
import { REPORT_NAV_ITEMS, REPORT_SECTION_LABELS, type ReportSection } from '../constants/reportSections';
import './AppLayout.css';

const superAdminNav = [
  { to: '/super', label: 'Dashboard' },
  { to: '/super/tenants', label: 'Tenants' },
  { to: '/super/plans', label: 'Subscription Plans' },
  { to: '/super/metrics', label: 'System Metrics' },
];

type TenantNavItem = {
  to: string;
  label: string;
  feature?: 'dashboard' | 'reports' | 'role_management';
  children?: { section: ReportSection; label: string }[];
};

const tenantNavAll: TenantNavItem[] = [
  { to: '/tenant', label: 'Tables', feature: 'dashboard' },
  { to: '/tenant/overview', label: 'Overview', feature: 'dashboard' },
  { to: '/tenant/game-types', label: 'Game Types' },
  { to: '/tenant/game-units', label: 'Game Units' },
  { to: '/tenant/products', label: 'Products' },
  { to: '/tenant/customers', label: 'Customers' },
  { to: '/tenant/customer-accounts', label: 'Customer Accounts' },
  { to: '/tenant/start-game', label: 'Start Game' },
  { to: '/tenant/tournament', label: 'Keep Tournament Going' },
  { to: '/tenant/sessions', label: 'Active Sessions' },
  { to: '/tenant/completed-sessions', label: 'Completed Sessions' },
  { to: '/tenant/repayments', label: 'Bill Payment' },
  {
    to: '/tenant/reports',
    label: 'Reports',
    feature: 'reports',
    children: REPORT_NAV_ITEMS.map(({ section }) => ({
      section,
      label: REPORT_SECTION_LABELS[section],
    })),
  },
  { to: '/tenant/roles', label: 'Role Management', feature: 'role_management' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [features, setFeatures] = useState<{ dashboard?: boolean; reports?: boolean; role_management?: boolean } | null>(null);
  const [reportsOpen, setReportsOpen] = useState(location.pathname.startsWith('/tenant/reports'));
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

  useEffect(() => {
    if (location.pathname.startsWith('/tenant/reports')) {
      setReportsOpen(true);
    }
  }, [location.pathname]);

  const tenantNav = tenantNavAll.filter((item) => {
    if (!item.feature) return true;
    if (features == null) return true;
    const val = features[item.feature];
    return val !== false;
  });

  const nav = isSuperAdmin ? superAdminNav : tenantNav;
  const activeReportSection = new URLSearchParams(location.search).get('section');

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
          {nav.map((item) => {
            const reportItem = item as TenantNavItem;
            if (reportItem.children?.length) {
              const isReportsActive = location.pathname.startsWith(reportItem.to);
              return (
                <div key={reportItem.to} className="nav-group">
                  <button
                    type="button"
                    className={`nav-group-toggle ${isReportsActive ? 'active' : ''}`}
                    onClick={() => setReportsOpen((open) => !open)}
                    aria-expanded={reportsOpen}
                  >
                    <span>{reportItem.label}</span>
                    <span className={`nav-group-chevron ${reportsOpen ? 'open' : ''}`}>▶</span>
                  </button>
                  {reportsOpen && (
                    <div className="nav-group-items">
                      {reportItem.children.map((child) => {
                        const to = `${reportItem.to}?section=${child.section}`;
                        const sectionActive =
                          isReportsActive &&
                          (activeReportSection === child.section ||
                            (!activeReportSection && child.section === 'overview'));
                        return (
                          <Link
                            key={child.section}
                            to={to}
                            className={`nav-sub-item${sectionActive ? ' active' : ''}`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                end={item.to === '/super' || item.to === '/tenant'}
              >
                {item.label}
              </NavLink>
            );
          })}
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
