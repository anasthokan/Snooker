import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCustomerSession,
  getCustomerProducts,
  customerCreateOrder,
  customerDeleteOrder,
} from '../../api/customerPortal';
import { CurrencyIcon } from '../../components/CurrencyIcon';

interface SessionData {
  id: number;
  players?: { id: number; name: string }[];
  orders?: { id: number; player_id: number; product_id: number; quantity: number; price: number }[];
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

export default function CustomerCanteen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!sessionId) return;
    const id = Number(sessionId);
    setLoading(true);
    setError('');
    try {
      const [sessRes, prodRes] = await Promise.all([
        getCustomerSession(id),
        getCustomerProducts(),
      ]);
      setSession((sessRes.data as unknown as SessionData) ?? null);
      setProducts(prodRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addItem = async (productId: number, quantity = 1) => {
    if (!sessionId || !session) return;
    try {
      await customerCreateOrder({
        session_id: Number(sessionId),
        product_id: productId,
        quantity,
        player_id: session.players?.[0]?.id,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item');
    }
  };

  const removeItem = async (orderId: number) => {
    try {
      await customerDeleteOrder(orderId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    }
  };

  if (loading) return <div className="page-loading"><p>Loading…</p></div>;
  if (!session) {
    return (
      <div>
        <p>Session not found.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/customer/tables')}>
          Back to Tables
        </button>
      </div>
    );
  }

  const orders = session.orders ?? [];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const categories = [...new Set(products.map((p) => p.category))];
  const orderTotal = orders.reduce((s, o) => s + o.price * o.quantity, 0);

  return (
    <div>
      <div className="page-header">
        <h2>Canteen — Session #{session.id}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/customer/session/${sessionId}/end`)}
          >
            End Session
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/customer/tables')}>
            Back to Tables
          </button>
        </div>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="kpi-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem' }}>Menu</h3>
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {products
                  .filter((p) => p.category === cat)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn btn-secondary"
                      style={{ justifyContent: 'space-between', display: 'flex' }}
                      onClick={() => void addItem(p.id, 1)}
                    >
                      <span>{p.name}</span>
                      <span><CurrencyIcon />{p.price}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="kpi-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem' }}>Your Order</h3>
          {orders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No items yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {orders.map((o) => (
                <li key={o.id} style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span>
                    {productMap[o.product_id]?.name ?? 'Item'} × {o.quantity} = <CurrencyIcon />
                    {(o.price * o.quantity).toFixed(2)}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => void removeItem(o.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: '1rem', fontWeight: 700 }}>
            Canteen total: <CurrencyIcon />{orderTotal.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
