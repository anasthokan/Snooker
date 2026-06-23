// Dev: /api proxy. Production build served from FastAPI: same-origin (empty string).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
      ? '/api'
      : '';

export const getAccessToken = (): string | null =>
  sessionStorage.getItem('gamehub_access_token');

export const setAccessToken = (token: string): void => {
  sessionStorage.setItem('gamehub_access_token', token);
};

export const clearAccessToken = (): void => {
  sessionStorage.removeItem('gamehub_access_token');
};

export const getRefreshToken = (): string | null =>
  sessionStorage.getItem('gamehub_refresh_token');

export const setRefreshToken = (token: string): void => {
  sessionStorage.setItem('gamehub_refresh_token', token);
};

export const clearRefreshToken = (): void => {
  sessionStorage.removeItem('gamehub_refresh_token');
};
