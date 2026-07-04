import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, getAuthRequestConfig } from './client';
import {
  actualizarPublicacion,
  crearPublicacion,
  eliminarPublicacion,
  listarPublicaciones,
  obtenerPublicacion,
} from './publicaciones';
import {
  actualizarMascota,
  crearMascota,
  eliminarMascota,
  listarMascotas,
  modificarMascotaParcial,
  obtenerMascota,
} from './mascotas';
import {
  buscarEnRadio,
  calcularDistancia,
  eliminarUbicacion,
  guardarUbicacion,
  obtenerUbicacion,
} from './geolocalizacion';
import { crearReporteCompleto, obtenerPublicacionDetallada } from './orquestador';
import type { PublicacionRequest } from './types';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  getAuthRequestConfig: vi.fn(),
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);
const putMock = vi.mocked(apiClient.put);
const patchMock = vi.mocked(apiClient.patch);
const deleteMock = vi.mocked(apiClient.delete);
const getAuthRequestConfigMock = vi.mocked(getAuthRequestConfig);

const publicacionPayload: PublicacionRequest = {
  tipoPublicacion: 'PERDIDO',
  titulo: 'Max perdido',
  descripcion: 'Perro mediano',
  fechaExtravioOEncuentro: '2026-06-17',
  estado: 'ACTIVA',
  latitud: -33.4489,
  longitud: -70.6693,
  direccionReferencia: 'Santiago',
  urlFoto: '',
  nombreContacto: 'Mario',
  telefonoContacto: '123',
  emailContacto: 'mario@test.cl',
  mascotaId: null,
  usuarioId: null,
};

