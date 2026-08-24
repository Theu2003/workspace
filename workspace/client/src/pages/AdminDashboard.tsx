import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Shield, CheckCircle, XCircle, Building, Users, Package, Clock } from '../components/Icons';

interface Company {
  id: number;
  name: string;
  cnpj: string;
  responsible: string;
  email: string;
  phone: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  materials: string[];
  is_approved: number;
  created_at: string;
}

interface Stats {
  totalCompanies: number;
  pendingCompanies: number;
  approvedCompanies: number;
  totalUsers: number;
  totalCollections: number;
}

export default function AdminDashboard() {
  const { token, role } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/login');
      return;
    }
    loadData();
  }, [role, navigate, token]);

  const loadData = async () => {
    try {
      const [companiesRes, statsRes] = await Promise.all([
        fetch('/api/admin/companies', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const companiesData = await companiesRes.json();
      const statsData = await statsRes.json();

      setCompanies(companiesData.companies || []);
      setStats(statsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (companyId: number) => {
    if (!confirm('Aprovar esta empresa?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Empresa aprovada!');
        loadData();
        setSelectedCompany(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao aprovar');
      }
    } catch {
      alert('Erro ao aprovar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (companyId: number) => {
    if (!confirm('Rejeitar e remover esta empresa?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Empresa rejeitada');
        loadData();
        setSelectedCompany(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao rejeitar');
      }
    } catch {
      alert('Erro ao rejeitar');
    } finally {
      setActionLoading(false);
    }
  };

  if (role !== 'admin') return null;

  const pendingCompanies = companies.filter((c) => c.is_approved === 0);
  const approvedCompanies = companies.filter((c) => c.is_approved === 1);

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <div className="bg-stone-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold">Painel Admin</h1>
              <p className="text-stone-400 text-xs">Gerencie empresas e aprovações</p>
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
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selectedCompany.is_approved ? 'bg-[#e4ecda] text-[#364a25]' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedCompany.is_approved ? 'Aprovada' : 'Pendente'}
                    </span>
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
                      {selectedCompany.materials.map((material, idx) => (
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

        <div className="mt-6 bg-white rounded-xl border border-stone-100 overflow-hidden">
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
                        {company.materials.slice(0, 3).map((m, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#e4ecda] text-[#364a25] rounded text-[11px] font-medium">{m}</span>
                        ))}
                        {company.materials.length > 3 && (
                          <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded text-[11px]">+{company.materials.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-stone-400 text-xs">
                      {new Date(company.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {approvedCompanies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-stone-400 text-sm">
                      Nenhuma empresa aprovada ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
