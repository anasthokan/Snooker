import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCustomerTables,
  customerStartSession,
  type CustomerTableItem,
} from '../../api/customerPortal';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import '../tenant/TableFloor.css';

type TableStatus = CustomerTableItem['status'];

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function tableDisplayName(table: CustomerTableItem) {
  const unitLower = table.unit_name.trim().toLowerCase();
  const typeLower = table.game_type_name.trim().toLowerCase();
  if (unitLower.includes(typeLower)) return table.unit_name;
  return `${table.game_type_name} ${table.unit_name}`;
}

function statusLabel(status: TableStatus) {
  switch (status) {
    case 'occupied':
      return 'In Use';
    case 'paused':
      return 'Paused';
    case 'maintenance':
      return 'Maintenance';
    default:
      return 'Available';
  }
}

export default function CustomerTables() {
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState('');
  const [tables, setTables] = useState<CustomerTableItem[]>([]);
  const [filterTypeId, setFilterTypeId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CustomerTableItem | null>(null);
  const [detailTable, setDetailTable] = useState<CustomerTableItem | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await getCustomerTables();
      setTenantName(res.data?.tenant_name ?? '');
      setTables(res.data?.tables ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const gameTypes = useMemo(() => {
    const seen = new Map<number, string>();
    for (const t of tables) {
      if (!seen.has(t.game_type_id)) seen.set(t.game_type_id, t.game_type_name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id: String(id), name }));
  }, [tables]);

  const filteredTables =
    filterTypeId === 'all'
      ? tables
      : tables.filter((t) => String(t.game_type_id) === filterTypeId);

  const handleStart = async () => {
    if (!selected) return;
    setStarting(true);
    setError('');
    try {
      await customerStartSession(selected.game_type_id, selected.unit_id);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start table');
    } finally {
      setStarting(false);
    }
  };

  const goCanteen = (sessionId: number) => {
    setSelected(null);
    navigate(`/customer/session/${sessionId}/canteen`);
  };

  const goEndSession = (sessionId: number) => {
    setSelected(null);
    navigate(`/customer/session/${sessionId}/end`);
  };

  if (loading) {
    return <div className="page-loading"><p>Loading tables…</p></div>;
  }

  return (
    <div>
      <div className="table-floor-header">
        <div>
          <h2>Tables</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {tenantName ? `${tenantName} — ` : ''}Click a table to start or add canteen
          </p>
        </div>
        <div className="table-floor-filters">
          <button
            type="button"
            className={`btn ${filterTypeId === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterTypeId('all')}
          >
            All
          </button>
          {gameTypes.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`btn ${filterTypeId === g.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterTypeId(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>
      )}

      {filteredTables.length === 0 ? (
        <div className="table-floor-empty kpi-card">
          <p>No tables available right now.</p>
        </div>
      ) : (
        <div className="table-floor-grid">
          {filteredTables.map((table) => (
            <div
              key={table.unit_id}
              className={`table-card table-card--${table.status}`}
              onClick={() => setSelected(table)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelected(table);
              }}
            >
              <button
                type="button"
                className="table-card-eye"
                title="View table details"
                aria-label={`View ${table.unit_name} details`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailTable(table);
                }}
              >
                <EyeIcon />
              </button>
              <div className="table-visual">
                <div className="table-visual-center" />
                <div className="table-visual-spot" />
              </div>
              <div className="table-card-meta">
                <span className="table-card-name">{tableDisplayName(table)}</span>
                <span className="table-card-type">
                  <CurrencyIcon />
                  {table.weekday_price}/hr weekday
                </span>
                <span className={`table-status-badge table-status-badge--${table.status}`}>
                  {statusLabel(table.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailTable && (
        <div className="table-modal-overlay" onClick={() => setDetailTable(null)} role="presentation">
          <div className="table-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{tableDisplayName(detailTable)}</h3>
            <p className="table-modal-sub">{detailTable.game_type_name}</p>
            <ul className="table-detail-list">
              <li><span>Status</span><span>{statusLabel(detailTable.status)}</span></li>
              <li>
                <span>Weekday rate</span>
                <span><CurrencyIcon />{detailTable.weekday_price}/hr</span>
              </li>
              <li>
                <span>Weekend rate</span>
                <span><CurrencyIcon />{detailTable.weekend_price}/hr</span>
              </li>
            </ul>
            <button type="button" className="btn btn-secondary" onClick={() => setDetailTable(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="table-modal-overlay" onClick={() => setSelected(null)} role="presentation">
          <div className="table-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{tableDisplayName(selected)}</h3>
            <p className="table-modal-sub">{selected.game_type_name}</p>

            {selected.status === 'maintenance' ? (
              <p style={{ color: 'var(--text-secondary)' }}>This table is under maintenance.</p>
            ) : selected.session_id ? (
              <div className="table-modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => goCanteen(selected.session_id!)}
                >
                  Add Canteen
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => goEndSession(selected.session_id!)}
                >
                  End & Pay / Credit
                </button>
              </div>
            ) : (
              <div className="table-modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStart}
                  disabled={starting}
                >
                  {starting ? 'Starting…' : 'Start Table'}
                </button>
              </div>
            )}

            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setSelected(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
