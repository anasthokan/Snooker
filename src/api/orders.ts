import { api } from './client';
import type { CreateOrderRequest, OrderItem } from './types';

export async function createOrder(payload: CreateOrderRequest) {
  return api.post<{ data?: OrderItem }>('/orders', payload);
}

export async function listOrdersBySession(sessionId: number): Promise<{ data?: OrderItem[] }> {
  return api.get<{ data?: OrderItem[] }>(`/orders/session/${sessionId}`);
}

export async function deleteOrder(orderId: number) {
  return api.delete<{ data?: unknown }>(`/orders/${orderId}`);
}
