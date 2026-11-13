// Titulo: UserProfile
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por UserProfile.
import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';
import AddressFields from '../components/AddressFields';

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none transition-colors text-sm';

export default function UserProfile() {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState({ name: '' });
  const [passwordCode, setPasswordCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '', cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: ''
  });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (user) setProfile({ name: user.name });
    api('/users/me')
      .then((d) => setAddresses(d.addresses))
      .catch(() => {});
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/users/me', { method: 'PUT', body: JSON.stringify({ name: profile.name }) });
      await refreshProfile();
      setMsg({ type: 'success', text: 'Perfil atualizado!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  async function requestPasswordCode() {
    setMsg(null);
    try {
      await api('/auth/password-change/request', { method: 'POST', body: JSON.stringify({}) });
      setPasswordCodeSent(true);
      setMsg({ type: 'success', text: 'Código enviado ao contato principal cadastrado.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/auth/password-change/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: passwordCode, newPassword })
      });
      setPasswordCode('');
      setNewPassword('');
      setPasswordCodeSent(false);
      setMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  function setNewField(field, value) {
    setNewAddress((a) => ({ ...a, [field]: value }));
  }

  async function addAddress(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/users/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...newAddress, isDefault: addresses.length === 0 })
      });
      const d = await api('/users/me');
      setAddresses(d.addresses);
      setShowNewAddress(false);
      setNewAddress({ label: '', cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: '' });
      setMsg({ type: 'success', text: 'Endereço adicionado!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  async function setDefault(id) {
    try {
      await api(`/users/addresses/${id}/default`, { method: 'POST' });
      const d = await api('/users/me');
      setAddresses(d.addresses);
    } catch {}
  }

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-extrabold text-stone-800 mb-6">Meu Perfil</h1>

      {msg && (
        <div className={`mb-5 px-3 py-2.5 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-[#f4f7f0] text-[#364a25] border border-[#e4ecda]' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-stone-100 p-5">
          <h2 className="font-bold text-stone-800 text-sm mb-3">Dados pessoais</h2>
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nome completo</label>
              <input className={inputClass} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Contato principal (não editável)</label>
              <input className={inputClass} value={user?.email || user?.phone || ''} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">CPF</label>
              <input className={inputClass} value={user?.cpf || ''} disabled />
            </div>
            <button className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors">
              Salvar alterações
            </button>
          </form>
          <div className="mt-5 border-t border-stone-100 pt-4">
            <h3 className="font-bold text-stone-800 text-sm mb-2">Alterar senha</h3>
            {!passwordCodeSent ? (
              <button type="button" onClick={requestPasswordCode} className="w-full py-2.5 rounded-lg border border-stone-200 text-sm font-semibold text-[#4a6741]">
                Enviar código ao contato cadastrado
              </button>
            ) : (
              <form onSubmit={changePassword} className="space-y-3">
                <input className={inputClass} inputMode="numeric" autoComplete="one-time-code" placeholder="Código de verificação"
                  value={passwordCode} onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required minLength={6} />
                <input type="password" className={inputClass} placeholder="Nova senha (mínimo 6 caracteres)"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                <button className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold">Confirmar nova senha</button>
              </form>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-stone-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 text-sm">Endereços de coleta</h2>
            <button onClick={() => setShowNewAddress(!showNewAddress)} className="text-xs font-semibold text-[#6b8f47] hover:text-[#537236]">
              {showNewAddress ? 'Cancelar' : '+ Novo'}
            </button>
          </div>

          {showNewAddress && (
            <form onSubmit={addAddress} className="mb-5 p-3.5 rounded-lg bg-[#f4f7f0] border border-[#e4ecda] space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome do endereço</label>
                <input className={inputClass} placeholder="Ex.: Casa, Trabalho" value={newAddress.label} onChange={(e) => setNewField('label', e.target.value)} />
              </div>
              <AddressFields values={newAddress} onChange={setNewField} />
              <button className="w-full py-2 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors text-sm">
                Adicionar
              </button>
            </form>
          )}

          <div className="space-y-2">
            {addresses.map((a) => (
              <div key={a.id} className="border border-stone-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800 text-sm">{a.label}</span>
                  {a.is_default === 1 ? (
                    <span className="text-[10px] font-bold text-[#537236] bg-[#e4ecda] px-1.5 py-0.5 rounded-full">PADRÃO</span>
                  ) : (
                    <button onClick={() => setDefault(a.id)} className="text-[11px] font-medium text-stone-500 hover:text-[#6b8f47]">
                      Definir padrão
                    </button>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">{a.street}, {a.number} - {a.neighborhood}</p>
                <p className="text-[11px] text-stone-400">{a.city}/{a.state} · CEP {a.cep}{a.complement && ` · ${a.complement}`}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}