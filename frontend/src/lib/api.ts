function getApiBase(): string {
  // Server-side (SSR in Docker): use internal service name
  if (typeof window === 'undefined') {
    return (
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001'
    );
  }
  // Browser: use public URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', headers = {}, body, ...rest } = options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (accessToken) {
    reqHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    ...rest,
  });

  if (res.status === 401 && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      reqHeaders['Authorization'] = `Bearer ${accessToken}`;
      const retryRes = await fetch(`${getApiBase()}${path}`, {
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
    const res = await fetch(`${getApiBase()}/auth/refresh`, {
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
  await apiFetch('/auth/logout', { method: 'POST' });
  setAccessToken(null);
}

export async function getMe() {
  return apiFetch<any>('/users/me');
}
