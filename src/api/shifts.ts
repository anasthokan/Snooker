import { api } from './client';
import type { ShiftItem, CloseShiftRequest } from './types';

export async function startShift() {
  return api.post<{ data?: ShiftItem }>('/shifts/start', undefined);
}

export async function closeShift(payload: CloseShiftRequest) {
  return api.post<{ data?: ShiftItem }>('/shifts/close', payload);
}

export async function getCurrentShift(): Promise<{ data?: ShiftItem }> {
  return api.get<{ data?: ShiftItem }>('/shifts/current');
}

export async function listShifts(): Promise<{ data?: ShiftItem[] }> {
  return api.get<{ data?: ShiftItem[] }>('/shifts');
}

