import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8085';
const TOKEN_KEY = 'sanosysalvos_token';
const TOKEN_CHANGED_EVENT = 'sanosysalvos_token_changed';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase() ?? 'GET';
  const url = config.url ?? '';
  const isPublicRead =
    method === 'GET' &&
    url.startsWith('/bff/ms-publicacion/');

  if (url.startsWith('/bff/auth/') || isPublicRead) {
    delete config.headers.Authorization;
    return config;
  }

  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    return Promise.reject(error);
  },
);

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getAuthRequestConfig(): AxiosRequestConfig | undefined {
  const token = getStoredToken();
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;
}

function decodeStoredToken(): Record<string, unknown> | null {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(window.atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

export function getStoredUserRole(): string | null {
  const decoded = decodeStoredToken() as { rol?: string; roles?: string[] } | null;
  const role = (decoded?.rol ?? decoded?.roles?.[0])?.replace(/^(ROLE_|ROL_)/, '');
  return role?.toUpperCase() ?? null;
}

export function isStoredUserAdmin(): boolean {
  return getStoredUserRole() === 'ADMIN';
}

export function getStoredUserId(): string | null {
  const decoded = decodeStoredToken();
  const directId = firstString(
    decoded?.usuarioId,
    decoded?.userId,
    decoded?.id,
    decoded?.uid,
  );

  if (directId && isUuid(directId)) {
    return directId;
  }

  const identity = firstString(decoded?.email, decoded?.sub);
  return identity ? stableUuidFromString(identity) : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function stableUuidFromString(value: string) {
  const bytes = new Uint8Array(16);
  let hash = 0x811c9dc5;

  for (let round = 0; round < bytes.length; round += 1) {
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index) + round;
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0x85ebca6b);
    bytes[round] = hash & 0xff;
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

export function onStoredTokenChange(listener: () => void) {
  window.addEventListener(TOKEN_CHANGED_EVENT, listener);
  return () => window.removeEventListener(TOKEN_CHANGED_EVENT, listener);
}

/**
 * Normaliza los errores de Axios a un mensaje legible para la interfaz.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    if (axiosError.response) {
      if (axiosError.response.status === 401) {
        return 'Sesión no autorizada o expirada. Vuelve a iniciar sesión.';
      }
      const data = axiosError.response.data;
      if (data && typeof data === 'object') {
        return data.message ?? data.error ?? `Error ${axiosError.response.status}`;
      }
      return `Error ${axiosError.response.status}`;
    }
    if (axiosError.request) {
      return 'No se pudo conectar con el servidor. Verifica que el BFF esté activo.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}
