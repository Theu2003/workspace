// Titulo: AdminDashboard
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por AdminDashboard.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import { Shield, CheckCircle, XCircle, Building, Users, Package, Clock, MessageSquare, Trash2, Send } from '../components/Icons';

export default function AdminDashboard() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMode, setConversationMode] = useState('active'); // 'active' = com conversa | 'all' = todas as aprovadas
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/login');
      return;
    }
    loadData();
  }, [role, navigate]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      const results = await Promise.allSettled([
        api('/admin/companies'),
        api('/admin/stats'),
        api('/admin/users'),
        api('/messages/conversations'),
      ]);

      const [companiesData, statsData, usersData, conversationsRes] = results;

      if (companiesData.status === 'fulfilled') setCompanies(companiesData.value.companies || []);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (usersData.status === 'fulfilled') setUsers(usersData.value.users || []);
      if (conversationsRes.status === 'fulfilled') setConversations(conversationsRes.value.conversations || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (companyId) => {
    try {
      const data = await api(`/messages/company/${companyId}`);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: selectedConversation, message: newMessage.trim() }),
      });
      setNewMessage('');
      await loadMessages(selectedConversation);
    } catch (err) {
      alert('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleApprove = async (companyId) => {
    if (!confirm('Aprovar esta empresa?')) return;
    setActionLoading(true);
    try {
      await api(`/admin/companies/${companyId}/approve`, { method: 'POST' });
      alert('Empresa aprovada!');
      loadData();
      setSelectedCompany(null);
    } catch (err) {
      alert(err.message || 'Erro ao aprovar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (companyId) => {
    if (!confirm('Rejeitar e remover esta empresa?')) return;
    setActionLoading(true);
    try {
      await api(`/admin/companies/${companyId}/reject`, { method: 'POST' });
      alert('Empresa rejeitada');
      loadData();
      setSelectedCompany(null);
    } catch (err) {
      alert(err.message || 'Erro ao rejeitar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId, companyName) => {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${companyName}"? Esta ação não pode ser desfeita.`)) return;
    setActionLoading(true);
    try {
      await api(`/admin/companies/${companyId}`, { method: 'DELETE' });
      alert('Empresa excluída com sucesso');
      loadData();
      setSelectedCompany(null);
      if (selectedConversation === companyId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      alert(err.message || 'Erro ao excluir empresa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) return;
    setActionLoading(true);
    try {
      await api(`/admin/users/${userId}`, { method: 'DELETE' });
      alert('Usuário excluído com sucesso');
      loadData();
    } catch (err) {
      alert(err.message || 'Erro ao excluir usuário');
    } finally {
      setActionLoading(false);
    }
  };

  if (role !== 'admin') return null;

  const pendingCompanies = companies.filter((c) => c.is_approved === 0);
  const approvedCompanies = companies.filter((c) => c.is_approved === 1);
  // Empresas aprovadas com conversa existente + todas as aprovadas (modo 'all')
  const conversationIds = new Set(conversations.map((c) => c.company_id));
  const messageTargets = conversationMode === 'active'
    ? conversations
    : approvedCompanies.map((c) => {
        const conv = conversations.find((cv) => cv.company_id === c.id);
        return {
          company_id: c.id,
          company_name: c.name,
          last_message_at: conv?.last_message_at || null,
          unread_count: conv?.unread_count || 0
        };
      });

  const tabs = [
    { id: 'pending', label: 'Pendentes', icon: <Clock className="w-4 h-4" />, count: pendingCompanies.length },
    { id: 'approved', label: 'Aprovadas', icon: <CheckCircle className="w-4 h-4" />, count: approvedCompanies.length },
    { id: 'messages', label: 'Mensagens', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" />, count: users.filter(u => u.role === 'user').length },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <div className="bg-stone-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Painel Admin</h1>
              <p className="text-stone-400 text-xs">Gerencie empresas, mensagens e aprovações</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Empresas', value: stats.totalCompanies, icon: <Building className="w-4 h-4" />, color: 'bg-blue-50 text-blue-700 border-blue-100' },
              { label: 'Pendentes', value: stats.pendingCompanies, icon: <Clock className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 border-amber-100' },
              { label: 'Aprovadas', value: stats.approvedCompanies, icon: <CheckCircle className="w-4 h-4" />, color: 'bg-[#f4f7f0] text-[#415a2b] border-[#e4ecda]' },
              { label: 'Usuários', value: stats.totalUsers, icon: <Users className="w-4 h-4" />, color: 'bg-purple-50 text-purple-700 border-purple-100' }
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">{s.icon}</div>
                  <div>
                    <p className="text-xl font-extrabold">{s.value}</p>
                    <p className="text-[11px] font-medium text-stone-500">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        { }
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-stone-800 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-stone-600' : 'bg-stone-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        { }
        {activeTab === 'pending' && (
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
                <div className="p-3.5 border-b border-stone-100 bg-amber-50">
                  <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Aguardando ({pendingCompanies.length})
                  </h2>
                </div>
                <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
                  {pendingCompanies.length === 0 ? (
                    <div className="p-5 text-center text-stone-400 text-sm">
                      <CheckCircle className="w-8 h-8 mx-auto text-[#a6bf87] mb-1.5" />
                      Nenhuma empresa pendente
                    </div>
                  ) : (
                    pendingCompanies.map((company) => (
                      <div
                        key={company.id}
                        className={`p-3.5 cursor-pointer hover:bg-stone-50 transition-colors ${
                          selectedCompany?.id === company.id ? 'bg-amber-50 border-l-2 border-amber-500' : ''
                        }`}
                        onClick={() => setSelectedCompany(company)}
                      >
                        <p className="font-semibold text-stone-800 text-sm">{company.name}</p>
                        <p className="text-xs text-stone-500">CNPJ: {company.cnpj}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">{company.city} - {company.state}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedCompany ? (
                <div className="bg-white rounded-xl border border-stone-100">
                  <div className="p-5 border-b border-stone-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-stone-800">{selectedCompany.name}</h2>
                        <p className="text-sm text-stone-500">{selectedCompany.responsible}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selectedCompany.is_approved ? 'bg-[#e4ecda] text-[#364a25]' : 'bg-amber-100 text-amber-700'}`}>
                          {selectedCompany.is_approved ? 'Aprovada' : 'Pendente'}
                        </span>
                        <button
                          onClick={() => handleDeleteCompany(selectedCompany.id, selectedCompany.name)}
                          disabled={actionLoading}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="bg-stone-50 rounded-lg p-4">
                      <h3 className="font-semibold text-stone-800 text-sm mb-2 flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-blue-600" /> Dados
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div><p className="text-stone-400 text-xs">CNPJ</p><p className="font-medium text-stone-800">{selectedCompany.cnpj}</p></div>
                        <div><p className="text-stone-400 text-xs">Telefone</p><p className="font-medium text-stone-800">{selectedCompany.phone}</p></div>
                        <div><p className="text-stone-400 text-xs">E-mail</p><p className="font-medium text-stone-800">{selectedCompany.email}</p></div>
                        <div><p className="text-stone-400 text-xs">CEP</p><p className="font-medium text-stone-800">{selectedCompany.cep}</p></div>
                      </div>
                    </div>

                    <div className="bg-stone-50 rounded-lg p-4">
                      <h3 className="font-semibold text-stone-800 text-sm mb-2">📍 Endereço</h3>
                      <p className="text-sm text-stone-600">
                        {selectedCompany.street}, {selectedCompany.number}{selectedCompany.complement ? ` - ${selectedCompany.complement}` : ''}
                      </p>
                      <p className="text-sm text-stone-600">
                        {selectedCompany.neighborhood} - {selectedCompany.city}/{selectedCompany.state}
                      </p>
                    </div>

                    <div className="bg-stone-50 rounded-lg p-4">
                      <h3 className="font-semibold text-stone-800 text-sm mb-2 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-[#6b8f47]" /> Materiais
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedCompany.materials || []).map((material, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-[#e4ecda] text-[#364a25] rounded-full text-xs font-medium">
                            {material}
                          </span>
                        ))}
                      </div>
                    </div>

                    {!selectedCompany.is_approved && (
                      <div className="flex gap-3 pt-3">
                        <button
                          onClick={() => handleApprove(selectedCompany.id)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {actionLoading ? 'Processando...' : 'Aprovar'}
                        </button>
                        <button
                          onClick={() => handleReject(selectedCompany.id)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          {actionLoading ? 'Processando...' : 'Rejeitar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-100 p-10 text-center">
                  <Shield className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <h3 className="font-bold text-stone-800">Selecione uma empresa</h3>
                  <p className="text-sm text-stone-400 mt-1">Clique pra ver detalhes e tomar decisão.</p>
                </div>
              )}
            </div>
          </div>
        )}

        { }
        {activeTab === 'approved' && (
          <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
            <div className="p-3.5 border-b border-stone-100 bg-[#f4f7f0]">
              <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#6b8f47]" />
                Aprovadas ({approvedCompanies.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Nome</th>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">CNPJ</th>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Cidade</th>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Materiais</th>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Cadastrado</th>
                    <th className="text-right px-4 py-2.5 font-medium text-stone-500 text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {approvedCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-medium text-stone-800">{company.name}</td>
                      <td className="px-4 py-2.5 text-stone-500">{company.cnpj}</td>
                      <td className="px-4 py-2.5 text-stone-500">{company.city}/{company.state}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(company.materials || []).slice(0, 3).map((m, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#e4ecda] text-[#364a25] rounded text-[11px] font-medium">{m}</span>
                          ))}
                          {(company.materials || []).length > 3 && (
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded text-[11px]">+{(company.materials || []).length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-stone-400 text-xs">
                        {new Date(company.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteCompany(company.id, company.name)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {approvedCompanies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-stone-400 text-sm">
                        Nenhuma empresa aprovada ainda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        { }
        {activeTab === 'messages' && (
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
                <div className="p-3.5 border-b border-stone-100 bg-blue-50">
                  <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Empresas ({messageTargets.length})
                  </h2>
                  <div className="mt-2.5 grid grid-cols-2 gap-1 bg-stone-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setConversationMode('active')}
                      className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                        conversationMode === 'active' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
                      }`}
                    >
                      Com conversa
                    </button>
                    <button
                      type="button"
                      onClick={() => setConversationMode('all')}
                      className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                        conversationMode === 'all' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
                      }`}
                    >
                      Todas aprovadas
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
                  {messageTargets.length === 0 ? (
                    <div className="p-5 text-center text-stone-400 text-sm">
                      <MessageSquare className="w-8 h-8 mx-auto text-stone-300 mb-1.5" />
                      {conversationMode === 'active' ? 'Nenhuma conversa ainda — use "Todas aprovadas" para iniciar' : 'Nenhuma empresa aprovada'}
                    </div>
                  ) : (
                    messageTargets.map((conv) => (
                      <div
                        key={conv.company_id}
                        className={`p-3.5 cursor-pointer hover:bg-stone-50 transition-colors ${
                          selectedConversation === conv.company_id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                        }`}
                        onClick={() => setSelectedConversation(conv.company_id)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-stone-800 text-sm">{conv.company_name}</p>
                            <p className="text-[11px] text-stone-400">
                              {conv.last_message_at
                                ? new Date(conv.last_message_at + 'Z').toLocaleString('pt-BR')
                                : 'Sem mensagens ainda'}
                            </p>
                          </div>
                          {conv.unread_count > 0 && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-[10px] font-bold">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedConversation ? (
                <div className="bg-white rounded-xl border border-stone-100 flex flex-col h-[600px]">
                  <div className="p-4 border-b border-stone-100">
                    <h3 className="font-bold text-stone-800">
                      {conversations.find(c => c.company_id === selectedConversation)?.company_name
                        || companies.find(c => c.id === selectedConversation)?.name}
                    </h3>
                    <p className="text-[11px] text-stone-400 mt-0.5">A mensagem chega como notificação para a empresa</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center py-8 text-stone-400 text-sm">
                        <Send className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                        Nenhuma mensagem ainda. Envie a primeira!
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-xl p-3 ${
                            msg.sender_type === 'admin'
                              ? 'bg-[#4a6741] text-white'
                              : 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_type === 'admin' ? 'text-green-100' : 'text-stone-400'}`}>
                            {new Date(msg.created_at + 'Z').toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-stone-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6741] focus:border-transparent"
                        disabled={sendingMessage}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="px-4 py-2.5 rounded-xl bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-100 p-10 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <h3 className="font-bold text-stone-800">Selecione uma conversa</h3>
                  <p className="text-sm text-stone-400 mt-1">Escolha uma empresa para enviar mensagens.</p>
                </div>
              )}
            </div>
          </div>
        )}

        { }
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
            <div className="p-3.5 border-b border-stone-100 bg-purple-50">
              <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                Usuários ({users.filter(u => u.role === 'user').length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Nome</th>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">E-mail</th>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Telefone</th>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">CPF</th>
                    <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Cadastrado</th>
                    <th className="text-right px-4 py-2.5 font-medium text-stone-500 text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.filter(u => u.role === 'user').map((user) => (
                    <tr key={user.id} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-medium text-stone-800">{user.name}</td>
                      <td className="px-4 py-2.5 text-stone-500">{user.email}</td>
                      <td className="px-4 py-2.5 text-stone-500">{user.phone}</td>
                      <td className="px-4 py-2.5 text-stone-500">{user.cpf}</td>
                      <td className="px-4 py-2.5 text-stone-400 text-xs">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => u.role === 'user').length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-stone-400 text-sm">
                        Nenhum usuário cadastrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}