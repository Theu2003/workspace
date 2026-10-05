// Titulo: CompanyProfile
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por CompanyProfile.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import AddressFields from '../components/AddressFields';
import { Trash2 } from '../components/Icons';

const MATERIAL_OPTIONS = ['Papel', 'Papelão', 'Plástico', 'Vidro', 'Metal', 'Eletrônicos', 'Óleo de cozinha', 'Outros'];

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none transition-colors text-sm';

export default function CompanyProfile() {
  const { company, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', responsible: '', phone: '', password: '',
    cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: ''
  });
  const [materials, setMaterials] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name, responsible: company.responsible, phone: company.phone, password: '',
        cep: company.cep, state: company.state, city: company.city, neighborhood: company.neighborhood,
        street: company.street, number: company.number, complement: company.complement
      });
      setMaterials(company.materials);
    }
  }, [company]);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleMaterial(m) {
    setMaterials((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    if (materials.length === 0) {
      setMsg({ type: 'error', text: 'Selecione ao menos um material' });
      return;
    }
    try {
      await api('/companies/me', { method: 'PUT', body: JSON.stringify({ ...form, materials }) });
      await refreshProfile();
      setMsg({ type: 'success', text: 'Perfil atualizado!' });
      setForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  async function deleteAccount() {
    if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) return;
    if (!confirm('Última chance: realmente excluir sua conta e todos os dados?')) return;
    try {
      await api('/companies/me', { method: 'DELETE' });
      alert('Conta excluída com sucesso.');
      logout();
    } catch (err) {
      alert(err.message || 'Erro ao excluir conta');
    }
  }

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-extrabold text-stone-800 mb-1">Perfil da Empresa</h1>
      <p className="text-sm text-stone-500 mb-6">Gerencie os dados da sua empresa.</p>

      {msg && (
        <div className={`mb-5 px-3 py-2.5 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-[#f4f7f0] text-[#364a25] border border-[#e4ecda]' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={save} className="space-y-4">
        <section className="bg-white rounded-xl border border-stone-100 p-4 sm:p-5">
          <h2 className="font-bold text-stone-800 text-sm mb-3">Dados da empresa</h2>
          { }
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Nome</label>
              <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">CNPJ</label>
              <input className={inputClass} value={company?.cnpj || ''} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Responsável</label>
              <input className={inputClass} value={form.responsible} onChange={(e) => setField('responsible', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">E-mail</label>
              <input className={inputClass} value={company?.email || ''} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Telefone</label>
              <input className={inputClass} value={form.phone} onChange={(e) => setField('phone', e.target.value)} required />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Nova senha <span className="text-xs text-stone-400">(opcional)</span></label>
              <input type="password" className={inputClass} placeholder="Deixe vazio pra manter" value={form.password} onChange={(e) => setField('password', e.target.value)} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-stone-100 p-5">
          <h2 className="font-bold text-stone-800 text-sm mb-3">Endereço</h2>
          <AddressFields values={form} onChange={setField} />
        </section>

        <section className="bg-white rounded-xl border border-stone-100 p-5">
          <h2 className="font-bold text-stone-800 text-sm mb-3">Materiais coletados</h2>
          { }
          <div className="flex flex-wrap gap-2">
            {MATERIAL_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMaterial(m)}
                className={`px-4 py-2.5 min-h-11 rounded-full text-sm font-medium border transition-colors ${
                  materials.includes(m)
                    ? 'bg-[#4a6741] border-[#4a6741] text-white'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-[#c9d9b5]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <button className="w-full py-3 min-h-12 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors">
          Salvar alterações
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-stone-200">
        <h2 className="font-bold text-red-600 text-sm mb-2 flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" /> Zona de perigo
        </h2>
        <p className="text-xs text-stone-500 mb-3">Excluir sua conta removerá todos os seus dados permanentemente.</p>
        <button
          onClick={deleteAccount}
          className="w-full sm:w-auto px-5 py-3 min-h-11 rounded-lg border border-red-300 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
        >
          Excluir minha conta
        </button>
      </div>
    </div>
  );
}