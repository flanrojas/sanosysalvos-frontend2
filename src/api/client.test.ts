import axios, { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStoredToken,
  getErrorMessage,
  getStoredToken,
  getStoredUserRole,
  isStoredUserAdmin,
  onStoredTokenChange,
  setStoredToken,
} from './client';
import { createJwt } from '../test/jwt';

describe('client storage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('guarda, lee, notifica y limpia token', () => {
    const listener = vi.fn();
    const unsubscribe = onStoredTokenChange(listener);

    setStoredToken('token-123');
    expect(getStoredToken()).toBe('token-123');
    expect(listener).toHaveBeenCalledTimes(1);

    clearStoredToken();
    expect(getStoredToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setStoredToken('token-456');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('decodifica roles de JWT y normaliza prefijos ROLE/ROL', () => {
    window.localStorage.setItem(
      'sanosysalvos_token',
      createJwt({ roles: ['ROL_ADMIN'] }),
    );
    expect(getStoredUserRole()).toBe('ADMIN');
    expect(isStoredUserAdmin()).toBe(true);

    window.localStorage.setItem(
      'sanosysalvos_token',
      createJwt({ rol: 'ROLE_USER' }),
    );
    expect(getStoredUserRole()).toBe('USER');
    expect(isStoredUserAdmin()).toBe(false);
  });

  it('retorna null ante tokens ausentes o inválidos', () => {
    expect(getStoredUserRole()).toBeNull();

    window.localStorage.setItem('sanosysalvos_token', 'token-invalido');
    expect(getStoredUserRole()).toBeNull();
  });
});

describe('getErrorMessage', () => {
  it('normaliza respuestas de error de Axios', () => {
    const withMessage = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      {},
      {
        data: { message: 'Correo inválido' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
      },
    );
    expect(getErrorMessage(withMessage)).toBe('Correo inválido');

    const withError = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      {},
      {
        data: { error: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as never,
      },
    );
    expect(getErrorMessage(withError)).toBe(
      'Sesión no autorizada o expirada. Vuelve a iniciar sesión.',
    );
  });

  it('normaliza errores de red y errores nativos', () => {
    const networkError = new AxiosError('Network Error');
    networkError.request = {};

    expect(getErrorMessage(networkError)).toBe(
      'No se pudo conectar con el servidor. Verifica que el BFF esté activo.',
    );
    expect(getErrorMessage(new Error('Fallo local'))).toBe('Fallo local');
    expect(getErrorMessage('desconocido')).toBe('Ocurrió un error inesperado.');
  });

  it('usa Error status si la respuesta no trae cuerpo estructurado', () => {
    const error = new AxiosError(
      'Request failed',
      'ERR_BAD_RESPONSE',
      undefined,
      {},
      {
        data: 'html',
        status: 500,
        statusText: 'Server Error',
        headers: {},
        config: {} as never,
      },
    );

    expect(axios.isAxiosError(error)).toBe(true);
    expect(getErrorMessage(error)).toBe('Error 500');
  });
});
