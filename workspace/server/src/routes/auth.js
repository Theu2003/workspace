// ===================================================================
// routes/auth.js — Rotas de autenticação e registro
// ===================================================================
// Este arquivo define as rotas relacionadas à autenticação:
//   POST /register/user   → Registra um novo usuário comum
//   POST /register/company → Registra uma nova empresa de coleta
//   POST /login           → Realiza login (usuário ou empresa)
//   GET  /materials       → Retorna a lista de tipos de materiais
//
// O registro de empresa requer aprovação do admin antes de poder
// acessar as funcionalidades da plataforma.
// ===================================================================

import { Router } from 'express';      // Router do Express para definir rotas
import bcrypt from 'bcryptjs';         // Biblioteca para hashear e comparar senhas
import db from '../db.js';             // Instância do banco de dados
import { signToken } from '../auth.js'; // Função para gerar tokens JWT
import { geocode } from '../geocode.js'; // Função para converter endereço em coordenadas
import { MATERIAL_TYPES, notifyUser } from '../helpers.js'; // Constantes e funções auxiliares

const router = Router(); // Cria instância do router

// ── Funções de validação ───────────────────────────────────────────

/**
 * validateEmail() — Valida se uma string é um e-mail válido.
 * Usa regex para verificar o formato básico: algo@algo.dominio
 * 
 * @param {string} email - E-mail a ser validado
 * @returns {boolean} true se válido, false se inválido
 */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * validateCpf() — Valida se uma string é um CPF válido.
 * Remove caracteres não numéricos e verifica se tem 11 dígitos.
 * 
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} true se tem 11 dígitos, false se não
 */
function validateCpf(cpf) {
  const clean = String(cpf || '').replace(/\D/g, ''); // Remove tudo que não é dígito
  return clean.length === 11;
}

/**
 * validateCnpj() — Valida se uma string é um CNPJ válido.
 * Remove caracteres não numéricos e verifica se tem 14 dígitos.
 * 
 * @param {string} cnpj - CNPJ a ser validado
 * @returns {boolean} true se tem 14 dígitos, false se não
 */
function validateCnpj(cnpj) {
  const clean = String(cnpj || '').replace(/\D/g, '');
  return clean.length === 14;
}

