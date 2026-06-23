import { api } from './client';
import type {
  CategoryItem,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './types';

export async function listCategories(): Promise<{ data?: CategoryItem[] }> {
  return api.get<{ data?: CategoryItem[] }>('/categories');
}

export async function getCategory(id: number): Promise<{ data?: CategoryItem }> {
  return api.get<{ data?: CategoryItem }>(`/categories/${id}`);
}

export async function createCategory(payload: CreateCategoryRequest) {
  return api.post<{ data?: CategoryItem }>('/categories', payload);
}

export async function updateCategory(id: number, payload: UpdateCategoryRequest) {
  return api.patch<{ data?: CategoryItem }>(`/categories/${id}`, payload);
}

export async function deleteCategory(id: number) {
  return api.delete<{ data?: unknown }>(`/categories/${id}`);
}