describe('api wrappers', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
    getAuthRequestConfigMock.mockReset();
    getAuthRequestConfigMock.mockReturnValue(undefined);
  });

  it('consume publicaciones con las rutas esperadas', async () => {
    getMock.mockResolvedValueOnce({ data: [{ idPublicacion: 'pub-1' }] });
    await expect(listarPublicaciones()).resolves.toEqual([{ idPublicacion: 'pub-1' }]);
    expect(getMock).toHaveBeenLastCalledWith('/bff/ms-publicacion/publicaciones');

    getMock.mockResolvedValueOnce({ data: { idPublicacion: 'pub-1' } });
    await expect(obtenerPublicacion('pub-1')).resolves.toEqual({ idPublicacion: 'pub-1' });
    expect(getMock).toHaveBeenLastCalledWith('/bff/ms-publicacion/publicaciones/pub-1');

    postMock.mockResolvedValueOnce({ data: { idPublicacion: 'pub-2' } });
    await expect(crearPublicacion(publicacionPayload)).resolves.toEqual({ idPublicacion: 'pub-2' });
    expect(postMock).toHaveBeenLastCalledWith(
      '/bff/ms-publicacion/publicaciones',
      publicacionPayload,
      undefined,
    );

    putMock.mockResolvedValueOnce({ data: { idPublicacion: 'pub-1', titulo: 'Actualizada' } });
    await expect(actualizarPublicacion('pub-1', publicacionPayload)).resolves.toEqual({
      idPublicacion: 'pub-1',
      titulo: 'Actualizada',
    });
    expect(putMock).toHaveBeenLastCalledWith(
      '/bff/ms-publicacion/publicaciones/pub-1',
      publicacionPayload,
      undefined,
    );

    deleteMock.mockResolvedValueOnce({});
    await expect(eliminarPublicacion('pub-1')).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenLastCalledWith(
      '/bff/ms-publicacion/publicaciones/pub-1',
      undefined,
    );
  });

  it('envía configuración autenticada al crear publicaciones', async () => {
    const authConfig = { headers: { Authorization: 'Bearer token-123' } };
    getAuthRequestConfigMock.mockReturnValue(authConfig);

    postMock.mockResolvedValueOnce({ data: { idPublicacion: 'pub-2' } });
    await expect(crearPublicacion(publicacionPayload)).resolves.toEqual({ idPublicacion: 'pub-2' });

    expect(postMock).toHaveBeenLastCalledWith(
      '/bff/ms-publicacion/publicaciones',
      publicacionPayload,
      authConfig,
    );

    postMock.mockResolvedValueOnce({ data: { mensaje: 'creado' } });
    await expect(
      crearReporteCompleto({
        titulo: 'Mascota perdida',
        nombre: 'Max',
        tipo: 'PERDIDO',
        tipoPublicacion: 'PERDIDO',
        especie: 'Perro',
        color: 'Negro',
        tamaño: 10,
        estado: 'LOST',
        ubicacion: 'Centro',
        fecha: '2026-06-17',
        descripcion: 'Descripción',
        nombreContacto: 'Mario',
        telefonoContacto: '123',
        usuarioId: '11111111-1111-5111-8111-111111111111',
        latitud: -33.4489,
        longitud: -70.6693,
      }),
    ).resolves.toEqual({ mensaje: 'creado' });

    expect(postMock).toHaveBeenLastCalledWith(
      '/bff/orquestador/publicaciones/completo',
      expect.any(Object),
      authConfig,
    );
  });

  it('consume mascotas con filtros opcionales', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'pet-1' }] });
    await expect(listarMascotas({ ownerId: 'owner-1', status: 'LOST' })).resolves.toEqual([
      { id: 'pet-1' },
    ]);
    expect(getMock).toHaveBeenLastCalledWith('/bff/ms-mascotas/pets', {
      params: { ownerId: 'owner-1', status: 'LOST' },
    });

    getMock.mockResolvedValueOnce({ data: [] });
    await expect(listarMascotas()).resolves.toEqual([]);
    expect(getMock).toHaveBeenLastCalledWith('/bff/ms-mascotas/pets', { params: {} });

    getMock.mockResolvedValueOnce({ data: { id: 'pet-1' } });
    await expect(obtenerMascota('pet-1')).resolves.toEqual({ id: 'pet-1' });

    const mascotaPayload = {
      name: 'Toby',
      status: 'LOST',
      species: 'Perro',
      color: 'Café',
      size: 12,
      foundLocation: null,
      lostLocation: 'Ñuñoa',
      description: null,
      ownerId: null,
    };

    postMock.mockResolvedValueOnce({ data: { id: 'pet-2' } });
    await expect(crearMascota(mascotaPayload)).resolves.toEqual({ id: 'pet-2' });
    expect(postMock).toHaveBeenLastCalledWith('/bff/ms-mascotas/pets', mascotaPayload);

    putMock.mockResolvedValueOnce({ data: { id: 'pet-1', name: 'Toby actualizado' } });
    await expect(actualizarMascota('pet-1', mascotaPayload)).resolves.toEqual({
      id: 'pet-1',
      name: 'Toby actualizado',
    });
    expect(putMock).toHaveBeenLastCalledWith('/bff/ms-mascotas/pets/pet-1', mascotaPayload);

    patchMock.mockResolvedValueOnce({ data: { id: 'pet-1', status: 'FOUND' } });
    await expect(modificarMascotaParcial('pet-1', { status: 'FOUND' })).resolves.toEqual({
      id: 'pet-1',
      status: 'FOUND',
    });
    expect(patchMock).toHaveBeenLastCalledWith('/bff/ms-mascotas/pets/pet-1', {
      status: 'FOUND',
    });

    deleteMock.mockResolvedValueOnce({});
    await expect(eliminarMascota('pet-1')).resolves.toBeUndefined();
  });

  it('consume geolocalización', async () => {
    postMock.mockResolvedValueOnce({ data: { distance_meters: 2144.59 } });
    await expect(
      calcularDistancia({
        origin_latitude: -33.4489,
        origin_longitude: -70.6693,
        target_latitude: -33.4569,
        target_longitude: -70.6483,
      }),
    ).resolves.toEqual({ distance_meters: 2144.59 });
    expect(postMock).toHaveBeenLastCalledWith('/bff/geolocalizacion/distance', expect.any(Object));

    postMock.mockResolvedValueOnce({ data: { pets: [] } });
    await expect(
      buscarEnRadio({ latitude: -33.4489, longitude: -70.6693, radius_meters: 500 }),
    ).resolves.toEqual({ pets: [] });

    postMock.mockResolvedValueOnce({ data: { message: 'ok' } });
    await expect(
      guardarUbicacion({
        pet_id: 'pet-1',
        latitude: -33.4489,
        longitude: -70.6693,
      }),
    ).resolves.toEqual({ message: 'ok' });

    getMock.mockResolvedValueOnce({ data: { pet_id: 'pet-1' } });
    await expect(obtenerUbicacion('pet-1')).resolves.toEqual({ pet_id: 'pet-1' });

    deleteMock.mockResolvedValueOnce({});
    await expect(eliminarUbicacion('pet-1')).resolves.toBeUndefined();
  });

  it('consume el orquestador', async () => {
    postMock.mockResolvedValueOnce({ data: { mensaje: 'creado' } });
    await expect(
      crearReporteCompleto({
        titulo: 'Mascota perdida',
        nombre: 'Max',
        tipo: 'PERDIDO',
        tipoPublicacion: 'PERDIDO',
        especie: 'Perro',
        color: 'Negro',
        tamaño: 10,
        estado: 'LOST',
        ubicacion: 'Centro',
        fecha: '2026-06-17',
        descripcion: 'Descripción',
        nombreContacto: 'Mario',
        telefonoContacto: '123',
        usuarioId: null,
        latitud: -33.4489,
        longitud: -70.6693,
      }),
    ).resolves.toEqual({ mensaje: 'creado' });
    expect(postMock).toHaveBeenLastCalledWith(
      '/bff/orquestador/publicaciones/completo',
      expect.any(Object),
      undefined,
    );

    getMock.mockResolvedValueOnce({ data: { publicacion: { idPublicacion: 'pub-1' } } });
    await expect(obtenerPublicacionDetallada('pub-1')).resolves.toEqual({
      publicacion: { idPublicacion: 'pub-1' },
    });
    expect(getMock).toHaveBeenLastCalledWith('/bff/orquestador/publicaciones/pub-1/detalle');
  });
});
