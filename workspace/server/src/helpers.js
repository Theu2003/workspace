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

export function parseMaterials(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw || [];
  } catch {
    return [];
  }
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
