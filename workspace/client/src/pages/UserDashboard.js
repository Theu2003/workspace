// Titulo: UserDashboard
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por UserDashboard.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import StatusBadge from '../components/StatusBadge';
import { Calendar, CheckCircle, Truck, MapPin, Clock, Recycle } from '../components/Icons';

export default function UserDashboard() {
  const { user, userCity } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/collections/user-dashboard')
      .then((d) => setStats(d.dashboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Solicitadas', value: stats?.total ?? 0, color: 'bg-[#f4f7f0] text-[#415a2b] border-[#e4ecda]', icon: <Recycle className="w-4 h-4" /> },
    { label: 'Agendadas', value: stats?.scheduled ?? 0, color: 'bg-blue-50 text-blue-700 border-blue-100', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Concluídas', value: stats?.completed ?? 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Total (kg)', value: stats?.totalWeight ?? 0, color: 'bg-amber-50 text-amber-700 border-amber-100', icon: <Truck className="w-4 h-4" /> }
  ];

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-800">Olá, {user?.name?.split(' ')[0]}!</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Acompanhe suas coletas e agende novas retiradas.{userCity && <> Empresa(s) disponível(is) em <strong className="text-stone-700">{userCity}</strong>.</>}
          </p>
        </div>
        <Link to="/agendar-coleta" className="tap-scale inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-11 rounded-xl bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors text-sm w-full sm:w-auto">
          <Calendar className="w-4 h-4" /> Agendar coleta
        </Link>
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

          <div className="mt-7">
            <h2 className="text-base font-bold text-stone-800 mb-3">Próximas coletas</h2>
            {stats?.upcoming?.length ? (
              <div className="space-y-2">
                {stats.upcoming.map((c) => (
                  <Link key={c.id} to="/minhas-coletas" className="block bg-white rounded-xl border border-stone-100 p-4 hover:border-[#c9d9b5] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#f4f7f0] text-[#537236] flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-800 text-sm">{c.date} · {c.period}</p>
                          <p className="text-xs text-stone-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{c.address.street}, {c.address.number} - {c.address.neighborhood}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 pl-11 sm:pl-0">
                        <div className="text-xs text-stone-500">
                          {c.materials.map((m) => `${m.type} (${m.quantity}kg)`).join(', ')}
                        </div>
                        <StatusBadge status={c.status} label={c.status_label} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-stone-200 p-8 text-center">
                <p className="text-stone-400 text-sm">Nenhuma coleta agendada ainda.</p>
                <Link to="/agendar-coleta" className="inline-block mt-3 text-sm text-[#6b8f47] font-medium hover:underline">
                  Agendar primeira coleta
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}