// Titulo: companies
// Autor: Mateus Martins Peres
// Finalidade: Rotas da API responsavel por companies.
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
  const { name, responsible, phone, materials, password, cep, state, city, neighborhood, street, number, complement = '' } = req.body;

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.auth.id);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

  const cleanName = String(name ?? '').trim();
  const cleanResponsible = String(responsible ?? '').trim();
  const cleanPhone = String(phone ?? '').trim();
  if (!cleanName || !cleanResponsible || !cleanPhone) {
    return res.status(400).json({ error: 'Nome, responsável e telefone são obrigatórios' });
  }

  if (!Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um tipo de material coletado' });
  }
  const invalidMaterial = materials.find((material) => !MATERIAL_TYPES.includes(material));
  if (invalidMaterial !== undefined) {
    return res.status(400).json({ error: `Tipo de material inválido: ${invalidMaterial}` });
  }

  if (password && String(password).length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
  }

  const nextAddress = {
    cep: cep ?? company.cep,
    state: state ?? company.state,
    city: city ?? company.city,
    neighborhood: neighborhood ?? company.neighborhood,
    street: street ?? company.street,
    number: number ?? company.number,
    complement: complement ?? company.complement
  };
  const addressFields = ['cep', 'state', 'city', 'neighborhood', 'street', 'number'];
  const addressChanged = addressFields.some(
    (field) => String(nextAddress[field] ?? '') !== String(company[field] ?? '')
  );

  // Endereço mudou: recalcula as coordenadas usadas na lista e no mapa.
  const coords = addressChanged
    ? (await geocode(nextAddress)) ?? { latitude: company.latitude, longitude: company.longitude }
    : { latitude: company.latitude, longitude: company.longitude };

  const baseFields = [
    cleanName, cleanResponsible, cleanPhone, JSON.stringify(materials),
    nextAddress.cep, nextAddress.state, nextAddress.city, nextAddress.neighborhood,
    nextAddress.street, nextAddress.number, nextAddress.complement,
    coords.latitude, coords.longitude
  ];
  const setClause = 'name = ?, responsible = ?, phone = ?, materials = ?, cep = ?, state = ?, city = ?, neighborhood = ?, street = ?, number = ?, complement = ?, latitude = ?, longitude = ?';

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    db.prepare(`UPDATE companies SET ${setClause}, password_hash = ? WHERE id = ?`)
      .run(...baseFields, hash, req.auth.id);
  } else {
    db.prepare(`UPDATE companies SET ${setClause} WHERE id = ?`)
      .run(...baseFields, req.auth.id);
  }

  res.json({ message: 'Perfil atualizado' });
});

router.get('/list', requireRole('user'), (req, res) => {

  const addr = db.prepare(
    `SELECT city FROM addresses WHERE user_id = ? AND is_default = 1 ORDER BY id LIMIT 1`
  ).get(req.auth.id);

  let companies;
  if (addr?.city) {

    companies = db.prepare(
      `SELECT id, name, city, state, phone, materials FROM companies WHERE is_approved = 1 AND city = ? ORDER BY name`
    ).all(addr.city).map((c) => ({ ...c, materials: parseMaterials(c.materials) }));
  } else {

    companies = db.prepare(
      `SELECT id, name, city, state, phone, materials FROM companies WHERE is_approved = 1 ORDER BY name`
    ).all().map((c) => ({ ...c, materials: parseMaterials(c.materials) }));
  }

  res.json({ companies, materials: MATERIAL_TYPES, userCity: addr?.city || null });
});

router.delete('/me', requireRole('company'), (req, res) => {
  try {
    const companyId = req.auth.id;
    const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    db.prepare('UPDATE collections SET company_id = NULL, status = ? WHERE company_id = ?').run('pendente', companyId);

    // Notificações da própria empresa vão embora junto com a conta
    // (antes viravam linhas órfãs sem user_id nem company_id).
    db.prepare('DELETE FROM notifications WHERE company_id = ?').run(companyId);

    db.prepare("DELETE FROM messages WHERE (sender_type = 'company' AND sender_id = ?) OR (receiver_type = 'company' AND receiver_id = ?)").run(companyId, companyId);

    db.prepare('DELETE FROM companies WHERE id = ?').run(companyId);

    res.json({ message: 'Conta excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir empresa:', err);
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

export default router;
