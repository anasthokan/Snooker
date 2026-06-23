import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import type { CompletedSession } from '../../types';
import type { SessionItem, OrderItem, ProductItem } from '../../api/types';
import { getSession, listOrdersBySession, listProducts, calculateBill } from '../../api';
import { loadCompletedSessions } from './CompletedSessions';
import { CurrencyIcon } from '../../components/CurrencyIcon';

const VAT_PERCENT = 5;

function canteenTotalFromOrders(orders: OrderItem[]): number {
  return orders.reduce((sum, o) => sum + Number(o.price) * o.quantity, 0);
}

export default function CompletedSessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<CompletedSession | null>(null);
  const [apiSession, setApiSession] = useState<SessionItem | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [bill, setBill] = useState<{ subtotal?: number; vat?: number; discount_amount?: number; total?: number } | null>(null);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    const all = loadCompletedSessions();
    const found = all.find((s) => s.id === String(sessionId));
    setSession(found ?? null);
  }, [sessionId]);

  useEffect(() => {
    async function loadApiData() {
      if (!sessionId) return;
      const id = Number(sessionId);
      if (Number.isNaN(id)) return;
      try {
        setApiError('');
        const [sessRes, ordRes, prodRes] = await Promise.all([
          getSession(id),
          listOrdersBySession(id),
          listProducts(),
        ]);
        setApiSession(sessRes.data ?? null);
        setOrders(ordRes.data ?? []);
        setProducts(prodRes.data ?? []);
      } catch (e) {
        setApiSession(null);
        setOrders([]);
        setProducts([]);
        setApiError(e instanceof Error ? e.message : 'Failed to load session from backend');
      }
    }
    void loadApiData();
  }, [sessionId]);

  useEffect(() => {
    async function loadBill() {
      if (!sessionId || !session) return;
      const id = Number(sessionId);
      if (Number.isNaN(id)) return;
      try {
        const res = await calculateBill({
          session_id: id,
          vat_percent: VAT_PERCENT,
          discount_amount: session.discount,
        });
        setBill(res.data ?? null);
      } catch {
        setBill(null);
      }
    }
    void loadBill();
  }, [sessionId, session]);

  if (!sessionId) {
    return (
      <div>
        <p>Session not found.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/tenant/completed-sessions')}>
          Back to Completed Sessions
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        <p>Details for this completed session are not available. It may have been ended outside this app or cleared from local storage.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/tenant/completed-sessions')}>
          Back to Completed Sessions
        </button>
      </div>
    );
  }

  const startedLabel = format(new Date(session.startedAt), 'dd MMM yyyy, HH:mm');
  const endedLabel = format(new Date(session.endedAt), 'dd MMM yyyy, HH:mm');

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const apiCanteenTotal = canteenTotalFromOrders(orders);
  const canteenTotal = orders.length > 0 ? apiCanteenTotal : session.canteenTotal;

  const subtotal = session.gameCharge + canteenTotal;
  const vatFromApi = bill?.vat;
  const vatDisplay =
    vatFromApi != null && vatFromApi > 0
      ? vatFromApi
      : session.vat > 0
        ? session.vat
        : Math.round(subtotal * (VAT_PERCENT / 100) * 100) / 100;

  return (
    <div>
      <div className="page-header">
        <h2>Session #{session.id} Summary</h2>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/tenant/completed-sessions')}>
          ← Back to Completed Sessions
        </button>
      </div>
      <div className="kpi-card" style={{ padding: '1.5rem', maxWidth: 640 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '0.75rem', columnGap: '2rem' }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Game</div>
            <div>{session.gameTypeName}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Unit</div>
            <div>{session.unitName}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Players</div>
            <div>
              {session.playerCount}
              {apiSession?.players && apiSession.players.length > 0
                ? ` (${apiSession.players.map((p) => p.name).join(', ')})`
                : ''}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Duration</div>
            <div>{session.durationMinutes} min</div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Started</div>
            <div>{startedLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ended</div>
            <div>{endedLabel}</div>
          </div>
        </div>

        <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-subtle)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '0.75rem', columnGap: '2rem' }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Game charge</div>
            <div>
              <CurrencyIcon />
              {session.gameCharge}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Canteen total</div>
            <div>
              <CurrencyIcon />
              {canteenTotal}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>VAT ({VAT_PERCENT}%)</div>
            <div>
              <CurrencyIcon />
              {vatDisplay}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Discount</div>
            <div>
              <CurrencyIcon />
              {session.discount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total amount</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              <CurrencyIcon />
              {session.totalAmount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Payment</div>
            <div>
              {session.paymentMode === 'single' ? 'Single payment' : 'Split payment'} — {session.paymentMethod}
            </div>
          </div>
        </div>

        {orders.length > 0 && (
          <>
            <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-subtle)' }} />
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Canteen products
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: 14 }}>
              {orders.map((o) => {
                const product = productMap[o.product_id];
                const productName = product?.name ?? `Product #${o.product_id}`;
                const lineTotal = Number(o.price) * o.quantity;
                return (
                  <li key={o.id}>
                    {productName} × {o.quantity} = <CurrencyIcon />
                    {lineTotal}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {apiSession?.players && apiSession.players.length > 0 && (
          <>
            <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-subtle)' }} />
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Player details
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: 14 }}>
              {apiSession.players.map((p) => (
                <li key={p.id}>
                  {p.name}
                  {p.mobile ? ` (${p.mobile})` : ''}
                  {p.membership_id ? ` • ID: ${p.membership_id}` : ''}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {apiError && (
        <div className="toast-error" style={{ marginTop: '1rem', maxWidth: 640 }}>
          {apiError}
        </div>
      )}

      {/* No raw JSON shown – only business-friendly summary above */}
    </div>
  );
}

