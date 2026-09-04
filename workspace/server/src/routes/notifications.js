// ===================================================================
// routes/notifications.js — Rotas de notificações
// ===================================================================
// Este arquivo gerencia as notificações do sistema:
//   GET /             → Lista as 50 notificações mais recentes
//   GET /unread-count → Conta notificações não lidas
//   PUT /:id/read     → Marca uma notificação como lida
//   PUT /read-all     → Marca todas como lidas
//
// Cada tipo de usuário vê apenas suas próprias notificações:
//   - Admin: vê todas as notificações
//   - Usuário: vê notificações com user_id = seu ID
//   - Empresa: vê notificações com company_id = seu ID
// ===================================================================

import { Router } from 'express';      // Router do Express
import db from '../db.js';              // Banco de dados
import { authMiddleware } from '../auth.js'; // Middleware de autenticação
import { parseMaterials } from '../helpers.js'; // Helpers (importado mas não usado diretamente)

const router = Router();
router.use(authMiddleware); // Todas as rotas requerem autenticação

// ── Rota: Listar notificações ──────────────────────────────────────
// GET /api/notifications
// Retorna as 50 notificações mais recentes do usuário logado
//
// Admin vê todas, usuário vê as suas, empresa vê as suas
//
// Retorna:
//   200: { notifications: [...] }
router.get('/', (req, res) => {
  let rows;
  if (req.auth.role === 'admin') {
    // Admin vê TODAS as notificações do sistema
    rows = db.prepare(
      `SELECT n.*, c.date, c.period, c.status
       FROM notifications n
       LEFT JOIN collections c ON c.id = n.collection_id
       ORDER BY n.created_at DESC LIMIT 50`
    ).all();
  } else if (req.auth.role === 'user') {
    // Usuário vê apenas suas notificações
    rows = db.prepare(
      `SELECT n.*, c.date, c.period, c.status
       FROM notifications n
       LEFT JOIN collections c ON c.id = n.collection_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 50`
    ).all(req.auth.id);
  } else {
    // Empresa vê apenas suas notificações
    rows = db.prepare(
      `SELECT n.*, c.date, c.period, c.status
       FROM notifications n
       LEFT JOIN collections c ON c.id = n.collection_id
       WHERE n.company_id = ?
       ORDER BY n.created_at DESC LIMIT 50`
    ).all(req.auth.id);
  }
  res.json({ notifications: rows });
});

// ── Rota: Contar notificações não lidas ─────────────────────────────
// GET /api/notifications/unread-count
// Retorna o número de notificações não lidas para exibir no badge do sino
//
// Retorna:
//   200: { count: number }
router.get('/unread-count', (req, res) => {
  let count;
  if (req.auth.role === 'admin') {
    // Admin conta todas as não lidas
    count = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0').get().c;
  } else if (req.auth.role === 'user') {
    // Usuário conta apenas as suas não lidas
    count = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.auth.id).c;
  } else {
    // Empresa conta apenas as suas não lidas
    count = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE company_id = ? AND is_read = 0').get(req.auth.id).c;
  }
  res.json({ count });
});

// ── Rota: Marcar notificação como lida ──────────────────────────────
// PUT /api/notifications/:id/read
// Marca uma notificação específica como lida
//
// Params: id (ID da notificação)
//
// Retorna:
//   200: { message: 'Marcada como lida' }
//   403: Não é o dono da notificação
//   404: Notificação não encontrada
router.put('/:id/read', (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Notificação não encontrada' });

  // Verificação de permissão: admin pode marcar qualquer uma
  if (req.auth.role !== 'admin') {
    const owner = req.auth.role === 'user' ? n.user_id === req.auth.id : n.company_id === req.auth.id;
    if (!owner) return res.status(403).json({ error: 'Acesso negado' });
  }

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(n.id);
  res.json({ message: 'Marcada como lida' });
});

// ── Rota: Marcar todas como lidas ───────────────────────────────────
// PUT /api/notifications/read-all
// Marca todas as notificações do usuário como lidas
//
// Retorna:
//   200: { message: 'Todas marcadas como lidas' }
router.put('/read-all', (req, res) => {
  if (req.auth.role === 'admin') {
    // Admin marca todas as notificações do sistema
    db.prepare('UPDATE notifications SET is_read = 1').run();
  } else if (req.auth.role === 'user') {
    // Usuário marca apenas as suas
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.auth.id);
  } else {
    // Empresa marca apenas as suas
    db.prepare('UPDATE notifications SET is_read = 1 WHERE company_id = ?').run(req.auth.id);
  }
  res.json({ message: 'Todas marcadas como lidas' });
});

export default router;
