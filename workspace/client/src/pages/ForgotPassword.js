// Titulo: ForgotPassword
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por ForgotPassword.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { CheckCircle } from '../components/Icons';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {

      await api('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ identifier })
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Não foi possível solicitar a redefinição');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ identifier, code, newPassword })
      });
      setSent(false);
      setCompleted(true);
      setCode('');
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Código inválido ou expirado');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError('');
    setLoading(true);
    try {
      await api('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ identifier })
      });
    } catch {
      // Keep the response generic to avoid account enumeration.
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[#faf8f5] px-4 py-4">
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-2xl border border-stone-100 p-7">
          {completed ? (
            <div className="text-center py-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#e4ecda] text-[#4a6741] flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-stone-800">Senha redefinida</h1>
              <p className="mt-2 text-stone-500 text-sm">Agora você já pode entrar com sua nova senha.</p>
              <Link to="/login" className="mt-5 inline-block text-sm text-[#6b8f47] font-medium hover:underline">Voltar pro login</Link>
            </div>
          ) : sent ? (
            <div className="text-center py-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#e4ecda] text-[#4a6741] flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-stone-800">Solicitação recebida</h1>
              <p className="mt-2 text-stone-500 text-sm leading-relaxed">
                Se existir uma conta, enviaremos um código ao contato principal já cadastrado. Digite-o abaixo para redefinir a senha.
              </p>
              <form onSubmit={handleReset} className="mt-5 text-left space-y-3.5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Código de verificação</label>
                  <input className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-sm" inputMode="numeric"
                    autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required minLength={6} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nova senha</label>
                  <input type="password" className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-sm"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                </div>
                {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}
                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold disabled:opacity-60">
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </button>
                <button type="button" disabled={loading} onClick={resendCode} className="w-full text-sm text-[#6b8f47] font-medium">
                  Reenviar código
                </button>
              </form>
              <Link to="/login" className="mt-4 inline-block text-sm text-[#6b8f47] font-medium hover:underline">Voltar pro login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-stone-800 text-center mb-1">Esqueci minha senha</h1>
              <p className="text-sm text-stone-400 text-center mb-6">
                Informe o e-mail ou telefone já cadastrado na conta.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">E-mail ou telefone</label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="voce@email.com ou +14155552671"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none transition-colors text-sm"
                  />
                </div>
                {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}
                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors disabled:opacity-60">
                  {loading ? 'Enviando...' : 'Enviar instruções'}
                </button>
              </form>
              <p className="mt-4 text-center text-sm text-stone-400">
                Lembrou a senha? <Link to="/login" className="text-[#6b8f47] font-medium hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}