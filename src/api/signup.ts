import { api } from './client';
import { setAccessToken, setRefreshToken } from './config';

export interface SignupTokenPayload {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface SignupPricing {
  country: string;
  currency: string;
  amount: number;
  monthly_label: string;
  display_price: string;
  trial_days: number;
  coupon_applied: string | null;
  has_trial: boolean;
}

export interface SignupCheckoutRequest {
  business_name: string;
  email: string;
  password: string;
  country: 'SA' | 'IN';
  coupon_code?: string;
}

export interface SignupCheckoutResponse {
  payment_mode: 'stripe' | 'direct';
  checkout_url?: string | null;
  session_id?: string | null;
  tenant_id: number;
  pricing: SignupPricing;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_in?: number | null;
}

interface ApiWrapper<T> {
  data?: T;
  message?: string;
}

export async function getSignupPricing(country: 'SA' | 'IN', couponCode?: string): Promise<SignupPricing> {
  const params = new URLSearchParams({ country });
  if (couponCode?.trim()) params.set('coupon_code', couponCode.trim());
  const res = await api.get<ApiWrapper<SignupPricing>>(`/auth/signup/pricing?${params}`, { skipAuth: true });
  if (!res.data) throw new Error('Could not load pricing');
  return res.data;
}

export async function startSignupCheckout(payload: SignupCheckoutRequest): Promise<SignupCheckoutResponse> {
  const res = await api.post<ApiWrapper<SignupCheckoutResponse>>('/auth/signup/checkout', payload, { skipAuth: true });
  if (!res.data) throw new Error('Could not start signup');
  if (res.data.payment_mode === 'stripe' && !res.data.checkout_url) {
    throw new Error('Could not start checkout');
  }
  if (res.data.payment_mode === 'direct' && res.data.access_token) {
    setAccessToken(res.data.access_token);
    if (res.data.refresh_token) setRefreshToken(res.data.refresh_token);
  }
  return res.data;
}

export async function completeSignup(sessionId: string): Promise<SignupTokenPayload> {
  const res = await api.post<ApiWrapper<SignupTokenPayload>>('/auth/signup/complete', { session_id: sessionId }, { skipAuth: true });
  if (res.data?.access_token) setAccessToken(res.data.access_token);
  if (res.data?.refresh_token) setRefreshToken(res.data.refresh_token);
  return res.data ?? { access_token: '' };
}

export async function getSignupConfig(): Promise<{ publishable_key: string | null; configured: boolean }> {
  const res = await api.get<ApiWrapper<{ publishable_key: string | null; configured: boolean }>>('/auth/signup/config', { skipAuth: true });
  return res.data ?? { publishable_key: null, configured: false };
}
