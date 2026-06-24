// Dev: /api proxy. Combined FastAPI+SPA: same-origin (empty string).
// Split IIS deploy (frontend domain != API): map host or set VITE_API_BASE_URL at build.
const SPLIT_API_BY_HOST: Record<string, string> = {
  'snooker.atozeesolutions.com': 'https://snooker-apis.atozeesolutions.com',
};

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv;
  }
  if (import.meta.env.DEV) {
    return '/api';
  }
  if (typeof window !== 'undefined') {
    const mapped = SPLIT_API_BY_HOST[window.location.hostname];
    if (mapped) return mapped;
  }
  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();

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
