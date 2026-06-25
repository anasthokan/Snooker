import { useEffect, useMemo, useState } from 'react';
import {
  canPickWinner,
  competitorCountLabel,
  createTournament,
  getChampion,
  getCurrentRoundIndex,
  getNextMatch,
  isMatchDecided,
  loadTournament,
  roundLabel,
  saveTournament,
  setMatchWinner,
  type TournamentMode,
  type TournamentState,
} from '../../utils/tournament';
import './KeepTournamentGoing.css';

function matchLabel(match: { slotA: { label: string } | null; slotB: { label: string } | null }) {
  const a = match.slotA?.label ?? 'TBD';
  const b = match.slotB?.label ?? 'TBD';
  return `${a} vs ${b}`;
}

export default function KeepTournamentGoing() {
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [mode, setMode] = useState<TournamentMode>('single');
  const [namesText, setNamesText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setTournament(loadTournament());
  }, []);

  const nextMatch = useMemo(
    () => (tournament ? getNextMatch(tournament) : null),
    [tournament]
  );

  const currentRound = useMemo(
    () => (tournament ? getCurrentRoundIndex(tournament) : 0),
    [tournament]
  );

  const champion = useMemo(
    () => (tournament?.championId ? getChampion(tournament) : null),
    [tournament]
  );

  const playerCount = namesText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  const persist = (next: TournamentState | null) => {
    setTournament(next);
    saveTournament(next);
  };

  const handleStart = () => {
    setError('');
    const { tournament: created, error: err } = createTournament(namesText, mode);
    if (err || !created) {
      setError(err ?? 'Could not start tournament.');
      return;
    }
    persist(created);
  };

  const handleWinner = (matchId: string, winnerId: string) => {
    if (!tournament) return;
    persist(setMatchWinner(tournament, matchId, winnerId));
  };

  const handleReset = () => {
    if (!window.confirm('Start a new tournament? Current progress will be cleared.')) return;
    persist(null);
    setNamesText('');
    setError('');
  };

  if (!tournament) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h2>Tournaments</h2>
            <p className="tournament-hint">
              Enter player names, pick single or double, then draw random first-round matches.
              Winners advance round by round until one champion remains.
            </p>
          </div>
        </div>

        {error && <div className="toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="kpi-card tournament-setup-card">
          <h3 className="section-title">Tournament type</h3>
          <div className="tournament-mode-toggle" style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`btn ${mode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('single')}
            >
              Single Player
            </button>
            <button
              type="button"
              className={`btn ${mode === 'double' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('double')}
            >
              Double Player
            </button>
          </div>
          <p className="tournament-hint" style={{ marginBottom: '1rem' }}>
            {mode === 'single'
              ? 'Each player is one team (1 vs 1 matches).'
              : 'Every two players form one team (e.g. Player1 & Player2 vs Player3 & Player4).'}
          </p>

          <div className="form-group">
            <label className="form-label">Player names</label>
            <textarea
              className="form-input tournament-names-input"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder={'Player1\nPlayer2\nPlayer3\nPlayer4\n…\n(one name per line)'}
            />
            <p className="tournament-hint">
              {playerCount > 0
                ? competitorCountLabel(mode, playerCount)
                : 'Tip: 8, 16, or 32 players work best for a clean bracket.'}
            </p>
          </div>

          <button type="button" className="btn btn-primary" onClick={handleStart}>
            Draw Random Matches &amp; Start
          </button>
        </div>
      </div>
    );
  }

  const totalRounds = tournament.rounds.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Tournaments</h2>
          <p className="tournament-hint">
            {tournament.mode === 'single' ? 'Single player' : 'Double player'} knockout ·{' '}
            {roundLabel(currentRound, totalRounds)}
          </p>
        </div>
        <div className="tournament-toolbar">
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            New Tournament
          </button>
        </div>
      </div>

      {champion && (
        <div className="kpi-card tournament-champion" style={{ marginBottom: '1.25rem' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Champion</p>
          <p className="tournament-champion-name">{champion.label}</p>
        </div>
      )}

      {nextMatch && !champion && (
        <div className="kpi-card tournament-now-playing" style={{ marginBottom: '1.25rem' }}>
          <h3>Now Playing</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {roundLabel(nextMatch.roundIndex, totalRounds)} · Match {nextMatch.matchIndex + 1}
          </p>
          <div className="tournament-matchup">
            <span>{nextMatch.slotA?.label}</span>
            <span className="tournament-vs">vs</span>
            <span>{nextMatch.slotB?.label}</span>
          </div>
          <div className="tournament-winner-actions">
            {nextMatch.slotA && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleWinner(nextMatch.id, nextMatch.slotA!.id)}
              >
                {nextMatch.slotA.label} wins
              </button>
            )}
            {nextMatch.slotB && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleWinner(nextMatch.id, nextMatch.slotB!.id)}
              >
                {nextMatch.slotB.label} wins
              </button>
            )}
          </div>
        </div>
      )}

      <div className="tournament-rounds">
        {tournament.rounds.map((round, roundIdx) => (
          <div key={roundIdx}>
            <h3 className="tournament-round-title">{roundLabel(roundIdx, totalRounds)}</h3>
            <div className="tournament-match-list">
              {round.map((match) => {
                if (!match.slotA && !match.slotB) return null;
                const isCurrent = nextMatch?.id === match.id;
                const isDone = isMatchDecided(match);
                const winner =
                  match.winnerId === match.slotA?.id
                    ? match.slotA?.label
                    : match.winnerId === match.slotB?.id
                      ? match.slotB?.label
                      : null;

                return (
                  <div
                    key={match.id}
                    className={`tournament-match-row${isCurrent ? ' tournament-match-row--current' : ''}${isDone ? ' tournament-match-row--done' : ''}`}
                  >
                    <span className="tournament-match-label">{matchLabel(match)}</span>
                    {isDone && winner ? (
                      <span className="tournament-match-winner">{winner} won</span>
                    ) : canPickWinner(match) ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleWinner(match.id, match.slotA!.id)}
                        >
                          {match.slotA!.label}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleWinner(match.id, match.slotB!.id)}
                        >
                          {match.slotB!.label}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>TBD</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
