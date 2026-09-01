import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { parseMaterials, notifyUser, notifyCompany, STATUS_FLOW } from '../helpers.js';

const router = Router();
router.use(authMiddleware);

function serializeCollection(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    company_id: row.company_id,
    user_name: row.user_name,
    user_phone: row.user_phone,
    company_name: row.company_name,
    materials: parseMaterials(row.materials),
    address: JSON.parse(row.address),
    latitude: row.latitude,
    longitude: row.longitude,
    company_latitude: row.company_latitude,
    company_longitude: row.company_longitude,
    date: row.date,
    period: row.period,
    observations: row.observations,
    status: row.status,
    status_label: STATUS_FLOW[row.status] || row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

const USER_COLLECTION_COLUMNS = `
  c.id, c.user_id, c.company_id, c.materials, c.address, c.latitude, c.longitude,
  c.date, c.period, c.observations, c.status, c.created_at, c.updated_at,
  u.name AS user_name, u.phone AS user_phone,
  co.name AS company_name,
  co.latitude AS company_latitude, co.longitude AS company_longitude
`;

router.post('/', requireRole('user'), (req, res) => {
  const { addressId, materials, date, period, observations = '' } = req.body;

  if (!addressId) return res.status(400).json({ error: 'Selecione um endereço de coleta' });
  if (!Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({ error: 'Adicione ao menos um material' });
  }
  for (const m of materials) {
    if (!m.type || !m.quantity || Number(m.quantity) <= 0) {
      return res.status(400).json({ error: `Informe uma quantidade válida para ${m.type || 'o material'}` });
    }
  }
  if (!date) return res.status(400).json({ error: 'Escolha uma data para a coleta' });
  if (!period) return res.status(400).json({ error: 'Escolha um período para a coleta' });

  const addr = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(addressId, req.auth.id);
  if (!addr) return res.status(404).json({ error: 'Endereço não encontrado' });

  const address = {
    cep: addr.cep, state: addr.state, city: addr.city, neighborhood: addr.neighborhood,
    street: addr.street, number: addr.number, complement: addr.complement, label: addr.label
  };

  const info = db.prepare(
    `INSERT INTO collections (user_id, materials, address, latitude, longitude, date, period, observations, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`
  ).run(
    req.auth.id, JSON.stringify(materials), JSON.stringify(address),
    addr.latitude, addr.longitude, date, period, observations
  );
  const collectionId = info.lastInsertRowid;

  notifyUser(req.auth.id, 'solicitacao_recebida',
    'Sua solicitação de coleta foi recebida! Em breve uma empresa poderá aceitá-la.', collectionId);

  // Notificar apenas empresas aprovadas da mesma cidade do usuário
  const userCity = addr.city;
  const companies = userCity
    ? db.prepare('SELECT id FROM companies WHERE is_approved = 1 AND city = ?').all(userCity)
    : db.prepare('SELECT id FROM companies WHERE is_approved = 1').all();
  for (const company of companies) {
    notifyCompany(company.id, 'nova_solicitacao',
      'Nova solicitação de coleta disponível na sua região. Verifique na sua área de trabalho.', collectionId);
  }

  const row = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.id = ?`
  ).get(collectionId);

  res.status(201).json({ collection: serializeCollection(row) });
});

router.get('/mine', requireRole('user'), (req, res) => {
  const rows = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC`
  ).all(req.auth.id);
  res.json({ collections: rows.map(serializeCollection) });
});

