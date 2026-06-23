import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, listProducts, listOrdersBySession, createOrder, deleteOrder } from '../../api';
import type { SessionItem, ProductItem, OrderItem } from '../../api/types';
import { CurrencyIcon } from '../../components/CurrencyIcon';

function subtotal(items: { price: number; quantity: number }[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export default function Canteen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!sessionId) return;
    const id = Number(sessionId);
    if (Number.isNaN(id)) return;
    setLoading(true);
    setError('');
    try {
      const [sessRes, prodRes, ordRes] = await Promise.all([
        getSession(id),
        listProducts(),
        listOrdersBySession(id),
      ]);
      setSession(sessRes.data ?? null);
      setProducts(prodRes.data ?? []);
      setOrders(ordRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setSession(null);
      setProducts([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const addToPlayer = async (playerId: number, product: ProductItem, quantity: number) => {
    if (!sessionId || !session) return;
    const sid = Number(sessionId);
    try {
      await createOrder({
        session_id: sid,
        player_id: playerId,
        product_id: product.id,
        quantity,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add order');
    }
  };

  const removeOrder = async (orderId: number) => {
    try {
      await deleteOrder(orderId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    }
  };

  if (!sessionId) {
    return (
      <div>
        <p>Session not found.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/tenant/sessions')}>
          Back to Sessions
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="page-loading"><p>Loading…</p></div>;
  }

  if (!session) {
    return (
      <div>
        <p>Session not found.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/tenant/sessions')}>
          Back to Sessions
        </button>
      </div>
    );
  }

  const players = session.players ?? [];
  const categories = [...new Set(products.filter((p) => p.status === 'active').map((p) => p.category))];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const ordersByPlayer = players.map((p) => ({
    player: p,
    items: orders.filter((o) => o.player_id === p.id),
  }));

  return (
    <div>
      <div className="page-header">
        <h2>Canteen — {session.game_type_name ? `${session.game_type_name} ${session.game_unit_name ?? ''}`.trim() : session.game_unit_name ?? `Session ${session.id}`}</h2>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/tenant/sessions')}>
          Back to Session
        </button>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="kpi-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Product Categories</h3>
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{cat}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {products
                  .filter((p) => p.status === 'active' && p.category === cat)
                  .map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      players={players}
                      onAdd={(playerId, q) => addToPlayer(playerId, p, q)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="kpi-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Orders by Player</h3>
          {ordersByPlayer.map(({ player, items }) => (
            <div
              key={player.id}
              style={{
                marginBottom: '1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{player.name}</div>
              <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.25rem' }}>
                {items.map((o) => {
                  const pr = productMap[o.product_id];
                  return (
                    <li key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {pr?.name ?? o.product_id} × {o.quantity} = <CurrencyIcon />
                        {o.price * o.quantity}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '0.25rem' }}
                        onClick={() => removeOrder(o.id)}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                Subtotal: <CurrencyIcon />
                {subtotal(items)}
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {products.slice(0, 4).map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => addToPlayer(player.id, pr, 1)}
                  >
                    + {pr.name} (
                    <CurrencyIcon />
                    {pr.price})
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  players,
  onAdd,
}: {
  product: ProductItem;
  players: { id: number; name: string }[];
  onAdd: (playerId: number, q: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? 0);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '0.25rem',
      }}
    >
      <span style={{ fontSize: '0.9rem' }}>
        {product.name} — <CurrencyIcon />
        {product.price}
      </span>
      <input
        type="number"
        min={1}
        max={10}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value) || 1)}
        className="form-input"
        style={{ width: 48, padding: '0.25rem' }}
      />
      <select
        className="form-input"
        value={selectedPlayerId}
        onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
        style={{ width: 'auto', minWidth: 80 }}
      >
        {players.map((pl) => (
          <option key={pl.id} value={pl.id}>{pl.name}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-primary"
        style={{ padding: '0.25rem 0.5rem' }}
        onClick={() => onAdd(selectedPlayerId, qty)}
      >
        Add
      </button>
    </div>
  );
}
