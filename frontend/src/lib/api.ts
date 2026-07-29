const API_PREFIX = '/api';

export function getApiBase(): string {
  // Server-side (SSR in Docker): use internal service name
  if (typeof window === 'undefined') {
    return (
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001'
    );
  }
  // Browser: use configured public API URL, falling back to same-origin
  return process.env.NEXT_PUBLIC_API_URL || '';
}

export function apiPath(path: string): string {
  if (path.startsWith('/api/')) return path;
  return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getApiUrl(path: string): string {
  return `${getApiBase()}${apiPath(path)}`;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export function getApiErrorMessage(err: unknown, fallback = 'Ошибка'): string {
  if (!err || typeof err !== 'object') return fallback;
  const message = (err as { message?: string | string[] }).message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', headers = {}, body, ...rest } = options;

  const reqHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (body !== undefined && body !== null) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    reqHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(getApiUrl(path), {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    ...rest,
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      reqHeaders['Authorization'] = `Bearer ${accessToken}`;
      const retryRes = await fetch(getApiUrl(path), {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        ...rest,
      });
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ message: 'Error' }));
        throw { status: retryRes.status, ...err };
      }
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json();
    }
    setAccessToken(null);
    throw { status: 401, message: 'Unauthorized' };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error' }));
    throw { status: res.status, ...err };
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function restoreSession() {
  const refreshed = await tryRefresh();
  if (!refreshed) return null;

  try {
    return await getMe();
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function login(email: string, password: string) {
  const res = await apiFetch<{ accessToken: string; user: any }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setAccessToken(res.accessToken);
  return res;
}

export async function register(email: string, password: string, displayName: string) {
  return apiFetch<any>('/auth/register', {
    method: 'POST',
    body: { email, password, displayName },
  });
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Clear local session even if request fails (e.g. expired access token)
  }
  setAccessToken(null);
}

export async function getMe() {
  return apiFetch<any>('/users/me');
}

export interface PdfImportResponse {
  text: string;
  html: string;
  suggestedTitle?: string;
  metadata?: {
    pageCount: number;
    version?: string;
  };
}

export async function importPdf(file: File): Promise<PdfImportResponse> {
  const doFetch = () => {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return fetch(getApiUrl('/pdf-import'), {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
  };

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      setAccessToken(null);
      throw { status: 401, message: 'Unauthorized' };
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error' }));
    throw { status: res.status, ...err };
  }

  return res.json();
}
