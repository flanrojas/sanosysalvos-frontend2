import { useEffect } from 'react';
import { DivIcon } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerMapProps {
  position: [number, number] | null;
  onSelect: (latitud: number, longitud: number) => void;
}

const defaultCenter: [number, number] = [-33.4489, -70.6693];

const selectedIcon = new DivIcon({
  className: 'location-picker__marker',
  html: '<span></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapClickHandler({ onSelect }: Pick<LocationPickerMapProps, 'onSelect'>) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function SyncMapView({ position }: Pick<LocationPickerMapProps, 'position'>) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [map, position]);

  return null;
}

export function LocationPickerMap({ position, onSelect }: LocationPickerMapProps) {
  return (
    <div className="location-picker" aria-label="Ubicación en mapa">
      <MapContainer
        center={position ?? defaultCenter}
        zoom={position ? 15 : 12}
        scrollWheelZoom
        className="location-picker__map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onSelect} />
        <SyncMapView position={position} />
        {position && <Marker position={position} icon={selectedIcon} />}
      </MapContainer>
    </div>
  );
}
