import { api } from './client';
import type { CreatePaymentRequest, SplitPaymentRequest } from './types';

export async function createPayment(payload: CreatePaymentRequest) {
  return api.post<{ data?: unknown }>('/payments', payload);
}

export async function splitPayment(payload: SplitPaymentRequest) {
  return api.post<{ data?: unknown }>('/payments/split', payload);
}

export async function listPaymentsBySession(sessionId: number): Promise<{ data?: unknown[] }> {
  return api.get<{ data?: unknown[] }>(`/payments/session/${sessionId}`);
}
