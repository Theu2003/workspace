// ===================================================================
// routes/users.js — Rotas de gerenciamento de perfil do usuário
// ===================================================================
// Este arquivo define as rotas relacionadas ao perfil do usuário comum:
//   GET    /me          → Retorna os dados do perfil e endereços
//   PUT    /me          → Atualiza nome, telefone e/ou senha
//   POST   /addresses   → Adiciona um novo endereço
//   PUT    /addresses/:id → Atualiza um endereço existente
//   POST   /addresses/:id/default → Define um endereço como padrão
//
// Todas as rotas requerem autenticação (authMiddleware) e
// papel 'user' (requireRole('user')).
// ===================================================================

import { Router } from 'express';      // Router do Express
import bcrypt from 'bcryptjs';         // Para hashear senhas
import db from '../db.js';             // Banco de dados
import { authMiddleware, requireRole } from '../auth.js'; // Middlewares de auth
import { geocode } from '../geocode.js'; // Geocodificação de endereços

const router = Router();
router.use(authMiddleware); // Todas as rotas deste arquivo requerem autenticação

// ── Rota: Obter perfil do usuário ──────────────────────────────────
// GET /api/users/me
// Retorna os dados do usuário logado e seus endereços cadastrados
//
// Retorna:
//   200: { user: { id, name, cpf, email, phone, city, created_at }, addresses: [...] }
//   404: Usuário não encontrado
router.get('/me', requireRole('user'), (req, res) => {
  // Busca os dados básicos do usuário (sem senha)
  const user = db.prepare(
    `SELECT id, name, cpf, email, phone, created_at FROM users WHERE id = ?`
  ).get(req.auth.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  // Busca todos os endereços do usuário, ordenados por padrão primeiro
  const addresses = db.prepare(
    `SELECT id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default
     FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC`
  ).all(user.id);

  // Extrai a cidade do endereço padrão (usada para filtrar empresas por cidade)
  const defaultAddr = addresses.find((a) => a.is_default === 1) || addresses[0];
  const city = defaultAddr?.city || null;

  res.json({ user: { ...user, city }, addresses });
});

// ── Rota: Atualizar perfil do usuário ───────────────────────────────
// PUT /api/users/me
// Atualiza nome, telefone e/ou senha do usuário logado
//
// Body esperado:
//   name     - Novo nome (obrigatório)
//   phone    - Novo telefone (obrigatório)
//   password - Nova senha (opcional, mínimo 6 caracteres)
//
// Retorna:
//   200: { message: 'Perfil atualizado' }
//   400: Senha muito curta
//   404: Usuário não encontrado
router.put('/me', requireRole('user'), async (req, res) => {
  const { name, phone, password } = req.body;

  // Verifica se o usuário existe
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (password) {
    // Se uma nova senha foi fornecida, valida e atualiza com hash
    if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    const hash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET name = ?, phone = ?, password_hash = ? WHERE id = ?').run(name, phone, hash, req.auth.id);
  } else {
    // Se não, atualiza apenas nome e telefone
    db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone, req.auth.id);
  }
  res.json({ message: 'Perfil atualizado' });
});

// ── Rota: Adicionar endereço ────────────────────────────────────────
// POST /api/users/addresses
// Cria um novo endereço para o usuário logado
//
// Body esperado:
//   label, cep, state, city, neighborhood, street, number, complement,
//   isDefault (boolean, opcional — se true, este endereço vira o padrão)
//
// Retorna:
//   201: { id: number, message: 'Endereço adicionado' }
//   400: Campos obrigatórios ausentes
router.post('/addresses', requireRole('user'), async (req, res) => {
  const { label, cep, state, city, neighborhood, street, number, complement = '', isDefault = false } = req.body;

  // Validação: todos os campos de endereço são obrigatórios
  if (!cep || !state || !city || !neighborhood || !street || !number) {
    return res.status(400).json({ error: 'Preencha todos os campos do endereço' });
  }

  // Converte o endereço em coordenadas geográficas
  const coords = await geocode({ street, number, neighborhood, city, state, cep });

  // Se for o novo endereço padrão, desmarcar todos os outros
  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.auth.id);
  }

  // Insere o novo endereço
  const info = db.prepare(
    `INSERT INTO addresses (user_id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.auth.id, label || 'Endereço', cep, state, city, neighborhood, street, number, complement, coords?.latitude ?? null, coords?.longitude ?? null, isDefault ? 1 : 0);

  res.status(201).json({ id: info.lastInsertRowid, message: 'Endereço adicionado' });
});

// ── Rota: Atualizar endereço ────────────────────────────────────────
// PUT /api/users/addresses/:id
// Atualiza um endereço existente do usuário
//
// Params: id (ID do endereço)
// Body: label, cep, state, city, neighborhood, street, number, complement
//
// Retorna:
//   200: { message, address }
//   404: Endereço não encontrado
router.put('/addresses/:id', requireRole('user'), async (req, res) => {
  // Verifica se o endereço existe e pertence ao usuário logado
  const addr = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.auth.id);
  if (!addr) return res.status(404).json({ error: 'Endereço não encontrado' });

  const { label, cep, state, city, neighborhood, street, number, complement } = req.body;

  // Recalcula as coordenadas geográficas
  const coords = await geocode({ street, number, neighborhood, city, state, cep });

  // Atualiza todos os campos do endereço
  db.prepare(
    `UPDATE addresses SET label = ?, cep = ?, state = ?, city = ?, neighborhood = ?, street = ?, number = ?, complement = ?, latitude = ?, longitude = ? WHERE id = ?`
  ).run(label, cep, state, city, neighborhood, street, number, complement, coords?.latitude ?? addr.latitude, coords?.longitude ?? addr.longitude, addr.id);

  // Retorna o endereço atualizado
  const updated = db.prepare('SELECT id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default FROM addresses WHERE id = ?').get(addr.id);
  res.json({ message: 'Endereço atualizado', address: updated });
});

// ── Rota: Definir endereço como padrão ──────────────────────────────
// POST /api/users/addresses/:id/default
// Marca um endereço como padrão (is_default = 1) e desmarca os outros
//
// Params: id (ID do endereço)
//
// Retorna:
//   200: { message: 'Endereço definido como padrão' }
//   404: Endereço não encontrado
router.post('/addresses/:id/default', requireRole('user'), (req, res) => {
  // Verifica se o endereço pertence ao usuário
  const addr = db.prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.auth.id);
  if (!addr) return res.status(404).json({ error: 'Endereço não encontrado' });

  // Remove o padrão de todos os outros endereços do usuário
  db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.auth.id);
  // Marca o endereço selecionado como padrão
  db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(addr.id);

  res.json({ message: 'Endereço definido como padrão' });
});

// ── Rota: Deletar endereço ─────────────────────────────────────────
// DELETE /api/users/addresses/:id
// Remove um endereço existente do usuário
//
// Params: id (ID do endereço)
//
// Retorna:
//   200: { message: 'Endereço removido' }
//   404: Endereço não encontrado
router.delete('/addresses/:id', requireRole('user'), (req, res) => {
  // Verifica se o endereço existe e pertence ao usuário logado
  const addr = db.prepare('SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.auth.id);
  if (!addr) return res.status(404).json({ error: 'Endereço não encontrado' });

  // Remove o endereço
  db.prepare('DELETE FROM addresses WHERE id = ?').run(addr.id);

  // Se era o endereço padrão, redefine o padrão para o primeiro disponível
  if (addr.is_default === 1) {
    const next = db.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(req.auth.id);
    if (next) db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(next.id);
  }

  res.json({ message: 'Endereço removido' });
});

export default router;