router.get('/', requireRole('company'), (req, res) => {
  const { status, neighborhood, material, date, distance } = req.query;

  const company = db.prepare('SELECT is_approved, city FROM companies WHERE id = ?').get(req.auth.id);
  if (!company?.is_approved) return res.status(403).json({ error: 'Empresa ainda não aprovada pelo administrador' });

  const conditions = [];
  const params = [];

  // Filtro por cidade: empresa só vê solicitações da sua cidade
  if (company.city) {
    conditions.push('JSON_EXTRACT(c.address, "$.city") = ?');
    params.push(company.city);
  }

  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }
  if (neighborhood) {
    conditions.push('JSON_EXTRACT(c.address, "$.neighborhood") LIKE ?');
    params.push(`%${neighborhood}%`);
  }
  if (material) {
    conditions.push('c.materials LIKE ?');
    params.push(`%${material}%`);
  }
  if (date) {
    conditions.push('c.date = ?');
    params.push(date);
  }

  let where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let rows = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     ${where}
     ORDER BY c.created_at DESC`
  ).all(...params);

  if (distance && rows.length) {
    const company = db.prepare('SELECT latitude, longitude FROM companies WHERE id = ?').get(req.auth.id);
    if (company?.latitude != null) {
      rows = rows.filter((r) => {
        if (r.latitude == null) return true;
        const d = haversine(company.latitude, company.longitude, r.latitude, r.longitude);
        return d <= Number(distance);
      });
    }
  }

  res.json({ collections: rows.map(serializeCollection) });
});

router.get('/dashboard', requireRole('company'), (req, res) => {
  const company = db.prepare('SELECT is_approved, city FROM companies WHERE id = ?').get(req.auth.id);
  if (!company?.is_approved) return res.status(403).json({ error: 'Empresa ainda não aprovada pelo administrador' });

  // Empresa só vê: suas próprias coletas + pendentes da mesma cidade
  const rows = company.city
    ? db.prepare(
        `SELECT ${USER_COLLECTION_COLUMNS}
         FROM collections c
         LEFT JOIN users u ON u.id = c.user_id
         LEFT JOIN companies co ON co.id = c.company_id
         WHERE c.company_id = ? OR (c.status = 'pendente' AND JSON_EXTRACT(c.address, '$.city') = ?)
         ORDER BY c.created_at DESC`
      ).all(req.auth.id, company.city)
    : db.prepare(
        `SELECT ${USER_COLLECTION_COLUMNS}
         FROM collections c
         LEFT JOIN users u ON u.id = c.user_id
         LEFT JOIN companies co ON co.id = c.company_id
         WHERE c.company_id = ? OR (c.status = 'pendente')
         ORDER BY c.created_at DESC`
      ).all(req.auth.id);

  const total = rows.length;
  const byStatus = { pendente: 0, agendada: 0, aceita: 0, em_coleta: 0, concluida: 0, cancelada: 0, recusada: 0 };
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  const completed = rows.filter((r) => r.status === 'concluida');
  let collected = 0;
  for (const c of completed) {
    for (const m of parseMaterials(c.materials)) collected += Number(m.quantity) || 0;
  }

  const clients = new Set();
  for (const c of completed) clients.add(c.user_id);

  const byDate = {};
  for (const r of rows) {
    if (r.status === 'pendente' || r.status === 'aceita' || r.status === 'agendada') {
      const d = r.date;
      byDate[d] = (byDate[d] || 0) + 1;
    }
  }

  res.json({
    dashboard: {
      total,
      byStatus,
      scheduled: byStatus.agendada + byStatus.aceita + byStatus.em_coleta,
      completed: byStatus.concluida,
      pending: byStatus.pendente,
      collectedWeight: collected,
      clientsServed: clients.size,
      byDate
    }
  });
});

router.get('/user-dashboard', requireRole('user'), (req, res) => {
  const rows = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC`
  ).all(req.auth.id);

  const byStatus = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  let totalWeight = 0;
  for (const c of rows) {
    if (c.status !== 'cancelada' && c.status !== 'recusada') {
      for (const m of parseMaterials(c.materials)) totalWeight += Number(m.quantity) || 0;
    }
  }

  const upcoming = rows
    .filter((r) => ['pendente', 'aceita', 'agendada'].includes(r.status))
    .sort((a, b) => (a.date + a.period).localeCompare(b.date + b.period));

  res.json({
    dashboard: {
      total: rows.length,
      byStatus,
      pending: byStatus.pendente || 0,
      scheduled: (byStatus.aceita || 0) + (byStatus.agendada || 0) + (byStatus.em_coleta || 0),
      completed: byStatus.concluida || 0,
      cancelled: (byStatus.cancelada || 0) + (byStatus.recusada || 0),
      totalWeight,
      upcoming
    }
  });
});

