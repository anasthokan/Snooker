import { API_BASE_URL, getAccessToken } from './config';

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...init } = options;
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...init, headers });
  let body: unknown;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) {
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
  } else {
    body = await res.text();
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null
        ? String(
            (body as { message?: unknown }).message ??
              (body as { detail?: unknown }).detail ??
              res.statusText
          )
        : res.statusText || 'Request failed';
    throw new ApiError(msg, res.status, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, opts?: { skipAuth?: boolean }) =>
    request<T>(path, { method: 'GET', ...opts }),

  post: <T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...opts }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
