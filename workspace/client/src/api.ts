// ===================================================================
// api.ts — Módulo de comunicação com a API (cliente)
// ===================================================================
// Este arquivo gerencia todas as requisições HTTP do frontend para o
// backend. Ele fornece:
//   1. Função api()    → Faz requisições autenticadas à API
//   2. Funções de auth → Gerenciar token e papel no localStorage
//   3. Funções utilitárias → Formatação de datas, parse de materiais
//
// A função api() automaticamente:
//   - Adiciona o header Authorization com o token JWT
//   - Trata erros 401 (redireciona para login)
//   - Parseia a resposta JSON
//   - Lança erros com mensagens amigáveis
// ===================================================================

// ── Constantes de armazenamento local ───────────────────────────────
// Chaves usadas no localStorage para persistir dados de autenticação
const TOKEN_KEY = 'reciclaja_token';   // Chave para armazenar o token JWT
const ROLE_KEY = 'reciclaja_role';     // Chave para armazenar o papel do usuário

// ── Funções de autenticação ─────────────────────────────────────────

/**
 * getToken() — Recupera o token JWT do localStorage.
 * @returns {string|null} Token JWT ou null se não está logado
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * setAuth() — Salva o token e papel no localStorage.
 * Chamada após login bem-sucedido.
 * 
 * @param {string} token - Token JWT recebido do servidor
 * @param {string} role  - Papel do usuário: 'user', 'company', ou 'admin'
 */
export function setAuth(token: string, role: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

/**
 * getStoredRole() — Recupera o papel do usuário do localStorage.
 * @returns {Role|null} Papel ('user', 'company', 'admin') ou null
 */
export function getStoredRole(): Role | null {
  const role = localStorage.getItem(ROLE_KEY);
  if (role === 'user' || role === 'company' || role === 'admin') return role;
  return null;
}

/**
 * clearAuth() — Remove token e papel do localStorage.
 * Chamada no logout ou quando o token expira.
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

// ── Tipo auxiliar ───────────────────────────────────────────────────
// Role define os papéis possíveis no sistema
type Role = 'user' | 'company' | 'admin';

// ── Função principal de requisição ──────────────────────────────────

/**
 * api() — Faz uma requisição autenticada à API.
 * 
 * Esta é a função principal usada por todos os componentes para
 * comunicar com o backend. Ela:
 *   1. Adiciona automaticamente o header Authorization com o token
 *   2. Envia Content-Type: application/json por padrão
 *   3. Trata erros 401 (redireciona para login)
 *   4. Parseia a resposta JSON
 *   5. Lança erros com mensagens amigáveis do servidor
 * 
 * @param {string} path - Caminho da API (sem /api no início)
 *   Ex: '/collections', '/users/me', '/auth/login'
 * @param {RequestInit} options - Opções do fetch (method, body, etc.)
 * @returns {Promise<T>} Dados da resposta parseados
 * 
 * Uso:
 *   const data = await api<{ collections: Collection[] }>('/collections/mine');
 *   const result = await api('/collections', { method: 'POST', body: JSON.stringify({...}) });
 */
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  // Recupera o token salvo
  const token = getToken();

  // Monta os headers (Content-Type + Authorization se tiver token)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Faz a requisição à API (path é relativo: /api é adicionado automaticamente)
  const res = await fetch(`/api${path}`, { ...options, headers });

  // Se retornou 401, o token expirou ou é inválido → redireciona para login
  if (res.status === 401) {
    clearAuth();           // Limpa dados de autenticação
    window.location.href = '/login'; // Redireciona
    throw new Error('Sessão expirada');
  }

  // Tenta parsear o body como JSON
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null; // Resposta sem body JSON
  }

  // Se a requisição falhou (status 4xx ou 5xx), lança erro
  if (!res.ok) {
    const message = data?.error || 'Erro na requisição';
    throw new Error(message);
  }
  return data as T;
}

// ── Funções utilitárias ─────────────────────────────────────────────

/**
 * formatDate() — Formata uma data ISO para pt-BR.
 * 
 * @param {string} iso - Data no formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
 * @returns {string} Data formatada (DD/MM/YYYY)
 * 
 * Exemplo:
 *   formatDate('2024-03-15') → '15/03/2024'
 */
export function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`); // Adiciona meio-dia para evitar problemas de timezone
  return d.toLocaleDateString('pt-BR');
}

/**
 * formatDateTime() — Formata data e hora ISO para pt-BR.
 * 
 * @param {string} iso - Data/hora no formato ISO
 * @returns {string} Data e hora formatada (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * parseMaterials() — Converte o campo materials de JSON string para array.
 * 
 * @param {any} materials - JSON string ou array de materiais
 * @returns {MaterialItem[]} Array de { type: string, quantity: number }
 */
export function parseMaterials(materials: any): MaterialItem[] {
  if (Array.isArray(materials)) return materials;
  try {
    return JSON.parse(materials || '[]');
  } catch {
    return [];
  }
}

// ── Interface de material ───────────────────────────────────────────
/**
 * MaterialItem — Representa um item de material numa coleta.
 * 
 * @property {string} type    - Tipo do material (ex: 'Plástico', 'Papel')
 * @property {number} quantity - Quantidade em kg
 */
interface MaterialItem {
  type: string;
  quantity: number;
}
