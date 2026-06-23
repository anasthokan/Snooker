import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import './CustomerLayout.css';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  return (
    <div className="customer-layout">
      <header className="customer-header">
        <div className="customer-header-brand">
          <span>🎮</span>
          <span>GameHub Pro</span>
        </div>
        <nav className="customer-header-nav">
          <NavLink to="/customer/tables" className={({ isActive }) => (isActive ? 'active' : '')} end>
            Tables
          </NavLink>
          <NavLink to="/customer/account" className={({ isActive }) => (isActive ? 'active' : '')}>
            My Account
          </NavLink>
        </nav>
        <div className="customer-header-actions">
          <span className="customer-user-name">{user?.name}</span>
          <ThemeToggle />
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className="customer-main">
        <div className="page-wrapper">{children}</div>
      </main>
    </div>
  );
}
