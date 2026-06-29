import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api';
import { getSignupConfig, getSignupPricing, startSignupCheckout } from '../../api/signup';
import type { SignupPricing } from '../../api/signup';
import { getMe } from '../../api/profile';
import { useAuth, buildStaffUserFromProfile } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import './Auth.css';

type Country = 'SA' | 'IN';

const COUNTRY_OPTIONS: { value: Country; label: string }[] = [
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'IN', label: 'India' },
];

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { establishSession, clearSession } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<Country>('SA');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [pricing, setPricing] = useState<SignupPricing | null>(null);
  const [pricingError, setPricingError] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    getSignupConfig()
      .then((cfg) => setStripeConfigured(cfg.configured))
      .catch(() => setStripeConfigured(false));
  }, []);

  const loadPricing = async (selectedCountry: Country, coupon?: string) => {
    setLoadingPricing(true);
    setPricingError('');
    try {
      const info = await getSignupPricing(selectedCountry, coupon);
      setPricing(info);
      if (coupon?.trim()) setAppliedCoupon(coupon.trim().toUpperCase());
      else setAppliedCoupon('');
    } catch (err) {
      setPricing(null);
      setPricingError(err instanceof ApiError ? err.message : 'Could not load pricing');
    } finally {
      setLoadingPricing(false);
    }
  };

  useEffect(() => {
    loadPricing(country);
  }, [country]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setAppliedCoupon('');
      await loadPricing(country);
      return;
    }
    await loadPricing(country, couponCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    clearSession();
    try {
      const result = await startSignupCheckout({
        business_name: businessName.trim(),
        email: email.trim(),
        password,
        country,
        coupon_code: appliedCoupon || undefined,
      });

      if (result.payment_mode === 'direct') {
        const emailTrimmed = email.trim();
        let profileUser = buildStaffUserFromProfile(emailTrimmed);
        profileUser = {
          ...profileUser,
          name: businessName.trim() || profileUser.name,
          tenantId: result.tenant_id != null ? String(result.tenant_id) : profileUser.tenantId,
        };
        try {
          const profile = await getMe();
          if (profile.data) {
            profileUser = {
              ...buildStaffUserFromProfile(emailTrimmed, profile.data),
              name: profile.data.tenant_name ?? businessName.trim() ?? profileUser.name,
            };
          }
        } catch {
          // use defaults from signup response
        }
        establishSession(profileUser);
        navigate('/tenant', { replace: true });
        return;
      }

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Signup failed');
      setLoading(false);
    }
  };

  const submitLabel = loading
    ? stripeConfigured
      ? 'Redirecting to payment…'
      : 'Creating account…'
    : !stripeConfigured
      ? 'Create account'
      : pricing?.has_trial
        ? 'Start free trial'
        : 'Continue to payment';

  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <span className="auth-brand-icon">🎮</span>
          <h1>GameHub Pro</h1>
          <p>Create your parlour account</p>
        </div>

        {cancelled && (
          <div className="toast-error" style={{ marginBottom: '1rem' }}>
            Payment was cancelled. You can try again below.
          </div>
        )}

        {!stripeConfigured && (
          <div className="signup-dev-banner">
            Payment gateway is not active yet — you can sign up and use the app for now.
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Business / Parlour name</label>
            <input
              className="form-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Green Baize Snooker"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Country</label>
            <select
              className="form-input"
              value={country}
              onChange={(e) => setCountry(e.target.value as Country)}
            >
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="signup-pricing-box">
            {loadingPricing && <p className="signup-pricing-muted">Loading plan…</p>}
            {!loadingPricing && pricing && (
              <>
                <div className="signup-pricing-amount">{pricing.display_price}</div>
                {pricing.has_trial ? (
                  <p className="signup-pricing-note">
                    Coupon <strong>{pricing.coupon_applied}</strong> applied — first month free, then {pricing.monthly_label}.
                  </p>
                ) : stripeConfigured ? (
                  <p className="signup-pricing-note">Billed monthly via Stripe. Cancel anytime.</p>
                ) : (
                  <p className="signup-pricing-note">Plan selected for your region. Billing will start when payment goes live.</p>
                )}
              </>
            )}
            {pricingError && <p className="signup-pricing-error">{pricingError}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Coupon code (optional)</label>
            <div className="coupon-row">
              <input
                className="form-input"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="e.g. FIRSTFREE"
              />
              <button type="button" className="btn btn-secondary" onClick={handleApplyCoupon} disabled={loadingPricing}>
                Apply
              </button>
            </div>
            <p className="signup-hint">Use <strong>FIRSTFREE</strong> for a 1-month free trial.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@parlour.com"
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

          {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={loading || loadingPricing || !!pricingError}
          >
            {submitLabel}
          </button>

          <Link to="/login" className="auth-link">
            Already have an account? Login
          </Link>
        </form>
      </div>
    </div>
  );
}
