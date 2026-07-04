import { apiClient, getAuthRequestConfig } from './client';
import type { PublicacionRequest, PublicacionResponse } from './types';

const BASE = '/bff/ms-publicacion/publicaciones';

export async function listarPublicaciones(): Promise<PublicacionResponse[]> {
  const { data } = await apiClient.get<PublicacionResponse[]>(BASE);
  return data;
}

export async function obtenerPublicacion(id: string): Promise<PublicacionResponse> {
  const { data } = await apiClient.get<PublicacionResponse>(`${BASE}/${id}`);
  return data;
}

export async function crearPublicacion(
  payload: PublicacionRequest,
): Promise<PublicacionResponse> {
  const { data } = await apiClient.post<PublicacionResponse>(
    BASE,
    payload,
    getAuthRequestConfig(),
  );
  return data;
}

export async function actualizarPublicacion(
  id: string,
  payload: PublicacionRequest,
): Promise<PublicacionResponse> {
  const { data } = await apiClient.put<PublicacionResponse>(
    `${BASE}/${id}`,
    payload,
    getAuthRequestConfig(),
  );
  return data;
}

export async function eliminarPublicacion(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`, getAuthRequestConfig());
}
