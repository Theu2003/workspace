// ===================================================================
// routes/admin.js — Rotas do painel administrativo
// ===================================================================
// Este arquivo define as rotas que só o administrador pode acessar.
// Gerencia empresas (aprovar, rejeitar, excluir) e usuários.
//
// Todas as rotas requerem autenticação + papel 'admin'.
//
// Rotas:
//   GET    /companies           → Lista todas as empresas
//   GET    /companies/pending   → Lista empresas pendentes de aprovação
//   POST   /companies/:id/approve → Aprova uma empresa
//   POST   /companies/:id/reject  → Rejeita e remove uma empresa
//   DELETE /companies/:id       → Remove uma empresa
//   GET    /users               → Lista todos os usuários
//   DELETE /users/:id           → Remove um usuário
//   GET    /stats               → Estatísticas do admin
// ===================================================================

import { Router } from 'express';      // Router do Express
import db from '../db.js';              // Banco de dados
import { authMiddleware, requireRole } from '../auth.js'; // Middlewares de auth

const router = Router();

// Proteção: TODAS as rotas deste arquivo requerem:
//   1. Autenticação (authMiddleware) → usuário deve estar logado
//   2. Papel admin (requireRole('admin')) → só administradores
router.use(authMiddleware, requireRole('admin'));

// ── Rota: Listar todas as empresas ──────────────────────────────────
// GET /api/admin/companies
// Retorna a lista completa de empresas (aprovadas e pendentes)
//
// Retorna:
//   200: { companies: [...] }
router.get('/companies', (_req, res) => {
  try {
    // Busca todas as empresas, ordenadas por data de criação (mais recente primeiro)
    const companies = db.prepare(`
      SELECT id, name, cnpj, responsible, email, phone, cep, state, city, 
             neighborhood, street, number, complement, materials, 
             is_approved, created_at 
      FROM companies 
      ORDER BY created_at DESC
    `).all();

    // Converte o JSON de materials string → array
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

// ── Rota: Listar empresas pendentes ─────────────────────────────────
// GET /api/admin/companies/pending
// Retorna apenas empresas com is_approved = 0 (aguardando aprovação)
//
// Retorna:
//   200: { companies: [...] }
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

// ── Rota: Aprovar empresa ───────────────────────────────────────────
// POST /api/admin/companies/:id/approve
// Aprova uma empresa (muda is_approved de 0 para 1)
//
// Params: id (ID da empresa)
//
// Efeito colateral: Notifica a empresa que foi aprovada
//
// Retorna:
//   200: { message: 'Empresa aprovada com sucesso' }
//   404: Empresa não encontrada
router.post('/companies/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT id, name, email FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    // Muda o status para aprovada
    db.prepare('UPDATE companies SET is_approved = 1 WHERE id = ?').run(id);

    // Notifica a empresa sobre a aprovação
    db.prepare(
      `INSERT INTO notifications (user_id, company_id, type, message) VALUES (NULL, ?, ?, ?)`
    ).run(id, 'aprovacao', `Parabéns! Sua empresa "${company.name}" foi aprovada e já está ativa na plataforma.`);

    res.json({ message: 'Empresa aprovada com sucesso' });
  } catch (err) {
    console.error('Erro ao aprovar empresa:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Rota: Rejeitar empresa ──────────────────────────────────────────
// POST /api/admin/companies/:id/reject
// Rejeita e remove uma empresa do sistema
//
// Params: id (ID da empresa)
//
// Retorna:
//   200: { message: 'Empresa rejeitada e removida' }
//   404: Empresa não encontrada
router.post('/companies/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    // Deleta a empresa
    db.prepare('DELETE FROM companies WHERE id = ?').run(id);

    res.json({ message: 'Empresa rejeitada e removida' });
  } catch (err) {
    console.error('Erro ao rejeitar empresa:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Rota: Estatísticas do admin ─────────────────────────────────────
// GET /api/admin/stats
// Retorna estatísticas gerais para o dashboard do administrador
//
// Retorna:
//   200: { totalCompanies, pendingCompanies, approvedCompanies, totalUsers, totalCollections }
router.get('/stats', (_req, res) => {
  try {
    // Conta empresas por status
    const totalCompanies = db.prepare('SELECT COUNT(*) as count FROM companies').get()?.count || 0;
    const pendingCompanies = db.prepare('SELECT COUNT(*) as count FROM companies WHERE is_approved = 0').get()?.count || 0;
    const approvedCompanies = db.prepare('SELECT COUNT(*) as count FROM companies WHERE is_approved = 1').get()?.count || 0;

    // Conta usuários comuns (excluindo admins)
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get()?.count || 0;

    // Conta total de coletas
    const totalCollections = db.prepare('SELECT COUNT(*) as count FROM collections').get()?.count || 0;

    res.json({
      totalCompanies,      // Total de empresas
      pendingCompanies,    // Empresas pendentes de aprovação
      approvedCompanies,   // Empresas aprovadas
      totalUsers,          // Total de usuários
      totalCollections,    // Total de coletas
    });
  } catch (err) {
    console.error('Erro ao buscar stats do admin:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Rota: Listar todos os usuários ──────────────────────────────────
// GET /api/admin/users
// Retorna a lista de todos os usuários cadastrados
//
// Retorna:
//   200: { users: [...] }
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

// ── Rota: Deletar empresa ───────────────────────────────────────────
// DELETE /api/admin/companies/:id
// Remove uma empresa e todos os seus dados relacionados
//
// Antes de deletar, remove:
//   - Notificações da empresa
//   - Mensagens da empresa
//
// Params: id (ID da empresa)
//
// Retorna:
//   200: { message: 'Empresa removida com sucesso' }
//   404: Empresa não encontrada
router.delete('/companies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    // Remove dados relacionados antes de deletar a empresa
    db.prepare('DELETE FROM notifications WHERE company_id = ?').run(id);
    db.prepare("DELETE FROM messages WHERE (sender_type = 'company' AND sender_id = ?) OR (receiver_type = 'company' AND receiver_id = ?)").run(id, id);

    // Deleta a empresa
    db.prepare('DELETE FROM companies WHERE id = ?').run(id);

    res.json({ message: 'Empresa removida com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar empresa:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Rota: Deletar usuário ───────────────────────────────────────────
// DELETE /api/admin/users/:id
// Remove um usuário e todos os seus dados relacionados
//
// NÃO permite deletar usuários admin
//
// Antes de deletar, remove:
//   - Notificações do usuário
//   - Endereços do usuário
//
// Params: id (ID do usuário)
//
// Retorna:
//   200: { message: 'Usuário removido com sucesso' }
//   403: Tentativa de deletar admin
//   404: Usuário não encontrado
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Proteção: não permite deletar administradores
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Não é possível excluir administradores' });
    }

    // Remove dados relacionados antes de deletar o usuário
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM addresses WHERE user_id = ?').run(id);

    // Deleta o usuário
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
