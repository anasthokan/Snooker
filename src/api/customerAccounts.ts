import { api } from './client';

export interface CustomerAccountSummary {
  customer_id: number;
  name: string;
  mobile?: string | null;
  balance: number;
}

export interface AccountBillItem {
  id: number;
  session_id?: number | null;
  amount: number;
  description: string;
  created_at: string;
}

export interface AccountDailyEntry {
  date: string;
  debit_total: number;
  credit_total: number;
  debits: AccountBillItem[];
  credits: AccountBillItem[];
}

export interface CustomerAccountDetail {
  customer_id: number;
  customer_name: string;
  mobile?: string | null;
  balance: number;
  total_debit: number;
  total_credit: number;
  daily_entries: AccountDailyEntry[];
}

export async function searchCustomerAccounts(params?: {
  q?: string;
  start_date?: string;
  end_date?: string;
  only_with_balance?: boolean;
}): Promise<{ data?: CustomerAccountSummary[] }> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.start_date) search.set('start_date', params.start_date);
  if (params?.end_date) search.set('end_date', params.end_date);
  if (params?.only_with_balance) search.set('only_with_balance', 'true');
  const qs = search.toString() ? `?${search.toString()}` : '';
  return api.get<{ data?: CustomerAccountSummary[] }>(`/customers/accounts/search${qs}`);
}

export async function getCustomerAccount(
  customerId: number,
  params?: { start_date?: string; end_date?: string }
): Promise<{ data?: CustomerAccountDetail }> {
  const search = new URLSearchParams();
  if (params?.start_date) search.set('start_date', params.start_date);
  if (params?.end_date) search.set('end_date', params.end_date);
  const qs = search.toString() ? `?${search.toString()}` : '';
  return api.get<{ data?: CustomerAccountDetail }>(`/customers/${customerId}/account${qs}`);
}

export async function settleCustomerAccount(
  customerId: number,
  payload: { amount: number; notes?: string }
) {
  return api.post<{ data?: unknown }>(`/customers/${customerId}/settle`, payload);
}
