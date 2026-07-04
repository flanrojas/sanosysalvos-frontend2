import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearReporteCompleto } from '../api/orquestador';
import { ToastProvider } from '../components/Toast';
import { ReportarPage } from './ReportarPage';

vi.mock('../api/orquestador', () => ({
  crearReporteCompleto: vi.fn(),
}));

vi.mock('../components/LocationPickerMap', () => ({
  LocationPickerMap: ({
    onSelect,
  }: {
    onSelect: (latitud: number, longitud: number) => void;
  }) => (
    <button type="button" onClick={() => onSelect(-33.4421, -70.6532)}>
      Seleccionar ubicación mock
    </button>
  ),
}));

const mockCrearReporteCompleto = vi.mocked(crearReporteCompleto);

function createJwt(payload: Record<string, unknown>) {
  const encodedPayload = window
    .btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${encodedPayload}.signature`;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ReportarPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('ReportarPage', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      'sanosysalvos_token',
      createJwt({ sub: 'admin@sanosysalvos.cl', roles: ['ROL_ADMIN'] }),
    );
    mockCrearReporteCompleto.mockReset();
    mockCrearReporteCompleto.mockResolvedValue({
      mensaje: 'ok',
      mascota: {
        id: 'pet-1',
        name: 'Luna',
        status: 'LOST',
        species: 'Perro',
        color: '',
        size: 8.5,
        foundLocation: null,
        lostLocation: null,
        description: null,
        ownerId: null,
      },
      publicacion: {
        idPublicacion: 'pub-1',
        tipoPublicacion: 'PERDIDA',
        titulo: 'Luna perdida',
        descripcion: '',
        fechaPublicacion: '2026-07-02T12:00:00',
        fechaExtravioOEncuentro: '2026-07-02',
        estado: 'ACTIVA',
        latitud: -33.4421,
        longitud: -70.6532,
        direccionReferencia: null,
        urlFoto: null,
        nombreContacto: null,
        telefonoContacto: null,
        emailContacto: null,
        mascotaId: 'pet-1',
        usuarioId: null,
      },
    });
  });

  it('envía las coordenadas seleccionadas en el mapa al crear el reporte', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Título del reporte'), 'Luna perdida');
    await user.type(screen.getByLabelText('Nombre de la mascota'), 'Luna');
    await user.type(screen.getByLabelText('Tamaño (kg aprox.)'), '8.5');
    await user.click(screen.getByRole('button', { name: 'Seleccionar ubicación mock' }));
    await user.click(screen.getByRole('button', { name: 'Publicar reporte' }));

    await waitFor(() => expect(mockCrearReporteCompleto).toHaveBeenCalled());
    expect(mockCrearReporteCompleto).toHaveBeenCalledWith(
      expect.objectContaining({
        latitud: -33.4421,
        longitud: -70.6532,
        tamaño: 8.5,
        usuarioId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      }),
    );
  });
});
