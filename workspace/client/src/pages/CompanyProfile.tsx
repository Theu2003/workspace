import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';
import AddressFields from '../components/AddressFields';

const MATERIAL_OPTIONS = ['Papel', 'Papelão', 'Plástico', 'Vidro', 'Metal', 'Eletrônicos', 'Óleo de cozinha', 'Outros'];

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none transition-colors text-sm';

export default function CompanyProfile() {
  const { company, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    name: '', responsible: '', phone: '', password: '',
    cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: ''
  });
  const [materials, setMaterials] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleMaterial(m: string) {
    setMaterials((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function save(e: React.FormEvent) {
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
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-stone-800 mb-1">Perfil da Empresa</h1>
      <p className="text-sm text-stone-500 mb-6">Gerencie os dados da sua empresa.</p>

      {msg && (
        <div className={`mb-5 px-3 py-2.5 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-[#f4f7f0] text-[#364a25] border border-[#e4ecda]' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={save} className="space-y-4">
        <section className="bg-white rounded-xl border border-stone-100 p-5">
          <h2 className="font-bold text-stone-800 text-sm mb-3">Dados da empresa</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
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
            <div className="col-span-2">
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
          <h2 className="font-bold text-stone-800 text-sm mb-2">Materiais coletados</h2>
          <div className="flex flex-wrap gap-1.5">
            {MATERIAL_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMaterial(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
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

        <button className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors">
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
