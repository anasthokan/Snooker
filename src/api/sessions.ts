import { api } from './client';
import type {
  SessionItem,
  StartSessionRequest,
  StartSessionWithPlayersRequest,
  AddPlayerRequest,
  PauseResumeEndRequest,
} from './types';

function normalizeSession(raw: any): SessionItem {
  return {
    id: raw.id,
    game_type_id: raw.game_type_id,
    game_unit_id: raw.game_unit_id ?? raw.game_units_id,
    status: raw.status,
    started_at: raw.started_at ?? raw.start_time,
    ended_at: raw.ended_at ?? raw.end_time,
    paused_at: raw.paused_at ?? raw.pause_time ?? null,
    game_type_name: raw.game_type_name,
    game_unit_name: raw.game_unit_name,
    players: raw.players,
    orders: raw.orders,
  };
}

export async function listSessions(params?: { status?: string }): Promise<{ data?: SessionItem[] }> {
  const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
  const res = await api.get<{ data?: any[] }>(`/sessions${qs}`);
  return {
    ...res,
    data: Array.isArray(res.data) ? res.data.map((s) => normalizeSession(s)) : undefined,
  };
}

export async function getSession(id: number): Promise<{ data?: SessionItem }> {
  const res = await api.get<{ data?: any }>(`/sessions/${id}`);
  return {
    ...res,
    data: res.data ? normalizeSession(res.data) : undefined,
  };
}

export async function startSession(payload: StartSessionRequest) {
  return api.post<{ data?: SessionItem }>('/sessions/start', payload);
}

export async function startSessionWithPlayers(payload: StartSessionWithPlayersRequest) {
  return api.post<{ data?: SessionItem }>('/sessions/start-with-players', payload);
}

export async function addPlayer(payload: AddPlayerRequest) {
  return api.post<{ data?: unknown }>('/sessions/players', payload);
}

export async function pauseSession(payload: PauseResumeEndRequest) {
  return api.post<{ data?: SessionItem }>('/sessions/pause', payload);
}

export async function resumeSession(payload: PauseResumeEndRequest) {
  return api.post<{ data?: SessionItem }>('/sessions/resume', payload);
}

export async function endSession(payload: PauseResumeEndRequest) {
  return api.post<{ data?: SessionItem }>('/sessions/end', payload);
}
