// ===================================================================
// routes/collections.js — Rotas de coletas (coro do sistema)
// ===================================================================
// Este é o arquivo mais importante do backend. Gerencia o ciclo de vida
// das solicitações de coleta de resíduos:
//
// Rotas:
//   POST /              → Cria uma nova solicitação de coleta (usuário)
//   GET  /mine           → Lista coletas do usuário logado
//   GET  /               → Lista coletas visíveis para a empresa (com filtros)
//   GET  /dashboard      → Dados do dashboard da empresa
//   GET  /user-dashboard → Dados do dashboard do usuário
//   PUT  /:id/status     → Atualiza o status de uma coleta
//   GET  /:id            → Detalhes de uma coleta específica
//   GET  /:id/messages   → Mensagens de uma coleta (usuário ↔ empresa)
//   POST /:id/messages   → Enviar mensagem numa coleta
//
// Fluxo de uma coleta:
//   1. Usuário cria → status 'pendente', empresa_id = NULL
//   2. Empresa aceita → status 'aceita', empresa_id definido
//   3. Empresa agenda → status 'agendada'
//   4. Empresa vai buscar → status 'em_coleta'
//   5. Coleta feita → status 'concluida'
// ===================================================================

import { Router } from 'express';       // Router do Express
import db from '../db.js';              // Banco de dados
import { authMiddleware, requireRole } from '../auth.js'; // Middlewares de auth
import { parseMaterials, notifyUser, notifyCompany, STATUS_FLOW } from '../helpers.js'; // Helpers

const router = Router();
router.use(authMiddleware); // Todas as rotas requerem autenticação

// ── Funções auxiliares ─────────────────────────────────────────────

/**
 * serializeCollection() — Converte uma linha do banco em objeto formatado para a API.
 * 
 * Transforma os dados brutos do SQLite em um objeto com todos os campos
 * necessários para o frontend, incluindo parsing de JSON (materials, address)
 * e tradução de status para label em português.
 * 
 * @param {Object} row - Linha do banco de dados com JOINs de users e companies
 * @returns {Object} Objeto formatado para a API
 */
