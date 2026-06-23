import { useState, useEffect, useCallback } from 'react';
import { listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer } from '../../api';
import type { CustomerItem } from '../../api/types';

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<CustomerItem | null>(null);
  const [editCustomer, setEditCustomer] = useState<CustomerItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    membership_id: '',
  });
  const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '', membership_id: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listCustomers({ skip: 0, limit: 100 });
      setCustomers(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openView = async (c: CustomerItem) => {
    setViewCustomer(c);
    try {
      const res = await getCustomer(c.id);
      if (res.data) setViewCustomer(res.data);
    } catch {
      // keep row data
    }
  };

  const openEdit = (c: CustomerItem) => {
    setEditCustomer(c);
    setEditForm({
      name: c.name,
      email: c.email ?? '',
      mobile: c.mobile ?? '',
      membership_id: c.membership_id ?? '',
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createCustomer({
        name: form.name.trim(),
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        membership_id: form.membership_id.trim() || null,
      });
      await load();
      setForm({ name: '', email: '', mobile: '', membership_id: '' });
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editCustomer) return;
    if (!editForm.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateCustomer(editCustomer.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        mobile: editForm.mobile.trim() || null,
        membership_id: editForm.membership_id.trim() || null,
      });
      await load();
      setEditCustomer(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CustomerItem) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    setError('');
    try {
      await deleteCustomer(c.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return <div className="page-loading"><p>Loading customers…</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Customers</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Customer</button>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Membership ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td>{c.email ?? '-'}</td>
                <td>{c.mobile ?? '-'}</td>
                <td>{c.membership_id ?? '-'}</td>
                <td>
                  <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => openView(c)}>View</button>
                  <button type="button" className="btn btn-ghost" style={{ marginRight: '0.5rem' }} onClick={() => openEdit(c)}>Edit</button>
                  <button type="button" className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDelete(c)}>Delete</button>
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
              <h3 style={{ margin: 0 }}>Create Customer</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="form-input" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="9876543210" />
              </div>
              <div className="form-group">
                <label className="form-label">Membership ID</label>
                <input className="form-input" value={form.membership_id} onChange={(e) => setForm((f) => ({ ...f, membership_id: e.target.value }))} placeholder="M001" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {viewCustomer !== null && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Customer Details</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setViewCustomer(null)}>×</button>
            </div>
            <div className="modal-body">
              <dl style={{ margin: 0, display: 'grid', gap: '0.5rem' }}>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>ID</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewCustomer.id}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Name</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewCustomer.name}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Email</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewCustomer.email ?? '-'}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Mobile</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewCustomer.mobile ?? '-'}</dd>
                </div>
                <div>
                  <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Membership ID</dt>
                  <dd style={{ margin: '0.25rem 0 0 0' }}>{viewCustomer.membership_id ?? '-'}</dd>
                </div>
              </dl>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewCustomer(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => { setViewCustomer(null); openEdit(viewCustomer); }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {editCustomer !== null && (
        <div className="modal-overlay" onClick={() => setEditCustomer(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Edit Customer</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setEditCustomer(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="form-input" value={editForm.mobile} onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="9876543210" />
              </div>
              <div className="form-group">
                <label className="form-label">Membership ID</label>
                <input className="form-input" value={editForm.membership_id} onChange={(e) => setEditForm((f) => ({ ...f, membership_id: e.target.value }))} placeholder="M001" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditCustomer(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
