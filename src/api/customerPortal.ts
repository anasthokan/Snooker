import { api } from './client';
import { setAccessToken, setRefreshToken } from './config';

export interface CustomerPortalConfig {
  tenant_id: number;
  tenant_name: string;
}

export interface CustomerParlour {
  id: number;
  name: string;
}

export interface CustomerAuthData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  customer: {
    id: number;
    name: string;
    mobile?: string | null;
    email?: string | null;
    tenant_id: number;
  };
}

export interface CustomerTableItem {
  unit_id: number;
  game_type_id: number;
  game_type_name: string;
  unit_name: string;
  weekday_price: number;
  weekend_price: number;
  status: 'available' | 'occupied' | 'paused' | 'maintenance';
  session_id?: number | null;
}

export interface CustomerFloorData {
  tenant_name: string;
  tables: CustomerTableItem[];
}

export async function listCustomerParlours() {
  return api.get<{ data?: CustomerParlour[] }>('/public/customer/tenants', { skipAuth: true });
}

export async function getCustomerPortalConfig(tenantId?: number) {
  const query = tenantId != null ? `?tenant_id=${tenantId}` : '';
  return api.get<{ data?: CustomerPortalConfig }>(`/public/customer/config${query}`, {
    skipAuth: true,
  });
}

export async function getCustomerPortalConfigByName(name: string) {
  return api.get<{ data?: CustomerPortalConfig }>(
    `/public/customer/config?name=${encodeURIComponent(name)}`,
    { skipAuth: true }
  );
}

export async function customerSignup(payload: {
  tenant_id?: number;
  name: string;
  mobile: string;
  password: string;
  email?: string;
}) {
  const res = await api.post<{ data?: CustomerAuthData }>('/public/customer/signup', payload, {
    skipAuth: true,
  });
  if (res.data?.access_token) setAccessToken(res.data.access_token);
  if (res.data?.refresh_token) setRefreshToken(res.data.refresh_token);
  return res;
}

export async function customerLogin(payload: {
  tenant_id?: number;
  mobile: string;
  password: string;
}) {
  const res = await api.post<{ data?: CustomerAuthData }>('/public/customer/login', payload, {
    skipAuth: true,
  });
  if (res.data?.access_token) setAccessToken(res.data.access_token);
  if (res.data?.refresh_token) setRefreshToken(res.data.refresh_token);
  return res;
}

export async function getCustomerTables() {
  return api.get<{ data?: CustomerFloorData }>('/public/customer/tables');
}

export async function getCustomerMe() {
  return api.get<{ data?: CustomerAuthData['customer'] }>('/public/customer/me');
}

export async function customerStartSession(game_type_id: number, game_unit_id: number) {
  return api.post<{ data?: { session_id: number } }>('/public/customer/sessions/start', {
    game_type_id,
    game_unit_id,
  });
}

export async function getCustomerSession(sessionId: number) {
  return api.get<{ data?: Record<string, unknown> }>(`/public/customer/sessions/${sessionId}`);
}

export async function getCustomerProducts() {
  return api.get<{ data?: { id: number; name: string; price: number; category: string }[] }>(
    '/public/customer/products'
  );
}

export async function customerCreateOrder(payload: {
  session_id: number;
  product_id: number;
  quantity: number;
  player_id?: number;
}) {
  return api.post('/public/customer/orders', payload);
}

export async function customerDeleteOrder(orderId: number) {
  return api.delete(`/public/customer/orders/${orderId}`);
}

export async function getCustomerSessionBill(sessionId: number) {
  return api.get<{
    data?: {
      total?: number;
      subtotal?: number;
      vat_amount?: number;
      game_charge?: number;
      canteen_charge?: number;
    };
  }>(`/public/customer/sessions/${sessionId}/bill`);
}

export async function customerCheckout(
  sessionId: number,
  payment_method: 'credit' | 'cash' | 'card'
) {
  return api.post<{ data?: { total: number; on_account: boolean } }>(
    `/public/customer/sessions/${sessionId}/checkout`,
    { payment_method }
  );
}

export interface CustomerAccountData {
  customer_id: number;
  customer_name: string;
  mobile?: string | null;
  balance: number;
  total_debit: number;
  total_credit: number;
  daily_entries: {
    date: string;
    debit_total: number;
    credit_total: number;
    debits: { id: number; session_id?: number | null; amount: number; description: string }[];
    credits: { id: number; amount: number; description: string }[];
  }[];
}

export async function getCustomerAccount(params?: { start_date?: string; end_date?: string }) {
  const q = new URLSearchParams();
  if (params?.start_date) q.set('start_date', params.start_date);
  if (params?.end_date) q.set('end_date', params.end_date);
  const qs = q.toString();
  return api.get<{ data?: CustomerAccountData }>(
    `/public/customer/account${qs ? `?${qs}` : ''}`
  );
}
