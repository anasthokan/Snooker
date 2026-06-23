import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPayConfig, getPublicCustomerBalance, type CustomerBalancePublic, type PayConfig } from '../../api/publicPay';
import MoyasarCheckout from '../../components/MoyasarCheckout';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import './CustomerPay.css';

export default function CustomerPay() {
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant');
  const urlTenantId = tenantParam ? Number(tenantParam) : undefined;
  const [config, setConfig] = useState<PayConfig | null>(null);
  const [mobile, setMobile] = useState(searchParams.get('mobile') || '');
  const [balanceInfo, setBalanceInfo] = useState<CustomerBalancePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPayConfig(urlTenantId && !Number.isNaN(urlTenantId) ? urlTenantId : undefined)
      .then((res) => setConfig(res.data ?? null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load payment page'))
      .finally(() => setLoading(false));
  }, [urlTenantId]);

  const lookupBalance = async () => {
    if (!mobile.trim()) return;
    setLookingUp(true);
    setError('');
    setBalanceInfo(null);
    try {
      const res = await getPublicCustomerBalance(
        mobile.trim(),
        urlTenantId && !Number.isNaN(urlTenantId) ? urlTenantId : undefined
      );
      setBalanceInfo(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Account not found');
    } finally {
      setLookingUp(false);
    }
  };

  const resolvedTenantId = balanceInfo?.tenant_id ?? config?.tenant_id ?? urlTenantId ?? 1;

  const callbackUrl =
    balanceInfo && balanceInfo.balance > 0
      ? `${window.location.origin}/pay/success?tenant=${resolvedTenantId}&customer_id=${balanceInfo.customer_id}&mobile=${encodeURIComponent(mobile.trim())}`
      : '';

  if (loading) {
    return <div className="customer-pay-page"><p>Loading…</p></div>;
  }

  return (
    <div className="customer-pay-page">
      <div className="customer-pay-card">
        <div className="customer-pay-brand">
          <span>🎮</span>
          <div>
            <h1>{balanceInfo ? config?.tenant_name ?? 'GameHub Pro' : config?.tenant_name ?? 'GameHub Pro'}</h1>
            <p>Pay your account balance online</p>
          </div>
        </div>

        {error && <div className="customer-pay-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Mobile number</label>
          <input
            className="form-input"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Enter your registered mobile"
          />
        </div>
        <button type="button" className="btn btn-primary customer-pay-btn" onClick={lookupBalance} disabled={lookingUp}>
          {lookingUp ? 'Checking…' : 'Check Balance'}
        </button>

        {balanceInfo && (
          <div className="customer-pay-summary">
            <p><strong>{balanceInfo.name}</strong></p>
            <p className="customer-pay-due">
              Due: <CurrencyIcon />{balanceInfo.balance.toFixed(2)}
            </p>
            {balanceInfo.balance <= 0 ? (
              <p style={{ color: 'var(--success)' }}>No balance due. Thank you!</p>
            ) : config?.publishable_key ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Pay securely below (Mada / Card / Apple Pay)
              </p>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Pay this amount at the counter (online gateway not configured).
              </p>
            )}
          </div>
        )}

        {config?.publishable_key && balanceInfo && balanceInfo.balance > 0 && (
          <MoyasarCheckout
            publishableKey={config.publishable_key}
            amountSar={balanceInfo.balance}
            description={`Account settlement - ${balanceInfo.name}`}
            callbackUrl={callbackUrl}
            currency={config.currency}
          />
        )}
      </div>
    </div>
  );
}
