export type TournamentMode = 'single' | 'double';

export interface Competitor {
  id: string;
  label: string;
  members: string[];
}

export interface BracketMatch {
  id: string;
  roundIndex: number;
  matchIndex: number;
  slotA: Competitor | null;
  slotB: Competitor | null;
  winnerId: string | null;
  isBye: boolean;
}

export interface TournamentState {
  id: string;
  mode: TournamentMode;
  name: string;
  rounds: BracketMatch[][];
  createdAt: string;
  championId: string | null;
}

const STORAGE_KEY = 'gamehub_keep_tournament';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function parseNames(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildCompetitors(names: string[], mode: TournamentMode): Competitor[] {
  if (mode === 'single') {
    return shuffle(names).map((name) => ({
      id: uid(),
      label: name,
      members: [name],
    }));
  }
  const teams: Competitor[] = [];
  for (let i = 0; i < names.length; i += 2) {
    const a = names[i];
    const b = names[i + 1];
    if (!b) {
      teams.push({ id: uid(), label: a, members: [a] });
    } else {
      teams.push({
        id: uid(),
        label: `${a} & ${b}`,
        members: [a, b],
      });
    }
  }
  return teams;
}

function createByeCompetitor(): Competitor {
  return { id: `bye-${uid()}`, label: 'BYE', members: [] };
}

function emptyBracketRounds(slotCount: number): BracketMatch[][] {
  const rounds: BracketMatch[][] = [];
  let matchesInRound = slotCount / 2;
  let roundIndex = 0;
  while (matchesInRound >= 1) {
    const round: BracketMatch[] = [];
    for (let i = 0; i < matchesInRound; i++) {
      round.push({
        id: uid(),
        roundIndex,
        matchIndex: i,
        slotA: null,
        slotB: null,
        winnerId: null,
        isBye: false,
      });
    }
    rounds.push(round);
    matchesInRound /= 2;
    roundIndex++;
  }
  return rounds;
}

function autoAdvanceByes(rounds: BracketMatch[][]): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const round of rounds) {
      for (const match of round) {
        if (match.winnerId) continue;
        const a = match.slotA;
        const b = match.slotB;
        if (!a || !b) continue;
        if (a.label === 'BYE' && b.label !== 'BYE') {
          match.winnerId = b.id;
          match.isBye = true;
          propagateWinner(rounds, match);
          changed = true;
        } else if (b.label === 'BYE' && a.label !== 'BYE') {
          match.winnerId = a.id;
          match.isBye = true;
          propagateWinner(rounds, match);
          changed = true;
        }
      }
    }
  }
}

function resolveChampion(rounds: BracketMatch[][]): string | null {
  const final = rounds[rounds.length - 1]?.[0];
  if (!final?.winnerId || !final.slotA || !final.slotB) return null;
  return final.winnerId;
}

function rebuildBracket(rounds: BracketMatch[][]): void {
  for (const round of rounds) {
    for (const match of round) {
      if (match.winnerId && (!match.slotA || !match.slotB)) {
        match.winnerId = null;
        match.isBye = false;
      }
    }
  }

  for (let r = 1; r < rounds.length; r++) {
    for (const match of rounds[r]) {
      match.slotA = null;
      match.slotB = null;
    }
  }

  for (let r = 0; r < rounds.length - 1; r++) {
    for (const match of rounds[r]) {
      if (match.winnerId && match.slotA && match.slotB) {
        propagateWinner(rounds, match);
      }
    }
  }

  const final = rounds[rounds.length - 1]?.[0];
  if (final?.winnerId && (!final.slotA || !final.slotB)) {
    final.winnerId = null;
    final.isBye = false;
  }
}

function repairTournament(tournament: TournamentState): TournamentState {
  const rounds = tournament.rounds.map((round) =>
    round.map((m) => ({
      ...m,
      slotA: m.slotA ? { ...m.slotA } : null,
      slotB: m.slotB ? { ...m.slotB } : null,
    }))
  );
  rebuildBracket(rounds);
  autoAdvanceByes(rounds);
  return { ...tournament, rounds, championId: resolveChampion(rounds) };
}

function propagateWinner(rounds: BracketMatch[][], match: BracketMatch) {
  const nextRound = match.roundIndex + 1;
  if (nextRound >= rounds.length || !match.winnerId) return;
  const nextMatchIdx = Math.floor(match.matchIndex / 2);
  const nextMatch = rounds[nextRound][nextMatchIdx];
  const winner = getCompetitorFromMatch(match, match.winnerId);
  if (!winner) return;
  if (match.matchIndex % 2 === 0) {
    nextMatch.slotA = winner;
  } else {
    nextMatch.slotB = winner;
  }
}

