import { API_BASE_URL } from './config';

async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { message?: string }).message || res.statusText;
    throw new Error(msg);
  }
  return body as T;
}

export interface PayConfig {
  tenant_id: number;
  tenant_name: string;
  publishable_key: string;
  currency: string;
  public_app_url: string;
}

export interface CustomerBalancePublic {
  customer_id: number;
  tenant_id: number;
  name: string;
  mobile?: string | null;
  balance: number;
}

export async function getPayConfig(tenantId?: number) {
  const q = tenantId != null ? `?tenant_id=${tenantId}` : '';
  return publicRequest<{ data?: PayConfig }>(`/public/pay/config${q}`);
}

export async function getPublicCustomerBalance(mobile: string, tenantId?: number) {
  const tenantQ = tenantId != null ? `tenant_id=${tenantId}&` : '';
  return publicRequest<{ data?: CustomerBalancePublic }>(
    `/public/pay/balance?${tenantQ}mobile=${encodeURIComponent(mobile)}`
  );
}

export async function verifyMoyasarPayment(payload: {
  moyasar_payment_id: string;
  tenant_id: number;
  purpose: 'account_settlement' | 'session';
  customer_id?: number;
  mobile?: string;
  session_id?: number;
}) {
  return publicRequest<{ data?: { status: string; amount: number; message: string } }>(
    '/public/pay/verify',
    { method: 'POST', body: JSON.stringify(payload) }
  );
}
