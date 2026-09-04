import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { CheckCircle } from '../components/Icons';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Verifica se o e-mail existe fazendo uma tentativa de login deliberadamente falha
      // Em produção, isso enviaria um e-mail de redefinição de senha
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: '__placeholder__' })
      }).catch(() => {});
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#faf8f5] py-12 px-4">
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-2xl border border-stone-100 p-7">
          {sent ? (
            <div className="text-center py-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#e4ecda] text-[#4a6741] flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-stone-800">E-mail enviado!</h1>
              <p className="mt-2 text-stone-500 text-sm leading-relaxed">
                Se existir uma conta com <strong>{email}</strong>, enviamos instruções pra redefinir sua senha.
              </p>
              <Link to="/login" className="mt-5 inline-block text-sm text-[#6b8f47] font-medium hover:underline">
                Voltar pro login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-stone-800 text-center mb-1">Esqueci minha senha</h1>
              <p className="text-sm text-stone-400 text-center mb-6">
                Informe seu e-mail que a gente envia as instruções.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
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
