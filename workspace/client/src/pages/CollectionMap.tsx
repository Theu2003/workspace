import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Collection } from '../types';
import MapView, { getPinIcon } from '../components/MapView';
import StatusBadge from '../components/StatusBadge';
import { MapPin } from '../components/Icons';
import { useAuth } from '../auth';

const STATUS_COLORS: Record<string, string> = {
  pendente: '#f59e0b',
  aceita: '#3b82f6',
  agendada: '#6366f1',
  em_coleta: '#a855f7',
  concluida: '#16a34a',
  cancelada: '#ef4444',
  recusada: '#9ca3af'
};

export default function CollectionMap() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { userCity } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ collections: Collection[] }>('/collections');
      setCollections(d.collections);
      if (d.collections.length && !selectedId) setSelectedId(d.collections[0].id);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const withCoords = collections.filter((c) => c.latitude && c.longitude);
  const selected = collections.find((c) => c.id === selectedId) || null;

  const markers = withCoords.map((c) => ({
    id: c.id,
    latitude: c.latitude!,
    longitude: c.longitude!,
    color: STATUS_COLORS[c.status] || '#10b981',
    popup: (
      <div className="min-w-[160px]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-stone-800">{c.user_name}</p>
          <StatusBadge status={c.status} label={c.status_label} />
        </div>
        <p className="text-[11px] text-stone-500 mt-1">{c.address.street}, {c.address.number} - {c.address.neighborhood}</p>
        <div className="text-[11px] text-stone-400 mt-1">
          <p>{c.materials.map((m) => `${m.type} (${m.quantity}kg)`).join(' · ')}</p>
          <p className="mt-0.5">{c.date} · {c.period}</p>
        </div>
      </div>
    )
  }));

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-800">Mapa de Coletas</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Todas as solicitações no mapa.{userCity && <> Mostrando coletas de <strong className="text-stone-700">{userCity}</strong>.</>}
        </p>
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Carregando...</p>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <MapView
              markers={markers}
              height="500px"
              onSelect={(id) => setSelectedId(id as number)}
              center={selected && selected.latitude && selected.longitude ? [selected.latitude, selected.longitude] : undefined}
              zoom={selected ? 15 : 12}
            />
            <div className="mt-2.5 flex flex-wrap gap-2.5 text-[11px] text-stone-500">
              {Object.entries(STATUS_COLORS).map(([s, color]) => (
                <span key={s} className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {withCoords.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-stone-200 p-8 text-center">
                <MapPin className="w-8 h-8 mx-auto text-stone-300" />
                <p className="mt-2 text-xs text-stone-400">Nenhuma solicitação com localização.</p>
              </div>
            ) : (
              withCoords.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left bg-white rounded-xl border p-3.5 transition-colors ${
                    selectedId === c.id ? 'border-[#6b8f47] shadow-sm' : 'border-stone-100 hover:border-[#c9d9b5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-xs text-stone-800">{c.user_name}</p>
                    <StatusBadge status={c.status} label={c.status_label} />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">{c.address.street}, {c.address.number} · {c.address.neighborhood}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">{c.date} · {c.period}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">{c.materials.map((m) => `${m.type}: ${m.quantity}kg`).join(' · ')}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
