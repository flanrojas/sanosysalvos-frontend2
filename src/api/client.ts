import axios, { type AxiosError } from 'axios';

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
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? '';
      const authHeader = error.config?.headers?.Authorization;
      if (!url.startsWith('/bff/auth/') && authHeader) {
        clearStoredToken();
      }
    }
    return Promise.reject(error);
  },
);

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
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
  const token = getStoredToken();
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = JSON.parse(window.atob(normalized)) as {
      rol?: string;
      roles?: string[];
    };
    const role = (decoded.rol ?? decoded.roles?.[0])?.replace(/^(ROLE_|ROL_)/, '');
    return role?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

export function isStoredUserAdmin(): boolean {
  return getStoredUserRole() === 'ADMIN';
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
