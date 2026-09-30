// Titulo: admin
// Autor: Mateus Martins Peres
// Finalidade: Rotas da API responsavel por admin.
import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

router.get('/companies', (_req, res) => {
  try {

    const companies = db.prepare(`
      SELECT id, name, cnpj, responsible, email, phone, cep, state, city,
             neighborhood, street, number, complement, materials,
             is_approved, created_at
      FROM companies
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
    console.error('Erro ao listar empresas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

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

router.post('/companies/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT id, name, email FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    db.prepare('UPDATE companies SET is_approved = 1 WHERE id = ?').run(id);

    db.prepare(
      `INSERT INTO notifications (user_id, company_id, type, message) VALUES (NULL, ?, ?, ?)`
    ).run(id, 'aprovacao', `Parabéns! Sua empresa "${company.name}" foi aprovada e já está ativa na plataforma.`);

    res.json({ message: 'Empresa aprovada com sucesso' });
  } catch (err) {
    console.error('Erro ao aprovar empresa:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

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

router.delete('/companies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    db.prepare('DELETE FROM notifications WHERE company_id = ?').run(id);
    db.prepare("DELETE FROM messages WHERE (sender_type = 'company' AND sender_id = ?) OR (receiver_type = 'company' AND receiver_id = ?)").run(id, id);

    db.prepare('DELETE FROM companies WHERE id = ?').run(id);

    res.json({ message: 'Empresa removida com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar empresa:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Não é possível excluir administradores' });
    }

    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM addresses WHERE user_id = ?').run(id);

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
