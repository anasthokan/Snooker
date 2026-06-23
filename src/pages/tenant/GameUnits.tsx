import { useState, useEffect, useCallback } from 'react';
import type { GameUnit, UnitStatus } from '../../types';
import { listGameUnits, listGameTypes, createGameUnit, updateGameUnit, deleteGameUnit } from '../../api';
import type { GameUnitItem, GameTypeItem } from '../../api/types';
import { CurrencyIcon } from '../../components/CurrencyIcon';

function toGameUnit(item: GameUnitItem): GameUnit {
  return {
    id: String(item.id),
    gameTypeId: String(item.game_type_id),
    name: item.unit_name,
    weekdayPrice: item.weekday_price,
    weekendPrice: item.weekend_price,
    specialPrice: item.special_price ?? undefined,
    status: (item.status as UnitStatus) || 'available',
  };
}

export default function GameUnits() {
  const [units, setUnits] = useState<GameUnit[]>([]);
  const [gameTypes, setGameTypes] = useState<GameTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GameUnit | null>(null);
  const [form, setForm] = useState({
    game_type_id: 0,
    unit_name: '',
    weekday_price: 0,
    weekend_price: 0,
    special_price: undefined as number | undefined,
    status: 'available' as UnitStatus,
  });
  const [saving, setSaving] = useState(false);

  const loadUnits = useCallback(async () => {
    try {
      const res = await listGameUnits();
      setUnits((res.data ?? []).map(toGameUnit));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load units');
      setUnits([]);
    }
  }, []);

  const loadGameTypes = useCallback(async () => {
    try {
      const res = await listGameTypes();
      setGameTypes(res.data ?? []);
    } catch {
      setGameTypes([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadUnits(), loadGameTypes()]).finally(() => setLoading(false));
  }, [loadUnits, loadGameTypes]);

  const openAdd = () => {
    setEditing(null);
    const firstId = gameTypes[0]?.id ?? 0;
    setForm({
      game_type_id: firstId,
      unit_name: '',
      weekday_price: 0,
      weekend_price: 0,
      special_price: undefined,
      status: 'available',
    });
    setModalOpen(true);
  };

  const openEdit = (u: GameUnit) => {
    setEditing(u);
    setForm({
      game_type_id: Number(u.gameTypeId),
      unit_name: u.name,
      weekday_price: u.weekdayPrice,
      weekend_price: u.weekendPrice,
      special_price: u.specialPrice,
      status: u.status,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.unit_name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateGameUnit(Number(editing.id), {
          unit_name: form.unit_name,
          weekday_price: form.weekday_price,
          weekend_price: form.weekend_price,
          status: form.status,
        });
      } else {
        await createGameUnit({
          game_type_id: form.game_type_id,
          unit_name: form.unit_name,
          weekday_price: form.weekday_price,
          weekend_price: form.weekend_price,
          special_price: form.special_price ?? null,
          status: form.status,
        });
      }
      await loadUnits();
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const gameName = (id: number) => gameTypes.find((g) => g.id === id)?.name ?? String(id);

  const handleDelete = async (u: GameUnit) => {
    if (!confirm('Delete this unit?')) return;
    setError('');
    try {
      await deleteGameUnit(Number(u.id));
      await loadUnits();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return <div className="page-loading"><p>Loading game units…</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Game Units</h2>
        <button type="button" className="btn btn-primary" onClick={openAdd}>Add Unit</button>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Game Type</th>
              <th>Unit Name</th>
              <th>Weekday Price</th>
              <th>Weekend Price</th>
              <th>Special Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id}>
                <td>{gameName(Number(u.gameTypeId))}</td>
                <td>{u.name}</td>
                <td>
                  <CurrencyIcon />
                  {u.weekdayPrice}
                </td>
                <td>
                  <CurrencyIcon />
                  {u.weekendPrice}
                </td>
                <td>
                  {u.specialPrice != null ? (
                    <>
                      <CurrencyIcon />
                      {u.specialPrice}
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td style={{ color: u.status === 'available' ? 'var(--success)' : u.status === 'maintenance' ? 'var(--warning)' : 'var(--text-muted)' }}>{u.status}</td>
                <td>
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(u)}>Edit</button>
                  <button type="button" className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDelete(u)}>Delete</button>
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
              <h3 style={{ margin: 0 }}>{editing ? 'Edit' : 'Add'} Game Unit</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Game Type</label>
                <select
                  className="form-input"
                  value={form.game_type_id}
                  onChange={(e) => setForm((f) => ({ ...f, game_type_id: Number(e.target.value) }))}
                  disabled={!!editing}
                >
                  {gameTypes.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit Name</label>
                <input
                  className="form-input"
                  value={form.unit_name}
                  onChange={(e) => setForm((f) => ({ ...f, unit_name: e.target.value }))}
                  placeholder="Table 1 / PS5-01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Weekday Price (SAR)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.weekday_price || ''}
                  onChange={(e) => setForm((f) => ({ ...f, weekday_price: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Weekend Price (SAR)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.weekend_price || ''}
                  onChange={(e) => setForm((f) => ({ ...f, weekend_price: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Special Price (SAR) Optional</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.special_price ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, special_price: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Optional"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UnitStatus }))}
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disabled">Disabled</option>
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
