// ===================================================================
// routes/companies.js — Rotas de gerenciamento de empresas
// ===================================================================
// Este arquivo define as rotas relacionadas às empresas de coleta:
//   GET    /me      → Retorna os dados do perfil da empresa logada
//   PUT    /me      → Atualiza dados da empresa (nome, materiais, etc.)
//   GET    /list    → Lista empresas aprovadas (para o usuário ver)
//   DELETE /me      → Exclui a própria conta da empresa
//
// Todas as rotas (exceto /list) requerem autenticação de empresa.
// ===================================================================

import { Router } from 'express';      // Router do Express
import bcrypt from 'bcryptjs';         // Para hashear senhas
import db from '../db.js';             // Banco de dados
import { authMiddleware, requireRole } from '../auth.js'; // Middlewares de auth
import { geocode } from '../geocode.js'; // Geocodificação
import { MATERIAL_TYPES, parseMaterials } from '../helpers.js'; // Helpers

const router = Router();
router.use(authMiddleware); // Todas as rotas requerem autenticação

// ── Rota: Obter perfil da empresa ───────────────────────────────────
// GET /api/companies/me
// Retorna todos os dados da empresa logada
//
// Retorna:
//   200: { company: { id, name, cnpj, materials, ... } }
//   404: Empresa não encontrada
router.get('/me', requireRole('company'), (req, res) => {
  const company = db.prepare(
    `SELECT id, name, cnpj, responsible, email, phone, cep, state, city, neighborhood, street, number, complement, materials, latitude, longitude, created_at
     FROM companies WHERE id = ?`
  ).get(req.auth.id);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

  // Converte o JSON de materiais string → array
  company.materials = parseMaterials(company.materials);

  res.json({ company });
});

// ── Rota: Atualizar perfil da empresa ───────────────────────────────
// PUT /api/companies/me
// Atualiza dados da empresa (nome, responsável, telefone, materiais, etc.)
//
// Body esperado:
//   name, responsible, phone, materials, password (opcional),
//   cep, state, city, neighborhood, street, number, complement
//
// Retorna:
//   200: { message: 'Perfil atualizado' }
//   400: Senha muito curta
//   404: Empresa não encontrada
router.put('/me', requireRole('company'), async (req, res) => {
  const { name, responsible, phone, materials, password, cep, state, city, neighborhood, street, number, complement } = req.body;

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.auth.id);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

  if (password) {
    // Se uma nova senha foi fornecida, valida e atualiza
    if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    const hash = await bcrypt.hash(password, 10);
    db.prepare(
      `UPDATE companies SET name = ?, responsible = ?, phone = ?, materials = ?, password_hash = ?, cep = ?, state = ?, city = ?, neighborhood = ?, street = ?, number = ?, complement = ? WHERE id = ?`
    ).run(name, responsible, phone, JSON.stringify(materials || []), hash, cep, state, city, neighborhood, street, number, complement, req.auth.id);
  } else {
    // Atualiza sem alterar a senha
    db.prepare(
      `UPDATE companies SET name = ?, responsible = ?, phone = ?, materials = ?, cep = ?, state = ?, city = ?, neighborhood = ?, street = ?, number = ?, complement = ? WHERE id = ?`
    ).run(name, responsible, phone, JSON.stringify(materials || []), cep, state, city, neighborhood, street, number, complement, req.auth.id);
  }
  res.json({ message: 'Perfil atualizado' });
});

// ── Rota: Listar empresas para o usuário ────────────────────────────
// GET /api/companies/list
// Retorna a lista de empresas aprovadas que operam na mesma cidade do usuário
// Usada no formulário de agendamento de coleta (usuário escolhe a empresa)
//
// Retorna:
//   200: { companies: [...], materials: [...], userCity: string }
router.get('/list', requireRole('user'), (req, res) => {
  // Busca o endereço padrão do usuário para saber a cidade
  const addr = db.prepare(
    `SELECT city FROM addresses WHERE user_id = ? AND is_default = 1 ORDER BY id LIMIT 1`
  ).get(req.auth.id);

  let companies;
  if (addr?.city) {
    // Filtra empresas aprovadas da mesma cidade do usuário
    companies = db.prepare(
      `SELECT id, name, city, state, phone, materials FROM companies WHERE is_approved = 1 AND city = ? ORDER BY name`
    ).all(addr.city).map((c) => ({ ...c, materials: parseMaterials(c.materials) }));
  } else {
    // Se o usuário não tem endereço cadastrado, mostra todas as empresas
    companies = db.prepare(
      `SELECT id, name, city, state, phone, materials FROM companies WHERE is_approved = 1 ORDER BY name`
    ).all().map((c) => ({ ...c, materials: parseMaterials(c.materials) }));
  }

  res.json({ companies, materials: MATERIAL_TYPES, userCity: addr?.city || null });
});

// ── Rota: Excluir conta da empresa ──────────────────────────────────
// DELETE /api/companies/me
// Exclui a conta da empresa logada
//
// Antes de excluir, a empresa é desatribuída de todas as coletas
// (company_id vira NULL, status volta para 'pendente')
//
// Retorna:
//   200: { message: 'Conta excluída com sucesso' }
//   404: Empresa não encontrada
//   500: Erro interno
router.delete('/me', requireRole('company'), (req, res) => {
  try {
    const companyId = req.auth.id;
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    // Desatribui todas as coletas da empresa (volta para pendente)
    db.prepare('UPDATE collections SET company_id = NULL, status = ? WHERE company_id = ?').run('pendente', companyId);

    // Remove referências nas notificações
    db.prepare(`UPDATE notifications SET company_id = NULL WHERE company_id = ?`).run(companyId);

    // Deleta todas as mensagens da empresa (admin ↔ empresa)
    db.prepare("DELETE FROM messages WHERE (sender_type = 'company' AND sender_id = ?) OR (receiver_type = 'company' AND receiver_id = ?)").run(companyId, companyId);

    // Deleta a empresa
    db.prepare('DELETE FROM companies WHERE id = ?').run(companyId);

    res.json({ message: 'Conta excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir empresa:', err);
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

export default router;
