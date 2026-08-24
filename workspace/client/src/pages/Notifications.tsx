import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import type { Notification } from '../types';
import { Bell, CheckCircle, Truck, Calendar, XCircle, Recycle, MapPin } from '../components/Icons';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bem_vindo: <Recycle className="w-4 h-4" />,
  solicitacao_recebida: <CheckCircle className="w-4 h-4" />,
  nova_solicitacao: <Recycle className="w-4 h-4" />,
  coleta_aceita: <CheckCircle className="w-4 h-4" />,
  coleta_agendada: <Calendar className="w-4 h-4" />,
  coleta_em_coleta: <Truck className="w-4 h-4" />,
  coleta_concluida: <CheckCircle className="w-4 h-4" />,
  coleta_cancelada: <XCircle className="w-4 h-4" />
};

export default function Notifications() {
  const { role, refreshUnread } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const d = await api<{ notifications: Notification[] }>('/notifications');
      setNotifications(d.notifications);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: number) {
    await api(`/notifications/${id}/read`, { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    refreshUnread();
  }

  async function markAllRead() {
    await api('/notifications/read-all', { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    refreshUnread();
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-800">Notificações</h1>
          <p className="mt-0.5 text-sm text-stone-500">Novidades das suas coletas.</p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="text-xs font-semibold text-[#6b8f47] hover:text-[#537236]">
            Marcar todas lidas
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Carregando...</p>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 p-10 text-center">
          <Bell className="w-10 h-10 mx-auto text-stone-300" />
          <p className="mt-3 text-sm text-stone-400">Nenhuma notificação.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => n.collection_id && markRead(n.id)}
              className={`w-full text-left flex gap-3 p-3.5 rounded-xl border transition-colors ${
                n.is_read ? 'bg-white border-stone-100' : 'bg-[#f4f7f0] border-[#e4ecda]'
              }`}
            >
              <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${n.is_read ? 'bg-stone-100 text-stone-400' : 'bg-[#e4ecda] text-[#537236]'}`}>
                {TYPE_ICONS[n.type] || <Bell className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${n.is_read ? 'text-stone-500' : 'font-medium text-stone-800'}`}>{n.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                  <span>{new Date(n.created_at + 'Z').toLocaleString('pt-BR')}</span>
                  {n.date && <span>{n.date} · {n.period}</span>}
                  {n.status && !n.is_read && <span className="text-[#6b8f47] font-semibold">Nova</span>}
                </div>
              </div>
              {n.collection_id && (
                <Link
                  to={role === 'user' ? '/minhas-coletas' : '/empresa/solicitacoes'}
                  className="self-center shrink-0 text-xs font-semibold text-[#6b8f47] hover:underline"
                >
                  Ver
                </Link>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
