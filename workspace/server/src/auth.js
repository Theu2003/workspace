// ===================================================================
// auth.js — Módulo de autenticação e autorização (JWT)
// ===================================================================
// Este arquivo fornece três funcionalidades principais:
//   1. signToken()     → Gera um token JWT para autenticar o usuário
//   2. authMiddleware  → Middleware que verifica se o token é válido
//   3. requireRole()   → Middleware que verifica se o usuário tem o papel necessário
//
// Fluxo de autenticação:
//   1. Usuário faz login → servidor gera um token JWT
//   2. Frontend envia o token no header Authorization: Bearer <token>
//   3. authMiddleware verifica o token e coloca os dados em req.auth
//   4. requireRole verifica se o papel do usuário (user/company/admin) é permitido
// ===================================================================

import jwt from 'jsonwebtoken';  // Biblioteca para criar e verificar tokens JWT

// Chave secreta para assinar os tokens JWT
// Em produção, deve ser uma variável de ambiente segura (não hardcoded)
const JWT_SECRET = process.env.JWT_SECRET || 'ecopickup_secret_dev_key_change_in_production';

/**
 * Gera um token JWT com o payload fornecido.
 * 
 * @param {Object} payload - Dados a serem incluídos no token
 *   Ex: { id: 1, role: 'user' } ou { id: 2, role: 'company' }
 * @returns {string} Token JWT assinado (válido por 7 dias)
 * 
 * O token contém:
 *   - id: ID do usuário/empresa no banco de dados
 *   - role: papel ('user', 'company', ou 'admin')
 *   - iat: data de emissão (automático)
 *   - exp: data de expiração (7 dias a partir da emissão)
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Middleware de autenticação.
 * 
 * Verifica se o header Authorization contém um token JWT válido.
 * Se válido, decodifica o token e coloca os dados em req.auth:
 *   req.auth = { id: number, role: string, iat: number, exp: number }
 * 
 * Se inválido ou ausente, retorna erro 401 (Não autenticado).
 * 
 * Uso: router.get('/rota', authMiddleware, handler)
 */
export function authMiddleware(req, res, next) {
  // Extrai o header Authorization (padrão: "Bearer <token>")
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  // Se não há token, retorna erro 401
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  try {
    // Verifica se o token é válido e decodifica o payload
    // Se o token expirou ou foi adulterado, jwt.verify lança um erro
    req.auth = jwt.verify(token, JWT_SECRET);
    next(); // Token válido, continua para a próxima função/middleware
  } catch {
    // Token inválido ou expirado
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

/**
 * Middleware de autorização por papel (role).
 * 
 * Verifica se o usuário autenticado (req.auth.role) está entre os papéis permitidos.
 * 
 * @param {...string} roles - Papéis permitidos: 'user', 'company', 'admin'
 * @returns {Function} Middleware que verifica o papel
 * 
 * Uso:
 *   router.get('/admin', requireRole('admin'), handler)        → Só admin
 *   router.get('/user', requireRole('user'), handler)           → Só usuário
 *   router.get('/any', requireRole('user', 'company'), handler) → Usuário ou empresa
 * 
 * Códigos de erro:
 *   401 → Não autenticado (req.auth não existe)
 *   403 → Acesso negado (usuário não tem o papel necessário)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    // Verifica se o usuário está autenticado
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });
    // Verifica se o papel do usuário está entre os permitidos
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Acesso negado para este tipo de conta' });
    }
    next(); // Papel autorizado, continua
  };
}
