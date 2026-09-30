// Titulo: Login
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por Login.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';

export default function Login() {
  const [mode, setMode] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, as: mode })
      });
      login(data.token, data.role);
      if (data.role === 'admin') {
        navigate('/admin');
      } else if (data.role === 'company' && data.company?.is_approved === 0) {
        navigate('/empresa/pendente');
      } else {
        navigate(data.role === 'user' ? '/dashboard' : '/empresa/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#faf8f5] py-12 px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-2xl border border-stone-100 p-7">
          <div className="text-center mb-7">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#4a6741] flex items-center justify-center text-white text-lg font-bold">
              ♻
            </div>
            <h1 className="mt-3 text-xl font-bold text-stone-800">Entrar no ReciclaJá</h1>
            <p className="mt-1 text-sm text-stone-400">Acesse sua conta pra agendar ou gerenciar coletas</p>
          </div>

          <div className="grid grid-cols-2 gap-1 bg-stone-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('user')}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${mode === 'user' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
            >
              Usuário
            </button>
            <button
              type="button"
              onClick={() => setMode('company')}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${mode === 'company' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
            >
              Empresa
            </button>
          </div>

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
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none transition-colors text-sm"
              />
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/esqueci-senha" className="text-[#6b8f47] hover:text-[#537236] font-medium">
              Esqueci minha senha
            </Link>
            <span className="text-stone-300">|</span>
            <Link to="/cadastro" className="text-[#6b8f47] hover:text-[#537236] font-medium">
              Criar uma conta
            </Link>
          </div>

          <div className="mt-6 pt-5 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400">
              {mode === 'user'
                ? 'Entrando como usuário. '
                : 'Entrando como empresa. '}
              <button
                onClick={() => setMode(mode === 'user' ? 'company' : 'user')}
                className="text-[#6b8f47] font-medium hover:underline"
              >
                Trocar para {mode === 'user' ? 'empresa' : 'usuário'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}