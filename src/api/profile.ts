import { api } from './client';
import type { ProfileItem, UpdateProfileRequest } from './types';

export async function getMe(): Promise<{ data?: ProfileItem }> {
  return api.get<{ data?: ProfileItem }>('/profile/me');
}

export async function updateMe(payload: UpdateProfileRequest) {
  return api.patch<{ data?: ProfileItem }>('/profile/me', payload);
}
