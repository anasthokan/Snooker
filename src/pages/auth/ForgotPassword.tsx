import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { forgotPassword, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await forgotPassword(email);
    if (ok) setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-theme-toggle">
          <ThemeToggle />
        </div>
        <div className="auth-card">
          <div className="auth-brand">
            <h1>Check your email</h1>
            <p>If an account exists for {email}, we've sent a reset link.</p>
          </div>
          <Link to="/login" className="btn btn-primary">Back to Login</Link>
        </div>
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
          <h1>Forgot Password</h1>
          <p>Enter your email to receive a reset link</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : 'Send reset link'}
          </button>
          <Link to="/login" className="auth-link">Back to Login</Link>
        </form>
      </div>
    </div>
  );
}
