// Titulo: CollectionMap
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por CollectionMap.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, ScaleControl, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api, formatDate } from '../api';
import { useAuth } from '../auth';
import StatusBadge from '../components/StatusBadge';
import { getPinIcon } from '../components/MapView';
import { Bell, Calendar, CheckCircle, ChevronDown, ChevronUp, MapPin, MessageSquare, Package, Phone, Search, Send, Sliders, X, XCircle } from '../components/Icons';

const STATUS_META = [
  { key: 'pendente', label: 'Pendentes', color: '#f97316' },
  { key: 'aceita', label: 'Aceitas', color: '#2563eb' },
  { key: 'agendada', label: 'Agendadas', color: '#7c3aed' },
  { key: 'em_coleta', label: 'Em coleta', color: '#c026d3' },
  { key: 'concluida', label: 'Concluídas', color: '#16a34a' },
  { key: 'cancelada', label: 'Canceladas', color: '#dc2626' },
  { key: 'recusada', label: 'Recusadas', color: '#9ca3af' }
];
const COLOR_BY_STATUS = Object.fromEntries(STATUS_META.map((s) => [s.key, s.color]));

const MENU_LINKS = [
  { to: '/empresa/dashboard', label: 'Dashboard' },
  { to: '/empresa/mapa', label: 'Mapa de Coletas' },
  { to: '/empresa/agenda', label: 'Agenda' }
];

const NEXT_ACTION = {
  aceita: { next: 'agendada', label: 'Confirmar agendamento' },
  agendada: { next: 'em_coleta', label: 'Iniciar coleta' },
  em_coleta: { next: 'concluida', label: 'Concluir coleta' }
};
const TOAST_TEXT = {
  aceita: 'Coleta aceita',
  recusada: 'Coleta recusada — ela continua disponível para outras empresas',
  agendada: 'Agendamento confirmado',
  em_coleta: 'Coleta iniciada',
  concluida: 'Coleta concluída',
  cancelada: 'Coleta cancelada'
};

const paddedId = (n) => String(n ?? '').padStart(6, '0');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const totalKg = (c) => {
  const total = (c.materials || []).reduce((s, m) => s + Number(m?.quantity || 0), 0);
  return (Math.round(total * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
};
const fullAddress = (c) =>
  `${c.address?.street ?? ''}, ${c.address?.number ?? ''} - ${c.address?.neighborhood ?? ''}`.replace(/^,\s*,\s*/, '');

function FitInitial({ points }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || points.length === 0) return;
    didFit.current = true;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [56, 56] });
    }
  }, [points, map]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target?.coords) map.flyTo(target.coords, target.zoom ?? 15, { duration: 0.7 });
  }, [target, map]);
  return null;
}

function MapInvalidator({ trigger }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

function MarkerItem({ c, selected, openSignal, onSelect, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (selected && openSignal > 0) ref.current?.openPopup();
  }, [selected, openSignal]);
  const color = COLOR_BY_STATUS[c.status] || '#16a34a';
  const icon = useMemo(
    () => getPinIcon(color, selected ? 42 : 34, selected ? 'pin-selected' : ''),
    [color, selected]
  );
  return (
    <Marker
      ref={ref}
      position={[c.latitude, c.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(c.id) }}
    >
      {children}
    </Marker>
  );
}

