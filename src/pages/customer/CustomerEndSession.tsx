import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomerSessionBill, customerCheckout } from '../../api/customerPortal';
import { CurrencyIcon } from '../../components/CurrencyIcon';

type PayMethod = 'credit' | 'cash' | 'card';

export default function CustomerEndSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<{
    total?: number;
    subtotal?: number;
    vat_amount?: number;
    game_charge?: number;
    canteen_charge?: number;
  } | null>(null);
  const [method, setMethod] = useState<PayMethod>('credit');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBill = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getCustomerSessionBill(Number(sessionId));
      setBill(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bill');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadBill();
  }, [loadBill]);

  const handleConfirm = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await customerCheckout(Number(sessionId), method);
      if (res.data?.on_account) {
        setSuccess(
          `Bill of ${res.data.total?.toFixed(2) ?? ''} added to your account. Pay at month-end.`
        );
      } else {
        setSuccess('Payment recorded. Thank you!');
      }
      setTimeout(() => navigate('/customer/tables'), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading"><p>Loading bill…</p></div>;

  return (
    <div>
      <div className="page-header">
        <h2>End Session — Pay or Credit</h2>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/customer/tables')}>
          Back
        </button>
      </div>

      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && (
        <div className="kpi-card" style={{ marginBottom: '1rem', padding: '1rem', borderColor: 'var(--accent)' }}>
          {success}
        </div>
      )}

      <div className="kpi-card" style={{ padding: '1.5rem', maxWidth: 440 }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Game charge:</strong> <CurrencyIcon />{bill?.game_charge?.toFixed(2) ?? '0.00'}
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Canteen:</strong> <CurrencyIcon />{bill?.canteen_charge?.toFixed(2) ?? '0.00'}
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>VAT (15%):</strong> <CurrencyIcon />{bill?.vat_amount?.toFixed(2) ?? '0.00'}
        </div>
        <div style={{ marginBottom: '1.25rem', fontSize: '1.15rem', fontWeight: 700 }}>
          <strong>Total:</strong> <CurrencyIcon />{bill?.total?.toFixed(2) ?? '0.00'}
        </div>

        <div className="form-group">
          <label className="form-label">Payment</label>
          <select className="form-input" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
            <option value="credit">Credit — Pay later (month-end account)</option>
            <option value="cash">Cash — Pay now</option>
            <option value="card">Card — Pay now</option>
          </select>
        </div>

        {method === 'credit' && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Amount will be added to your account as due (debit). Settle at month-end from My Account or at counter.
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={submitting || !!success}
          onClick={() => void handleConfirm()}
        >
          {submitting ? 'Processing…' : method === 'credit' ? 'Add to My Account (Credit)' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );
}