// ── Rota: Registro de usuário comum ────────────────────────────────
// POST /api/auth/register/user
// Cria uma nova conta de usuário (gerador de resíduos)
//
// Body esperado:
//   name, cpf, email, phone, password,
//   cep, state, city, neighborhood, street, number, complement
//
// Retorna:
//   201: { token, role: 'user', user: { id, name, email } }
//   400: Erro de validação
//   409: E-mail ou CPF já cadastrado
router.post('/register/user', async (req, res) => {
  // Desestrutura os campos do body da requisição
  const {
    name, cpf, email, phone, password,
    cep, state, city, neighborhood, street, number, complement = ''
  } = req.body;

  // Validação: todos os campos obrigatórios devem ser preenchidos
  if (!name || !cpf || !email || !phone || !password || !cep || !state || !city || !neighborhood || !street || !number) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }
  // Validação: formato do e-mail
  if (!validateEmail(email)) return res.status(400).json({ error: 'E-mail inválido' });
  // Validação: CPF tem 11 dígitos
  if (!validateCpf(cpf)) return res.status(400).json({ error: 'CPF inválido' });
  // Validação: senha tem pelo menos 6 caracteres
  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

  // Verifica se já existe uma conta com este e-mail ou CPF
  const exists = db.prepare('SELECT id FROM users WHERE email = ? OR cpf = ?').get(email, cpf.replace(/\D/g, ''));
  if (exists) return res.status(409).json({ error: 'Já existe uma conta com este e-mail ou CPF' });

  // Hashea a senha com bcrypt (10 rounds de salt = seguro)
  const hash = await bcrypt.hash(password, 10);

  // Converte o endereço em coordenadas geográficas (latitude/longitude)
  const coords = await geocode({ street, number, neighborhood, city, state, cep });

  // Insere o usuário no banco de dados
  const insertUser = db.prepare(
    `INSERT INTO users (name, cpf, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)`
  );
  const info = insertUser.run(name, cpf.replace(/\D/g, ''), email, phone, hash);
  const userId = info.lastInsertRowid; // ID gerado automaticamente

  // Cria o endereço padrão do usuário (is_default = 1)
  db.prepare(
    `INSERT INTO addresses (user_id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default)
     VALUES (?, 'Principal', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(userId, cep, state, city, neighborhood, street, number, complement, coords?.latitude ?? null, coords?.longitude ?? null);

  // Envia notificação de boas-vindas ao novo usuário
  notifyUser(userId, 'bem_vindo', `Bem-vindo(a) ao ReciclaJá, ${name.split(' ')[0]}! Crie seu primeiro agendamento de coleta.`);

  // Gera o token JWT e retorna os dados
  const token = signToken({ id: userId, role: 'user' });
  res.status(201).json({ token, role: 'user', user: { id: userId, name, email } });
});

// ── Rota: Registro de empresa de coleta ─────────────────────────────
// POST /api/auth/register/company
// Cria uma nova empresa (recolhedora de resíduos)
//
// Body esperado:
//   name, cnpj, responsible, email, phone, password,
//   cep, state, city, neighborhood, street, number, complement,
//   materials (array de strings: ["Plástico", "Papel", ...])
//
// Retorna:
//   201: { token, role: 'company', company: { name, email } }
//   400: Erro de validação
//   409: E-mail ou CNPJ já cadastrado
//
// Nota: A empresa começa com is_approved = 0 (pendente de aprovação do admin)
router.post('/register/company', async (req, res) => {
  // Desestrutura os campos do body
  const {
    name, cnpj, responsible, email, phone, password,
    cep, state, city, neighborhood, street, number, complement = '',
    materials  // Array de materiais que a empresa coleta
  } = req.body;

  // Validação: campos obrigatórios
  if (!name || !cnpj || !responsible || !email || !phone || !password || !cep || !state || !city || !neighborhood || !street || !number) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }
  if (!validateEmail(email)) return res.status(400).json({ error: 'E-mail inválido' });
  if (!validateCnpj(cnpj)) return res.status(400).json({ error: 'CNPJ inválido' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
  // Validação: empresa deve coletar pelo menos um tipo de material
  if (!Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um tipo de material coletado' });
  }

  // Verifica se já existe empresa com este e-mail ou CNPJ
  const exists = db.prepare('SELECT id FROM companies WHERE email = ? OR cnpj = ?').get(email, cnpj.replace(/\D/g, ''));
  if (exists) return res.status(409).json({ error: 'Já existe uma empresa com este e-mail ou CNPJ' });

  // Hashea a senha
  const hash = await bcrypt.hash(password, 10);

  // Converte o endereço em coordenadas geográficas
  const coords = await geocode({ street, number, neighborhood, city, state, cep });

  // Insere a empresa no banco de dados
  // materials é salvo como JSON string: '["Plástico","Papel"]'
  db.prepare(
    `INSERT INTO companies (name, cnpj, responsible, email, phone, password_hash, cep, state, city, neighborhood, street, number, complement, materials, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name, cnpj.replace(/\D/g, ''), responsible, email, phone, hash,
    cep, state, city, neighborhood, street, number, complement,
    JSON.stringify(materials),  // Converte array para JSON string para salvar no SQLite
    coords?.latitude ?? null, coords?.longitude ?? null
  );

  // Busca o ID da empresa recém-criada para gerar o token
  const companyRow = db.prepare('SELECT id FROM companies WHERE email = ?').get(email);
  const token = signToken({ id: companyRow.id, role: 'company' });

  // Notifica TODOS os administradores que uma nova empresa precisa de aprovação
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  for (const admin of admins) {
    notifyUser(admin.id, 'nova_empresa_pendente', `Nova empresa "${name}" se cadastrou e aguarda aprovação. CNPJ: ${cnpj.replace(/\D/g, '')}.`);
  }

  res.status(201).json({ token, role: 'company', company: { name, email } });
});

// ── Rota: Login ────────────────────────────────────────────────────
// POST /api/auth/login
// Realiza login de usuário ou empresa
//
// Body esperado:
//   email     - E-mail da conta
//   password  - Senha em texto puro (será comparada com o hash)
//   as        - 'company' para login de empresa (opcional, padrão: usuário)
//
// Retorna:
//   200: { token, role, user/company }
//   400: Campos obrigatórios ausentes
//   401: E-mail ou senha incorretos
router.post('/login', async (req, res) => {
  const { email, password, as } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha' });

  // ── Login de empresa ───────────────────────────────────────────
  if (as === 'company') {
    // Busca a empresa pelo e-mail
    const company = db.prepare('SELECT * FROM companies WHERE email = ?').get(email);
    if (!company) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    // Compara a senha fornecida com o hash armazenado
    const ok = await bcrypt.compare(password, company.password_hash);
    if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    // Gera o token JWT com ID e role da empresa
    const token = signToken({ id: company.id, role: 'company' });
    return res.json({
      token,
      role: 'company',
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        is_approved: company.is_approved  // Importante: frontend verifica se está aprovada
      }
    });
  }

  // ── Login de usuário (padrão) ──────────────────────────────────
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

  // Compara a senha com o hash
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

  const userRole = user.role || 'user'; // Pode ser 'user' ou 'admin'
  const token = signToken({ id: user.id, role: userRole });

  // Busca a cidade do endereço padrão do usuário (usada para filtrar empresas)
  const defaultAddr = db.prepare('SELECT city FROM addresses WHERE user_id = ? AND is_default = 1 LIMIT 1').get(user.id);

  res.json({
    token,
    role: userRole,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      city: defaultAddr?.city || null  // Cidade do endereço padrão
    }
  });
});

// ── Rota: Lista de materiais ───────────────────────────────────────
// GET /api/auth/materials
// Retorna a lista de tipos de materiais recicláveis
// Usada no formulário de cadastro de coleta e cadastro de empresa
router.get('/materials', (_req, res) => {
  res.json({ materials: MATERIAL_TYPES });
});

export default router;
