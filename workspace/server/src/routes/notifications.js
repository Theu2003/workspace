import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';
import { parseMaterials } from '../helpers.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  let rows;
  if (req.auth.role === 'admin') {
    // Admin sees all notifications
    rows = db.prepare(
      `SELECT n.*, c.date, c.period, c.status
       FROM notifications n
       LEFT JOIN collections c ON c.id = n.collection_id
       ORDER BY n.created_at DESC LIMIT 50`
    ).all();
  } else if (req.auth.role === 'user') {
    rows = db.prepare(
      `SELECT n.*, c.date, c.period, c.status
       FROM notifications n
       LEFT JOIN collections c ON c.id = n.collection_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 50`
    ).all(req.auth.id);
  } else {
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

router.get('/unread-count', (req, res) => {
  let count;
  if (req.auth.role === 'admin') {
    count = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0').get().c;
  } else if (req.auth.role === 'user') {
    count = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.auth.id).c;
  } else {
    count = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE company_id = ? AND is_read = 0').get(req.auth.id).c;
  }
  res.json({ count });
});

router.put('/:id/read', (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Notificação não encontrada' });
  if (req.auth.role !== 'admin') {
    const owner = req.auth.role === 'user' ? n.user_id === req.auth.id : n.company_id === req.auth.id;
    if (!owner) return res.status(403).json({ error: 'Acesso negado' });
  }
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(n.id);
  res.json({ message: 'Marcada como lida' });
});

router.put('/read-all', (req, res) => {
  if (req.auth.role === 'admin') {
    db.prepare('UPDATE notifications SET is_read = 1').run();
  } else if (req.auth.role === 'user') {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.auth.id);
  } else {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE company_id = ?').run(req.auth.id);
  }
  res.json({ message: 'Todas marcadas como lidas' });
});

export default router;
