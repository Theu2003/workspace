// Titulo: CompanyAgenda
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por CompanyAgenda.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Calendar, Clock, MapPin, Recycle } from '../components/Icons';
import { useAuth } from '../auth';

export default function CompanyAgenda() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [confirming, setConfirming] = useState(null);
  const { userCity } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/collections${selectedDate ? `?date=${selectedDate}` : ''}`);
      setCollections(d.collections.filter((c) => ['aceita', 'agendada', 'em_coleta', 'concluida'].includes(c.status)));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = collections.reduce((acc, c) => {
    (acc[c.date] = acc[c.date] || []).push(c);
    return acc;
  }, {});

  async function confirm(id) {
    setConfirming(id);
    try {
      await api(`/collections/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'agendada' }) });
      await load();
    } catch {
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-stone-800">Agenda da Empresa</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Planeje rotas e confirme coletas.{userCity && <> Coletas em <strong className="text-stone-700">{userCity}</strong>.</>}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-4 mb-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-600">
          <Calendar className="w-4 h-4 text-[#6b8f47]" /> Filtrar data
        </label>
        { }
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2.5 min-h-11 rounded-lg border border-stone-200 text-sm outline-none focus:border-[#6b8f47]"
        />
        {selectedDate && (
          <button onClick={() => setSelectedDate('')} className="px-3 py-2.5 min-h-11 text-xs font-medium text-stone-400 hover:text-red-500">
            Limpar
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Carregando...</p>
      ) : collections.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 p-10 text-center">
          <Recycle className="w-10 h-10 mx-auto text-stone-300" />
          <p className="mt-3 text-sm text-stone-400">Nenhuma coleta pra este período.</p>
        </div>
      ) : (
        Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([date, items]) => (
          <div key={date} className="mb-6">
            <h2 className="font-bold text-stone-800 mb-2.5 flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-[#6b8f47]" />
              {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              <span className="font-medium text-stone-400">({items.length})</span>
            </h2>
            <div className="space-y-2">
              {items.sort((a, b) => a.period.localeCompare(b.period)).map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-stone-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-stone-800 text-sm">{c.user_name}</p>
                      <StatusBadge status={c.status} label={c.status_label} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-stone-500">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-stone-400" /> {c.period}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-stone-400" /> {c.address.street}, {c.address.number} - {c.address.neighborhood}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-400">
                      {c.materials.map((m) => `${m.type}: ${m.quantity}kg`).join(' · ')}
                    </p>
                  </div>
                  { }
                  <div className="flex gap-2">
                    {c.status === 'aceita' && (
                      <button
                        onClick={() => confirm(c.id)}
                        disabled={confirming === c.id}
                        className="flex-1 sm:flex-none px-4 py-2.5 min-h-11 rounded-lg bg-[#4a6741] text-white text-xs font-semibold hover:bg-[#364a25] transition-colors disabled:opacity-60"
                      >
                        {confirming === c.id ? 'Confirmando...' : 'Confirmar'}
                      </button>
                    )}
                    <Link to="/empresa/mapa" className="flex-1 sm:flex-none text-center px-4 py-2.5 min-h-11 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors">
                      Mapa
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}