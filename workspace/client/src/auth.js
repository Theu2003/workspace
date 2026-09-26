// ===================================================================
// auth.jsx — Context de autenticação (React Context API)
// ===================================================================
// Este arquivo gerencia o estado global de autenticação da aplicação.
// Ele fornece:
//   1. AuthProvider — Provedor que envolve toda a aplicação
//   2. useAuth()    — Hook para acessar dados de auth de qualquer componente
//
// O AuthProvider mantém:
//   - Token JWT (para autenticar requisições)
//   - Papel do usuário (user/company/admin)
//   - Dados do perfil (user ou company)
//   - Contagem de notificações não lidas
//
// Quando o app carrega, ele verifica se há um token salvo no localStorage
// e busca o perfil do usuário no servidor.
// ===================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import { api, clearAuth, getStoredRole, getToken, setAuth } from './api';

// ── Interface do contexto ───────────────────────────────────────────
/**
 * AuthContextValue — Define todos os valores e funções disponíveis
 * através do hook useAuth().
 */
const AuthContext = createContext(undefined);

// ── Provider de autenticação ────────────────────────────────────────
/**
 * AuthProvider — Componente que envolve toda a aplicação.
 * 
 * Fornece dados de autenticação para todos os componentes filhos.
 * 
 * Uso (no main.jsx):
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 */
export function AuthProvider({ children }) {
  // ── Estado ──────────────────────────────────────────────────────
  const [token, setToken] = useState(() => getToken());
  const [role, setRole] = useState(() => getStoredRole());
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [unread, setUnread] = useState(0);

  // ── Efeito: carregar perfil quando token/papel mudam ──────────────
  useEffect(() => {
    if (!token || !role) return;
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  // ── Efeito: verificar não lidas periodicamente ────────────────────
  useEffect(() => {
    if (!token) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  // ── Funções ──────────────────────────────────────────────────────

  /**
   * refreshProfile() — Busca os dados do perfil no servidor.
   * 
   * Para 'user': busca em /users/me
   * Para 'company': busca em /companies/me
   * Para 'admin': não busca (não tem perfil editável)
   */
  async function refreshProfile() {
    try {
      if (role === 'admin') {
        return;
      }
      if (role === 'user') {
        const data = await api('/users/me');
        setUser(data.user);
      } else {
        const data = await api('/companies/me');
        setCompany(data.company);
      }
    } catch {
      // Ignora erros (perfil pode falhar temporariamente)
    }
  }

  /**
   * refreshUnread() — Atualiza a contagem de notificações não lidas.
   * Chamada periodicamente e após ações que criam notificações.
   */
  async function refreshUnread() {
    try {
      const data = await api('/notifications/unread-count');
      setUnread(data.count);
    } catch {
      // Ignora erros
    }
  }

  /**
   * login() — Salva o token e papel após login bem-sucedido.
   * 
   * @param {string} tokenValue - Token JWT recebido do servidor
   * @param {string} roleValue  - Papel: 'user', 'company', ou 'admin'
   */
  function login(tokenValue, roleValue) {
    setAuth(tokenValue, roleValue);
    setToken(tokenValue);
    setRole(roleValue);
  }

  /**
   * logout() — Limpa todos os dados de autenticação e redireciona.
   */
  function logout() {
    clearAuth();
    setToken(null);
    setRole(null);
    setUser(null);
    setCompany(null);
    setUnread(0);
    window.location.href = '/';
  }

  // Calcula a cidade do usuário/empresa (para filtrar coletas por cidade)
  const userCity = role === 'user' ? (user?.city || null) : role === 'company' ? (company?.city || null) : null;

  // ── Provider ────────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={{
      token, role, user, company, unread, userCity,
      login, logout, refreshProfile, refreshUnread
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook de acesso ──────────────────────────────────────────────────
/**
 * useAuth() — Hook para acessar dados e funções de autenticação.
 * 
 * Deve ser usado dentro de um componente que está dentro de AuthProvider.
 * 
 * @returns {Object} Todos os dados e funções de auth
 * 
 * Uso:
 *   const { user, role, logout } = useAuth();
 *   if (role === 'user') { ... }
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}