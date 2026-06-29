import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { completeSignup } from '../../api/signup';
import { getMe } from '../../api/profile';
import { useAuth, buildStaffUserFromProfile } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import './Auth.css';

export default function SignupSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('Missing payment session. Please contact support.');
      return;
    }

    let attempts = 0;
    const maxAttempts = 8;

    const tryComplete = async () => {
      attempts += 1;
      try {
        const tokens = await completeSignup(sessionId);
        if (tokens.access_token) {
          let profileUser = buildStaffUserFromProfile('');
          try {
            const profile = await getMe();
            if (profile.data) {
              profileUser = buildStaffUserFromProfile(profile.data.email, profile.data);
            }
          } catch {
            // profile optional
          }
          establishSession(profileUser);
          setStatus('success');
          setMessage('Your account is ready!');
          setTimeout(() => navigate('/tenant', { replace: true }), 800);
          return;
        }
        throw new Error('Activation incomplete');
      } catch {
        if (attempts < maxAttempts) {
          setTimeout(tryComplete, 1500);
        } else {
          setStatus('error');
          setMessage('Payment received but activation is still processing. Please try logging in shortly.');
        }
      }
    };

    tryComplete();
  }, [sessionId, navigate, establishSession]);

  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-brand">
          <span className="auth-brand-icon">🎮</span>
          <h1>GameHub Pro</h1>
        </div>
        {status === 'loading' && (
          <>
            <div className="spinner" style={{ margin: '1rem auto' }} />
            <p>Activating your subscription…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h2>Welcome aboard!</h2>
            <p>{message}</p>
            <p className="signup-pricing-muted">Redirecting to your dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem' }}>⚠️</div>
            <h2>Almost there</h2>
            <p className="toast-error" style={{ marginBottom: '1rem' }}>{message}</p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.75rem 1.5rem' }}>
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
