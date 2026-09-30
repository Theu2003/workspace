// Titulo: users
// Autor: Mateus Martins Peres
// Finalidade: Rotas da API responsavel por users.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { geocode } from '../geocode.js';

const router = Router();
router.use(authMiddleware);

router.get('/me', requireRole('user'), (req, res) => {

  const user = db.prepare(
    `SELECT id, name, cpf, email, phone, created_at FROM users WHERE id = ?`
  ).get(req.auth.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const addresses = db.prepare(
    `SELECT id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default
     FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC`
  ).all(user.id);

  const defaultAddr = addresses.find((a) => a.is_default === 1) || addresses[0];
  const city = defaultAddr?.city || null;

  res.json({ user: { ...user, city }, addresses });
});

router.put('/me', requireRole('user'), async (req, res) => {
  const { name, phone, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (password) {

    if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    const hash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET name = ?, phone = ?, password_hash = ? WHERE id = ?').run(name, phone, hash, req.auth.id);
  } else {

    db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone, req.auth.id);
  }
  res.json({ message: 'Perfil atualizado' });
});

router.post('/addresses', requireRole('user'), async (req, res) => {
  const { label, cep, state, city, neighborhood, street, number, complement = '', isDefault = false } = req.body;

  if (!cep || !state || !city || !neighborhood || !street || !number) {
    return res.status(400).json({ error: 'Preencha todos os campos do endereço' });
  }

  const coords = await geocode({ street, number, neighborhood, city, state, cep });

  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.auth.id);
  }

  const info = db.prepare(
    `INSERT INTO addresses (user_id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.auth.id, label || 'Endereço', cep, state, city, neighborhood, street, number, complement, coords?.latitude ?? null, coords?.longitude ?? null, isDefault ? 1 : 0);

  res.status(201).json({ id: info.lastInsertRowid, message: 'Endereço adicionado' });
});

router.put('/addresses/:id', requireRole('user'), async (req, res) => {

  const addr = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.auth.id);
  if (!addr) return res.status(404).json({ error: 'Endereço não encontrado' });

  const { label, cep, state, city, neighborhood, street, number, complement, latitude, longitude } = req.body;

  const hasManualCoords = latitude != null && longitude != null && latitude !== '' && longitude !== '';
  const coords = hasManualCoords
    ? { latitude: Number(latitude), longitude: Number(longitude) }
    : await geocode({ street, number, neighborhood, city, state, cep });

  db.prepare(
    `UPDATE addresses SET label = ?, cep = ?, state = ?, city = ?, neighborhood = ?, street = ?, number = ?, complement = ?, latitude = ?, longitude = ? WHERE id = ?`
  ).run(label, cep, state, city, neighborhood, street, number, complement, coords?.latitude ?? addr.latitude, coords?.longitude ?? addr.longitude, addr.id);

  const updated = db.prepare('SELECT id, label, cep, state, city, neighborhood, street, number, complement, latitude, longitude, is_default FROM addresses WHERE id = ?').get(addr.id);
  res.json({ message: 'Endereço atualizado', address: updated });
});

router.post('/addresses/:id/default', requireRole('user'), (req, res) => {

  const addr = db.prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.auth.id);
  if (!addr) return res.status(404).json({ error: 'Endereço não encontrado' });

  db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.auth.id);

  db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(addr.id);

  res.json({ message: 'Endereço definido como padrão' });
});

router.delete('/addresses/:id', requireRole('user'), (req, res) => {

  const addr = db.prepare('SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.auth.id);
  if (!addr) return res.status(404).json({ error: 'Endereço não encontrado' });

  db.prepare('DELETE FROM addresses WHERE id = ?').run(addr.id);

  if (addr.is_default === 1) {
    const next = db.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(req.auth.id);
    if (next) db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(next.id);
  }

  res.json({ message: 'Endereço removido' });
});

export default router;
