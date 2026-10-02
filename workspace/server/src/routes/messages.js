// Titulo: messages
// Autor: Mateus Martins Peres
// Finalidade: Rotas da API responsavel por messages.
import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { notifyCompany } from '../helpers.js';

const router = Router();
router.use(authMiddleware);

router.get('/conversations', (req, res) => {
  try {
    if (req.auth.role === 'admin') {

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

      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      if (!adminUser) return res.json({ conversations: [] });

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

      res.status(403).json({ error: 'Acesso negado' });
    }
  } catch (err) {
    console.error('Erro ao buscar conversas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/company/:companyId', requireRole('admin'), (req, res) => {
  try {
    const { companyId } = req.params;

    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE (sender_type = 'admin' AND sender_id = ? AND receiver_type = 'company' AND receiver_id = ?)
         OR (sender_type = 'company' AND sender_id = ? AND receiver_type = 'admin' AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(req.auth.id, companyId, companyId, req.auth.id);

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

router.post('/', (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
    }

    let senderType, senderId, receiverType;

    if (req.auth.role === 'admin') {

      senderType = 'admin';
      senderId = req.auth.id;
      receiverType = 'company';

      const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(receiverId);
      if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
    } else if (req.auth.role === 'company') {

      senderType = 'company';
      senderId = req.auth.id;
      receiverType = 'admin';

      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      if (!adminUser) return res.status(500).json({ error: 'Administrador não encontrado' });
      receiverId = adminUser.id;
    } else {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = db.prepare(`
      INSERT INTO messages (sender_type, sender_id, receiver_type, receiver_id, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(senderType, senderId, receiverType, receiverId, message.trim());

    // Notifica a empresa quando o admin envia uma mensagem (nao exige resposta)
    if (senderType === 'admin') {
      const adminName = db.prepare('SELECT name FROM users WHERE id = ?').get(req.auth.id);
      const from = adminName?.name ? adminName.name.split(' ')[0] : 'Administração';
      notifyCompany(receiverId, 'mensagem_admin', `Mensagem da administração (${from}): ${message.trim()}`);
    }

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Mensagem enviada'
    });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/unread-count', (req, res) => {
  try {
    let count;
    if (req.auth.role === 'admin') {

      count = db.prepare(`
        SELECT COUNT(*) as c FROM messages
        WHERE receiver_type = 'admin' AND receiver_id = ? AND is_read = 0
      `).get(req.auth.id)?.c || 0;
    } else if (req.auth.role === 'company') {

      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      count = adminUser ? db.prepare(`
        SELECT COUNT(*) as c FROM messages
        WHERE sender_type = 'admin' AND sender_id = ?
          AND receiver_type = 'company' AND receiver_id = ?
          AND is_read = 0
      `).get(adminUser.id, req.auth.id)?.c || 0 : 0;
    } else {
      count = 0;
    }
    res.json({ count });
  } catch (err) {
    console.error('Erro ao contar mensagens não lidas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
