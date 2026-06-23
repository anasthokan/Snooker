import { useState, useEffect, useCallback } from 'react';
import type { GameType, BillingType } from '../../types';
import { listGameTypes, createGameType, updateGameType } from '../../api';
import type { GameTypeItem } from '../../api/types';

const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'time_based', label: 'Time-Based' },
  { value: 'match_based', label: 'Match-Based' },
  { value: 'flat', label: 'Flat' },
];

function toGameType(item: GameTypeItem): GameType {
  return {
    id: String(item.id),
    name: item.name,
    billingType: (item.billing_type as BillingType) || 'time_based',
    status: item.status === 'active' ? 'active' : 'inactive',
    iconUrl: item.icon ?? undefined,
  };
}

export default function GameTypes() {
  const [games, setGames] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GameType | null>(null);
  const [form, setForm] = useState<{ name: string; billingType: BillingType; icon: string; status: 'active' | 'inactive' }>({
    name: '',
    billingType: 'time_based',
    icon: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listGameTypes();
      const list = res.data ?? [];
      setGames(list.map(toGameType));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load game types');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', billingType: 'time_based', icon: '', status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (g: GameType) => {
    setEditing(g);
    setForm({ name: g.name, billingType: g.billingType, icon: g.iconUrl ?? '', status: g.status });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateGameType(Number(editing.id), {
          name: form.name,
          status: form.status,
        });
      } else {
        await createGameType({
          name: form.name,
          billing_type: form.billingType,
          icon: form.icon.trim() || null,
          status: form.status,
        });
      }
      await load();
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (g: GameType) => {
    const next = g.status === 'active' ? 'inactive' : 'active';
    try {
      await updateGameType(Number(g.id), { status: next });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) {
    return <div className="page-loading"><p>Loading game types…</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Game Types</h2>
        <button type="button" className="btn btn-primary" onClick={openAdd}>Add Game Type</button>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Game Name</th>
              <th>Billing Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{BILLING_OPTIONS.find((o) => o.value === g.billingType)?.label ?? g.billingType}</td>
                <td style={{ color: g.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>{g.status}</td>
                <td>
                  <button type="button" className="btn btn-ghost" style={{ marginRight: '0.5rem' }} onClick={() => openEdit(g)}>Edit</button>
                  <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(g)}>{g.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{editing ? 'Edit' : 'Add'} Game Type</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Game Name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Snooker" />
              </div>
              {!editing && (
                <div className="form-group">
                  <label className="form-label">Billing Type</label>
                  <select className="form-input" value={form.billingType} onChange={(e) => setForm((f) => ({ ...f, billingType: e.target.value as BillingType }))}>
                    {BILLING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {!editing && (
                <div className="form-group">
                  <label className="form-label">Icon (URL, optional)</label>
                  <input className="form-input" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="https://..." />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
