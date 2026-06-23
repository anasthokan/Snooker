import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PaymentMethod, CompletedSession } from '../../types';
import { getSession, calculateBill, createPayment, splitPayment, endSession, fetchBillPdf, listCustomers } from '../../api';
import { getPayConfig } from '../../api/publicPay';
import type { CustomerItem } from '../../api/types';
import type { SessionItem } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import MoyasarCheckout from '../../components/MoyasarCheckout';
import { STORAGE_KEY, loadCompletedSessions } from './CompletedSessions';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import { generateReceiptPdf } from '../../utils/receiptPdf';

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function EndSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = Number(user?.tenantId || 1);
  const [session, setSession] = useState<SessionItem | null>(null);
  const [bill, setBill] = useState<{ subtotal?: number; vat?: number; vat_amount?: number; discount_amount?: number; total?: number } | null>(null);
  const [vatPercent] = useState(15);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [creditCustomerId, setCreditCustomerId] = useState<number | ''>('');
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditCustomerMobile, setCreditCustomerMobile] = useState('');
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [splitAmounts, setSplitAmounts] = useState<{ amount: number; method: string }[]>([{ amount: 0, method: 'cash' }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [publishableKey, setPublishableKey] = useState('');

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    const id = Number(sessionId);
    if (Number.isNaN(id)) return;
    setLoading(true);
    setError('');
    try {
      const res = await getSession(id);
      setSession(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load session');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const loadBill = useCallback(async () => {
    if (!sessionId || !session) return;
    const id = Number(sessionId);
    try {
      const res = await calculateBill({
        session_id: id,
        vat_percent: vatPercent,
        discount_amount: discountAmount,
      });
      setBill(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to calculate bill');
    }
  }, [sessionId, session, vatPercent, discountAmount]);

  useEffect(() => {
    if (session) void loadBill();
  }, [session, loadBill]);

  useEffect(() => {
    if (method !== 'credit') return;
    listCustomers({ limit: 200 })
      .then((res) => setCustomers(res.data ?? []))
      .catch(() => setCustomers([]));
  }, [method]);

  useEffect(() => {
    if (method !== 'online') return;
    getPayConfig(tenantId)
      .then((res) => setPublishableKey(res.data?.publishable_key ?? ''))
      .catch(() => setPublishableKey(''));
  }, [method, tenantId]);

  const canteenTotal = useMemo(() => {
    if (!session || !Array.isArray(session.orders)) return 0;
    return session.orders.reduce(
      (sum, o: any) => sum + Number(o.price ?? 0) * Number(o.quantity ?? 0),
      0
    );
  }, [session]);

  if (!sessionId) {
    return (
      <div>
        <p>Session not found.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/tenant/sessions')}>Back</button>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div>
        <p>{loading ? 'Loading…' : 'Session not found.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/tenant/sessions')}>Back</button>
      </div>
    );
  }

  const sid = Number(sessionId);
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now();
  const durationMs = Date.now() - startedAt;
  const total = bill?.total ?? 0;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (method === 'credit' && !creditCustomerId && !creditCustomerName.trim()) {
        setError('Please select or enter customer for credit payment');
        setSubmitting(false);
        return;
      }
      if (paymentMode === 'single') {
        await createPayment({
          session_id: sid,
          amount: total,
          method,
          status: method === 'credit' ? 'on_account' : 'completed',
          ...(method === 'credit'
            ? {
                customer_id: creditCustomerId ? Number(creditCustomerId) : undefined,
                customer_name: creditCustomerName.trim() || undefined,
                customer_mobile: creditCustomerMobile.trim() || undefined,
              }
            : {}),
        });
      } else {
        await splitPayment({
          session_id: sid,
          payments: splitAmounts.filter((p) => p.amount > 0),
        });
      }
      await endSession({ session_id: sid });

      const completed: CompletedSession = {
        id: String(session.id),
        gameTypeName: session.game_type_name ?? '',
        unitName: session.game_unit_name ?? '',
        playerCount: session.players?.length ?? 0,
        startedAt: session.started_at ?? new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: Math.round(durationMs / 60000),
        gameCharge: bill?.subtotal ?? 0,
        canteenTotal: 0,
        vat: bill?.vat_amount ?? bill?.vat ?? 0,
        discount: bill?.discount_amount ?? 0,
        totalAmount: total,
        paymentMode,
        paymentMethod: method,
      };
      const list = loadCompletedSessions();
      list.push(completed);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }

      // Fetch backend-generated Zebra-sized PDF bill and open it so user can print from the PDF view.
      try {
        const pdfBlob = await fetchBillPdf(sid, {
          vat_percent: vatPercent,
          discount_amount: discountAmount,
        });

        const blobUrl = URL.createObjectURL(pdfBlob);
        // Open in a new tab so the user can see the proper bill layout
        // (Game charge, canteen, VAT, total, QR code) and choose the Zebra printer.
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // If server PDF fails, fall back to client-side PDF generation.
        try {
          await generateReceiptPdf({
            sessionId: sid,
            gameTypeName: session.game_type_name,
            unitName: session.game_unit_name,
            startedAt: session.started_at,
            endedAt: new Date().toISOString(),
            canteenTotal,
            subtotal: bill?.subtotal ?? total,
            vat: bill?.vat_amount ?? bill?.vat ?? 0,
            discount: bill?.discount_amount ?? 0,
            total,
            vatPercent,
          });
        } catch {
          // If PDF generation fails, still continue navigation
        }
      }

      navigate('/tenant/sessions');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>End Session</h2>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="kpi-card" style={{ padding: '1.5rem', maxWidth: 420 }}>
        <div style={{ marginBottom: '1rem' }}>
          <strong>Duration:</strong> {formatDuration(durationMs)}
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <strong>Subtotal:</strong>{' '}
          <CurrencyIcon />
          {bill?.subtotal ?? 0}
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <strong>VAT ({vatPercent}%):</strong>{' '}
          <CurrencyIcon />
          {bill?.vat_amount ?? bill?.vat ?? 0}
        </div>
        <div className="form-group">
          <label className="form-label">Discount (SAR)</label>
          <input
            type="number"
            className="form-input"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
            min={0}
          />
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
          Final amount:{' '}
          <CurrencyIcon />
          {total}
        </div>
        <div className="form-group">
          <label className="form-label">Payment</label>
          <select className="form-input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as 'single' | 'split')}>
            <option value="single">Single Payment</option>
            <option value="split">Split Payment</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Payment method</label>
          <select
            className="form-input"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            disabled={paymentMode === 'split'}
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mixed">Mixed</option>
            <option value="credit">Credit (Pay Later / On Account)</option>
            <option value="online">Online (Mada / Card / Apple Pay)</option>
          </select>
        </div>
        {method === 'online' && paymentMode === 'single' && total > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {publishableKey ? (
              <MoyasarCheckout
                publishableKey={publishableKey}
                amountSar={total}
                description={`Session #${sid} - ${session.game_unit_name ?? 'Table'}`}
                callbackUrl={`${window.location.origin}/pay/success?tenant=${tenantId}&session_id=${sid}`}
              />
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Payment gateway loading… Configure MOYASAR keys in backend .env if this persists.
              </p>
            )}
          </div>
        )}
        {method === 'credit' && paymentMode === 'single' && (
          <>
            <div className="form-group">
              <label className="form-label">Select existing customer</label>
              <select
                className="form-input"
                value={creditCustomerId}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreditCustomerId(val ? Number(val) : '');
                  if (val) {
                    const c = customers.find((x) => x.id === Number(val));
                    if (c) {
                      setCreditCustomerName(c.name);
                      setCreditCustomerMobile(c.mobile ?? '');
                    }
                  }
                }}
              >
                <option value="">— New customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.mobile ? ` (${c.mobile})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Customer name *</label>
              <input
                className="form-input"
                value={creditCustomerName}
                onChange={(e) => setCreditCustomerName(e.target.value)}
                placeholder="Customer name"
                disabled={!!creditCustomerId}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile number</label>
              <input
                className="form-input"
                value={creditCustomerMobile}
                onChange={(e) => setCreditCustomerMobile(e.target.value)}
                placeholder="03001234567"
                disabled={!!creditCustomerId}
              />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
              Bill will be added to customer account as debit. Settle from Customer Accounts at month end.
            </p>
          </>
        )}
        {paymentMode === 'split' && (
          <div className="form-group">
            <label className="form-label">Split amounts</label>
            {splitAmounts.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="number"
                  className="form-input"
                  value={p.amount}
                  onChange={(e) =>
                    setSplitAmounts((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x))
                    )
                  }
                  placeholder="Amount"
                />
                <select
                  className="form-input"
                  value={p.method}
                  onChange={(e) =>
                    setSplitAmounts((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, method: e.target.value } : x))
                    )
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSplitAmounts((prev) => [...prev, { amount: 0, method: 'cash' }])}
            >
              + Add split
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/tenant/sessions')}>Cancel</button>
          {method !== 'online' && (
            <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Processing…' : method === 'credit' ? 'Add to Account' : 'Confirm Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
