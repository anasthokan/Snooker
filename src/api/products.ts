import { api } from './client';
import type { ProductItem, CreateProductRequest, UpdateProductRequest } from './types';

export async function listProducts(params?: { skip?: number; limit?: number }): Promise<{ data?: ProductItem[] }> {
  const search = new URLSearchParams();
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString() ? `?${search.toString()}` : '';
  return api.get<{ data?: ProductItem[] }>(`/products${qs}`);
}

export async function getProduct(id: number): Promise<{ data?: ProductItem }> {
  return api.get<{ data?: ProductItem }>(`/products/${id}`);
}

export async function createProduct(payload: CreateProductRequest) {
  return api.post<{ data?: ProductItem }>('/products', payload);
}

export async function updateProduct(id: number, payload: UpdateProductRequest) {
  return api.patch<{ data?: ProductItem }>(`/products/${id}`, payload);
}
