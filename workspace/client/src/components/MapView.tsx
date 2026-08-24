import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';

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

export function getPinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  });
}

interface MapMarker {
  id?: string | number;
  latitude: number;
  longitude: number;
  label?: string;
  color?: string;
  popup?: React.ReactNode;
}

interface MapViewProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  showRadius?: number;
  className?: string;
  onSelect?: (id: any) => void;
  height?: string;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapView({ markers, center, zoom = 14, showRadius, className = '', onSelect, height = '400px' }: MapViewProps) {
  const defaultCenter: [number, number] = useMemo(() => {
    if (center) return center;
    const valid = markers.filter((m) => m.latitude && m.longitude);
    if (valid.length === 1) return [valid[0].latitude, valid[0].longitude];
    if (valid.length > 1) {
      const lat = valid.reduce((s, m) => s + m.latitude, 0) / valid.length;
      const lng = valid.reduce((s, m) => s + m.longitude, 0) / valid.length;
      return [lat, lng];
    }
    return [-23.5505, -46.6333];
  }, [markers, center]);

  const mapCenter: [number, number] = center ?? defaultCenter;
  const hasMarkers = markers.some((m) => m.latitude && m.longitude);

  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ height }}>
      <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo center={center ?? mapCenter} zoom={zoom} />
        {markers.map((m, idx) =>
          m.latitude && m.longitude ? (
            <Marker
              key={m.id ?? idx}
              position={[m.latitude, m.longitude]}
              icon={getPinIcon(m.color || (idx === 0 ? '#16a34a' : '#0ea5e9'))}
              eventHandlers={onSelect ? { click: () => onSelect(m.id) } : {}}
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
    </div>
  );
}

export { greenIcon, orangeIcon };
