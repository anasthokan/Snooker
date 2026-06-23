import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { GameType, GameUnit } from '../../types';
import type { SessionPlayerInput } from '../../api/types';
import { listGameTypes, listGameUnits, startSession, startSessionWithPlayers } from '../../api';
import type { GameTypeItem, GameUnitItem } from '../../api/types';
import { CurrencyIcon } from '../../components/CurrencyIcon';

const STEPS = ['Game Type', 'Game Unit', 'Players', 'Start'];

function normalizeGameTypeStatus(raw?: string): GameType['status'] {
  if (!raw) return 'active';
  const value = raw.toLowerCase();
  if (value === 'inactive') return 'inactive';
  return 'active';
}

function toGameType(item: GameTypeItem): GameType {
  return {
    id: String(item.id),
    name: item.name,
    billingType: (item.billing_type as GameType['billingType']) || 'time_based',
    status: normalizeGameTypeStatus(item.status),
  };
}

function normalizeUnitStatus(raw?: string): GameUnit['status'] {
  if (!raw) return 'available';
  const value = raw.toLowerCase();
  if (value === 'maintenance') return 'maintenance';
  if (value === 'disabled') return 'disabled';
  return 'available';
}

function toGameUnit(item: GameUnitItem): GameUnit {
  return {
    id: String(item.id),
    gameTypeId: String(item.game_type_id),
    name: item.unit_name,
    weekdayPrice: item.weekday_price,
    weekendPrice: item.weekend_price,
    specialPrice: item.special_price ?? undefined,
    status: normalizeUnitStatus(item.status),
  };
}

interface PlayerRow {
  id: string;
  name: string;
  mobile: string;
  membership_id: string;
}

export default function StartGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preGameTypeId = searchParams.get('gameTypeId') ?? '';
  const preUnitId = searchParams.get('unitId') ?? '';
  const [step, setStep] = useState(preGameTypeId && preUnitId ? 2 : 0);
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [gameUnits, setGameUnits] = useState<GameUnit[]>([]);
  const [gameTypeId, setGameTypeId] = useState(preGameTypeId);
  const [unitId, setUnitId] = useState(preUnitId);
  const [players, setPlayers] = useState<PlayerRow[]>([
    { id: '1', name: '', mobile: '', membership_id: '' },
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, unitsRes] = await Promise.all([
        listGameTypes(),
        listGameUnits({ available_only: true }),
      ]);
      setGameTypes((typesRes.data ?? []).map(toGameType));
      setGameUnits((unitsRes.data ?? []).map(toGameUnit));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableUnits = gameUnits.filter(
    (u) => u.gameTypeId === gameTypeId && u.status !== 'disabled'
  );

  const addPlayer = () => {
    if (players.length >= 10) return;
    setPlayers((prev) => [
      ...prev,
      { id: String(prev.length + 1), name: '', mobile: '', membership_id: '' },
    ]);
  };

  const removePlayer = (index: number) => {
    if (players.length <= 1) return;
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: keyof PlayerRow, value: string) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const canProceed = () => {
    if (step === 0) return !!gameTypeId;
    if (step === 1) return !!unitId;
    if (step === 2) return players.some((p) => p.name.trim());
    return true;
  };

  const startSessionClick = async () => {
    const game_type_id = Number(gameTypeId);
    const game_unit_id = Number(unitId);
    if (!game_type_id || !game_unit_id) {
      setError('Please select both game type and game unit before starting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const withNames = players.filter((p) => p.name.trim());
      const playerPayload: SessionPlayerInput[] = withNames.map((p) => ({
        name: p.name.trim(),
        mobile: p.mobile.trim() || null,
        membership_id: p.membership_id.trim() || null,
      }));
      if (playerPayload.length > 0) {
        await startSessionWithPlayers({ game_type_id, game_unit_id, players: playerPayload });
      } else {
        await startSession({ game_type_id, game_unit_id });
      }
      navigate('/tenant/sessions');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-loading"><p>Loading…</p></div>;
  }

  const activeGameTypes = gameTypes.filter((g) => g.status === 'active');

  return (
    <div>
      <div className="page-header">
        <h2>Start New Game</h2>
      </div>
      {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {STEPS.map((label, i) => {
          const isActive = i === step;
          const isFuture = i > step;
          return (
            <button
              key={label}
              type="button"
              className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                if (!isFuture) {
                  setStep(i);
                }
              }}
              disabled={isFuture}
              style={{ opacity: i <= step ? 1 : 0.6 }}
            >
              {i + 1}. {label}
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <div className="kpi-card" style={{ padding: '1.5rem', maxWidth: 400 }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Select Game Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeGameTypes.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`btn ${gameTypeId === g.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textAlign: 'left' }}
                onClick={() => setGameTypeId(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="kpi-card" style={{ padding: '1.5rem', maxWidth: 400 }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Select Available Unit</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {availableUnits.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`btn ${unitId === u.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textAlign: 'left' }}
                onClick={() => setUnitId(u.id)}
              >
                {u.name} — <CurrencyIcon />
                {u.weekdayPrice} / <CurrencyIcon />
                {u.weekendPrice}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="kpi-card" style={{ padding: '1.5rem', maxWidth: 520 }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Add Players (up to 10)</h3>
          {players.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                gap: '0.75rem',
                alignItems: 'end',
                marginBottom: '1rem',
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Name *</label>
                <input
                  className="form-input"
                  value={p.name}
                  onChange={(e) => updatePlayer(i, 'name', e.target.value)}
                  placeholder="Player name"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mobile (optional)</label>
                <input
                  className="form-input"
                  value={p.mobile}
                  onChange={(e) => updatePlayer(i, 'mobile', e.target.value)}
                  placeholder="Mobile"
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removePlayer(i)}
                disabled={players.length <= 1}
              >
                Remove
              </button>
              <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                <label className="form-label">Membership ID (optional)</label>
                <input
                  className="form-input"
                  value={p.membership_id}
                  onChange={(e) => updatePlayer(i, 'membership_id', e.target.value)}
                  placeholder="Membership ID"
                />
              </div>
            </div>
          ))}
          {players.length < 10 && (
            <button type="button" className="btn btn-secondary" onClick={addPlayer}>
              + Add Player
            </button>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="kpi-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Confirm & Start</h3>
          <p>Game: {gameTypes.find((g) => g.id === gameTypeId)?.name}</p>
          <p>Unit: {gameUnits.find((u) => u.id === unitId)?.name}</p>
          <p>Players: {players.filter((p) => p.name.trim()).length}</p>
          <button type="button" className="btn btn-primary" onClick={startSessionClick} disabled={submitting}>
            {submitting ? 'Starting…' : 'Start Session'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
        {step > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < 3 && (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
