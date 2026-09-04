// ===================================================================
// helpers.js — Funções utilitárias e constantes do projeto
// ===================================================================
// Este arquivo contém constantes e funções auxiliares usadas em vários
// arquivos do servidor, incluindo:
//   - Lista de tipos de materiais recicláveis
//   - Fluxo de status das coletas
//   - Funções para parsear materiais e calcular pesos
//   - Funções para criar notificações no banco de dados
// ===================================================================

import db from './db.js';  // Importa a instância do banco de dados

// ── Constantes ─────────────────────────────────────────────────────

/**
 * MATERIAL_TYPES — Lista de todos os tipos de materiais recicláveis
 * que o usuário pode selecionar ao agendar uma coleta.
 * 
 * Usado tanto no formulário de cadastro de coleta quanto
 * na tela de detalhes da coleta para exibir o que foi coletado.
 */
export const MATERIAL_TYPES = [
  'Papel',           // Jornais, revistas, folhas de sulfite
  'Papelão',         // Caixas de papelão, embalagens
  'Plástico',        // Garrafas, sacolas, embalagens plásticas
  'Vidro',           // Garrafas, frascos de vidro
  'Metal',           // Latas de alumínio, ferro, cobre
  'Eletrônicos',     // Celulares, computadores, TV (lixo eletrônico)
  'Óleo de cozinha', // Óleo usado de fritura (coleta específica)
  'Outros'           // Qualquer outro material reciclável não listado
];

/**
 * STATUS_FLOW — Mapa dos status possíveis de uma coleta e seus labels em português.
 * 
 * Fluxo normal de uma coleta:
 *   pendente → aceita → agendada → em_coleta → concluida
 * 
 * Status alternativos:
 *   pendente → cancelada (pelo usuário)
 *   pendente → recusada (pela empresa)
 * 
 * As chaves são os valores armazenados no banco de dados,
 * os valores são os labels exibidos na interface do usuário.
 */
export const STATUS_FLOW = {
  pendente: 'Pendente',       // Coleta criada, aguardando empresa
  aceita: 'Aceita',           // Empresa aceitou a coleta
  agendada: 'Agendada',       // Data e período confirmados
  em_coleta: 'Em coleta',     // Empresa está a caminho ou coletando
  concluida: 'Concluída',     // Coleta finalizada com sucesso
  cancelada: 'Cancelada',     // Coleta cancelada pelo usuário
  recusada: 'Recusada'        // Coleta recusada pela empresa
};

// ── Funções utilitárias ────────────────────────────────────────────

/**
 * getStatusLabel() — Retorna o label em português de um status.
 * 
 * @param {string} status - Chave do status (ex: 'pendente', 'aceita')
 * @returns {string} Label em português (ex: 'Pendente', 'Aceita')
 * 
 * Exemplo:
 *   getStatusLabel('pendente') → 'Pendente'
 *   getStatusLabel('xyz')      → 'xyz' (fallback para o próprio valor)
 */
export function getStatusLabel(status) {
  return STATUS_FLOW[status] || status;
}

/**
 * parseMaterials() — Converte o campo materials de JSON string para array.
 * 
 * No banco de dados, materiais são armazenados como JSON string:
 *   '[{"type":"Plástico","quantity":5},{"type":"Papel","quantity":3}]'
 * 
 * Esta função converte para um array JavaScript:
 *   [{ type: "Plástico", quantity: 5 }, { type: "Papel", quantity: 3 }]
 * 
 * @param {string|Array} raw - JSON string ou já é array
 * @returns {Array} Array de objetos { type: string, quantity: number }
 */
export function parseMaterials(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw || [];
  } catch {
    return [];  // Se o JSON for inválido, retorna array vazio
  }
}

/**
 * totalWeight() — Calcula o peso total de material em uma lista de coletas.
 * 
 * Soma todas as quantidades (em kg) de todos os materiais de todas as coletas.
 * 
 * @param {Array} collections - Array de coletas (cada uma com campo 'materials')
 * @returns {number} Peso total em kg
 * 
 * Exemplo:
 *   totalWeight([
 *     { materials: '[{"type":"Plástico","quantity":5}]' },
 *     { materials: '[{"type":"Papel","quantity":3}]' }
 *   ]) → 8
 */
export function totalWeight(collections) {
  return collections.reduce((acc, c) => {
    const items = parseMaterials(c.materials);  // Converte JSON para array
    const sum = items.reduce((s, m) => s + (Number(m.quantity) || 0), 0); // Soma quantidades
    return acc + sum;
  }, 0);
}

/**
 * uniqueClients() — Conta o número de clientes únicos em uma lista de coletas.
 * 
 * Usa um Set para contar usuários distintos (baseado no user_id).
 * 
 * @param {Array} collections - Array de coletas
 * @returns {number} Quantidade de clientes únicos
 * 
 * Exemplo:
 *   uniqueClients([
 *     { user_id: 1 }, { user_id: 2 }, { user_id: 1 }
 *   ]) → 2 (apenas 2 usuários únicos)
 */
export function uniqueClients(collections) {
  return new Set(collections.map((c) => c.user_id)).size;
}

// ── Funções de notificação ─────────────────────────────────────────

/**
 * notifyUser() — Cria uma notificação para um usuário.
 * 
 * @param {number} userId - ID do usuário destinatário
 * @param {string} type - Tipo da notificação (ex: 'solicitacao_recebida', 'coleta_aceita')
 * @param {string} message - Texto da notificação exibido ao usuário
 * @param {number|null} collectionId - ID da coleta relacionada (opcional)
 * 
 * Exemplo de uso:
 *   notifyUser(1, 'coleta_aceita', 'Sua coleta foi aceita!', 42)
 */
export function notifyUser(userId, type, message, collectionId = null) {
  db.prepare(
    `INSERT INTO notifications (user_id, company_id, type, message, collection_id) VALUES (?, NULL, ?, ?, ?)`
  ).run(userId, type, message, collectionId);
}

/**
 * notifyCompany() — Cria uma notificação para uma empresa.
 * 
 * @param {number} companyId - ID da empresa destinatária
 * @param {string} type - Tipo da notificação (ex: 'nova_solicitacao', 'mensagem_usuario')
 * @param {string} message - Texto da notificação exibido à empresa
 * @param {number|null} collectionId - ID da coleta relacionada (opcional)
 * 
 * Exemplo de uso:
 *   notifyCompany(3, 'nova_solicitacao', 'Nova coleta disponível!', 42)
 */
export function notifyCompany(companyId, type, message, collectionId = null) {
  db.prepare(
    `INSERT INTO notifications (user_id, company_id, type, message, collection_id) VALUES (NULL, ?, ?, ?, ?)`
  ).run(companyId, type, message, collectionId);
}
