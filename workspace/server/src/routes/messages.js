// ===================================================================
// routes/messages.js — Rotas de mensagens (admin ↔ empresa)
// ===================================================================
// Este arquivo gerencia o sistema de mensagens diretas entre
// administradores e empresas (chat de suporte).
//
// Rotas:
//   GET  /conversations       → Lista conversas (admin: todas, empresa: só com admin)
//   GET  /company/:companyId  → Mensagens de uma conversa específica (admin)
//   POST /                    → Enviar uma mensagem (admin ou empresa)
//   GET  /unread-count        → Conta mensagens não lidas
//
// Fluxo:
//   - Admin vê lista de empresas que já conversou
//   - Empresa vê apenas sua conversa com o admin
//   - Mensagens são marcadas como lidas quando o destinatário abre a conversa
// ===================================================================

import { Router } from 'express';      // Router do Express
import db from '../db.js';              // Banco de dados
import { authMiddleware, requireRole } from '../auth.js'; // Middlewares de auth

const router = Router();
router.use(authMiddleware); // Todas as rotas requerem autenticação

// ── Rota: Listar conversas ──────────────────────────────────────────
// GET /api/messages/conversations
// Retorna a lista de conversas do usuário logado
//
// Admin: vê todas as empresas que já trocaram mensagem com ele
// Empresa: vê sua conversa com o admin (se existir)
//
// Retorna:
//   200: { conversations: [...] } (admin) ou { messages: [...] } (empresa)
router.get('/conversations', (req, res) => {
  try {
    if (req.auth.role === 'admin') {
      // ── Admin: lista empresas com quem conversou ───────────────
      const conversations = db.prepare(`
        SELECT DISTINCT
          COALESCE(CASE WHEN m.sender_type = 'company' THEN m.sender_id END,
                   CASE WHEN m.receiver_type = 'company' THEN m.receiver_id END) as company_id,
          c.name as company_name,
          c.email as company_email,
          MAX(m.created_at) as last_message_at,
          SUM(CASE WHEN m.sender_type = 'company' AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_count
        FROM messages m
        JOIN companies c ON c.id = COALESCE(
          CASE WHEN m.sender_type = 'company' THEN m.sender_id END,
          CASE WHEN m.receiver_type = 'company' THEN m.receiver_id END
        )
        GROUP BY company_id
        ORDER BY last_message_at DESC
      `).all();
      res.json({ conversations });
    } else if (req.auth.role === 'company') {
      // ── Empresa: busca sua conversa com o admin ────────────────
      // Primeiro encontra o admin (assumindo que há apenas um admin)
      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      if (!adminUser) return res.json({ conversations: [] });

      // Busca todas as mensagens entre o admin e esta empresa
      const conversation = db.prepare(`
        SELECT 
          m.sender_type,
          m.sender_id,
          m.receiver_type,
          m.receiver_id,
          m.message,
          m.is_read,
          m.created_at
        FROM messages m
        WHERE (m.sender_type = 'admin' AND m.sender_id = ? AND m.receiver_type = 'company' AND m.receiver_id = ?)
           OR (m.sender_type = 'company' AND m.sender_id = ? AND m.receiver_type = 'admin' AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
      `).all(adminUser.id, req.auth.id, req.auth.id, adminUser.id);

      res.json({ messages: conversation });
    } else {
      // Usuários comuns não têm acesso a este sistema de mensagens
      res.status(403).json({ error: 'Acesso negado' });
    }
  } catch (err) {
    console.error('Erro ao buscar conversas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Rota: Mensagens de uma empresa específica ───────────────────────
// GET /api/messages/company/:companyId
// Retorna todas as mensagens entre o admin e uma empresa específica
//
// Params: companyId (ID da empresa)
//
// Marca como lidas as mensagens da empresa (unread → read)
//
// Retorna:
//   200: { messages: [...], company: { id, name } }
//   404: Empresa não encontrada
router.get('/company/:companyId', requireRole('admin'), (req, res) => {
  try {
    const { companyId } = req.params;

    // Verifica se a empresa existe
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    // Busca todas as mensagens entre admin e empresa
    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE (sender_type = 'admin' AND sender_id = ? AND receiver_type = 'company' AND receiver_id = ?)
         OR (sender_type = 'company' AND sender_id = ? AND receiver_type = 'admin' AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(req.auth.id, companyId, companyId, req.auth.id);

    // Marca as mensagens da empresa como lidas
    db.prepare(`
      UPDATE messages SET is_read = 1 
      WHERE sender_type = 'company' AND sender_id = ? 
        AND receiver_type = 'admin' AND receiver_id = ? 
        AND is_read = 0
    `).run(companyId, req.auth.id);

    res.json({ messages, company });
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Rota: Enviar mensagem ───────────────────────────────────────────
// POST /api/messages
// Envia uma mensagem (admin ou empresa)
//
// Body esperado:
//   receiverId - ID do destinatário (admin envia ID da empresa, empresa ignora)
//   message    - Texto da mensagem
//
// Fluxo:
//   - Admin envia para uma empresa específica (receiverId = company.id)
//   - Empresa envia para o admin (receiverId é ignorado, sempre envia ao admin)
//
// Retorna:
//   201: { id, message: 'Mensagem enviada' }
//   400: Mensagem vazia
//   403: Acesso negado
//   404: Empresa não encontrada (quando admin envia)
router.post('/', (req, res) => {
  try {
    const { receiverId, message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
    }

    let senderType, senderId, receiverType;

    if (req.auth.role === 'admin') {
      // ── Admin enviando mensagem ────────────────────────────────
      senderType = 'admin';
      senderId = req.auth.id;
      receiverType = 'company';
      
      // Verifica se a empresa existe
      const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(receiverId);
      if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
    } else if (req.auth.role === 'company') {
      // ── Empresa enviando mensagem ──────────────────────────────
      senderType = 'company';
      senderId = req.auth.id;
      receiverType = 'admin';
      
      // Busca o admin para enviar a mensagem (sempre envia ao admin)
      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      if (!adminUser) return res.status(500).json({ error: 'Administrador não encontrado' });
      receiverId = adminUser.id;
    } else {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Insere a mensagem no banco
    const result = db.prepare(`
      INSERT INTO messages (sender_type, sender_id, receiver_type, receiver_id, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(senderType, senderId, receiverType, receiverId, message.trim());

    res.status(201).json({ 
      id: result.lastInsertRowid,
      message: 'Mensagem enviada' 
    });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Rota: Contar mensagens não lidas ────────────────────────────────
// GET /api/messages/unread-count
// Retorna o número de mensagens não lidas para exibir no badge
//
// Admin: conta mensagens recebidas de empresas não lidas
// Empresa: conta mensagens recebidas do admin não lidas
//
// Retorna:
//   200: { count: number }
router.get('/unread-count', (req, res) => {
  try {
    let count;
    if (req.auth.role === 'admin') {
      // Admin conta mensagens não lidas de empresas
      count = db.prepare(`
        SELECT COUNT(*) as c FROM messages 
        WHERE receiver_type = 'admin' AND receiver_id = ? AND is_read = 0
      `).get(req.auth.id)?.c || 0;
    } else if (req.auth.role === 'company') {
      // Empresa conta mensagens não lidas do admin
      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      count = adminUser ? db.prepare(`
        SELECT COUNT(*) as c FROM messages 
        WHERE sender_type = 'admin' AND sender_id = ? 
          AND receiver_type = 'company' AND receiver_id = ? 
          AND is_read = 0
      `).get(adminUser.id, req.auth.id)?.c || 0 : 0;
    } else {
      count = 0; // Usuários comuns não têm mensagens
    }
    res.json({ count });
  } catch (err) {
    console.error('Erro ao contar mensagens não lidas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