router.put('/:id/status', requireRole('company'), (req, res) => {
  const { status, companyId } = req.body;
  const allowed = Object.keys(STATUS_FLOW);
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!collection) return res.status(404).json({ error: 'Coleta não encontrada' });

  if (status === 'cancelada' || status === 'recusada') {
    db.prepare(
      `UPDATE collections SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(status, collection.id);
    notifyUser(collection.user_id, 'coleta_cancelada',
      `Sua coleta foi ${status === 'cancelada' ? 'cancelada' : 'recusada'}. Entre em contato para mais informações.`, collection.id);
    return res.json({ message: 'Coleta atualizada' });
  }

  db.prepare(
    `UPDATE collections SET status = ?, company_id = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(status, companyId || req.auth.id, collection.id);

  const messages = {
    aceita: 'Uma empresa aceitou sua solicitação de coleta!',
    agendada: 'A data da sua coleta foi confirmada. Prepare seus materiais!',
    em_coleta: 'A empresa está a caminho da sua coleta!',
    concluida: 'Coleta concluída! Obrigado por reciclar e contribuir com o planeta.'
  };
  if (messages[status]) {
    notifyUser(collection.user_id, `coleta_${status}`, messages[status], collection.id);
  }

  res.json({ message: 'Coleta atualizada' });
});

router.get('/:id', (req, res) => {
  const row = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.id = ?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Coleta não encontrada' });

  if (req.auth.role === 'user' && row.user_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (req.auth.role === 'company' && row.company_id && row.company_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  res.json({ collection: serializeCollection(row) });
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Mensagens empresa ↔ usuário (por coleta) ──────────────────────

// Listar mensagens de uma coleta
router.get('/:id/messages', (req, res) => {
  const col = db.prepare('SELECT id, user_id, company_id FROM collections WHERE id = ?').get(req.params.id);
  if (!col) return res.status(404).json({ error: 'Coleta não encontrada' });

  // Verificar acesso: só o usuário dono da coleta ou a empresa atribuída
  if (req.auth.role === 'user' && col.user_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (req.auth.role === 'company' && col.company_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const messages = db.prepare(
    `SELECT id, collection_id, sender_type, sender_id, message, is_read, created_at
     FROM collection_messages WHERE collection_id = ? ORDER BY created_at ASC`
  ).all(req.params.id);

  // Marcar como lidas as mensagens do outro lado
  const markType = req.auth.role;
  db.prepare(
    `UPDATE collection_messages SET is_read = 1
     WHERE collection_id = ? AND sender_type != ? AND is_read = 0`
  ).run(req.params.id, markType);

  res.json({ messages });
});

// Enviar mensagem numa coleta
router.post('/:id/messages', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
  }

  const col = db.prepare('SELECT id, user_id, company_id FROM collections WHERE id = ?').get(req.params.id);
  if (!col) return res.status(404).json({ error: 'Coleta não encontrada' });

  if (req.auth.role === 'user' && col.user_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (req.auth.role === 'company' && col.company_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const senderType = req.auth.role; // 'user' ou 'company'
  const info = db.prepare(
    `INSERT INTO collection_messages (collection_id, sender_type, sender_id, message)
     VALUES (?, ?, ?, ?)`
  ).run(req.params.id, senderType, req.auth.id, message.trim());

  // Notificar o outro lado
  if (senderType === 'company' && col.user_id) {
    notifyUser(col.user_id, 'mensagem_empresa',
      `A empresa enviou uma mensagem sobre a coleta #${col.id}.`, col.id);
  } else if (senderType === 'user' && col.company_id) {
    notifyCompany(col.company_id, 'mensagem_usuario',
      `O cliente enviou uma mensagem sobre a coleta #${col.id}.`, col.id);
  }

  res.status(201).json({ id: info.lastInsertRowid, message: 'Mensagem enviada' });
});

export default router;
