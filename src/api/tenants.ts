import { api } from './client';
import type {
  TenantListItem,
  CreateTenantRequest,
  UpdateTenantRequest,
} from './types';

export async function listTenants(): Promise<{ data?: TenantListItem[] }> {
  return api.get<{ data?: TenantListItem[] }>('/tenants');
}

export async function getTenant(id: number): Promise<{ data?: TenantListItem }> {
  return api.get<{ data?: TenantListItem }>(`/tenants/${id}`);
}

export async function createTenant(payload: CreateTenantRequest) {
  return api.post<{ data?: TenantListItem }>('/tenants', payload);
}

export async function updateTenant(id: number, payload: UpdateTenantRequest) {
  return api.patch<{ data?: TenantListItem }>(`/tenants/${id}`, payload);
}
