// Titulo: auth
// Autor: Mateus Martins Peres
// Finalidade: Rotas da API responsavel por auth.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { authMiddleware, requireRole, signToken } from '../auth.js';
import { geocode } from '../geocode.js';
import { MATERIAL_TYPES, notifyUser } from '../helpers.js';
import { generateCode, hashCode, sendVerificationCode, verifyCode } from '../otp.js';
import { findUserByIdentifier, getPrimaryContact } from '../user-identifiers.js';

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

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_CODE_SENDS = 3;
const requestBuckets = new Map();

function rateLimited(req, action, limit = 10) {
  const now = Date.now();
  const key = `${action}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  const recent = (requestBuckets.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= limit) {
    requestBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  requestBuckets.set(key, recent);
  if (requestBuckets.size > 2000) {
    for (const [bucket, times] of requestBuckets) {
      if (times.every((time) => now - time >= 15 * 60 * 1000)) requestBuckets.delete(bucket);
    }
  }
  return false;
}

function normalizeContact(email, phone) {
  const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
  const normalizedPhone = phone ? String(phone).trim() : '';
  if (Boolean(normalizedEmail) === Boolean(normalizedPhone)) return null;
  if (normalizedEmail && !validateEmail(normalizedEmail)) return null;
  if (normalizedPhone && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) return null;
  return normalizedEmail
    ? { channel: 'email', value: normalizedEmail, email: normalizedEmail, phone: null }
    : { channel: 'phone', value: normalizedPhone, email: null, phone: normalizedPhone };
}

function issueCode({ purpose, userId = null, pendingId = null, channel, destination }) {
  const now = Date.now();
  const existing = userId == null
    ? (pendingId ? db.prepare('SELECT * FROM verification_codes WHERE pending_id = ? AND purpose = ?').get(pendingId, purpose) : null)
    : db.prepare('SELECT * FROM verification_codes WHERE user_id = ? AND purpose = ?').get(userId, purpose);
  if (existing && existing.expires_at > now) {
    if (now - existing.last_sent_at < CODE_RESEND_MS) throw new Error('A code was sent recently. Please wait before requesting another.');
    if (existing.sends >= MAX_CODE_SENDS) throw new Error('The maximum number of code sends has been reached. Try again later.');
  }

  const code = generateCode();
  const codeHash = hashCode(code, purpose, userId ?? pendingId);
  const values = {
    channel, destination, codeHash,
    expiresAt: now + CODE_TTL_MS,
    lastSentAt: now
  };
  let codeId;
  if (existing) {
    db.prepare(
      `UPDATE verification_codes SET channel = ?, destination = ?, code_hash = ?, expires_at = ?,
       attempts = 0,
       sends = CASE WHEN expires_at > ? THEN sends + 1 ELSE 1 END,
       last_sent_at = ?, consumed_at = NULL WHERE id = ?`
    ).run(channel, destination, codeHash, values.expiresAt, now, now, existing.id);
    codeId = existing.id;
  } else {
    const info = db.prepare(
      `INSERT INTO verification_codes
       (user_id, pending_id, purpose, channel, destination, code_hash, expires_at, last_sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, pendingId, purpose, channel, destination, codeHash, values.expiresAt, now, now);
    codeId = info.lastInsertRowid;
  }
  return { id: codeId, code };
}

function registrationDestinationLimited(channel, destination) {
  const recent = db.prepare(
    `SELECT COALESCE(SUM(sends), 0) AS count FROM verification_codes
     WHERE purpose = 'registration' AND channel = ? AND destination = ? AND created_at > ?`
  ).get(channel, destination, Date.now() - 60 * 60 * 1000);
  return recent.count >= MAX_CODE_SENDS;
}

async function deliverIssuedCode(issued, channel, destination) {
  await sendVerificationCode(channel, destination, issued.code);
}

function checkCode(req, res, code, purpose, recordId) {
  const row = db.prepare(
    `SELECT * FROM verification_codes WHERE purpose = ? AND ${purpose === 'registration' ? 'pending_id' : 'user_id'} = ?`
  ).get(purpose, recordId);
  const now = Date.now();
  if (!row || row.consumed_at != null || row.expires_at <= now || row.attempts >= MAX_CODE_ATTEMPTS) {
    res.status(400).json({ error: 'Código inválido ou expirado' });
    return false;
  }
  if (!/^\d{6}$/.test(String(code || '')) ||
      !verifyCode(String(code), row.code_hash, purpose, row.user_id ?? row.pending_id)) {
    db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    res.status(400).json({ error: 'Código inválido ou expirado' });
    return false;
  }
  db.prepare('UPDATE verification_codes SET consumed_at = ? WHERE id = ?').run(now, row.id);
  return true;
}

