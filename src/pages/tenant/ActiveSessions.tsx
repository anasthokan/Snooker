import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ActiveSession } from '../../types';
import { listSessions, listGameTypes, listGameUnits, pauseSession, resumeSession, ApiError } from '../../api';
import type { SessionItem, GameTypeItem, GameUnitItem } from '../../api/types';

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
}

function toActiveSession(
  s: SessionItem,
  gameTypes: GameTypeItem[],
  gameUnits: GameUnitItem[]
): ActiveSession {
  const gameType = gameTypes.find((g) => g.id === s.game_type_id);
  const gameUnit = gameUnits.find((u) => u.id === s.game_unit_id);
  const startedAt = s.started_at ?? new Date().toISOString();
  const players = (s.players ?? []).map((p) => ({
    id: String(p.id),
    name: p.name,
    mobile: p.mobile ?? undefined,
    membershipId: p.membership_id ?? undefined,
    canteenItems: [],
  }));
  return {
    id: String(s.id),
    gameTypeId: String(s.game_type_id),
    gameTypeName: s.game_type_name ?? gameType?.name ?? '',
    unitId: String(s.game_unit_id),
    unitName: s.game_unit_name ?? gameUnit?.unit_name ?? '',
    players,
    startedAt,
    pausedAt: s.paused_at ?? undefined,
    isPaused: !!s.paused_at,
  };
}

function getPausedElapsedSeconds(session: ActiveSession): number {
  if (!session.isPaused || !session.pausedAt) return 0;
  const start = new Date(session.startedAt).getTime();
  const paused = new Date(session.pausedAt).getTime();
  return Math.max(0, Math.floor((paused - start) / 1000));
}

function SessionCard({
  session,
  onPauseResume,
}: {
  session: ActiveSession;
  onPauseResume: (action: 'pause' | 'resume') => Promise<void>;
}) {
  const [isPaused, setPaused] = useState(session.isPaused);
  const [pausedAtSeconds, setPausedAtSeconds] = useState(() => getPausedElapsedSeconds(session));
  const [effectiveStartMs, setEffectiveStartMs] = useState(() => new Date(session.startedAt).getTime());
  const [displaySeconds, setDisplaySeconds] = useState(() =>
    session.isPaused ? getPausedElapsedSeconds(session) : Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
  );
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) setDisplaySeconds(pausedAtSeconds);
      else setDisplaySeconds(Math.floor((Date.now() - effectiveStartMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, pausedAtSeconds, effectiveStartMs]);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    setActionError('');
    try {
      await onPauseResume(isPaused ? 'resume' : 'pause');
      if (isPaused) {
        setEffectiveStartMs(Date.now() - pausedAtSeconds * 1000);
        setPaused(false);
      } else {
        const elapsed = Math.floor((Date.now() - effectiveStartMs) / 1000);
        setPausedAtSeconds(elapsed);
        setDisplaySeconds(elapsed);
        setPaused(true);
      }
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body != null && typeof e.body === 'object' && 'detail' in (e.body as object)
          ? String((e.body as { detail: unknown }).detail)
          : e instanceof Error
            ? e.message
            : 'Pause / Resume failed';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kpi-card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div>
        <div style={{ fontSize: '2rem', fontVariantNumeric: 'tabular-nums', marginBottom: '0.5rem' }}>
          {formatTime(displaySeconds)}
        </div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {session.gameTypeName} — {session.unitName}
        </div>
        {actionError && (
          <div className="toast-error" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>{actionError}</div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={handleToggle} disabled={loading}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <Link to={`/tenant/session/${session.id}/canteen`} className="btn btn-ghost">Add Canteen</Link>
          <Link to={`/tenant/session/${session.id}/end`} className="btn btn-primary">End Session</Link>
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Players</div>
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {session.players.map((p) => (
            <li key={p.id}>{p.name} {p.mobile ? `(${p.mobile})` : ''}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sessRes, typesRes, unitsRes] = await Promise.all([
        listSessions(),
        listGameTypes(),
        listGameUnits(),
      ]);
      const types = typesRes.data ?? [];
      const units = unitsRes.data ?? [];
      const list = (sessRes.data ?? [])
        .filter((s) => {
          const status = (s.status ?? '').toLowerCase();
          return status === 'active' || status === 'paused';
        })
        .map((s) => toActiveSession(s, types, units));
      setSessions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePauseResume = useCallback(async (sessionId: string, action: 'pause' | 'resume') => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const id = Number(sessionId);
    if (!Number.isInteger(id) || id < 1) return;
    if (action === 'resume') {
      await resumeSession({ session_id: id });
    } else {
      await pauseSession({ session_id: id });
    }
    // Don't reload list here so SessionCard keeps timer state (pause = stop tick, resume = continue from frozen time)
  }, [sessions]);

  return (
    <div>
      <div className="page-header">
        <h2>Active Sessions</h2>
        <Link to="/tenant/start-game" className="btn btn-primary">Start New Game</Link>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {loading ? (
        <div className="kpi-card" style={{ padding: '2rem', textAlign: 'center' }}>Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="kpi-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No active sessions. <Link to="/tenant/start-game">Start a game</Link>.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onPauseResume={(action) => handlePauseResume(session.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
