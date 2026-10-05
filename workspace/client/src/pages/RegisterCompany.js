// Titulo: RegisterCompany
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por RegisterCompany.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import AddressFields from '../components/AddressFields';

const MATERIAL_OPTIONS = ['Papel', 'Papelão', 'Plástico', 'Vidro', 'Metal', 'Eletrônicos', 'Óleo de cozinha', 'Outros'];

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none transition-colors text-sm';

export default function RegisterCompany() {
  const [form, setForm] = useState({
    name: '', cnpj: '', responsible: '', email: '', phone: '', password: '',
    cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: ''
  });
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleMaterial(m) {
    setMaterials((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (materials.length === 0) {
      setError('Selecione ao menos um tipo de material');
      return;
    }
    setLoading(true);
    try {
      const data = await api('/auth/register/company', {
        method: 'POST',
        body: JSON.stringify({ ...form, materials })
      });
      login(data.token, 'company');
      navigate('/empresa/pendente');
    } catch (err) {
      setError(err.message || 'Erro no cadastro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-[#faf8f5] px-4 py-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-stone-100 p-7">
          <div className="text-center mb-7">
            <div className="w-11 h-11 mx-auto rounded-xl bg-[#f4f7f0] text-[#537236] flex items-center justify-center text-lg">🚚</div>
            <h1 className="mt-3 text-xl font-bold text-stone-800">Cadastro de empresa coletora</h1>
            <p className="mt-1 text-sm text-stone-400">Cadastre sua empresa pra receber pedidos de coleta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome da empresa</label>
                <input className={inputClass} value={form.name} required onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">CNPJ</label>
                <input className={inputClass} value={form.cnpj} required onChange={(e) => setField('cnpj', e.target.value.replace(/\D/g, '').slice(0, 14))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Responsável</label>
                <input className={inputClass} value={form.responsible} required onChange={(e) => setField('responsible', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">E-mail</label>
                <input type="email" className={inputClass} value={form.email} required onChange={(e) => setField('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Telefone</label>
                <input className={inputClass} value={form.phone} required onChange={(e) => setField('phone', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
                <input type="password" className={inputClass} value={form.password} required minLength={6} onChange={(e) => setField('password', e.target.value)} />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100">
              <h3 className="font-semibold text-stone-800 text-sm mb-0.5">Endereço da empresa</h3>
              <p className="text-xs text-stone-400 mb-3">Usado pra calcular a distância das coletas</p>
              <AddressFields values={form} onChange={setField} />
            </div>

            <div className="pt-3 border-t border-stone-100">
              <h3 className="font-semibold text-stone-800 text-sm mb-1">Materiais que coleta</h3>
              <p className="text-xs text-stone-400 mb-2">Selecione todos que sua empresa recolhe</p>
              <div className="flex flex-wrap gap-1.5">
                {MATERIAL_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMaterial(m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      materials.includes(m)
                        ? 'bg-[#4a6741] border-[#4a6741] text-white'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-[#a6bf87]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}

            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors disabled:opacity-60">
              {loading ? 'Cadastrando...' : 'Cadastrar empresa'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-stone-400">
            Já tem conta? <Link to="/login" className="text-[#6b8f47] font-medium hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}