router.post('/register/user', async (req, res) => {

  const {
    name, cpf, email, phone, password,
    cep, state, city, neighborhood, street, number, complement = ''
  } = req.body;

  if (!name || !cpf || !password || !cep || !state || !city || !neighborhood || !street || !number) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }

  const contact = normalizeContact(email, phone);
  if (!contact) return res.status(400).json({ error: 'Informe somente um contato: e-mail válido ou telefone E.164 (+código do país)' });

  if (!validateCpf(cpf)) return res.status(400).json({ error: 'CPF inválido' });

  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

  if (rateLimited(req, 'register', 5)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  const exists = db.prepare(
    `SELECT id FROM users WHERE cpf = ?
     OR (primary_contact = 'email' AND lower(email) = lower(?))
     OR (primary_contact = 'phone' AND phone = ?)`
  ).get(cpf.replace(/\D/g, ''), contact.email || null, contact.phone || null);
  if (exists) return res.status(409).json({ error: 'Já existe uma conta com este e-mail, telefone ou CPF' });

  const hash = await bcrypt.hash(password, 10);
  const pendingId = randomUUID();
  const now = Date.now();
  if (registrationDestinationLimited(contact.channel, contact.value)) {
    return res.status(429).json({ error: 'Muitas solicitações para este contato. Tente novamente mais tarde.' });
  }
  db.exec(`DELETE FROM pending_registrations WHERE created_at <= ${now - 24 * 60 * 60 * 1000}`);
  db.prepare(
    `INSERT INTO pending_registrations (id, contact_type, contact_value, payload, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(pendingId, contact.channel, contact.value, JSON.stringify({
    name, cpf: cpf.replace(/\D/g, ''), email: contact.email, phone: contact.phone, passwordHash: hash,
    cep, state, city, neighborhood, street, number, complement
  }), now + CODE_TTL_MS, now);

  try {
    const issued = issueCode({ purpose: 'registration', pendingId, channel: contact.channel, destination: contact.value });
    await deliverIssuedCode(issued, contact.channel, contact.value);
  } catch (error) {
    db.prepare('DELETE FROM pending_registrations WHERE id = ?').run(pendingId);
    const message = error.message.includes('configured') || error.message.includes('must be')
      ? error.message
      : 'Could not deliver the verification code. Check the selected delivery provider configuration.';
    return res.status(503).json({ error: message });
  }

  res.status(202).json({ pendingId, expiresIn: CODE_TTL_MS / 1000, message: 'Código de verificação enviado' });
});

router.post('/register/user/resend', async (req, res) => {
  const { pendingId } = req.body;
  if (!pendingId || rateLimited(req, 'register-resend', 5)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  }
  const pending = db.prepare('SELECT * FROM pending_registrations WHERE id = ?').get(pendingId);
  if (!pending || pending.expires_at <= Date.now()) return res.status(400).json({ error: 'Cadastro pendente inválido ou expirado' });
  if (registrationDestinationLimited(pending.contact_type, pending.contact_value)) {
    return res.status(429).json({ error: 'Muitas solicitações para este contato. Tente novamente mais tarde.' });
  }

  try {
    const issued = issueCode({
      purpose: 'registration', pendingId, channel: pending.contact_type, destination: pending.contact_value
    });
    await deliverIssuedCode(issued, pending.contact_type, pending.contact_value);
    return res.json({ message: 'Código de verificação enviado' });
  } catch (error) {
    const status = error.message.includes('recently') || error.message.includes('maximum') ? 429 : 503;
    return res.status(status).json({ error: error.message });
  }
});

router.post('/register/user/verify', async (req, res) => {
  if (rateLimited(req, 'register-verify', 10)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  const { pendingId, code } = req.body;
  const pending = db.prepare('SELECT * FROM pending_registrations WHERE id = ?').get(pendingId);
  if (!pending || pending.expires_at <= Date.now()) return res.status(400).json({ error: 'Cadastro pendente inválido ou expirado' });
  if (!checkCode(req, res, code, 'registration', pendingId)) return;

  const data = JSON.parse(pending.payload);
  const exists = db.prepare(
    `SELECT id FROM users WHERE cpf = ?
     OR (primary_contact = 'email' AND lower(email) = lower(?))
     OR (primary_contact = 'phone' AND phone = ?)`
  ).get(data.cpf, data.email, data.phone);
  if (exists) {
    db.prepare('DELETE FROM pending_registrations WHERE id = ?').run(pendingId);
    return res.status(409).json({ error: 'Já existe uma conta com este e-mail, telefone ou CPF' });
  }

  const coords = await geocode(data);
  let userId;
  try {
    const info = db.prepare(
      `INSERT INTO users (name, cpf, email, phone, password_hash, primary_contact) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(data.name, data.cpf, data.email, data.phone, data.passwordHash, pending.contact_type);
    userId = info.lastInsertRowid;
    db.prepare(
      `INSERT INTO addresses (user_id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default)
       VALUES (?, 'Principal', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(userId, data.cep, data.state, data.city, data.neighborhood, data.street, data.number,
      data.complement, coords?.latitude ?? null, coords?.longitude ?? null);
  } catch {
    if (userId) db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return res.status(409).json({ error: 'Não foi possível concluir o cadastro; verifique os dados informados' });
  }

  db.prepare('DELETE FROM pending_registrations WHERE id = ?').run(pendingId);
  notifyUser(userId, 'bem_vindo', `Bem-vindo(a) ao ReciclaJá, ${data.name.split(' ')[0]}! Crie seu primeiro agendamento de coleta.`);
  const token = signToken({ id: userId, role: 'user' });
  return res.status(201).json({
    token, role: 'user',
    user: { id: userId, name: data.name, email: data.email, phone: data.phone }
  });
});

router.post('/password-reset/request', async (req, res) => {
  const { identifier } = req.body;
  if (!rateLimited(req, 'password-reset', 5)) {
    const user = findUserByIdentifier(db, identifier);
    const contact = getPrimaryContact(user);
    if (user && contact) {
      try {
        const issued = issueCode({
          purpose: 'password_reset', userId: user.id,
          channel: contact.channel, destination: contact.destination
        });
        deliverIssuedCode(issued, contact.channel, contact.destination).catch(() => {
          console.error('Password reset delivery failed; verify the selected provider configuration and availability');
        });
      } catch {
        // Keep this public response indistinguishable for known and unknown accounts.
      }
    }
  }
  return res.status(202).json({ message: 'Se a conta existir, enviaremos um código ao contato cadastrado.' });
});

router.post('/password-reset/confirm', async (req, res) => {
  const { identifier, code, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
  if (rateLimited(req, 'password-reset-verify', 10)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  const user = findUserByIdentifier(db, identifier);
  if (!user || !checkCode(req, res, code, 'password_reset', user.id)) {
    if (!user) return res.status(400).json({ error: 'Código inválido ou expirado' });
    return;
  }
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  return res.json({ message: 'Senha redefinida com sucesso' });
});

router.post('/password-change/request', authMiddleware, requireRole('user'), async (req, res) => {
  if (rateLimited(req, 'password-change', 5)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  const user = db.prepare('SELECT email, phone, primary_contact FROM users WHERE id = ?').get(req.auth.id);
  const contact = getPrimaryContact(user);
  if (!contact) return res.status(400).json({ error: 'A conta não possui um contato verificado para receber o código' });
  try {
    const issued = issueCode({
      purpose: 'password_change', userId: req.auth.id,
      channel: contact.channel, destination: contact.destination
    });
    await deliverIssuedCode(issued, contact.channel, contact.destination);
    return res.json({ message: 'Código enviado ao contato principal cadastrado' });
  } catch (error) {
    const status = error.message.includes('recently') || error.message.includes('maximum') ? 429 : 503;
    return res.status(status).json({ error: error.message });
  }
});

router.post('/password-change/confirm', authMiddleware, requireRole('user'), async (req, res) => {
  const { code, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
  if (rateLimited(req, 'password-change-verify', 10)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  if (!checkCode(req, res, code, 'password_change', req.auth.id)) return;
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.auth.id);
  return res.json({ message: 'Senha alterada com sucesso' });
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
    JSON.stringify(materials),
    coords?.latitude ?? null, coords?.longitude ?? null
  );

  const companyRow = db.prepare('SELECT id FROM companies WHERE email = ?').get(email);
  const token = signToken({ id: companyRow.id, role: 'company' });

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  for (const admin of admins) {
    notifyUser(admin.id, 'nova_empresa_pendente', `Nova empresa "${name}" se cadastrou e aguarda aprovação. CNPJ: ${cnpj.replace(/\D/g, '')}.`);
  }

  res.status(201).json({ token, role: 'company', company: { name, email } });
});

router.post('/login', async (req, res) => {
  const { email, identifier = email, password, as } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Informe seu e-mail ou telefone e a senha' });

  if (as === 'company') {

    const company = db.prepare('SELECT * FROM companies WHERE email = ?').get(identifier);
    if (!company) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const ok = await bcrypt.compare(password, company.password_hash);
    if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const token = signToken({ id: company.id, role: 'company' });
    return res.json({
      token,
      role: 'company',
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        is_approved: company.is_approved
      }
    });
  }

  const user = findUserByIdentifier(identifier);
  if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

  const userRole = user.role || 'user';
  const token = signToken({ id: user.id, role: userRole });

  const defaultAddr = db.prepare('SELECT city FROM addresses WHERE user_id = ? AND is_default = 1 LIMIT 1').get(user.id);

  res.json({
    token,
    role: userRole,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      city: defaultAddr?.city || null
    }
  });
});

router.get('/materials', (_req, res) => {
  res.json({ materials: MATERIAL_TYPES });
});

export default router;
