import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import { useCustomerParlour } from './useCustomerParlour';
import '../auth/Auth.css';

export default function CustomerLogin() {
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant');
  const { tenantName, loading, configError } = useCustomerParlour(tenantParam);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, customerLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'customer') {
      navigate('/customer/tables', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const ok = await customerLogin(mobile, password);
      if (ok) {
        navigate('/customer/tables');
      } else {
        setError('Invalid mobile or password for this parlour.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">🎮</span>
          <h1>{tenantName}</h1>
          <p>Customer login — view tables & availability</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Mobile number</label>
            <input
              type="tel"
              className="form-input"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="05xxxxxxxx"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {(error || configError) && (
            <div className="toast-error" style={{ marginBottom: '1rem' }}>
              {error || configError}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Login'}
          </button>
          <Link to="/customer/signup" className="auth-link">
            New here? Create account
          </Link>
          <Link to="/login" className="auth-link" style={{ marginTop: '0.5rem' }}>
            Staff login
          </Link>
        </form>
      </div>
    </div>
  );
}
