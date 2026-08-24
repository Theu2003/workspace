import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken } from '../auth.js';
import { geocode } from '../geocode.js';
import { MATERIAL_TYPES, notifyUser } from '../helpers.js';

const router = Router();

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateCpf(cpf) {
  const clean = String(cpf || '').replace(/\D/g, '');
  return clean.length === 11;
}

function validateCnpj(cnpj) {
  const clean = String(cnpj || '').replace(/\D/g, '');
  return clean.length === 14;
}

router.post('/register/user', async (req, res) => {
  const {
    name, cpf, email, phone, password,
    cep, state, city, neighborhood, street, number, complement = ''
  } = req.body;

  if (!name || !cpf || !email || !phone || !password || !cep || !state || !city || !neighborhood || !street || !number) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }
  if (!validateEmail(email)) return res.status(400).json({ error: 'E-mail inválido' });
  if (!validateCpf(cpf)) return res.status(400).json({ error: 'CPF inválido' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ? OR cpf = ?').get(email, cpf.replace(/\D/g, ''));
  if (exists) return res.status(409).json({ error: 'Já existe uma conta com este e-mail ou CPF' });

  const hash = await bcrypt.hash(password, 10);
  const coords = await geocode({ street, number, neighborhood, city, state, cep });

  const insertUser = db.prepare(
    `INSERT INTO users (name, cpf, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)`
  );
  const info = insertUser.run(name, cpf.replace(/\D/g, ''), email, phone, hash);
  const userId = info.lastInsertRowid;

  db.prepare(
    `INSERT INTO addresses (user_id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default)
     VALUES (?, 'Principal', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(userId, cep, state, city, neighborhood, street, number, complement, coords?.latitude ?? null, coords?.longitude ?? null);

  notifyUser(userId, 'bem_vindo', `Bem-vindo(a) ao ReciclaJá, ${name.split(' ')[0]}! Crie seu primeiro agendamento de coleta.`);

  const token = signToken({ id: userId, role: 'user' });
  res.status(201).json({ token, role: 'user', user: { id: userId, name, email } });
});

router.post('/register/company', async (req, res) => {
  const {
    name, cnpj, responsible, email, phone, password,
    cep, state, city, neighborhood, street, number, complement = '',
    materials
  } = req.body;

  if (!name || !cnpj || !responsible || !email || !phone || !password || !cep || !state || !city || !neighborhood || !street || !number) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }
  if (!validateEmail(email)) return res.status(400).json({ error: 'E-mail inválido' });
  if (!validateCnpj(cnpj)) return res.status(400).json({ error: 'CNPJ inválido' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
  if (!Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um tipo de material coletado' });
  }

  const exists = db.prepare('SELECT id FROM companies WHERE email = ? OR cnpj = ?').get(email, cnpj.replace(/\D/g, ''));
  if (exists) return res.status(409).json({ error: 'Já existe uma empresa com este e-mail ou CNPJ' });

  const hash = await bcrypt.hash(password, 10);
  const coords = await geocode({ street, number, neighborhood, city, state, cep });

  db.prepare(
    `INSERT INTO companies (name, cnpj, responsible, email, phone, password_hash, cep, state, city, neighborhood, street, number, complement, materials, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name, cnpj.replace(/\D/g, ''), responsible, email, phone, hash,
    cep, state, city, neighborhood, street, number, complement,
    JSON.stringify(materials), coords?.latitude ?? null, coords?.longitude ?? null
  );

  const token = signToken({ id: db.prepare('SELECT id FROM companies WHERE email = ?').get(email).id, role: 'company' });
  res.status(201).json({ token, role: 'company', company: { name, email } });
});

router.post('/login', async (req, res) => {
  const { email, password, as } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha' });

  if (as === 'company') {
    const company = db.prepare('SELECT * FROM companies WHERE email = ?').get(email);
    if (!company) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    const ok = await bcrypt.compare(password, company.password_hash);
    if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    const token = signToken({ id: company.id, role: 'company' });
    return res.json({ token, role: 'company', company: { id: company.id, name: company.name, email: company.email, is_approved: company.is_approved } });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  const userRole = user.role || 'user';
  const token = signToken({ id: user.id, role: userRole });
  // Busca cidade do endereço padrão
  const defaultAddr = db.prepare('SELECT city FROM addresses WHERE user_id = ? AND is_default = 1 LIMIT 1').get(user.id);
  res.json({ token, role: userRole, user: { id: user.id, name: user.name, email: user.email, city: defaultAddr?.city || null } });
});

router.get('/materials', (_req, res) => {
  res.json({ materials: MATERIAL_TYPES });
});

export default router;
