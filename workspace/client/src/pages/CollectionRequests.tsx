import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Collection } from '../types';
import StatusBadge from '../components/StatusBadge';
import MapView from '../components/MapView';
import { MapPin, Phone, Calendar, Clock, Search, CheckCircle, XCircle, MessageSquare, Recycle, Send, Truck } from '../components/Icons';
import { useAuth } from '../auth';

const STATUS_OPTIONS = ['', 'pendente', 'aceita', 'agendada', 'em_coleta', 'concluida', 'cancelada', 'recusada'];

interface ChatMessage {
  id: number;
  collection_id: number;
  sender_type: string;
  sender_id: number;
  message: string;
  is_read: number;
  created_at: string;
}

export default function CollectionRequests() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filter, setFilter] = useState({ status: '', city: '', neighborhood: '', material: '', date: '', distance: '' });
  const [selected, setSelected] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { userCity } = useAuth();

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Route state
  const [routePositions, setRoutePositions] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const load = useCallback(async (filters: typeof filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const qs = params.toString();
      const d = await api<{ collections: Collection[] }>(`/collections${qs ? `?${qs}` : ''}`);
      setCollections(d.collections);
      setSelected((prev) => {
        if (prev) {
          const updated = d.collections.find((c) => c.id === prev.id);
          return updated || d.collections[0] || null;
        }
        return d.collections[0] || null;
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [load]);

  // Carregar chat quando coleta selecionada muda
  useEffect(() => {
    if (selected && ['aceita', 'agendada', 'em_coleta', 'concluida'].includes(selected.status)) {
      loadChat(selected.id);
    } else {
      setChatMessages([]);
    }
  }, [selected?.id]);

  // Auto-scroll no chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Buscar rota OSRM quando coleta aceita/agendada/em_coleta
  useEffect(() => {
    if (selected && selected.latitude && selected.longitude &&
        selected.company_latitude && selected.company_longitude &&
        ['aceita', 'agendada', 'em_coleta'].includes(selected.status)) {
      fetchRoute(selected);
    } else {
      setRoutePositions(null);
    }
  }, [selected?.id, selected?.status]);

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
      setMessage(err.message || 'Erro ao enviar mensagem');
    }
  }

  async function fetchRoute(col: Collection) {
    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${col.company_longitude},${col.company_latitude};${col.longitude},${col.latitude}?overview=simplified&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        setRoutePositions(data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]));
      } else {
        setRoutePositions(null);
      }
    } catch {
      setRoutePositions(null);
    } finally {
      setRouteLoading(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    setMessage('');
    try {
      await api(`/collections/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      await load(filter);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao atualizar');
    }
  }

  function setFilterField(field: string, value: string) {
    const next = { ...filter, [field]: value };
    setFilter(next);
    load(next);
  }

  const cities = [...new Set(collections.map((c) => c.address.city))];
  const neighborhoods = [...new Set(collections.map((c) => c.address.neighborhood))];
  const materials = [...new Set(collections.flatMap((c) => c.materials.map((m) => m.type)))];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-800">Solicitações de Coleta</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Visualize, filtre e gerencie as solicitações.{userCity && <> Mostrando apenas coletas de <strong className="text-stone-700">{userCity}</strong>.</>}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3 text-stone-600">
          <Search className="w-4 h-4 text-[#6b8f47]" />
          <span className="font-semibold text-xs">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <input type="date" value={filter.date} onChange={(e) => setFilterField('date', e.target.value)} className="px-2.5 py-2 rounded-lg border border-stone-200 text-xs outline-none focus:border-[#6b8f47]" />
          <select value={filter.city} onChange={(e) => setFilterField('city', e.target.value)} className="px-2.5 py-2 rounded-lg border border-stone-200 text-xs outline-none bg-white">
            <option value="">Cidade</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filter.neighborhood} onChange={(e) => setFilterField('neighborhood', e.target.value)} className="px-2.5 py-2 rounded-lg border border-stone-200 text-xs outline-none bg-white">
            <option value="">Bairro</option>
            {neighborhoods.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filter.material} onChange={(e) => setFilterField('material', e.target.value)} className="px-2.5 py-2 rounded-lg border border-stone-200 text-xs outline-none bg-white">
            <option value="">Material</option>
            {materials.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filter.status} onChange={(e) => setFilterField('status', e.target.value)} className="px-2.5 py-2 rounded-lg border border-stone-200 text-xs outline-none bg-white">
            <option value="">Status</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder="Dist. (km)"
            value={filter.distance}
            onChange={(e) => setFilterField('distance', e.target.value)}
            className="px-2.5 py-2 rounded-lg border border-stone-200 text-xs outline-none focus:border-[#6b8f47]"
          />
        </div>
      </div>

      {message && <div className="mb-3 text-sm text-[#415a2b] bg-[#f4f7f0] border border-[#e4ecda] rounded-lg px-3 py-2">{message}</div>}

      {loading ? (
        <p className="text-stone-400 text-sm">Carregando...</p>
      ) : collections.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 p-10 text-center">
          <Recycle className="w-10 h-10 mx-auto text-stone-300" />
          <p className="mt-3 text-sm text-stone-400">Nenhuma solicitação com esses filtros.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-2">
            {collections.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`bg-white rounded-xl border p-4 transition cursor-pointer ${
                  selected?.id === c.id ? 'border-[#6b8f47] shadow-sm' : 'border-stone-100 hover:border-[#c9d9b5]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{c.user_name}</p>
                    <p className="text-[11px] text-stone-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {c.user_phone}</p>
                  </div>
                  <StatusBadge status={c.status} label={c.status_label} />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-stone-400" /> {c.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-stone-400" /> {c.period}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-stone-400" /> {c.address.neighborhood}, {c.address.city}/{c.address.state}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {c.materials.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-[#f4f7f0] border border-[#e4ecda] text-[11px] font-medium text-[#364a25]">
                      {m.type}: {m.quantity}kg
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-stone-100 pt-3">
                  {c.status === 'pendente' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(c.id, 'aceita'); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4a6741] text-white text-xs font-semibold hover:bg-[#364a25] transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Aceitar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(c.id, 'recusada'); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-300 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Recusar
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(c); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Detalhes
                  </button>
                  <a
                    href={`tel:${c.user_phone.replace(/\D/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Ligar
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-3">
            {selected && (
              <>
                <div className="bg-white rounded-xl border border-stone-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-stone-800 text-sm">Detalhes</h2>
                    <StatusBadge status={selected.status} label={selected.status_label} />
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Cliente</dt><dd className="font-medium text-stone-800">{selected.user_name}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Telefone</dt><dd className="font-medium text-stone-800">{selected.user_phone}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Data</dt><dd className="font-medium text-stone-800">{selected.date}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Horário</dt><dd className="font-medium text-stone-800">{selected.period}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-stone-400">Endereço</dt><dd className="font-medium text-stone-800 text-right">{selected.address.street}, {selected.address.number} · {selected.address.neighborhood}</dd></div>
                    {selected.observations && (
                      <div className="flex gap-3"><dt className="text-stone-400 flex items-start gap-1"><MessageSquare className="w-3.5 h-3.5 mt-0.5" /> Obs</dt><dd className="font-medium text-stone-800 text-right">{selected.observations}</dd></div>
                    )}
                  </dl>
                </div>

                <div className="bg-white rounded-xl border border-stone-100 p-3.5">
                  <h3 className="text-xs font-bold text-stone-500 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#6b8f47]" /> Localização e Rota</h3>
                  {selected.latitude && selected.longitude ? (
                    <MapView
                      markers={[
                        { latitude: selected.latitude, longitude: selected.longitude, label: selected.address.street, color: '#16a34a' },
                        ...(selected.company_latitude && selected.company_longitude ? [{
                          latitude: selected.company_latitude,
                          longitude: selected.company_longitude,
                          label: 'Sua empresa',
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
                      <Truck className="w-3 h-3 animate-pulse" /> Calculando rota...
                    </div>
                  )}
                  {routePositions && !routeLoading && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#537236] bg-[#f4f7f0] rounded-lg px-2.5 py-1.5">
                      <Truck className="w-3 h-3" /> Rota calculada até o cliente
                    </div>
                  )}
                </div>

                {['aceita', 'agendada', 'em_coleta'].includes(selected.status) && (
                  <div className="bg-[#364a25] text-white rounded-xl p-4">
                    <h3 className="font-bold text-sm">Ações</h3>
                    <div className="mt-2.5 grid grid-cols-1 gap-1.5">
                      {selected.status === 'aceita' && (
                        <button onClick={() => updateStatus(selected.id, 'agendada')} className="py-2 rounded-lg bg-white text-[#364a25] font-semibold text-xs hover:bg-stone-50 transition-colors">Confirmar agendamento</button>
                      )}
                      {selected.status === 'agendada' && (
                        <button onClick={() => updateStatus(selected.id, 'em_coleta')} className="py-2 rounded-lg bg-white text-[#364a25] font-semibold text-xs hover:bg-stone-50 transition-colors">Iniciar coleta</button>
                      )}
                      {selected.status === 'em_coleta' && (
                        <button onClick={() => updateStatus(selected.id, 'concluida')} className="py-2 rounded-lg bg-white text-[#364a25] font-semibold text-xs hover:bg-stone-50 transition-colors">Concluir coleta</button>
                      )}
                      <button onClick={() => updateStatus(selected.id, 'cancelada')} className="py-2 rounded-lg bg-red-500/20 border border-red-300/30 text-white font-semibold text-xs hover:bg-red-500/30 transition-colors">Cancelar coleta</button>
                    </div>
                  </div>
                )}

                {/* Chat empresa ↔ usuário */}
                {['aceita', 'agendada', 'em_coleta', 'concluida'].includes(selected.status) && (
                  <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
                    <div className="p-3.5 border-b border-stone-100 bg-blue-50">
                      <h3 className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        Chat com {selected.user_name}
                      </h3>
                    </div>
                    <div className="h-[250px] overflow-y-auto p-3 space-y-2">
                      {chatLoading ? (
                        <p className="text-xs text-stone-400 text-center py-4">Carregando...</p>
                      ) : chatMessages.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-4">Envie uma mensagem para iniciar a conversa.</p>
                      ) : (
                        chatMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.sender_type === 'company' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                              msg.sender_type === 'company'
                                ? 'bg-[#4a6741] text-white'
                                : 'bg-stone-100 text-stone-800'
                            }`}>
                              <p>{msg.message}</p>
                              <p className={`text-[9px] mt-1 ${msg.sender_type === 'company' ? 'text-green-100' : 'text-stone-400'}`}>
                                {new Date(msg.created_at + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 border-t border-stone-100">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                          placeholder="Mensagem para o cliente..."
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
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
