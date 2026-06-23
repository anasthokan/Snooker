import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyMoyasarPayment } from '../../api/publicPay';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import './CustomerPay.css';

export default function PaySuccess() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('id') || searchParams.get('payment_id');
  const tenantId = Number(searchParams.get('tenant') || '1');
  const customerId = searchParams.get('customer_id') ? Number(searchParams.get('customer_id')) : undefined;
  const mobile = searchParams.get('mobile') || undefined;
  const sessionId = searchParams.get('session_id') ? Number(searchParams.get('session_id')) : undefined;
  const purpose = sessionId ? 'session' as const : 'account_settlement' as const;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!paymentId) {
      setStatus('error');
      setMessage('Payment reference missing.');
      return;
    }
    verifyMoyasarPayment({
      moyasar_payment_id: paymentId,
      tenant_id: tenantId,
      purpose,
      customer_id: customerId,
      mobile,
      session_id: sessionId,
    })
      .then((res) => {
        setStatus('success');
        setAmount(res.data?.amount ?? null);
        setMessage(res.data?.message ?? 'Payment successful');
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Payment verification failed');
      });
  }, [paymentId, tenantId, customerId, mobile, sessionId, purpose]);

  return (
    <div className="customer-pay-page">
      <div className="customer-pay-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && <p>Verifying payment…</p>}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h2>Payment Successful</h2>
            {amount != null && (
              <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                <CurrencyIcon />{amount.toFixed(2)}
              </p>
            )}
            <p>{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem' }}>❌</div>
            <h2>Payment Issue</h2>
            <p className="customer-pay-error">{message}</p>
          </>
        )}
        <Link to={`/pay?tenant=${tenantId}`} className="btn btn-primary customer-pay-btn" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
          Back to Pay Page
        </Link>
      </div>
    </div>
  );
}
