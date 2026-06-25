import { api } from './client';
import type {
  RepaymentItem,
  CreateRepaymentRequest,
  UpdateRepaymentRequest,
  RepaymentCategory,
} from './types';

export async function listRepayments(params?: {
  start_date?: string;
  end_date?: string;
  category?: RepaymentCategory;
  skip?: number;
  limit?: number;
}): Promise<{ data?: RepaymentItem[] }> {
  const search = new URLSearchParams();
  if (params?.start_date) search.set('start_date', params.start_date);
  if (params?.end_date) search.set('end_date', params.end_date);
  if (params?.category) search.set('category', params.category);
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString() ? `?${search.toString()}` : '';
  return api.get<{ data?: RepaymentItem[] }>(`/repayments${qs}`);
}

export async function getRepayment(id: number): Promise<{ data?: RepaymentItem }> {
  return api.get<{ data?: RepaymentItem }>(`/repayments/${id}`);
}

export async function createRepayment(payload: CreateRepaymentRequest) {
  return api.post<{ data?: RepaymentItem }>('/repayments', payload);
}

export async function updateRepayment(id: number, payload: UpdateRepaymentRequest) {
  return api.patch<{ data?: RepaymentItem }>(`/repayments/${id}`, payload);
}

export async function deleteRepayment(id: number) {
  return api.delete<{ data?: null }>(`/repayments/${id}`);
}
