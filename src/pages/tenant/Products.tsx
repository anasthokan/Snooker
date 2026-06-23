import { useState, useEffect, useCallback } from 'react';
import { listProducts, createProduct, getProduct, updateProduct } from '../../api';
import type { ProductItem } from '../../api/types';
import { CurrencyIcon } from '../../components/CurrencyIcon';

const CATEGORY_OPTIONS = ['Snacks', 'Beverages', 'Food', 'Other'];
const STATUS_OPTIONS = ['active', 'inactive'];

export default function Products() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewProduct, setViewProduct] = useState<ProductItem | null>(null);
  const [editProduct, setEditProduct] = useState<ProductItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    price: 0,
    category: 'Snacks',
    status: 'active' as string,
  });
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', price: 0, category: 'Snacks', status: 'active' as string });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listProducts();
      setProducts(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openView = async (p: ProductItem) => {
    setViewProduct(p);
    try {
      const res = await getProduct(p.id);
      if (res.data) setViewProduct(res.data);
    } catch {
      // keep row data
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createProduct({
        name: form.name.trim(),
        price: Number(form.price) || 0,
        category: form.category,
        status: form.status,
      });
      await load();
      setForm({ name: '', price: 0, category: 'Snacks', status: 'active' });
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-loading"><p>Loading products…</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Products</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Product</button>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>
                  <CurrencyIcon />
                  {p.price}
                </td>
                <td>{p.category}</td>
                <td>
                  <span style={{ color: p.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>{p.status}</span>
                </td>
                <td>
                  <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => openView(p)}>View</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditProduct(p); setEditForm({ name: p.name, price: p.price, category: p.category, status: p.status }); }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create Product</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Product name" />
              </div>
              <div className="form-group">
                <label className="form-label">Price (SAR)</label>
                <input type="number" min={0} step={0.01} className="form-input" value={form.price || ''} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {editProduct !== null && (
        <div className="modal-overlay" onClick={() => setEditProduct(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Edit Product</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setEditProduct(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Product name" />
              </div>
              <div className="form-group">
                <label className="form-label">Price (SAR)</label>
                <input type="number" min={0} step={0.01} className="form-input" value={editForm.price || ''} onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditProduct(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={async () => {
                  if (!editForm.name.trim()) return;
                  setSaving(true);
                  setError('');
                  try {
                    await updateProduct(editProduct.id, {
                      name: editForm.name.trim(),
                      price: editForm.price,
                      category: editForm.category,
                      status: editForm.status,
                    });
                    await load();
                    setEditProduct(null);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Update failed');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewProduct !== null && (
        <div className="modal-overlay" onClick={() => setViewProduct(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Product Details</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setViewProduct(null)}>×</button>
            </div>
            <div className="modal-body">
              <dl style={{ margin: 0, display: 'grid', gap: '0.5rem' }}>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>ID</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewProduct.id}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Name</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewProduct.name}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Price</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>
                    <CurrencyIcon />
                    {viewProduct.price}
                  </dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Category</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewProduct.category}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Status</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewProduct.status}</dd>
                </div>
              </dl>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewProduct(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
