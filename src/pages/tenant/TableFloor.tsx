import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameType, GameUnit } from '../../types';
import {
  listGameTypes,
  listGameUnits,
  listSessions,
  startSession,
  startSessionWithPlayers,
} from '../../api';
import type { GameTypeItem, GameUnitItem, SessionItem } from '../../api/types';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import './TableFloor.css';

type TableStatus = 'available' | 'occupied' | 'paused' | 'maintenance';

interface FloorTable {
  unit: GameUnit;
  gameType: GameType;
  status: TableStatus;
  session?: SessionItem;
}

function toGameType(item: GameTypeItem): GameType {
  return {
    id: String(item.id),
    name: item.name,
    billingType: (item.billing_type as GameType['billingType']) || 'time_based',
    status: item.status === 'inactive' ? 'inactive' : 'active',
  };
}

function toGameUnit(item: GameUnitItem): GameUnit {
  const raw = (item.status ?? 'active').toLowerCase();
  let status: GameUnit['status'] = 'available';
  if (raw === 'maintenance') status = 'maintenance';
  else if (raw === 'disabled') status = 'disabled';
  return {
    id: String(item.id),
    gameTypeId: String(item.game_type_id),
    name: item.unit_name,
    weekdayPrice: item.weekday_price,
    weekendPrice: item.weekend_price,
    specialPrice: item.special_price ?? undefined,
    status,
  };
}

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

function tableDisplayName(gameType: GameType, unit: GameUnit) {
  const unitLower = unit.name.trim().toLowerCase();
  const typeLower = gameType.name.trim().toLowerCase();
  if (unitLower.includes(typeLower)) return unit.name;
  return `${gameType.name} ${unit.name}`;
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

export default function TableFloor() {
  const navigate = useNavigate();
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [gameUnits, setGameUnits] = useState<GameUnit[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionItem[]>([]);
  const [filterTypeId, setFilterTypeId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<FloorTable | null>(null);
  const [detailTable, setDetailTable] = useState<FloorTable | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [starting, setStarting] = useState(false);

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError('');
    try {
      const [typesRes, unitsRes, sessionsRes] = await Promise.all([
        listGameTypes(),
        listGameUnits(),
        listSessions(),
      ]);
      setGameTypes((typesRes.data ?? []).map(toGameType));
      setGameUnits((unitsRes.data ?? []).map(toGameUnit));
      setActiveSessions(
        (sessionsRes.data ?? []).filter(
          (s) => s.status === 'active' || s.status === 'paused'
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const floorTables = useMemo((): FloorTable[] => {
    const typeMap = Object.fromEntries(gameTypes.map((g) => [g.id, g]));
    const tables: FloorTable[] = [];
    for (const unit of gameUnits) {
      if (unit.status === 'disabled') continue;
      const gameType = typeMap[unit.gameTypeId];
      if (!gameType || gameType.status !== 'active') continue;
      const session = activeSessions.find(
        (s) => String(s.game_unit_id) === unit.id && (s.status === 'active' || s.status === 'paused')
      );
      let status: TableStatus = 'available';
      if (unit.status === 'maintenance') status = 'maintenance';
      else if (session?.status === 'paused' || session?.paused_at) status = 'paused';
      else if (session) status = 'occupied';
      tables.push(session ? { unit, gameType, status, session } : { unit, gameType, status });
    }
    return tables;
  }, [gameUnits, gameTypes, activeSessions]);

  const filteredTables =
    filterTypeId === 'all'
      ? floorTables
      : floorTables.filter((t) => t.gameType.id === filterTypeId);

  const activeTypes = gameTypes.filter((g) => g.status === 'active');

  const openActions = (table: FloorTable) => {
    setPlayerName('');
    setSelected(table);
  };

  const handleStart = async () => {
    if (!selected) return;
    setStarting(true);
    setError('');
    try {
      const game_type_id = Number(selected.gameType.id);
      const game_unit_id = Number(selected.unit.id);
      if (playerName.trim()) {
        await startSessionWithPlayers({
          game_type_id,
          game_unit_id,
          players: [{ name: playerName.trim() }],
        });
      } else {
        await startSession({ game_type_id, game_unit_id });
      }
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
    navigate(`/tenant/session/${sessionId}/canteen`);
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
            Click a table to start a session or add canteen orders
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
          {activeTypes.map((g) => (
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
          <p>No tables found. Add game units from Game Units menu.</p>
        </div>
      ) : (
        <div className="table-floor-grid">
          {filteredTables.map((table) => (
            <div
              key={table.unit.id}
              className={`table-card table-card--${table.status}`}
              onClick={() => openActions(table)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openActions(table);
              }}
            >
              <button
                type="button"
                className="table-card-eye"
                title="View table details"
                aria-label={`View ${table.unit.name} details`}
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
                <span className="table-card-name">{tableDisplayName(table.gameType, table.unit)}</span>
                <span className="table-card-type">
                  <CurrencyIcon />
                  {table.unit.weekdayPrice}/hr weekday
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
            <h3>{tableDisplayName(detailTable.gameType, detailTable.unit)}</h3>
            <p className="table-modal-sub">{detailTable.gameType.name}</p>
            <ul className="table-detail-list">
              <li><span>Status</span><span>{statusLabel(detailTable.status)}</span></li>
              <li>
                <span>Weekday rate</span>
                <span><CurrencyIcon />{detailTable.unit.weekdayPrice}/hr</span>
              </li>
              <li>
                <span>Weekend rate</span>
                <span><CurrencyIcon />{detailTable.unit.weekendPrice}/hr</span>
              </li>
              {detailTable.session && (
                <>
                  <li><span>Session</span><span>#{detailTable.session.id}</span></li>
                  <li>
                    <span>Players</span>
                    <span>{detailTable.session.players?.length ?? 0}</span>
                  </li>
                </>
              )}
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
            <h3>{tableDisplayName(selected.gameType, selected.unit)}</h3>
            <p className="table-modal-sub">{selected.gameType.name}</p>

            {selected.status === 'maintenance' ? (
              <p style={{ color: 'var(--text-secondary)' }}>This table is under maintenance.</p>
            ) : selected.session ? (
              <div className="table-modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => goCanteen(selected.session!.id)}
                >
                  Add Canteen
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelected(null);
                    navigate('/tenant/sessions');
                  }}
                >
                  View Active Session
                </button>
              </div>
            ) : (
              <div className="table-modal-actions">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Player name (optional)</label>
                  <input
                    className="form-input"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Rahul"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStart}
                  disabled={starting}
                >
                  {starting ? 'Starting…' : 'Start Table'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelected(null);
                    navigate(
                      `/tenant/start-game?gameTypeId=${selected.gameType.id}&unitId=${selected.unit.id}`
                    );
                  }}
                >
                  Advanced start (more players)
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