function getCompetitorFromMatch(match: BracketMatch, id: string): Competitor | null {
  if (match.slotA?.id === id) return match.slotA;
  if (match.slotB?.id === id) return match.slotB;
  return null;
}

export function createTournament(
  rawNames: string,
  mode: TournamentMode,
  name = 'Tournament'
): { tournament: TournamentState; error?: string } {
  const names = parseNames(rawNames);
  if (names.length < 2) {
    return { tournament: null as unknown as TournamentState, error: 'Enter at least 2 players.' };
  }
  if (mode === 'double' && names.length < 4) {
    return {
      tournament: null as unknown as TournamentState,
      error: 'Double player tournament needs at least 4 players (2 teams).',
    };
  }

  let competitors = buildCompetitors(names, mode);
  const bracketSize = nextPowerOfTwo(competitors.length);
  while (competitors.length < bracketSize) {
    competitors.push(createByeCompetitor());
  }
  competitors = shuffle(competitors);

  const rounds = emptyBracketRounds(bracketSize);
  const round0 = rounds[0];
  for (let i = 0; i < round0.length; i++) {
    round0[i].slotA = competitors[i * 2];
    round0[i].slotB = competitors[i * 2 + 1];
  }

  autoAdvanceByes(rounds);

  const tournament: TournamentState = {
    id: uid(),
    mode,
    name,
    rounds,
    createdAt: new Date().toISOString(),
    championId: resolveChampion(rounds),
  };
  return { tournament };
}

export function setMatchWinner(
  tournament: TournamentState,
  matchId: string,
  winnerId: string
): TournamentState {
  const rounds = tournament.rounds.map((round) =>
    round.map((m) => ({ ...m, slotA: m.slotA, slotB: m.slotB }))
  );

  let target: BracketMatch | null = null;
  for (const round of rounds) {
    const found = round.find((m) => m.id === matchId);
    if (found) {
      target = found;
      break;
    }
  }
  if (!target) return tournament;
  if (target.slotA?.id !== winnerId && target.slotB?.id !== winnerId) return tournament;

  target.winnerId = winnerId;
  propagateWinner(rounds, target);
  autoAdvanceByes(rounds);

  return { ...tournament, rounds, championId: resolveChampion(rounds) };
}

export function getCurrentRoundIndex(tournament: TournamentState): number {
  for (let i = 0; i < tournament.rounds.length; i++) {
    const incomplete = tournament.rounds[i].some(
      (m) => m.slotA && m.slotB && !m.winnerId && m.slotA.label !== 'BYE' && m.slotB.label !== 'BYE'
    );
    if (incomplete) return i;
  }
  return tournament.rounds.length - 1;
}

export function isMatchDecided(match: BracketMatch): boolean {
  return !!(match.winnerId && match.slotA && match.slotB);
}

export function canPickWinner(match: BracketMatch): boolean {
  return !!(
    match.slotA &&
    match.slotB &&
    !match.winnerId &&
    match.slotA.label !== 'BYE' &&
    match.slotB.label !== 'BYE'
  );
}

export function getNextMatch(tournament: TournamentState): BracketMatch | null {
  for (const round of tournament.rounds) {
    for (const match of round) {
      if (
        match.slotA &&
        match.slotB &&
        !match.winnerId &&
        match.slotA.label !== 'BYE' &&
        match.slotB.label !== 'BYE'
      ) {
        return match;
      }
    }
  }
  return null;
}

export function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromFinal = totalRounds - 1 - roundIndex;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semi Final';
  if (fromFinal === 2) return 'Quarter Final';
  return `Round ${roundIndex + 1}`;
}

export function competitorCountLabel(mode: TournamentMode, playerCount: number): string {
  if (mode === 'single') return `${playerCount} players`;
  const teams = Math.ceil(playerCount / 2);
  return `${playerCount} players · ${teams} teams`;
}

export function loadTournament(): TournamentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const tournament = JSON.parse(raw) as TournamentState;
    const repaired = repairTournament(tournament);
    saveTournament(repaired);
    return repaired;
  } catch {
    return null;
  }
}

export function saveTournament(tournament: TournamentState | null) {
  if (!tournament) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
}

export function getChampion(tournament: TournamentState): Competitor | null {
  if (!tournament.championId) return null;
  for (const round of tournament.rounds) {
    for (const match of round) {
      if (match.winnerId === tournament.championId) {
        return getCompetitorFromMatch(match, tournament.championId);
      }
      if (match.slotA?.id === tournament.championId) return match.slotA;
      if (match.slotB?.id === tournament.championId) return match.slotB;
    }
  }
  return null;
}
