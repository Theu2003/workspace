import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api';
import type { Collection } from '../types';
import StatusBadge from '../components/StatusBadge';
import MapView from '../components/MapView';
import { MapPin, Recycle, Calendar, Clock, MessageSquare, Truck, Send } from '../components/Icons';

interface ChatMessage {
  id: number;
  collection_id: number;
  sender_type: string;
  sender_id: number;
  message: string;
  is_read: number;
  created_at: string;
}

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

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Fetch route from OSRM between company and user
  const [routePositions, setRoutePositions] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const fetchRoute = useCallback(async (col: Collection) => {
    if (!col.company_latitude || !col.company_longitude || !col.latitude || !col.longitude) {
      setRoutePositions(null);
      return;
    }
    setRouteLoading(true);
    try {
      // OSRM uses lng,lat format
      const url = `https://router.project-osrm.org/route/v1/driving/${col.company_longitude},${col.company_latitude};${col.longitude},${col.latitude}?overview=simplified&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        setRoutePositions(coords);
      } else {
        setRoutePositions(null);
      }
    } catch {
      setRoutePositions(null);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected && ['aceita', 'agendada', 'em_coleta'].includes(selected.status)) {
      fetchRoute(selected);
    } else {
      setRoutePositions(null);
    }
  }, [selected, fetchRoute]);

  // Chat: carregar mensagens quando coleta selecionada muda
  useEffect(() => {
    if (selected && ['aceita', 'agendada', 'em_coleta', 'concluida'].includes(selected.status) && selected.company_id) {
      loadChat(selected.id);
    } else {
      setChatMessages([]);
    }
  }, [selected?.id]);

  // Auto-scroll no chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function loadChat(collectionId: number) {
    setChatLoading(true);
    try {
      const data = await api<{ messages: ChatMessage[] }>(`/collections/${collectionId}/messages`);
      setChatMessages(data.messages || []);
    } catch {
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || !selected) return;
    try {
      await api(`/collections/${selected.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: chatInput.trim() })
      });
      setChatInput('');
      await loadChat(selected.id);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagem');
    }
  }

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

                  {/* Chat usuário → empresa */}
                  {['aceita', 'agendada', 'em_coleta', 'concluida'].includes(selected.status) && selected.company_id && (
                    <div className="mt-4 pt-3 border-t border-stone-100">
                      <h3 className="text-xs font-bold text-stone-500 mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        Chat com {selected.company_name}
                      </h3>
                      <div className="h-[200px] overflow-y-auto p-2.5 space-y-2 bg-stone-50 rounded-lg mb-2">
                        {chatLoading ? (
                          <p className="text-[11px] text-stone-400 text-center py-3">Carregando...</p>
                        ) : chatMessages.length === 0 ? (
                          <p className="text-[11px] text-stone-400 text-center py-3">Envie uma mensagem para a empresa.</p>
                        ) : (
                          chatMessages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] ${
                                msg.sender_type === 'user'
                                  ? 'bg-[#4a6741] text-white'
                                  : 'bg-white border border-stone-200 text-stone-800'
                              }`}>
                                <p>{msg.message}</p>
                                <p className={`text-[9px] mt-1 ${msg.sender_type === 'user' ? 'text-green-100' : 'text-stone-400'}`}>
                                  {new Date(msg.created_at + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          )))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                          placeholder="Mensagem para a empresa..."
                          className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#6b8f47]"
                        />
                        <button
                          onClick={sendChatMessage}
                          disabled={!chatInput.trim()}
                          className="px-3 py-2 rounded-lg bg-[#4a6741] text-white text-xs font-semibold hover:bg-[#364a25] disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-stone-100 p-4">
                  <h3 className="text-xs font-bold text-stone-500 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#6b8f47]" /> Localização</h3>
                  {selected.latitude && selected.longitude ? (
                    <MapView
                      markers={[
                        { latitude: selected.latitude, longitude: selected.longitude, label: 'Seu endereço', color: '#16a34a' },
                        ...(selected.company_latitude && selected.company_longitude ? [{
                          latitude: selected.company_latitude,
                          longitude: selected.company_longitude,
                          label: selected.company_name || 'Empresa',
                          color: '#f59e0b'
                        }] : [])
                      ]}
                      center={routePositions ? undefined : [selected.latitude, selected.longitude]}
                      height="220px"
                      routePositions={routePositions || undefined}
                    />
                  ) : (
                    <p className="text-[11px] text-stone-400">Localização não disponível.</p>
                  )}
                  {routeLoading && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-stone-400">
                      <Truck className="w-3 h-3 animate-pulse" /> Carregando rota...
                    </div>
                  )}
                  {routePositions && !routeLoading && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#537236] bg-[#f4f7f0] rounded-lg px-2.5 py-1.5">
                      <Truck className="w-3 h-3" /> Rota da empresa até você exibida no mapa
                    </div>
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
