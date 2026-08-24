import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, clearAuth, getStoredRole, getToken, setAuth } from './api';
import type { Role, User, Company, Notification } from './types';

interface AuthContextValue {
  token: string | null;
  role: Role | null;
  user: User | null;
  company: Company | null;
  unread: number;
  userCity: string | null;
  login: (token: string, role: Role) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  refreshUnread: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [role, setRole] = useState<Role | null>(() => getStoredRole());
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token || !role) return;
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  useEffect(() => {
    if (!token) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  async function refreshProfile() {
    try {
      if (role === 'admin') {
        // Admin doesn't need to fetch profile
        return;
      }
      if (role === 'user') {
        const data = await api<{ user: User }>('/users/me');
        setUser(data.user);
      } else {
        const data = await api<{ company: Company }>('/companies/me');
        setCompany(data.company);
      }
    } catch {
      // ignore
    }
  }

  async function refreshUnread() {
    try {
      const data = await api<{ count: number }>('/notifications/unread-count');
      setUnread(data.count);
    } catch {
      // ignore
    }
  }

  function login(tokenValue: string, roleValue: Role) {
    setAuth(tokenValue, roleValue);
    setToken(tokenValue);
    setRole(roleValue);
  }

  function logout() {
    clearAuth();
    setToken(null);
    setRole(null);
    setUser(null);
    setCompany(null);
    setUnread(0);
    window.location.href = '/';
  }

  const userCity = role === 'user' ? (user?.city || null) : role === 'company' ? (company?.city || null) : null;

  return (
    <AuthContext.Provider value={{ token, role, user, company, unread, userCity, login, logout, refreshProfile, refreshUnread }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
