import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { geocode } from '../geocode.js';
import { MATERIAL_TYPES, parseMaterials } from '../helpers.js';

const router = Router();
router.use(authMiddleware);

router.get('/me', requireRole('company'), (req, res) => {
  const company = db.prepare(
    `SELECT id, name, cnpj, responsible, email, phone, cep, state, city, neighborhood, street, number, complement, materials, latitude, longitude, created_at
     FROM companies WHERE id = ?`
  ).get(req.auth.id);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  company.materials = parseMaterials(company.materials);
  res.json({ company });
});

router.put('/me', requireRole('company'), async (req, res) => {
  const { name, responsible, phone, materials, password, cep, state, city, neighborhood, street, number, complement } = req.body;
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.auth.id);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    const hash = await bcrypt.hash(password, 10);
    db.prepare(
      `UPDATE companies SET name = ?, responsible = ?, phone = ?, materials = ?, password_hash = ?, cep = ?, state = ?, city = ?, neighborhood = ?, street = ?, number = ?, complement = ? WHERE id = ?`
    ).run(name, responsible, phone, JSON.stringify(materials || []), hash, cep, state, city, neighborhood, street, number, complement, req.auth.id);
  } else {
    db.prepare(
      `UPDATE companies SET name = ?, responsible = ?, phone = ?, materials = ?, cep = ?, state = ?, city = ?, neighborhood = ?, street = ?, number = ?, complement = ? WHERE id = ?`
    ).run(name, responsible, phone, JSON.stringify(materials || []), cep, state, city, neighborhood, street, number, complement, req.auth.id);
  }
  res.json({ message: 'Perfil atualizado' });
});

router.get('/list', requireRole('user'), (req, res) => {
  // Busca endereço padrão do usuário pra filtrar por cidade
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
    // Sem endereço cadastrado, mostra todas
    companies = db.prepare(
      `SELECT id, name, city, state, phone, materials FROM companies WHERE is_approved = 1 ORDER BY name`
    ).all().map((c) => ({ ...c, materials: parseMaterials(c.materials) }));
  }
  res.json({ companies, materials: MATERIAL_TYPES, userCity: addr?.city || null });
});

export default router;
