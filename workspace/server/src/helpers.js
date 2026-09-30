// Titulo: helpers
// Autor: Mateus Martins Peres
// Finalidade: Modulo do backend responsavel por helpers.
import db from './db.js';

export const MATERIAL_TYPES = [
  'Papel',
  'Papelão',
  'Plástico',
  'Vidro',
  'Metal',
  'Eletrônicos',
  'Óleo de cozinha',
  'Outros'
];

export const STATUS_FLOW = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  agendada: 'Agendada',
  em_coleta: 'Em coleta',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  recusada: 'Recusada'
};

export function getStatusLabel(status) {
  return STATUS_FLOW[status] || status;
}

export function parseMaterials(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw || [];
  } catch {
    return [];
  }
}

export function totalWeight(collections) {
  return collections.reduce((acc, c) => {
    const items = parseMaterials(c.materials);
    const sum = items.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
    return acc + sum;
  }, 0);
}

export function uniqueClients(collections) {
  return new Set(collections.map((c) => c.user_id)).size;
}

export function notifyUser(userId, type, message, collectionId = null) {
  db.prepare(
    `INSERT INTO notifications (user_id, company_id, type, message, collection_id) VALUES (?, NULL, ?, ?, ?)`
  ).run(userId, type, message, collectionId);
}

export function notifyCompany(companyId, type, message, collectionId = null) {
  db.prepare(
    `INSERT INTO notifications (user_id, company_id, type, message, collection_id) VALUES (NULL, ?, ?, ?, ?)`
  ).run(companyId, type, message, collectionId);
}
