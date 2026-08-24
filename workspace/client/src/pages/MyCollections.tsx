import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Collection } from '../types';
import StatusBadge from '../components/StatusBadge';
import MapView from '../components/MapView';
import { MapPin, Recycle, Calendar, Clock, MessageSquare } from '../components/Icons';

const STATUS_TABS = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'agendadas', label: 'Agendadas' },
  { key: 'concluidas', label: 'Concluídas' },
  { key: 'canceladas', label: 'Canceladas' }
];

export default function MyCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filter, setFilter] = useState('todas');
  const [selected, setSelected] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ collections: Collection[] }>('/collections/mine')
      .then((d) => {
        setCollections(d.collections);
        if (d.collections.length) setSelected(d.collections[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = collections.filter((c) => {
    if (filter === 'todas') return true;
    if (filter === 'agendadas') return ['aceita', 'agendada', 'em_coleta'].includes(c.status);
    if (filter === 'canceladas') return ['cancelada', 'recusada'].includes(c.status);
    return c.status === filter;
  });

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-800">Minhas Coletas</h1>
        <p className="mt-0.5 text-sm text-stone-500">Acompanhe suas solicitações de coleta.</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === t.key ? 'bg-[#4a6741] border-[#4a6741] text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-[#c9d9b5]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 p-10 text-center">
          <Recycle className="w-10 h-10 mx-auto text-stone-300" />
          <p className="mt-3 text-sm text-stone-400">Nenhuma coleta nesta categoria.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-colors ${
                  selected?.id === c.id ? 'border-[#6b8f47] shadow-sm' : 'border-stone-100 hover:border-[#c9d9b5]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selected?.id === c.id ? 'bg-[#6b8f47]' : 'bg-stone-300'}`} />
                    <span className="font-semibold text-stone-800 text-sm">Coleta #{c.id}</span>
                  </div>
                  <StatusBadge status={c.status} label={c.status_label} />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-stone-400" /> {c.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-stone-400" /> {c.period}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-stone-400" /> {c.address.neighborhood}</span>
                </div>
                <div className="mt-1.5 text-xs text-stone-400">
                  {c.materials.map((m) => `${m.type}: ${m.quantity}kg`).join(' · ')}
                </div>
                {c.company_name && <div className="mt-1.5 text-[11px] font-semibold text-[#537236]">Empresa: {c.company_name}</div>}
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-3">
            {selected ? (
              <>
                <div className="bg-white rounded-xl border border-stone-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-stone-800 text-sm">Coleta #{selected.id}</h2>
                    <StatusBadge status={selected.status} label={selected.status_label} />
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Data</dt><dd className="font-medium text-stone-800">{selected.date}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Período</dt><dd className="font-medium text-stone-800">{selected.period}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Endereço</dt><dd className="font-medium text-stone-800 text-right">{selected.address.street}, {selected.address.number} - {selected.address.neighborhood}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Empresa</dt><dd className="font-medium text-stone-800">{selected.company_name || 'Aguardando'}</dd></div>
                    {selected.observations && (
                      <div className="flex justify-between gap-3"><dt className="text-stone-400 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Obs</dt><dd className="font-medium text-stone-800 text-right">{selected.observations}</dd></div>
                    )}
                  </dl>
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wide mb-1.5">Materiais</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.materials.map((m, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#f4f7f0] border border-[#e4ecda] text-xs font-medium text-[#364a25]">
                          {m.type}: {m.quantity}kg
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-stone-100 p-4">
                  <h3 className="text-xs font-bold text-stone-500 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#6b8f47]" /> Localização</h3>
                  {selected.latitude && selected.longitude ? (
                    <MapView
                      markers={[{ latitude: selected.latitude, longitude: selected.longitude, label: selected.address.street }]}
                      center={[selected.latitude, selected.longitude]}
                      height="220px"
                    />
                  ) : (
                    <p className="text-[11px] text-stone-400">Localização não disponível.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-stone-400 text-sm">Selecione uma coleta.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
