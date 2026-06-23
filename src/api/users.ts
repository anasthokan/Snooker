import { api } from './client';
import type {
  RoleItem,
  UserListItem,
  CreateUserRequest,
  UpdateUserRequest,
} from './types';

export async function listRoles(): Promise<{ data?: RoleItem[] }> {
  return api.get<{ data?: RoleItem[] }>('/users/roles');
}

export async function listUsers(): Promise<{ data?: UserListItem[] }> {
  return api.get<{ data?: UserListItem[] }>('/users');
}

export async function getUser(id: number): Promise<{ data?: UserListItem }> {
  return api.get<{ data?: UserListItem }>(`/users/${id}`);
}

export async function createUser(payload: CreateUserRequest) {
  return api.post<{ data?: UserListItem }>('/users', payload);
}

export async function updateUser(id: number, payload: UpdateUserRequest) {
  return api.patch<{ data?: UserListItem }>(`/users/${id}`, payload);
}
