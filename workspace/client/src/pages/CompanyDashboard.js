import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Recycle, Calendar, CheckCircle, Clock, Truck, Users, MapPin, ArrowRight } from '../components/Icons';

export default function CompanyDashboard() {
  const { company, userCity } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Collection requests state
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  useEffect(() => {
    api('/collections/dashboard')
      .then((d) => setStats(d.dashboard))
      .catch((err) => {
        // Se a empresa não está aprovada, redireciona pra tela de pendente
        if (err.message?.includes('não aprovada')) {
          navigate('/empresa/pendente');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Load collection requests for this company's city
  useEffect(() => {
    setCollectionsLoading(true);
    api('/collections')
      .then((d) => setCollections(d.collections))
      .catch(() => {})
      .finally(() => setCollectionsLoading(false));
  }, []);

  const cards = [
    { label: 'Solicitações', value: stats?.total ?? 0, color: 'bg-[#f4f7f0] text-[#415a2b] border-[#e4ecda]', icon: <Recycle className="w-4 h-4" /> },
    { label: 'Agendadas', value: stats?.scheduled ?? 0, color: 'bg-blue-50 text-blue-700 border-blue-100', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Pendentes', value: stats?.pending ?? 0, color: 'bg-amber-50 text-amber-700 border-amber-100', icon: <Clock className="w-4 h-4" /> },
    { label: 'Realizadas', value: stats?.completed ?? 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Coletados (kg)', value: stats?.collectedWeight ?? 0, color: 'bg-teal-50 text-teal-700 border-teal-100', icon: <Truck className="w-4 h-4" /> },
    { label: 'Clientes', value: stats?.clientsServed ?? 0, color: 'bg-purple-50 text-purple-700 border-purple-100', icon: <Users className="w-4 h-4" /> }
  ];

  const statusOrder = [
    ['pendente', 'Pendentes', '#f59e0b'],
    ['aceita', 'Aceitas', '#3b82f6'],
    ['agendada', 'Agendadas', '#6366f1'],
    ['em_coleta', 'Em coleta', '#a855f7'],
    ['concluida', 'Concluídas', '#16a34a'],
    ['cancelada', 'Canceladas', '#ef4444']
  ];

  const maxDate = Math.max(1, ...Object.values(stats?.byDate || {}));
  const dateEntries = Object.entries(stats?.byDate || {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-800">{company?.name}</h1>
          <p className="mt-0.5 text-sm text-stone-500">Visão geral das coletas da sua empresa.{userCity && <> Coletas em <strong className="text-stone-700">{userCity}</strong>.</>}</p>
        </div>
        <div>
          <Link to="/empresa/mapa" className="tap-scale inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-11 rounded-xl bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors text-sm w-full sm:w-auto">
            Ver no mapa <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {cards.map((c) => (
              <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">{c.icon}</div>
                  <span className="text-xl font-extrabold">{c.value}</span>
                </div>
                <p className="mt-1.5 text-xs font-medium text-stone-500">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-stone-100 p-5">
              <h2 className="font-bold text-stone-800 mb-4 text-sm">Distribuição por status</h2>
              {!stats || stats.total === 0 ? (
                <p className="text-xs text-stone-400">Nenhuma solicitação ainda.</p>
              ) : (
                <div className="space-y-3">
                  {statusOrder.map(([key, label, color]) => {
                    const count = stats?.byStatus[key] || 0;
                    const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-medium text-stone-600">{label}</span>
                          <span className="text-stone-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-stone-100 p-5">
              <h2 className="font-bold text-stone-800 mb-4 text-sm">Coletas por data</h2>
              {dateEntries.length === 0 ? (
                <p className="text-xs text-stone-400">Nenhuma coleta agendada.</p>
              ) : (
                <div className="flex items-end gap-2 h-44">
                  {dateEntries.map(([date, count]) => (
                    <div key={date} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                      <span className="text-[10px] font-bold text-stone-500">{count}</span>
                      <div
                        className="w-full max-w-[40px] rounded-t bg-[#84a55e]"
                        style={{ height: `${Math.max(8, (count / maxDate) * 72)}%` }}
                      />
                      <span className="text-[10px] text-stone-400 whitespace-nowrap">
                        {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collection Requests List */}
          <div className="mt-5 bg-white rounded-xl border border-stone-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
                <Recycle className="w-4 h-4 text-[#6b8f47]" />
                Solicitações Recentes
              </h2>
              <Link to="/empresa/mapa" className="text-xs text-[#6b8f47] font-semibold hover:underline flex items-center gap-1">
                Ver no mapa <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {collectionsLoading ? (
              <p className="text-stone-400 text-xs">Carregando solicitações...</p>
            ) : collections.length === 0 ? (
              <div className="text-center py-6">
                <Recycle className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                <p className="text-xs text-stone-400">Nenhuma solicitação na sua região.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collections.slice(0, 8).map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#f4f7f0] text-[#537236] flex items-center justify-center">
                        <Recycle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-stone-800 text-sm">{c.user_name}</p>
                        <p className="text-[11px] text-stone-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.address.neighborhood}, {c.address.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-stone-500">
                        {c.materials.map((m) => m.type).join(', ')}
                      </div>
                      <StatusBadge status={c.status} label={c.status_label} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 bg-white rounded-xl border border-stone-100 p-5 flex flex-wrap items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f4f7f0] text-[#537236] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-700">Base de operação</p>
              <p className="text-xs text-stone-500">{company?.street}, {company?.number} · {company?.neighborhood}, {company?.city}/{company?.state}</p>
            </div>
            <div className="ml-auto flex gap-1.5">
              <Link to="/empresa/mapa" className="px-3 py-1.5 rounded-lg bg-[#f4f7f0] text-[#537236] text-xs font-semibold hover:bg-[#e4ecda] transition-colors">Mapa</Link>
              <Link to="/empresa/agenda" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors">Agenda</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}