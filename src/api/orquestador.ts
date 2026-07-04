import { apiClient, getAuthRequestConfig } from './client';
import type {
  PublicacionDetalladaResponse,
  ReporteCompletoRequest,
  ReporteCompletoResponse,
} from './types';

const BASE = '/bff/orquestador';

export async function crearReporteCompleto(
  payload: ReporteCompletoRequest,
): Promise<ReporteCompletoResponse> {
  const config = getAuthRequestConfig();
  const { data } = await apiClient.post<ReporteCompletoResponse>(
    `${BASE}/publicaciones/completo`,
    payload,
    config,
  );
  return data;
}

export async function obtenerPublicacionDetallada(
  id: string,
): Promise<PublicacionDetalladaResponse> {
  const { data } = await apiClient.get<PublicacionDetalladaResponse>(
    `${BASE}/publicaciones/${id}/detalle`,
  );
  return data;
}
