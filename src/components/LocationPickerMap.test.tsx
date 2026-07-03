import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { LocationPickerMap } from './LocationPickerMap';

const mockSetView = vi.fn();
let mockMapHandlers:
  | {
      click?: (event: { latlng: { lat: number; lng: number } }) => void;
    }
  | undefined;

vi.mock('leaflet', () => ({
  DivIcon: class {
    options: unknown;

    constructor(options: unknown) {
      this.options = options;
    }
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    center,
    zoom,
  }: {
    children: ReactNode;
    center: [number, number];
    zoom: number;
  }) => (
    <div data-center={center.join(',')} data-testid="map-container" data-zoom={zoom}>
      {children}
    </div>
  ),
  Marker: ({ position }: { position: [number, number] }) => (
    <div data-position={position.join(',')} data-testid="selected-marker" />
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: () => ({ setView: mockSetView }),
  useMapEvents: (handlers: typeof mockMapHandlers) => {
    mockMapHandlers = handlers;
    return {};
  },
}));

describe('LocationPickerMap', () => {
  beforeEach(() => {
    mockSetView.mockClear();
    mockMapHandlers = undefined;
  });

  it('notifica las coordenadas al hacer click en el mapa', () => {
    const onSelect = vi.fn();
    render(<LocationPickerMap position={null} onSelect={onSelect} />);

    act(() => {
      mockMapHandlers?.click?.({ latlng: { lat: -33.4421, lng: -70.6532 } });
    });

    expect(onSelect).toHaveBeenCalledWith(-33.4421, -70.6532);
  });

  it('muestra marcador y centra el mapa cuando hay una posición seleccionada', () => {
    render(<LocationPickerMap position={[-33.4421, -70.6532]} onSelect={vi.fn()} />);

    expect(screen.getByTestId('selected-marker')).toHaveAttribute(
      'data-position',
      '-33.4421,-70.6532',
    );
    expect(mockSetView).toHaveBeenCalledWith([-33.4421, -70.6532], 15);
  });
});
