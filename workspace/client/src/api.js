// Titulo: api
// Autor: Mateus Martins Peres
// Finalidade: Modulo do frontend responsavel por api.
const TOKEN_KEY = 'reciclaja_token';
const ROLE_KEY = 'reciclaja_role';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token, role) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function getStoredRole() {
  const role = localStorage.getItem(ROLE_KEY);
  if (role === 'user' || role === 'company' || role === 'admin') return role;
  return null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export async function api(path, options = {}) {

  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || 'Erro na requisição';
    throw new Error(message);
  }
  return data;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function parseMaterials(materials) {
  if (Array.isArray(materials)) return materials;
  try {
    return JSON.parse(materials || '[]');
  } catch {
    return [];
  }
}