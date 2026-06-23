import { api } from './client';
import { setAccessToken, setRefreshToken, getRefreshToken, clearRefreshToken } from './config';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from './types';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', payload, { skipAuth: true });
  if (res.data?.access_token) {
    setAccessToken(res.data.access_token);
  }
  if (res.data?.refresh_token) {
    setRefreshToken(res.data.refresh_token);
  }
  return res;
}

export async function refreshToken(payload: RefreshTokenRequest) {
  return api.post<LoginResponse>('/auth/refresh', payload, { skipAuth: true });
}

export async function forgotPassword(payload: ForgotPasswordRequest) {
  return api.post<{ message?: string }>('/auth/forgot-password', payload, { skipAuth: true });
}

export async function resetPassword(payload: ResetPasswordRequest) {
  return api.post<{ message?: string }>('/auth/reset-password', payload, { skipAuth: true });
}

export interface AuthFeaturesResponse {
  data?: {
    reports?: boolean;
    dashboard?: boolean;
    role_management?: boolean;
    [key: string]: boolean | undefined;
  };
}

export async function getFeatures(): Promise<AuthFeaturesResponse> {
  return api.get<AuthFeaturesResponse>('/auth/features');
}

export async function logout(): Promise<void> {
  const refresh_token = getRefreshToken();

  const body = refresh_token ? { refresh_token } : undefined;

  api
    .post('/auth/logout', body)
    .catch(() => {})
    .finally(() => {
      clearRefreshToken();
    });
}
