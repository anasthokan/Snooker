import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api';
import ThemeToggle from '../../components/ThemeToggle';
import { useCustomerParlour } from './useCustomerParlour';
import '../auth/Auth.css';

export default function CustomerSignup() {
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant');
  const { tenantName, loading, configError } = useCustomerParlour(tenantParam);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, customerSignup, isLoading } = useAuth();
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
      const ok = await customerSignup(name, mobile, password, email || undefined);
      if (ok) {
        navigate('/customer/tables');
      } else {
        setError('Could not create account. Mobile may already be registered at this parlour.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Signup failed');
      }
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
          <p>Create your customer account</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
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
            <label className="form-label">Email (optional)</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
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
                placeholder="At least 6 characters"
                minLength={6}
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
            {isLoading ? 'Creating account…' : 'Sign up'}
          </button>
          <Link to="/customer/login" className="auth-link">
            Already have an account? Login
          </Link>
        </form>
      </div>
    </div>
  );
}
