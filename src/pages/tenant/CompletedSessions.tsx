import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { listSessions, listGameTypes, listGameUnits } from '../../api';
import type { SessionItem, GameTypeItem, GameUnitItem } from '../../api/types';
import type { CompletedSession } from '../../types';

const STORAGE_KEY = 'gamehub_completed_sessions';
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

function loadCompletedSessions(): CompletedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatDurationMs(startedAt: string | undefined, endedAt: string | undefined): string {
  if (!startedAt || !endedAt) return '–';
  const s = new Date(startedAt).getTime();
  const e = new Date(endedAt).getTime();
  const mins = Math.round((e - s) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CompletedSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [gameTypes, setGameTypes] = useState<GameTypeItem[]>([]);
  const [gameUnits, setGameUnits] = useState<GameUnitItem[]>([]);
  const [localCompleted, setLocalCompleted] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState<string>('');
  const [unitFilter, setUnitFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sessRes, typesRes, unitsRes] = await Promise.all([
        listSessions({ status: 'ended' }),
        listGameTypes(),
        listGameUnits(),
      ]);
      setSessions(sessRes.data ?? []);
      setGameTypes(typesRes.data ?? []);
      setGameUnits(unitsRes.data ?? []);
      setLocalCompleted(loadCompletedSessions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load completed sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getGameTypeName = (s: SessionItem) => {
    if (s.game_type_name) return s.game_type_name;
    const fromTypes = gameTypes.find((g) => g.id === s.game_type_id);
    if (fromTypes) return fromTypes.name;
    const local = localCompleted.find((c) => Number(c.id) === s.id);
    return local?.gameTypeName ?? '–';
  };

  const getGameUnitName = (s: SessionItem) => {
    if (s.game_unit_name) return s.game_unit_name;
    const fromUnits = gameUnits.find((u) => u.id === s.game_unit_id);
    if (fromUnits) return fromUnits.unit_name;
    const local = localCompleted.find((c) => Number(c.id) === s.id);
    return local?.unitName ?? '–';
  };

  const getPlayerCount = (s: SessionItem) => {
    if (Array.isArray(s.players)) return s.players.length;
    const local = localCompleted.find((c) => Number(c.id) === s.id);
    return local?.playerCount ?? 0;
  };

  const filteredSessions = useMemo(() => {
    let list = [...sessions].reverse();
    const q = search.trim().toLowerCase();

    const resolveGameName = (s: SessionItem) => {
      if (s.game_type_name) return s.game_type_name;
      const t = gameTypes.find((g) => g.id === s.game_type_id);
      if (t) return t.name;
      const local = localCompleted.find((c) => Number(c.id) === s.id);
      return local?.gameTypeName ?? '–';
    };
    const resolveUnitName = (s: SessionItem) => {
      if (s.game_unit_name) return s.game_unit_name;
      const u = gameUnits.find((x) => x.id === s.game_unit_id);
      if (u) return u.unit_name;
      const local = localCompleted.find((c) => Number(c.id) === s.id);
      return local?.unitName ?? '–';
    };

    if (q) {
      list = list.filter((s) => {
        const gameName = resolveGameName(s).toLowerCase();
        const unitName = resolveUnitName(s).toLowerCase();
        const idStr = String(s.id);
        return idStr.includes(q) || gameName.includes(q) || unitName.includes(q);
      });
    }
    if (gameTypeFilter) {
      list = list.filter((s) => String(s.game_type_id) === gameTypeFilter);
    }
    if (unitFilter) {
      list = list.filter((s) => String(s.game_unit_id) === unitFilter);
    }
    if (dateFrom) {
      const fromMs = new Date(dateFrom).setHours(0, 0, 0, 0);
      list = list.filter((s) => {
        const started = s.started_at ? new Date(s.started_at).getTime() : 0;
        return started >= fromMs;
      });
    }
    if (dateTo) {
      const toMs = new Date(dateTo).setHours(23, 59, 59, 999);
      list = list.filter((s) => {
        const ended = s.ended_at ? new Date(s.ended_at).getTime() : 0;
        return ended <= toMs;
      });
    }
    return list;
  }, [sessions, search, gameTypeFilter, unitFilter, dateFrom, dateTo, gameTypes, gameUnits, localCompleted]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / itemsPerPage));
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(start, start + itemsPerPage);
  }, [filteredSessions, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, gameTypeFilter, unitFilter, dateFrom, dateTo, itemsPerPage]);

  const clearFilters = () => {
    setSearch('');
    setGameTypeFilter('');
    setUnitFilter('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = search || gameTypeFilter || unitFilter || dateFrom || dateTo;

  return (
    <div>
      <div className="page-header">
        <h2>Completed Sessions</h2>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {loading ? (
        <div className="kpi-card" style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="kpi-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No completed sessions. End a session from Active Sessions to see it here.
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <input
              type="search"
              className="form-input filter-search"
              placeholder="Search by ID, game, or unit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-input filter-select"
              value={gameTypeFilter}
              onChange={(e) => setGameTypeFilter(e.target.value)}
            >
              <option value="">All games</option>
              {gameTypes.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <select
              className="form-input filter-select"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="">All units</option>
              {gameUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.unit_name}</option>
              ))}
            </select>
            <input
              type="date"
              className="form-input filter-date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
            />
            <input
              type="date"
              className="form-input filter-date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
            />
            {hasActiveFilters && (
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Started</th>
                  <th>Ended</th>
                  <th>Game</th>
                  <th>Unit</th>
                  <th>Players</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paginatedSessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/tenant/completed-sessions/${s.id}`} className="link">
                        {s.id}
                      </Link>
                    </td>
                    <td>{s.started_at ? format(new Date(s.started_at), 'dd MMM yyyy, HH:mm') : '–'}</td>
                    <td>{s.ended_at ? format(new Date(s.ended_at), 'dd MMM yyyy, HH:mm') : '–'}</td>
                    <td>{getGameTypeName(s)}</td>
                    <td>{getGameUnitName(s)}</td>
                    <td>{getPlayerCount(s)}</td>
                    <td>{formatDurationMs(s.started_at, s.ended_at)}</td>
                    <td>{s.status}</td>
                    <td>
                      <Link to={`/tenant/completed-sessions/${s.id}`} className="btn btn-ghost btn-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(filteredSessions.length === 0 && hasActiveFilters) && (
            <div className="kpi-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              No sessions match your filters. Try adjusting or clearing them.
            </div>
          )}

          <div className="pagination-bar">
            <div className="pagination-info">
              {filteredSessions.length === 0
                ? 'No sessions'
                : `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredSessions.length)} of ${filteredSessions.length}`}
            </div>
            <div className="pagination-controls">
              <select
                className="form-input pagination-per-page"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="pagination-page">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { STORAGE_KEY, loadCompletedSessions };
