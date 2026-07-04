import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearReporteCompleto } from '../api/orquestador';
import { getErrorMessage, getStoredUserId } from '../api/client';
import type { ReporteCompletoRequest } from '../api/types';
import { InputField, TextareaField, SelectField } from '../components/Field';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { MapPinIcon, PawIcon } from '../components/icons';
import { LocationPickerMap } from '../components/LocationPickerMap';
import './ReportarPage.css';

type Tipo = 'PERDIDO' | 'ENCONTRADO';

interface FormState {
  tipo: Tipo;
  titulo: string;
  nombre: string;
  especie: string;
  color: string;
  tamaño: string;
  descripcion: string;
  ubicacion: string;
  fecha: string;
  latitud: string;
  longitud: string;
  nombreContacto: string;
  telefonoContacto: string;
}

const inicial: FormState = {
  tipo: 'PERDIDO',
  titulo: '',
  nombre: '',
  especie: 'Perro',
  color: '',
  tamaño: '',
  descripcion: '',
  ubicacion: '',
  fecha: '',
  latitud: '',
  longitud: '',
  nombreContacto: '',
  telefonoContacto: '',
};

function parseCoordinate(value: string, min: number, max: number) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function ReportarPage() {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useToast();
  const [form, setForm] = useState<FormState>(inicial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCoordinates(latitud: number, longitud: number) {
    setForm((prev) => ({
      ...prev,
      latitud: latitud.toFixed(6),
      longitud: longitud.toFixed(6),
    }));
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      notifyError('Tu navegador no permite geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateCoordinates(pos.coords.latitude, pos.coords.longitude);
        notifySuccess('Coordenadas capturadas.');
      },
      () => notifyError('No se pudo obtener tu ubicación.'),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.titulo.trim() || !form.nombre.trim()) {
      setError('El título y el nombre de la mascota son obligatorios.');
      return;
    }

    const tamaño = Number(form.tamaño);
    if (!form.tamaño.trim() || !Number.isFinite(tamaño) || tamaño <= 0) {
      setError('Ingresa un tamaño aproximado válido para la mascota.');
      return;
    }

    const latitud = parseCoordinate(form.latitud, -90, 90);
    const longitud = parseCoordinate(form.longitud, -180, 180);
    const hasCoordinateInput = Boolean(form.latitud.trim() || form.longitud.trim());

    if (hasCoordinateInput && (latitud === null || longitud === null)) {
      setError('Selecciona una ubicación válida en el mapa.');
      return;
    }

    const usuarioId = getStoredUserId();
    if (!usuarioId) {
      setError('Debes iniciar sesión antes de publicar un reporte.');
      return;
    }

    const payload: ReporteCompletoRequest = {
      titulo: form.titulo.trim(),
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      tipoPublicacion: form.tipo,
      especie: form.especie,
      color: form.color.trim(),
      tamaño,
      estado: form.tipo === 'PERDIDO' ? 'LOST' : 'FOUND',
      ubicacion: form.ubicacion.trim(),
      fecha: form.fecha,
      descripcion: form.descripcion.trim(),
      nombreContacto: form.nombreContacto.trim(),
      telefonoContacto: form.telefonoContacto.trim(),
      usuarioId,
      latitud,
      longitud,
    };

    setSubmitting(true);
    try {
      const res = await crearReporteCompleto(payload);
      notifySuccess('Reporte publicado. Gracias por ayudar.');
      navigate(`/publicaciones/${res.publicacion.idPublicacion}`);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      notifyError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPosition =
    parseCoordinate(form.latitud, -90, 90) !== null &&
    parseCoordinate(form.longitud, -180, 180) !== null
      ? ([
          Number(form.latitud),
          Number(form.longitud),
        ] as [number, number])
      : null;

  return (
    <div className="container page">
      <div className="form-shell">
        <div className="page__head">
          <div>
            <p className="page__eyebrow">Nuevo reporte</p>
            <h1 className="page__title">Reportar una mascota</h1>
            <p className="page__subtitle">
              Cuanta más información compartas, más fácil será el reencuentro.
            </p>
          </div>
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2 className="form-section__title">¿Qué ocurrió?</h2>
            <p className="form-section__hint">
              Indica si estás buscando a tu mascota o si encontraste una.
            </p>
            <div className="type-toggle">
              <button
                type="button"
                className={`type-option type-option--lost ${
                  form.tipo === 'PERDIDO' ? 'type-option--active-lost' : ''
                }`}
                onClick={() => update('tipo', 'PERDIDO')}
              >
                <span className="type-option__icon">
                  <PawIcon size={20} />
                </span>
                <span>
                  <span className="type-option__title">Perdí a mi mascota</span>
                  <span className="type-option__sub">Quiero encontrarla</span>
                </span>
              </button>
              <button
                type="button"
                className={`type-option type-option--found ${
                  form.tipo === 'ENCONTRADO' ? 'type-option--active-found' : ''
                }`}
                onClick={() => update('tipo', 'ENCONTRADO')}
              >
                <span className="type-option__icon">
                  <MapPinIcon size={20} />
                </span>
                <span>
                  <span className="type-option__title">Encontré una mascota</span>
                  <span className="type-option__sub">Busco a su familia</span>
                </span>
              </button>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section__title">Sobre la mascota</h2>
            <div className="form-grid">
              <div className="span-2">
                <InputField
                  id="titulo"
                  label="Título del reporte"
                  placeholder="Ej. Perrita beige perdida en el parque central"
                  value={form.titulo}
                  onChange={(e) => update('titulo', e.target.value)}
                  required
                />
              </div>
              <InputField
                id="nombre"
                label="Nombre de la mascota"
                placeholder="Luna"
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                required
              />
              <SelectField
                id="especie"
                label="Especie"
                value={form.especie}
                onChange={(e) => update('especie', e.target.value)}
              >
                <option>Perro</option>
                <option>Gato</option>
                <option>Ave</option>
                <option>Conejo</option>
                <option>Otro</option>
              </SelectField>
              <InputField
                id="color"
                label="Color"
                placeholder="Beige con manchas blancas"
                value={form.color}
                onChange={(e) => update('color', e.target.value)}
              />
              <InputField
                id="tamano"
                label="Tamaño (kg aprox.)"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="8.5"
                value={form.tamaño}
                onChange={(e) => update('tamaño', e.target.value)}
                required
              />
              <div className="span-2">
                <TextareaField
                  id="descripcion"
                  label="Descripción"
                  placeholder="Señas particulares, comportamiento, collar, etc."
                  value={form.descripcion}
                  onChange={(e) => update('descripcion', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section__title">¿Dónde y cuándo?</h2>
            <div className="form-grid">
              <InputField
                id="ubicacion"
                label="Zona de referencia"
                placeholder="Parque Central, Av. Siempre Viva"
                value={form.ubicacion}
                onChange={(e) => update('ubicacion', e.target.value)}
              />
              <InputField
                id="fecha"
                label="Fecha del evento"
                type="date"
                value={form.fecha}
                onChange={(e) => update('fecha', e.target.value)}
              />
              <InputField
                id="latitud"
                label="Latitud"
                type="number"
                min="-90"
                max="90"
                step="0.000001"
                placeholder="-12.0464"
                value={form.latitud}
                onChange={(e) => update('latitud', e.target.value)}
              />
              <InputField
                id="longitud"
                label="Longitud"
                type="number"
                min="-180"
                max="180"
                step="0.000001"
                placeholder="-77.0428"
                value={form.longitud}
                onChange={(e) => update('longitud', e.target.value)}
              />
              <div className="span-2">
                <LocationPickerMap
                  position={selectedPosition}
                  onSelect={updateCoordinates}
                />
                <p className="location-summary">
                  {selectedPosition
                    ? `Punto seleccionado: ${form.latitud}, ${form.longitud}`
                    : 'Sin punto seleccionado'}
                </p>
              </div>
              <div className="span-2">
                <Button type="button" variant="subtle" size="sm" onClick={usarMiUbicacion}>
                  <MapPinIcon size={16} />
                  Usar mi ubicación actual
                </Button>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section__title">Contacto</h2>
            <p className="form-section__hint">
              Así podrán comunicarse contigo cuando haya novedades.
            </p>
            <div className="form-grid">
              <InputField
                id="contacto-nombre"
                label="Tu nombre"
                placeholder="María"
                value={form.nombreContacto}
                onChange={(e) => update('nombreContacto', e.target.value)}
              />
              <InputField
                id="contacto-tel"
                label="Teléfono"
                type="tel"
                placeholder="+51 999 888 777"
                value={form.telefonoContacto}
                onChange={(e) => update('telefonoContacto', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? 'Publicando…' : 'Publicar reporte'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