function PopupContent({ c, onDetails, onZoom, onStatus, busy }) {
  const next = NEXT_ACTION[c.status];
  const active = ['aceita', 'agendada', 'em_coleta'].includes(c.status);
  return (
    <div className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-[13px] text-stone-800 leading-tight truncate">{c.user_name}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">ID: {paddedId(c.user_id)}</p>
        </div>
        <StatusBadge status={c.status} label={c.status_label} />
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-stone-600">
        <MapPin className="w-3.5 h-3.5 text-[#84a55e] shrink-0 mt-px" />
        <span>{fullAddress(c)}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          {formatDate(c.date)} · {cap(c.period)}
        </span>
        <span className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5 text-stone-400" />
          {totalKg(c)} kg
        </span>
        <a
          href={`tel:${(c.user_phone || '').replace(/\D/g, '')}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-blue-700 hover:underline"
        >
          <Phone className="w-3.5 h-3.5 text-blue-500" />
          {c.user_phone}
        </a>
      </div>
      <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2">
        {c.status === 'pendente' ? (
          <>
            <button
              onClick={() => onStatus(c, 'aceita')}
              disabled={busy}
              className="py-1.5 rounded-lg bg-[#4a6741] hover:bg-[#364a25] text-white text-[11px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Aceitar
            </button>
            <button
              onClick={() => onStatus(c, 'recusada')}
              disabled={busy}
              className="py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-[11px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Recusar
            </button>
          </>
        ) : (
          <>
            {next && (
              <button
                onClick={() => onStatus(c, next.next)}
                disabled={busy}
                className="py-1.5 rounded-lg bg-[#4a6741] hover:bg-[#364a25] text-white text-[11px] font-semibold transition-colors disabled:opacity-50"
              >
                {next.label}
              </button>
            )}
            {active && (
              <button
                onClick={() => onStatus(c, 'cancelada')}
                disabled={busy}
                className="py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-[11px] font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
          </>
        )}
        {c.status !== 'pendente' && (
          <button
            onClick={onDetails}
            className="py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-[11px] font-semibold transition-colors"
          >
            Detalhes
          </button>
        )}
        <button
          onClick={onZoom}
          className="py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-[11px] font-semibold transition-colors"
        >
          Ver no mapa
        </button>
      </div>
    </div>
  );
}

export default function CollectionMap() {
  const navigate = useNavigate();
  const { logout, unread, company } = useAuth();

  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [openSignal, setOpenSignal] = useState(0);
  const [flyTarget, setFlyTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [mobileView, setMobileView] = useState('map');
  const [legendOpen, setLegendOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  function showToast(text) {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }

  async function updateStatus(c, status) {
    setBusyId(c.id);
    try {
      await api(`/collections/${c.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      showToast(TOAST_TEXT[status] || 'Status atualizado');
      await load();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar status');
    } finally {
      setBusyId(null);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await api('/collections');
      const list = d.collections || [];
      setCollections(list);
      const first = list.find((c) => c.latitude && c.longitude) || list[0] || null;
      setSelectedId((prev) => prev ?? first?.id ?? null);
      setOpenSignal((n) => n + 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withCoords = useMemo(() => collections.filter((c) => c.latitude && c.longitude), [collections]);
  const points = useMemo(() => withCoords.map((c) => [c.latitude, c.longitude]), [withCoords]);
  const materials = useMemo(
    () => [...new Set(collections.flatMap((c) => (c.materials || []).map((m) => m.type)))],
    [collections]
  );

  const counts = useMemo(() => {
    const acc = { '': withCoords.length };
    for (const c of withCoords) acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, [withCoords]);

  const filtered = useMemo(
    () =>
      withCoords.filter((c) => {
        if (statusFilter && c.status !== statusFilter) return false;
        if (materialFilter && !(c.materials || []).some((m) => m.type === materialFilter)) return false;
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          const haystack = [
            c.user_name,
            paddedId(c.user_id),
            String(c.id),
            c.address?.street,
            c.address?.number,
            c.address?.neighborhood,
            c.address?.city
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      }),
    [withCoords, statusFilter, materialFilter, query]
  );

  const selected = collections.find((c) => c.id === selectedId) || null;

  function clearFilters() {
    setQuery('');
    setStatusFilter('');
    setMaterialFilter('');
  }

  function selectFromList(c) {
    setSelectedId(c.id);
    setOpenSignal((n) => n + 1);
    setFlyTarget({ coords: [c.latitude, c.longitude], zoom: 15 });
    setMobileView('map');
  }

  function goDetails(c) {
    setSelectedId(c.id);
    setOpenSignal((n) => n + 1);
    setDetailOpen(true);
  }

  function zoomOnMap(c) {
    setFlyTarget({ coords: [c.latitude, c.longitude], zoom: 16 });
  }

  function handleMarkerSelect(id) {
    setSelectedId(id);
    setFlyTarget(null);
  }

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (selected && ['aceita', 'agendada', 'em_coleta', 'concluida'].includes(selected.status)) {
      setChatLoading(true);
      api(`/collections/${selected.id}/messages`)
        .then((d) => setChatMessages(d.messages || []))
        .catch(() => setChatMessages([]))
        .finally(() => setChatLoading(false));
    } else {
      setChatMessages([]);
    }
  }, [selected?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function sendChatMessage() {
    if (!chatInput.trim() || !selected) return;
    try {
      await api(`/collections/${selected.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: chatInput.trim() })
      });
      setChatInput('');
      const d = await api(`/collections/${selected.id}/messages`);
      setChatMessages(d.messages || []);
    } catch (err) {
      showToast(err.message || 'Erro ao enviar mensagem');
    }
  }

  const detailPanel = selected ? (
    <div
      className={`absolute inset-y-0 right-0 w-full sm:w-[380px] bg-white shadow-2xl z-[1100] transform transition-transform duration-300 flex flex-col ${
        detailOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-4 border-b border-stone-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-bold text-stone-800 text-sm">Detalhes da Coleta</h2>
          <p className="text-[11px] text-stone-400 mt-0.5">#{String(selected.id).padStart(6, '0')}</p>
        </div>
        <button onClick={() => setDetailOpen(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
          <X className="w-4.5 h-4.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto nice-scroll p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-stone-800 text-sm">{selected.user_name}</p>
            <p className="text-[11px] text-stone-400">ID: {paddedId(selected.user_id)}</p>
          </div>
          <StatusBadge status={selected.status} label={selected.status_label} />
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-stone-400">Telefone</dt>
            <dd className="font-medium text-stone-800">
              <a href={`tel:${(selected.user_phone || '').replace(/\D/g, '')}`} className="hover:underline">
                {selected.user_phone || '—'}
              </a>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-stone-400">Data</dt>
            <dd className="font-medium text-stone-800">{formatDate(selected.date)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-stone-400">Horário</dt>
            <dd className="font-medium text-stone-800">{cap(selected.period)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-stone-400">Endereço</dt>
            <dd className="font-medium text-stone-800 text-right">{fullAddress(selected)}</dd>
          </div>
          {selected.observations && (
            <div className="flex gap-3">
              <dt className="text-stone-400 flex items-start gap-1">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5" /> Obs
              </dt>
              <dd className="font-medium text-stone-800 text-right">{selected.observations}</dd>
            </div>
          )}
        </dl>

        { }
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Materiais</p>
          <div className="flex flex-wrap gap-1.5">
            {(selected.materials || []).map((m, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-[#f4f7f0] border border-[#e4ecda] text-[11px] font-medium text-[#364a25]"
              >
                {m.type}: {m.quantity}kg
              </span>
            ))}
          </div>
        </div>

        { }
        {['aceita', 'agendada', 'em_coleta', 'concluida'].includes(selected.status) && (
          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <button
              onClick={() => setChatCollapsed((o) => !o)}
              className="w-full p-3 bg-blue-50 flex items-center justify-between hover:bg-blue-100/60 transition-colors"
              title={chatCollapsed ? 'Mostrar chat' : 'Ocultar chat'}
            >
              <h3 className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Chat com {selected.user_name}
              </h3>
              <span className="flex items-center gap-2">
                {!chatCollapsed && chatMessages.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white border border-blue-200 text-[10px] font-bold text-blue-700">
                    {chatMessages.length}
                  </span>
                )}
                {chatCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-stone-500" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-stone-500" />
                )}
              </span>
            </button>
            {!chatCollapsed && (
              <>
                <div className="h-[200px] sm:h-[220px] overflow-y-auto nice-scroll p-3 space-y-2">
                  {chatLoading ? (
                    <p className="text-xs text-stone-400 text-center py-4">Carregando...</p>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-4">Envie uma mensagem para iniciar a conversa.</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender_type === 'company' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                            msg.sender_type === 'company' ? 'bg-[#4a6741] text-white' : 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          <p>{msg.message}</p>
                          <p className={`text-[9px] mt-1 ${msg.sender_type === 'company' ? 'text-green-100' : 'text-stone-400'}`}>
                            {new Date(msg.created_at + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2.5 border-t border-stone-100">
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
              </>
            )}
          </div>
        )}
      </div>

      { }
      <div className="p-3 border-t border-stone-100 shrink-0 bg-[#faf8f5]">
        {selected.status === 'pendente' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateStatus(selected, 'aceita')}
              disabled={busyId === selected.id}
              className="py-2 rounded-lg bg-[#4a6741] text-white text-xs font-semibold hover:bg-[#364a25] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Aceitar
            </button>
            <button
              onClick={() => updateStatus(selected, 'recusada')}
              disabled={busyId === selected.id}
              className="py-2 rounded-lg bg-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Recusar
            </button>
          </div>
        ) : NEXT_ACTION[selected.status] ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateStatus(selected, NEXT_ACTION[selected.status].next)}
              disabled={busyId === selected.id}
              className="py-2 rounded-lg bg-[#4a6741] text-white text-xs font-semibold hover:bg-[#364a25] disabled:opacity-50"
            >
              {NEXT_ACTION[selected.status].label}
            </button>
            <button
              onClick={() => updateStatus(selected, 'cancelada')}
              disabled={busyId === selected.id}
              className="py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <p className="text-center text-[11px] text-stone-400 py-1">Nenhuma ação disponível para este status.</p>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#f7f6f3]">
      { }
      <header className="h-14 shrink-0 bg-white border-b border-stone-200 flex items-center gap-3 px-4 sm:px-6 relative z-[1200]">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-[#4a6741] flex items-center justify-center text-white text-sm font-bold">
            ♻
          </span>
          <span className="text-lg font-bold tracking-tight text-[#4a6741]">
            Recicla<span className="text-[#6b8f47]">Já</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {MENU_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#e4ecda] text-[#364a25]'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link to="/notificacoes" className="relative p-2 rounded-lg hover:bg-stone-100 text-stone-500" title="Notificações">
            <Bell className="w-[18px] h-[18px]" />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <button
            onClick={() => navigate('/empresa/perfil')}
            className="w-8 h-8 rounded-full bg-[#c9d9b5] text-[#364a25] font-bold text-sm flex items-center justify-center"
            title={company?.name || 'Perfil'}
          >
            {(company?.name || 'E').charAt(0).toUpperCase()}
          </button>
          <button onClick={logout} className="hidden sm:block text-sm font-medium text-stone-500 hover:text-red-600">
            Sair
          </button>
          <button className="md:hidden p-1.5 text-stone-600" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-stone-200 shadow-lg md:hidden p-3 space-y-1 z-50">
            {MENU_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-[#e4ecda] text-[#364a25]' : 'text-stone-700 hover:bg-stone-100'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/empresa/perfil" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-stone-700">
              Meu perfil
            </Link>
            <button onClick={logout} className="block w-full text-left px-3 py-2 text-sm font-medium text-red-600">
              Sair
            </button>
          </div>
        )}
      </header>

      { }
      { }
      <div className="lg:hidden shrink-0 bg-white border-b border-stone-200 px-3 py-2 flex items-center gap-2">
        <div className="flex-1 grid grid-cols-2 gap-1 bg-stone-100 rounded-lg p-1">
          <button
            onClick={() => setMobileView('map')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-semibold transition-colors ${
              mobileView === 'map' ? 'bg-white text-[#364a25] shadow-sm' : 'text-stone-500'
            }`}
          >
            <MapPin className="w-4 h-4" /> Mapa
            <span className={`text-[11px] font-bold ${mobileView === 'map' ? 'text-[#6b8f47]' : 'text-stone-400'}`}>
              {counts[''] || 0}
            </span>
          </button>
          <button
            onClick={() => setMobileView('list')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-semibold transition-colors ${
              mobileView === 'list' ? 'bg-white text-[#364a25] shadow-sm' : 'text-stone-500'
            }`}
          >
            <Search className="w-4 h-4" /> Lista
            <span className={`text-[11px] font-bold ${mobileView === 'list' ? 'text-[#6b8f47]' : 'text-stone-400'}`}>
              {filtered.length}
            </span>
          </button>
        </div>
      </div>

      { }
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        { }
        { }
        <aside
          className={`w-full lg:w-[27%] lg:min-w-[320px] lg:max-w-[420px] shrink-0 flex flex-col min-h-0 bg-white lg:border-b-0 lg:border-r border-stone-200 ${
            mobileView === 'list' ? 'flex-1' : 'hidden lg:flex'
          }`}
        >
          <div className="p-4 pb-3 space-y-3 border-b border-stone-100 shrink-0">
            { }
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome, endereço ou ID..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-[#faf8f5] text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-[#6b8f47] focus:ring-2 focus:ring-[#e4ecda] transition"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((o) => !o)}
                  title="Filtros"
                  className={`h-full px-3 rounded-xl border flex items-center transition-colors ${
                    filterOpen || materialFilter
                      ? 'border-[#6b8f47] bg-[#e4ecda] text-[#364a25]'
                      : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-stone-200 shadow-xl p-3 space-y-3 z-30">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">Material</label>
                      <select
                        value={materialFilter}
                        onChange={(e) => setMaterialFilter(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-xs bg-white outline-none focus:border-[#6b8f47]"
                      >
                        <option value="">Todos os materiais</option>
                        {materials.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={clearFilters}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>

            { }
            <div>
              <h2 className="text-sm font-bold text-stone-800">Solicitações de Coleta</h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {loading ? 'Carregando...' : `${filtered.length} de ${withCoords.length} solicitações`}
              </p>
            </div>

            { }
            <div className="flex flex-wrap gap-1.5">
              {[{ key: '', label: 'Todas' }, ...STATUS_META].map((s) => {
                const active = statusFilter === s.key;
                return (
                  <button
                    key={s.key || 'todas'}
                    onClick={() => setStatusFilter(s.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      active
                        ? 'bg-[#4a6741] border-[#4a6741] text-white shadow-sm'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-[#c9d9b5] hover:bg-[#f4f7f0]'
                    }`}
                  >
                    {s.label}
                    <span className={`ml-1 ${active ? 'text-white/70' : 'text-stone-400'}`}>{counts[s.key] || 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          { }
          <div className="flex-1 min-h-0 overflow-y-auto nice-scroll p-3 space-y-2.5 bg-[#faf8f5]">
            {loading ? (
              [0, 1, 2, 3].map((i) => <div key={i} className="h-[92px] rounded-xl bg-stone-200/60 animate-pulse" />)
            ) : error ? (
              <div className="bg-white rounded-xl border border-dashed border-stone-200 p-6 text-center">
                <p className="text-sm text-stone-500">Não foi possível carregar as solicitações.</p>
                <button
                  onClick={load}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-[#4a6741] text-white text-xs font-semibold hover:bg-[#364a25]"
                >
                  Tentar novamente
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-stone-200 p-8 text-center">
                <MapPin className="w-8 h-8 mx-auto text-stone-300" />
                <p className="mt-2 text-xs text-stone-400">
                  Nenhuma solicitação encontrada. Ajuste a busca ou os filtros.
                </p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectFromList(c)}
                  className={`w-full text-left bg-white rounded-xl border p-3.5 shadow-sm transition-all ${
                    selectedId === c.id
                      ? 'border-[#6b8f47] ring-1 ring-[#6b8f47] shadow-md'
                      : 'border-stone-100 hover:border-[#c9d9b5] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-stone-800 leading-tight truncate">{c.user_name}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">ID: {paddedId(c.user_id)}</p>
                    </div>
                    <StatusBadge status={c.status} label={c.status_label} />
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-stone-600">
                    <MapPin className="w-3.5 h-3.5 text-[#84a55e] shrink-0 mt-0.5" />
                    <span className="truncate">{fullAddress(c)}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {formatDate(c.date)} · {cap(c.period)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-stone-400" />
                      {totalKg(c)} kg
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        { }
        { }
        <section className={`relative flex-1 min-h-0 ${mobileView === 'map' ? 'block' : 'hidden lg:block'}`}>
          <div className="absolute inset-0 map-bleed">
            <MapContainer
              center={[-14.235, -51.9253]}
              zoom={5}
              minZoom={4}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ScaleControl position="bottomright" imperial={false} />
              <FitInitial points={points} />
              <FlyTo target={flyTarget} />
              <MapInvalidator trigger={mobileView} />
              {filtered.map((c) => (
                <MarkerItem
                  key={c.id}
                  c={c}
                  selected={c.id === selectedId}
                  openSignal={openSignal}
                  onSelect={handleMarkerSelect}
                >
                  <Popup className="map-popup" keepInView>
                    <PopupContent
                      c={c}
                      busy={busyId === c.id}
                      onDetails={() => goDetails(c)}
                      onZoom={() => zoomOnMap(c)}
                      onStatus={updateStatus}
                    />
                  </Popup>
                </MarkerItem>
              ))}
            </MapContainer>
          </div>

          { }
          {!loading && filtered.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[900]">
              <div className="bg-white/95 border border-stone-200 rounded-xl shadow-lg px-5 py-4 text-center">
                <MapPin className="w-6 h-6 mx-auto text-stone-300" />
                <p className="mt-1.5 text-sm font-medium text-stone-600">Nenhuma solicitação com localização</p>
                <p className="text-xs text-stone-400">Ajuste os filtros ou aguarde novas solicitações.</p>
              </div>
            </div>
          )}

          { }
          {detailOpen && (
            <button
              onClick={() => setDetailOpen(false)}
              aria-label="Fechar detalhes"
              className="absolute inset-0 z-[1050] bg-black/20 sm:bg-transparent cursor-default"
              tabIndex={-1}
            />
          )}

          { }
          {detailPanel}

          { }
          {toast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1200] bg-[#364a25] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl animate-[fadeIn_.2s_ease-out]">
              {toast}
            </div>
          )}

          { }
          <div className="absolute left-3 bottom-3 lg:left-4 lg:bottom-4 z-[1000] bg-white/95 backdrop-blur border border-stone-200 rounded-xl shadow-lg px-3 py-2.5 lg:px-3.5 lg:py-3">
            <button
              onClick={() => setLegendOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 lg:cursor-default"
              aria-expanded={legendOpen}
            >
              Legenda
              <ChevronDown className={`w-3.5 h-3.5 transition-transform lg:hidden ${legendOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`${legendOpen ? 'grid' : 'hidden'} lg:grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 lg:mt-2`}>
              {STATUS_META.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-stone-600">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
