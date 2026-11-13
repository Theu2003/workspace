// Titulo: MapView
// Autor: Mateus Martins Peres
// Finalidade: Componente React responsavel por MapView.
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';

const greenIcon = L.divIcon({
  className: '',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#16a34a" stroke="white" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34]
});

const orangeIcon = L.divIcon({
  className: '',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#f59e0b" stroke="white" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34]
});

export function getPinIcon(color, size = 34, extraClass = '') {
  return L.divIcon({
    className: extraClass,
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function PolylinePath({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length < 2) return;
    const line = L.polyline(positions, {
      color: '#4a6741',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 6'
    }).addTo(map);

    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [40, 40] });
    return () => { line.remove(); };
  }, [positions, map]);
  return null;
}

function ClickPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function MapView({ markers, center, zoom = 14, showRadius, className = '', onSelect, height = '400px', routePositions, onPositionChange }) {
  const interactive = typeof onPositionChange === 'function';

  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsMessage, setGpsMessage] = useState('');

  const defaultCenter = useMemo(() => {
    if (center) return center;
    const valid = markers.filter((m) => m.latitude && m.longitude);
    if (valid.length === 1) return [valid[0].latitude, valid[0].longitude];
    if (valid.length > 1) {
      const lat = valid.reduce((s, m) => s + m.latitude, 0) / valid.length;
      const lng = valid.reduce((s, m) => s + m.longitude, 0) / valid.length;
      return [lat, lng];
    }
    return [-14.235, -51.9253];
  }, [markers, center]);

  const mapCenter = center ?? defaultCenter;
  const hasMarkers = markers.some((m) => m.latitude && m.longitude);

  const firstValidIdx = markers.findIndex((m) => m.latitude && m.longitude);

  function handleGps() {
    if (!navigator.geolocation) {
      setGpsMessage('Geolocalização não suportada neste navegador.');
      setTimeout(() => setGpsMessage(''), 4000);
      return;
    }
    setGpsBusy(true);
    setGpsMessage('Obtendo sua localização...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onPositionChange(position.coords.latitude, position.coords.longitude);
        setGpsBusy(false);
        setGpsMessage('Localização encontrada!');
        setTimeout(() => setGpsMessage(''), 2500);
      },
      (err) => {
        setGpsBusy(false);
        if (err.code === 1) {
          setGpsMessage(
            !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
              ? `O navegador bloqueia o GPS em endereços http que não são localhost (você está em ${window.location.origin}). Acesse via localhost ou https://.`
              : 'Permissão negada. Clique no cadeado ao lado do endereço no navegador → Localização → Permitir, depois tente de novo.'
          );
        } else {
          setGpsMessage('Não foi possível obter sua localização.');
        }
        setTimeout(() => setGpsMessage(''), 5000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`} style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={interactive}
        style={{ height: '100%', width: '100%', cursor: interactive ? 'crosshair' : undefined }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo center={center ?? mapCenter} zoom={zoom} />
        {interactive && <ClickPicker onPick={onPositionChange} />}
        {routePositions && routePositions.length >= 2 && (
          <PolylinePath positions={routePositions} />
        )}
        {markers.map((m, idx) =>
          m.latitude && m.longitude ? (
            <Marker
              key={m.id ?? idx}
              position={[m.latitude, m.longitude]}
              icon={getPinIcon(m.color || (idx === 0 ? '#16a34a' : '#0ea5e9'))}
              draggable={interactive && idx === firstValidIdx}
              eventHandlers={{
                ...(onSelect ? { click: () => onSelect(m.id) } : {}),
                ...(interactive && idx === firstValidIdx
                  ? {
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        onPositionChange(lat, lng);
                      }
                    }
                  : {})
              }}
            >
              {m.popup && <Popup>{m.popup}</Popup>}
            </Marker>
          ) : null
        )}
        {showRadius && markers[0]?.latitude && markers[0]?.longitude ? (
          <Circle
            center={[markers[0].latitude, markers[0].longitude]}
            radius={showRadius * 1000}
            pathOptions={{ color: '#16a34a', fillColor: '#bbf7d0', fillOpacity: 0.25 }}
          />
        ) : null}
      </MapContainer>

      { }
      {interactive && (
        <>
          <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-[1000] max-w-[90%]">
            <span className="inline-block bg-white/95 backdrop-blur border border-stone-200 shadow-md rounded-full px-3 py-1.5 text-[11px] font-medium text-stone-600 text-center">
              {gpsMessage ||
                (hasMarkers
                  ? 'Clique no mapa ou arraste o pin para ajustar sua localização'
                  : 'Clique no mapa para marcar sua localização')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleGps}
            disabled={gpsBusy}
            className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 backdrop-blur border border-stone-200 shadow-md text-[11px] font-semibold text-[#364a25] hover:bg-white transition-colors disabled:opacity-60"
            title="Usar minha localização atual (GPS)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" />
            </svg>
            {gpsBusy ? 'Localizando...' : 'Minha localização'}
          </button>
        </>
      )}
    </div>
  );
}

export { greenIcon, orangeIcon };
