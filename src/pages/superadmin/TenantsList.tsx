import { useState, useEffect, useCallback } from 'react';
import { listTenants, createTenant, updateTenant, getTenant } from '../../api';
import type { TenantListItem } from '../../api/types';

export default function TenantsList() {
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [saving, setSaving] = useState(false);

  const [viewTenant, setViewTenant] = useState<TenantListItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editTenant, setEditTenant] = useState<TenantListItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listTenants();
      setTenants(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tenants');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (t: TenantListItem) => {
    const next = t.status === 'active' ? 'inactive' : 'active';
    try {
      await updateTenant(t.id, { status: next });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const openView = async (t: TenantListItem) => {
    setViewTenant(t);
    setViewLoading(true);
    setError('');
    try {
      const res = await getTenant(t.id);
      setViewTenant(res.data ?? t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tenant');
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = (t: TenantListItem) => {
    setEditTenant(t);
    setEditName(t.name);
    setEditStatus(t.status ?? 'active');
  };

  const saveEdit = async () => {
    if (!editTenant || !editName.trim()) return;
    setUpdating(true);
    setError('');
    try {
      await updateTenant(editTenant.id, { name: editName.trim(), status: editStatus });
      await load();
      setEditTenant(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const slugFromName = (n: string) =>
    n.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const addTenant = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createTenant({
        name: newName.trim(),
        status: 'active',
        subscription_plan: '',
      });
      await load();
      setNewName('');
      setNewSlug('');
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-loading"><p>Loading tenants…</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Tenants</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>Create Tenant</button>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>
                  <span style={{ color: t.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>{t.status}</span>
                </td>
                <td>{t.subscription_plan ?? '-'}</td>
                <td>
                  <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => openView(t)}>View</button>
                  <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => openEdit(t)}>Update</button>
                  <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(t)}>
                    {t.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create Tenant</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tenant Name</label>
                <input className="form-input" value={newName} onChange={(e) => { setNewName(e.target.value); setNewSlug(slugFromName(e.target.value)); }} placeholder="Parlour Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Slug</label>
                <input className="form-input" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="e.g. new-parlour" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={addTenant} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {viewTenant !== null && (
        <div className="modal-overlay" onClick={() => setViewTenant(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Tenant Details</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setViewTenant(null)}>×</button>
            </div>
            <div className="modal-body">
              {viewLoading ? (
                <p>Loading…</p>
              ) : (
                <dl style={{ margin: 0, display: 'grid', gap: '0.5rem' }}>
                  <div>
                    <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>ID</dt>
                    <dd style={{ margin: '0.25rem 0 0 0' }}>{viewTenant.id}</dd>
                  </div>
                  <div>
                    <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Name</dt>
                    <dd style={{ margin: '0.25rem 0 0 0' }}>{viewTenant.name}</dd>
                  </div>
                  <div>
                    <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Status</dt>
                    <dd style={{ margin: '0.25rem 0 0 0' }}>
                      <span style={{ color: viewTenant.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>{viewTenant.status}</span>
                    </dd>
                  </div>
                  <div>
                    <dt style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>Plan</dt>
                    <dd style={{ margin: '0.25rem 0 0 0' }}>{viewTenant.subscription_plan ?? '-'}</dd>
                  </div>
                </dl>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => { setEditTenant(viewTenant); setEditName(viewTenant.name); setEditStatus(viewTenant.status ?? 'active'); setViewTenant(null); }}>Edit</button>
              <button type="button" className="btn btn-secondary" onClick={() => setViewTenant(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {editTenant !== null && (
        <div className="modal-overlay" onClick={() => setEditTenant(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Update Tenant</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setEditTenant(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tenant Name</label>
                <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Parlour Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditTenant(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={updating}>{updating ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
