import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware, requireRole('admin'));

// List all companies (with approval status)
router.get('/companies', (_req, res) => {
  try {
    const companies = db.prepare(`
      SELECT id, name, cnpj, responsible, email, phone, cep, state, city, 
             neighborhood, street, number, complement, materials, 
             is_approved, created_at 
      FROM companies 
      ORDER BY created_at DESC
    `).all();

    // Parse materials JSON
    const parsed = companies.map((c) => ({
      ...c,
      materials: (() => {
        try { return JSON.parse(c.materials); } catch { return []; }
      })(),
    }));

    res.json({ companies: parsed });
  } catch (err) {
    console.error('Erro ao listar empresas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get pending companies only
router.get('/companies/pending', (_req, res) => {
  try {
    const companies = db.prepare(`
      SELECT id, name, cnpj, responsible, email, phone, cep, state, city, 
             neighborhood, street, number, complement, materials, 
             is_approved, created_at 
      FROM companies 
      WHERE is_approved = 0
      ORDER BY created_at DESC
    `).all();

    const parsed = companies.map((c) => ({
      ...c,
      materials: (() => {
        try { return JSON.parse(c.materials); } catch { return []; }
      })(),
    }));

    res.json({ companies: parsed });
  } catch (err) {
    console.error('Erro ao listar empresas pendentes:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Approve a company
router.post('/companies/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT id, name, email FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    db.prepare('UPDATE companies SET is_approved = 1 WHERE id = ?').run(id);

    // Notify the company
    db.prepare(
      `INSERT INTO notifications (user_id, company_id, type, message) VALUES (NULL, ?, ?, ?)`
    ).run(id, 'aprovacao', `Parabéns! Sua empresa "${company.name}" foi aprovada e já está ativa na plataforma.`);

    res.json({ message: 'Empresa aprovada com sucesso' });
  } catch (err) {
    console.error('Erro ao aprovar empresa:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reject a company (deletes the company)
router.post('/companies/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    db.prepare('DELETE FROM companies WHERE id = ?').run(id);

    res.json({ message: 'Empresa rejeitada e removida' });
  } catch (err) {
    console.error('Erro ao rejeitar empresa:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get admin stats
router.get('/stats', (_req, res) => {
  try {
    const totalCompanies = db.prepare('SELECT COUNT(*) as count FROM companies').get()?.count || 0;
    const pendingCompanies = db.prepare('SELECT COUNT(*) as count FROM companies WHERE is_approved = 0').get()?.count || 0;
    const approvedCompanies = db.prepare('SELECT COUNT(*) as count FROM companies WHERE is_approved = 1').get()?.count || 0;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get()?.count || 0;
    const totalCollections = db.prepare('SELECT COUNT(*) as count FROM collections').get()?.count || 0;

    res.json({
      totalCompanies,
      pendingCompanies,
      approvedCompanies,
      totalUsers,
      totalCollections,
    });
  } catch (err) {
    console.error('Erro ao buscar stats do admin:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get all users (admin only)
router.get('/users', (_req, res) => {
  try {
    const users = db.prepare(
      `SELECT id, name, cpf, email, phone, role, created_at FROM users ORDER BY created_at DESC`
    ).all();
    res.json({ users });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete a company (admin only)
router.delete('/companies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    // Delete related notifications
    db.prepare('DELETE FROM notifications WHERE company_id = ?').run(id);
    // Delete related messages
    db.prepare("DELETE FROM messages WHERE (sender_type = 'company' AND sender_id = ?) OR (receiver_type = 'company' AND receiver_id = ?)").run(id, id);
    // Delete the company
    db.prepare('DELETE FROM companies WHERE id = ?').run(id);

    res.json({ message: 'Empresa removida com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar empresa:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete a user (admin only)
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Don't allow deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Não é possível excluir administradores' });
    }

    // Delete related notifications
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
    // Delete related addresses (cascade should handle this, but be explicit)
    db.prepare('DELETE FROM addresses WHERE user_id = ?').run(id);
    // Delete the user
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
