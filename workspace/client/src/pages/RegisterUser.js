// Titulo: RegisterUser
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por RegisterUser.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import AddressFields from '../components/AddressFields';

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none transition-colors text-sm';

export default function RegisterUser() {
  const [form, setForm] = useState({
    name: '', cpf: '', email: '', phone: '', password: '',
    cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState('email');
  const [pendingId, setPendingId] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/register/user', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          email: channel === 'email' ? form.email : '',
          phone: channel === 'phone' ? form.phone : ''
        })
      });
      setPendingId(data.pendingId);
      setCodeSent(true);
    } catch (err) {
      setError(err.message || 'Erro no cadastro');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/register/user/verify', {
        method: 'POST',
        body: JSON.stringify({ pendingId, code })
      });
      login(data.token, 'user');
      navigate('/agendar-coleta', { state: { welcome: true } });
    } catch (err) {
      setError(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError('');
    setLoading(true);
    try {
      await api('/auth/register/user/resend', {
        method: 'POST',
        body: JSON.stringify({ pendingId })
      });
      setCodeSent(true);
    } catch (err) {
      setError(err.message || 'Não foi possível reenviar o código');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-[#faf8f5] px-4 py-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-stone-100 p-7">
          <div className="text-center mb-7">
            <h1 className="text-xl font-bold text-stone-800">Cadastro de usuário</h1>
            <p className="mt-1 text-sm text-stone-400">Crie sua conta pra agendar coletas</p>
          </div>

          {pendingId ? (
            <form onSubmit={handleVerify} className="space-y-3.5">
              <p className="text-sm text-stone-500 text-center">
                {codeSent ? 'Enviamos um código de seis dígitos para o contato informado.' : 'Confirme seu contato para ativar a conta.'}
              </p>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Código de verificação</label>
                <input className={inputClass} inputMode="numeric" autoComplete="one-time-code" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required minLength={6} />
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold disabled:opacity-60">
                {loading ? 'Verificando...' : 'Verificar e criar conta'}
              </button>
              <button type="button" disabled={loading} onClick={resendCode} className="w-full text-sm text-[#6b8f47] font-medium">
                Reenviar código
              </button>
            </form>
          ) : <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome completo</label>
                <input className={inputClass} value={form.name} required onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">CPF</label>
                <input className={inputClass} value={form.cpf} required onChange={(e) => setField('cpf', e.target.value.replace(/\D/g, '').slice(0, 11))} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Contato para login e verificação</label>
                <select className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone (SMS)</option>
                </select>
                {channel === 'email' ? (
                  <input type="email" className={`${inputClass} mt-2`} value={form.email} required
                    placeholder="voce@email.com" onChange={(e) => setField('email', e.target.value)} />
                ) : (
                  <>
                    <input type="tel" className={`${inputClass} mt-2`} value={form.phone} required
                      placeholder="+14155552671" onChange={(e) => setField('phone', e.target.value)} />
                    <p className="mt-1 text-xs text-stone-400">Use o formato internacional E.164, incluindo o código do país (ex.: +14155552671). Não adicionamos o código automaticamente.</p>
                  </>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
                <input type="password" className={inputClass} value={form.password} required minLength={6} onChange={(e) => setField('password', e.target.value)} />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100">
              <h3 className="font-semibold text-stone-800 text-sm mb-3">Endereço principal</h3>
              <AddressFields values={form} onChange={setField} />
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}

            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors disabled:opacity-60">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>}

          <p className="mt-5 text-center text-sm text-stone-400">
            Já tem conta? <Link to="/login" className="text-[#6b8f47] font-medium hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}