// ===================================================================
// auth.tsx — Context de autenticação (React Context API)
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

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'; // React hooks
import { api, clearAuth, getStoredRole, getToken, setAuth } from './api'; // Funções de auth da API
import type { Role, User, Company, Notification } from './types'; // Tipos TypeScript

// ── Interface do contexto ───────────────────────────────────────────
/**
 * AuthContextValue — Define todos os valores e funções disponíveis
 * através do hook useAuth().
 */
interface AuthContextValue {
  token: string | null;              // Token JWT (null se não logado)
  role: Role | null;                 // Papel: 'user', 'company', 'admin' (null se não logado)
  user: User | null;                 // Dados do perfil do usuário (null se é empresa ou não logado)
  company: Company | null;           // Dados do perfil da empresa (null se é usuário ou não logado)
  unread: number;                    // Número de notificações não lidas
  userCity: string | null;           // Cidade do usuário/empresa (para filtrar coletas)
  login: (token: string, role: Role) => void;  // Função de login
  logout: () => void;                // Função de logout
  refreshProfile: () => Promise<void>;   // Recarrega dados do perfil do servidor
  refreshUnread: () => Promise<void>;    // Recarrega contagem de não lidas
}

// Cria o contexto React (undefined = fora do provider)
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider de autenticação ────────────────────────────────────────
/**
 * AuthProvider — Componente que envolve toda a aplicação.
 * 
 * Fornece dados de autenticação para todos os componentes filhos.
 * 
 * Uso (no main.tsx):
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // ── Estado ──────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(() => getToken());     // Token JWT
  const [role, setRole] = useState<Role | null>(() => getStoredRole());    // Papel do usuário
  const [user, setUser] = useState<User | null>(null);                     // Dados do perfil
  const [company, setCompany] = useState<Company | null>(null);            // Dados da empresa
  const [unread, setUnread] = useState(0);                                 // Notificações não lidas

  // ── Efeito: carregar perfil quando token/papel mudam ──────────────
  // Quando o app carrega ou o login é feito, busca os dados do perfil
  useEffect(() => {
    if (!token || !role) return; // Só busca se estiver logado
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  // ── Efeito: verificar não lidas periodicamente ────────────────────
  // A cada 15 segundos, verifica se há novas notificações não lidas
  useEffect(() => {
    if (!token) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, 15000); // A cada 15 segundos
    return () => clearInterval(interval); // Limpa o intervalo ao desmontar
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
        // Admin não precisa de perfil
        return;
      }
      if (role === 'user') {
        // Busca dados do usuário
        const data = await api<{ user: User }>('/users/me');
        setUser(data.user);
      } else {
        // Busca dados da empresa
        const data = await api<{ company: Company }>('/companies/me');
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
      const data = await api<{ count: number }>('/notifications/unread-count');
      setUnread(data.count);
    } catch {
      // Ignora erros
    }
  }

  /**
   * login() — Salva o token e papel após login bem-sucedido.
   * 
   * @param {string} tokenValue - Token JWT recebido do servidor
   * @param {Role} roleValue    - Papel: 'user', 'company', ou 'admin'
   */
  function login(tokenValue: string, roleValue: Role) {
    setAuth(tokenValue, roleValue); // Salva no localStorage
    setToken(tokenValue);           // Atualiza o estado
    setRole(roleValue);
  }

  /**
   * logout() — Limpa todos os dados de autenticação e redireciona.
   */
  function logout() {
    clearAuth();         // Remove do localStorage
    setToken(null);      // Limpa o estado
    setRole(null);
    setUser(null);
    setCompany(null);
    setUnread(0);
    window.location.href = '/'; // Redireciona para Home
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
 * @returns {AuthContextValue} Todos os dados e funções de auth
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
