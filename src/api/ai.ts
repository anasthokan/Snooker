import { api } from './client';
import type { AIQuery } from './types';

function queryString(params: AIQuery): string {
  const q = new URLSearchParams();
  q.set('start_date', params.start_date);
  q.set('end_date', params.end_date);
  if (params.limit != null) q.set('limit', String(params.limit));
  return `?${q.toString()}`;
}

export async function getAISessions(params: AIQuery) {
  return api.get<{ data?: unknown }>(`/ai/sessions${queryString(params)}`);
}

export async function getAIRevenue(params: AIQuery) {
  return api.get<{ data?: unknown }>(`/ai/revenue${queryString(params)}`);
}

export async function getAIPlayers(params: AIQuery) {
  return api.get<{ data?: unknown }>(`/ai/players${queryString(params)}`);
}
