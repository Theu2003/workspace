// Titulo: auth
// Autor: Mateus Martins Peres
// Finalidade: Modulo do backend responsavel por auth.
import jwt from 'jsonwebtoken';
import { requireEnv } from './env.js';

const JWT_SECRET = requireEnv('JWT_SECRET');

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req, res, next) {

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  try {

    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {

    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {

    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Acesso negado para este tipo de conta' });
    }
    next();
  };
}
 