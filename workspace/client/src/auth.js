// Titulo: auth
// Autor: Mateus Martins Peres
// Finalidade: Modulo do frontend responsavel por auth.
import { createContext, useContext, useEffect, useState } from 'react';
import { api, clearAuth, getStoredRole, getToken, setAuth } from './api';
import { checkNotificationSounds } from './sounds';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {

  const [token, setToken] = useState(() => getToken());
  const [role, setRole] = useState(() => getStoredRole());
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token || !role) return;
    refreshProfile();

  }, [token, role]);

  useEffect(() => {
    if (!token) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, 15000);
    return () => clearInterval(interval);

  }, [token, role]);

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

    }
  }

  async function refreshUnread() {
    try {
      const data = await api('/notifications/unread-count');
      setUnread(data.count);
    } catch {

    }
  }

  // Toca som de notificacao (mp3_1 = mensagem, mp3_2 = coleta aceita)
  // quando chegam notificacoes novas detectadas pelo polling.
  async function refreshSounds() {
    try {
      const data = await api('/notifications');
      checkNotificationSounds(data.notifications);
    } catch {

    }
  }

  useEffect(() => {
    if (!token) return;
    refreshSounds();
    const interval = setInterval(refreshSounds, 15000);
    return () => clearInterval(interval);
  }, [token]);

  function login(tokenValue, roleValue) {
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
    <AuthContext.Provider value={{
      token, role, user, company, unread, userCity,
      login, logout, refreshProfile, refreshUnread
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}