import { api } from './client';
import type {
  GameTypeItem,
  GameUnitItem,
  CreateGameTypeRequest,
  UpdateGameTypeRequest,
  CreateGameUnitRequest,
  UpdateGameUnitRequest,
} from './types';

// —— Game Types ——
export async function listGameTypes(): Promise<{ data?: GameTypeItem[] }> {
  return api.get<{ data?: GameTypeItem[] }>('/games/types');
}

export async function getGameType(id: number): Promise<{ data?: GameTypeItem }> {
  return api.get<{ data?: GameTypeItem }>(`/games/types/${id}`);
}

export async function createGameType(payload: CreateGameTypeRequest) {
  return api.post<{ data?: GameTypeItem }>('/games/types', payload);
}

export async function updateGameType(id: number, payload: UpdateGameTypeRequest) {
  return api.patch<{ data?: GameTypeItem }>(`/games/types/${id}`, payload);
}

// —— Game Units ——
export async function listGameUnits(params?: {
  game_type_id?: number;
  available_only?: boolean;
  skip?: number;
  limit?: number;
}): Promise<{ data?: GameUnitItem[] }> {
  const search = new URLSearchParams();
  if (params?.game_type_id != null) search.set('game_type_id', String(params.game_type_id));
  if (params?.available_only === true) search.set('available_only', 'true');
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString() ? `?${search.toString()}` : '';
  return api.get<{ data?: GameUnitItem[] }>(`/games/units${qs}`);
}

export async function getGameUnit(id: number): Promise<{ data?: GameUnitItem }> {
  return api.get<{ data?: GameUnitItem }>(`/games/units/${id}`);
}

export async function createGameUnit(payload: CreateGameUnitRequest) {
  return api.post<{ data?: GameUnitItem }>('/games/units', payload);
}

export async function updateGameUnit(id: number, payload: UpdateGameUnitRequest) {
  return api.patch<{ data?: GameUnitItem }>(`/games/units/${id}`, payload);
}

export async function deleteGameUnit(id: number) {
  return api.delete<{ data?: unknown }>(`/games/units/${id}`);
}
