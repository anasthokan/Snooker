import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api';
import ThemeToggle from '../../components/ThemeToggle';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const ok = await login(email, password);
      if (ok) {
        const u = JSON.parse(sessionStorage.getItem('gamehub_user') || '{}');
        if (u.role === 'super_admin') navigate('/super');
        else navigate('/tenant');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">🎮</span>
          <h1>GameHub Pro</h1>
          <p>Multi-Game Parlour SaaS</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gamehub.pro"
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
          {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                Signing in…
              </>
            ) : (
              'Login'
            )}
          </button>
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          <Link to="/signup" className="auth-link" style={{ marginTop: '0.75rem' }}>
            New parlour? Sign up
          </Link>
        </form>
      </div>
    </div>
  );
}
