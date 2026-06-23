import { api } from './client';
import type {
  CustomerItem,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './types';

export async function listCustomers(params?: {
  skip?: number;
  limit?: number;
}): Promise<{ data?: CustomerItem[] }> {
  const search = new URLSearchParams();
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString() ? `?${search.toString()}` : '';
  return api.get<{ data?: CustomerItem[] }>(`/customers${qs}`);
}

export async function getCustomer(id: number): Promise<{ data?: CustomerItem }> {
  return api.get<{ data?: CustomerItem }>(`/customers/${id}`);
}

export async function createCustomer(payload: CreateCustomerRequest) {
  return api.post<{ data?: CustomerItem }>('/customers', payload);
}

export async function updateCustomer(id: number, payload: UpdateCustomerRequest) {
  return api.put<{ data?: CustomerItem }>(`/customers/${id}`, payload);
}

export async function deleteCustomer(id: number) {
  return api.delete<{ data?: unknown }>(`/customers/${id}`);
}
