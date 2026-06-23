import { api } from './client';
import { API_BASE_URL, getAccessToken } from './config';
import type { CalculateBillRequest, CalculateBillResponse } from './types';

export async function calculateBill(payload: CalculateBillRequest): Promise<{ data?: CalculateBillResponse }> {
  return api.post<{ data?: CalculateBillResponse }>('/billing/calculate', payload);
}

/**
 * Fetches the backend-generated PDF bill for a session.
 * The backend is responsible for formatting the PDF for Zebra / thermal printers.
 */
export async function fetchBillPdf(
  sessionId: number,
  opts?: { vat_percent?: number; discount_amount?: number }
): Promise<Blob> {
  const params = new URLSearchParams();
  if (opts?.vat_percent != null) params.set('vat_percent', String(opts.vat_percent));
  if (opts?.discount_amount != null) params.set('discount_amount', String(opts.discount_amount));

  const token = getAccessToken();
  const url = `${API_BASE_URL}/billing/session/${sessionId}/bill-pdf${params.toString() ? `?${params.toString()}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/pdf',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to download bill PDF');
  }

  return await res.blob();
}
