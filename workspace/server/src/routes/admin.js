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

export default router;