function serializeCollection(row) {
  return {
    id: row.id,
    user_id: row.user_id,              // ID do usuário que pediu a coleta
    company_id: row.company_id,         // ID da empresa (NULL se não atribuída)
    user_name: row.user_name,           // Nome do usuário (do JOIN com users)
    user_phone: row.user_phone,         // Telefone do usuário
    company_name: row.company_name,     // Nome da empresa (do JOIN com companies)
    materials: parseMaterials(row.materials), // JSON string → array de { type, quantity }
    address: (() => { try { return JSON.parse(row.address); } catch { return {}; } })(),   // JSON string → objeto { cep, city, street, ... }
    latitude: row.latitude,
    longitude: row.longitude,
    company_latitude: row.company_latitude,   // Coordenadas da empresa
    company_longitude: row.company_longitude,
    date: row.date,                     // Data agendada (YYYY-MM-DD)
    period: row.period,                 // Período: 'manhã' ou 'tarde'
    observations: row.observations,     // Observações do usuário
    status: row.status,                 // Chave do status (ex: 'pendente')
    status_label: STATUS_FLOW[row.status] || row.status, // Label em português
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * USER_COLLECTION_COLUMNS — Colunas SQL selecionadas nas queries de coleta.
 * 
 * Inclui:
 *   - Todos os campos da tabela collections (c.*)
 *   - Nome e telefone do usuário (u.name, u.phone)
 *   - Nome da empresa (co.name)
 *   - Coordenadas da empresa (co.latitude, co.longitude)
 * 
 * Usado em todas as queries que retornam coletas para evitar repetição.
 */
const USER_COLLECTION_COLUMNS = `
  c.id, c.user_id, c.company_id, c.materials, c.address, c.latitude, c.longitude,
  c.date, c.period, c.observations, c.status, c.created_at, c.updated_at,
  u.name AS user_name, u.phone AS user_phone,
  co.name AS company_name,
  co.latitude AS company_latitude, co.longitude AS company_longitude
`;

// ── Rota: Criar nova solicitação de coleta ──────────────────────────
// POST /api/collections
// Usuário cria uma nova solicitação de coleta
//
// Body esperado:
//   addressId   - ID do endereço de coleta (deve pertencer ao usuário)
//   materials   - Array de { type: string, quantity: number }
//   date        - Data desejada (YYYY-MM-DD)
//   period      - Período: 'manhã' ou 'tarde'
//   observations - Observações (opcional)
//
// Retorna:
//   201: { collection: {...} }
//   400: Validações
//   404: Endereço não encontrado
//
// Efeitos colaterais:
//   - Notifica o usuário: "Sua solicitação foi recebida"
//   - Notifica empresas aprovadas da mesma cidade: "Nova solicitação disponível"
router.post('/', requireRole('user'), (req, res) => {
  const { addressId, materials, date, period, observations = '' } = req.body;

  // ── Validações ──────────────────────────────────────────────────
  if (!addressId) return res.status(400).json({ error: 'Selecione um endereço de coleta' });
  if (!Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({ error: 'Adicione ao menos um material' });
  }
  // Valida que cada material tem tipo e quantidade válida
  for (const m of materials) {
    if (!m.type || !m.quantity || Number(m.quantity) <= 0) {
      return res.status(400).json({ error: `Informe uma quantidade válida para ${m.type || 'o material'}` });
    }
  }
  if (!date) return res.status(400).json({ error: 'Escolha uma data para a coleta' });
  if (!period) return res.status(400).json({ error: 'Escolha um período para a coleta' });

  // Verifica se o endereço existe e pertence ao usuário
  const addr = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(addressId, req.auth.id);
  if (!addr) return res.status(404).json({ error: 'Endereço não encontrado' });

  // Monta o objeto endereço para salvar na coleta (cópia do endereço)
  const address = {
    cep: addr.cep, state: addr.state, city: addr.city, neighborhood: addr.neighborhood,
    street: addr.street, number: addr.number, complement: addr.complement, label: addr.label
  };

  // ── Cria a coleta no banco de dados ─────────────────────────────
  // materials e address são salvos como JSON strings
  // status inicial: 'pendente' (aguardando empresa)
  // company_id: NULL (nenhuma empresa aceitou ainda)
  const info = db.prepare(
    `INSERT INTO collections (user_id, materials, address, latitude, longitude, date, period, observations, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`
  ).run(
    req.auth.id, JSON.stringify(materials), JSON.stringify(address),
    addr.latitude, addr.longitude, date, period, observations
  );
  const collectionId = info.lastInsertRowid;

  // Notifica o usuário: "Sua solicitação foi recebida"
  notifyUser(req.auth.id, 'solicitacao_recebida',
    'Sua solicitação de coleta foi recebida! Em breve uma empresa poderá aceitá-la.', collectionId);

  // Notifica empresas aprovadas da mesma cidade: "Nova solicitação disponível"
  const userCity = addr.city;
  const companies = userCity
    ? db.prepare('SELECT id FROM companies WHERE is_approved = 1 AND city = ?').all(userCity)
    : db.prepare('SELECT id FROM companies WHERE is_approved = 1').all();
  for (const company of companies) {
    notifyCompany(company.id, 'nova_solicitacao',
      'Nova solicitação de coleta disponível na sua região. Verifique na sua área de trabalho.', collectionId);
  }

  // Retorna a coleta criada com todos os dados (incluindo JOINs)
  const row = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.id = ?`
  ).get(collectionId);

  res.status(201).json({ collection: serializeCollection(row) });
});

// ── Rota: Listar coletas do usuário ────────────────────────────────
// GET /api/collections/mine
// Retorna todas as coletas criadas pelo usuário logado
//
// Retorna:
//   200: { collections: [...] }
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

// ── Rota: Listar coletas para a empresa ─────────────────────────────
// GET /api/collections
// Retorna coletas visíveis para a empresa logada:
//   - Suas próprias coletas (company_id = empresa logada)
//   - Coletas pendentes da mesma cidade que ninguém aceitou
//
// Query params (filtros opcionais):
//   status       - Filtrar por status
//   neighborhood - Filtrar por bairro (busca parcial)
//   material     - Filtrar por tipo de material
//   date         - Filtrar por data
//   distance     - Filtrar por distância máxima em km
//
// Retorna:
//   200: { collections: [...] }
//   403: Empresa não aprovada
router.get('/', requireRole('company'), (req, res) => {
  const { status, neighborhood, material, date, distance } = req.query;

  // Verifica se a empresa está aprovada
  const company = db.prepare('SELECT is_approved, city FROM companies WHERE id = ?').get(req.auth.id);
  if (!company?.is_approved) return res.status(403).json({ error: 'Empresa ainda não aprovada pelo administrador' });

  // ── Monta as condições da query WHERE ──────────────────────────
  const conditions = [];
  const params = [];

  // Condição principal: empresa vê suas próprias coletas + pendentes da cidade
  // (c.company_id = ? OR (c.status = ? AND c.company_id IS NULL AND cidade))
  if (company.city) {
    conditions.push('(c.company_id = ? OR (c.status = ? AND c.company_id IS NULL AND JSON_EXTRACT(c.address, "$.city") = ?))');
    params.push(req.auth.id, 'pendente', company.city);
  } else {
    conditions.push('(c.company_id = ? OR (c.status = ? AND c.company_id IS NULL))');
    params.push(req.auth.id, 'pendente');
  }

  // Filtros opcionais
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

  // Monta a query final com todas as condições
  let where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let rows = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     ${where}
     ORDER BY c.created_at DESC`
  ).all(...params);

  // Filtro por distância (usa fórmula de Haversine)
  if (distance && rows.length) {
    const company = db.prepare('SELECT latitude, longitude FROM companies WHERE id = ?').get(req.auth.id);
    if (company?.latitude != null) {
      rows = rows.filter((r) => {
        if (r.latitude == null) return true; // Mantém coletas sem coordenadas
        const d = haversine(company.latitude, company.longitude, r.latitude, r.longitude);
        return d <= Number(distance); // Só mantém coletas dentro da distância máxima
      });
    }
  }

  res.json({ collections: rows.map(serializeCollection) });
});

// ── Rota: Dashboard da empresa ──────────────────────────────────────
// GET /api/collections/dashboard
// Retorna estatísticas e dados para o dashboard da empresa
//
// Retorna:
//   200: { dashboard: { total, byStatus, scheduled, completed, pending, collectedWeight, clientsServed, byDate } }
//   403: Empresa não aprovada
router.get('/dashboard', requireRole('company'), (req, res) => {
  const company = db.prepare('SELECT is_approved, city FROM companies WHERE id = ?').get(req.auth.id);
  if (!company?.is_approved) return res.status(403).json({ error: 'Empresa ainda não aprovada pelo administrador' });

  // Busca todas as coletas da empresa
  const rows = db.prepare(
      `SELECT ${USER_COLLECTION_COLUMNS}
       FROM collections c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN companies co ON co.id = c.company_id
       WHERE c.company_id = ?
       ORDER BY c.created_at DESC`
    ).all(req.auth.id);

  const total = rows.length; // Total de coletas

  // Conta coletas por status
  const byStatus = { pendente: 0, agendada: 0, aceita: 0, em_coleta: 0, concluida: 0, cancelada: 0, recusada: 0 };
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  // Calcula peso total coletado (apenas coletas concluídas)
  const completed = rows.filter((r) => r.status === 'concluida');
  let collected = 0;
  for (const c of completed) {
    for (const m of parseMaterials(c.materials)) collected += Number(m.quantity) || 0;
  }

  // Conta clientes atendidos únicos
  const clients = new Set();
  for (const c of completed) clients.add(c.user_id);

  // Conta coletas por data (apenas pendentes, aceitas e agendadas)
  const byDate = {};
  for (const r of rows) {
    if (r.status === 'pendente' || r.status === 'aceita' || r.status === 'agendada') {
      const d = r.date;
      byDate[d] = (byDate[d] || 0) + 1;
    }
  }

  res.json({
    dashboard: {
      total,                     // Total de coletas
      byStatus,                  // Coletas por status
      scheduled: byStatus.agendada + byStatus.aceita + byStatus.em_coleta, // Agendadas
      completed: byStatus.concluida,   // Concluídas
      pending: byStatus.pendente,      // Pendentes
      collectedWeight: collected,      // Peso coletado em kg
      clientsServed: clients.size,     // Clientes atendidos
      byDate                         // Coletas por data
    }
  });
});

// ── Rota: Dashboard do usuário ──────────────────────────────────────
// GET /api/collections/user-dashboard
// Retorna estatísticas e dados para o dashboard do usuário
//
// Retorna:
//   200: { dashboard: { total, byStatus, pending, scheduled, completed, cancelled, totalWeight, upcoming } }
router.get('/user-dashboard', requireRole('user'), (req, res) => {
  // Busca todas as coletas do usuário
  const rows = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC`
  ).all(req.auth.id);

  // Conta coletas por status
  const byStatus = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  // Calcula peso total de materiais (excluindo canceladas e recusadas)
  let totalWeight = 0;
  for (const c of rows) {
    if (c.status !== 'cancelada' && c.status !== 'recusada') {
      for (const m of parseMaterials(c.materials)) totalWeight += Number(m.quantity) || 0;
    }
  }

  // Lista coletas próximas (pendentes, aceitas, agendadas)
  const upcoming = rows
    .filter((r) => ['pendente', 'aceita', 'agendada'].includes(r.status))
    .sort((a, b) => (a.date + a.period).localeCompare(b.date + b.period)); // Ordena por data

  res.json({
    dashboard: {
      total: rows.length,
      byStatus,
      pending: byStatus.pendente || 0,
      scheduled: (byStatus.aceita || 0) + (byStatus.agendada || 0) + (byStatus.em_coleta || 0),
      completed: byStatus.concluida || 0,
      cancelled: (byStatus.cancelada || 0) + (byStatus.recusada || 0),
      totalWeight,
      upcoming  // Coletas futuras
    }
  });
});

// ── Rota: Atualizar status da coleta ────────────────────────────────
// PUT /api/collections/:id/status
// Empresa atualiza o status de uma coleta
//
// Body esperado:
//   status    - Novo status
//   companyId - ID da empresa (opcional, usado quando aceita a coleta)
//
// Status permitidos:
//   aceita     - Empresa aceita a coleta
//   agendada   - Data confirmada
//   em_coleta  - Empresa a caminho
//   concluida  - Coleta finalizada
//   cancelada  - Cancelada
//   recusada   - Recusada pela empresa
//
// Retorna:
//   200: { message: 'Coleta atualizada' }
//   400: Status inválido
//   404: Coleta não encontrada
router.put('/:id/status', requireRole('company'), (req, res) => {
  const { status, companyId } = req.body;
  const allowed = Object.keys(STATUS_FLOW);
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  // Busca a coleta no banco
  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!collection) return res.status(404).json({ error: 'Coleta não encontrada' });

  // ── Cancelamento ou recusa ────────────────────────────────────
  if (status === 'cancelada' || status === 'recusada') {
    db.prepare(
      `UPDATE collections SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(status, collection.id);
    // Notifica o usuário sobre o cancelamento/recusa
    notifyUser(collection.user_id, 'coleta_cancelada',
      `Sua coleta foi ${status === 'cancelada' ? 'cancelada' : 'recusada'}. Entre em contato para mais informações.`, collection.id);
    return res.json({ message: 'Coleta atualizada' });
  }

  // ── Atualização normal de status ─────────────────────────────
  db.prepare(
    `UPDATE collections SET status = ?, company_id = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(status, companyId || req.auth.id, collection.id);

  // Mensagens de notificação para cada transição de status
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

// ── Rota: Detalhes de uma coleta ────────────────────────────────────
// GET /api/collections/:id
// Retorna todos os dados de uma coleta específica
//
// Verifica permissão:
//   - Usuário só vê suas próprias coletas
//   - Empresa só vê coletas atribuídas a ela
//
// Retorna:
//   200: { collection: {...} }
//   403: Acesso negado
//   404: Coleta não encontrada
router.get('/:id', (req, res) => {
  const row = db.prepare(
    `SELECT ${USER_COLLECTION_COLUMNS}
     FROM collections c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.id = ?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Coleta não encontrada' });

  // Verificação de permissão: usuário só vê suas coletas
  if (req.auth.role === 'user' && row.user_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  // Verificação de permissão: empresa só vê coletas atribuídas a ela
  if (req.auth.role === 'company' && row.company_id && row.company_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  res.json({ collection: serializeCollection(row) });
});

// ── Função: Haversine ──────────────────────────────────────────────
/**
 * haversine() — Calcula a distância entre dois pontos na Terra.
 * 
 * Usa a fórmula de Haversine para calcular a distância
 * geodésica (curvatura da Terra) entre duas coordenadas.
 * 
 * @param {number} lat1 - Latitude do ponto 1 (graus)
 * @param {number} lon1 - Longitude do ponto 1 (graus)
 * @param {number} lat2 - Latitude do ponto 2 (graus)
 * @param {number} lon2 - Longitude do ponto 2 (graus)
 * @returns {number} Distância em km
 * 
 * Exemplo:
 *   haversine(-18.91, -48.27, -19.01, -48.30) → ~12.5 km
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180; // Diferença de latitude em radianos
  const dLon = ((lon2 - lon1) * Math.PI) / 180; // Diferença de longitude em radianos
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +  // Fórmula de Haversine
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Distância em km
}

// ── Mensagens por coleta (usuário ↔ empresa) ───────────────────────

// ── Rota: Listar mensagens de uma coleta ────────────────────────────
// GET /api/collections/:id/messages
// Retorna todas as mensagens trocadas entre usuário e empresa sobre uma coleta
//
// Também marca como lidas as mensagens do outro lado
//
// Retorna:
//   200: { messages: [...] }
//   403: Acesso negado
//   404: Coleta não encontrada
router.get('/:id/messages', (req, res) => {
  // Busca a coleta para verificar permissão
  const col = db.prepare('SELECT id, user_id, company_id FROM collections WHERE id = ?').get(req.params.id);
  if (!col) return res.status(404).json({ error: 'Coleta não encontrada' });

  // Verificação de permissão: só o dono da coleta ou a empresa atribuída
  if (req.auth.role === 'user' && col.user_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (req.auth.role === 'company' && col.company_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  // Busca todas as mensagens da coleta, ordenadas por data
  const messages = db.prepare(
    `SELECT id, collection_id, sender_type, sender_id, message, is_read, created_at
     FROM collection_messages WHERE collection_id = ? ORDER BY created_at ASC`
  ).all(req.params.id);

  // Marca como lidas as mensagens do outro lado
  const markType = req.auth.role; // 'user' ou 'company'
  db.prepare(
    `UPDATE collection_messages SET is_read = 1
     WHERE collection_id = ? AND sender_type != ? AND is_read = 0`
  ).run(req.params.id, markType);

  res.json({ messages });
});

// ── Rota: Enviar mensagem numa coleta ───────────────────────────────
// POST /api/collections/:id/messages
// Envia uma mensagem na conversa entre usuário e empresa
//
// Body esperado:
//   message - Texto da mensagem
//
// Retorna:
//   201: { id, message: 'Mensagem enviada' }
//   400: Mensagem vazia
//   403: Acesso negado
//   404: Coleta não encontrada
router.post('/:id/messages', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
  }

  // Verifica se a coleta existe e o usuário tem acesso
  const col = db.prepare('SELECT id, user_id, company_id FROM collections WHERE id = ?').get(req.params.id);
  if (!col) return res.status(404).json({ error: 'Coleta não encontrada' });

  if (req.auth.role === 'user' && col.user_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (req.auth.role === 'company' && col.company_id !== req.auth.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  // Insere a mensagem no banco
  const senderType = req.auth.role; // 'user' ou 'company'
  const info = db.prepare(
    `INSERT INTO collection_messages (collection_id, sender_type, sender_id, message)
     VALUES (?, ?, ?, ?)`
  ).run(req.params.id, senderType, req.auth.id, message.trim());

  // Notifica o outro lado sobre a nova mensagem
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
