// ===================================================================
// types.js — Definições de tipos (JSDoc)
// ===================================================================
// Este arquivo define todas as interfaces e tipos usados na aplicação.
// Em JavaScript, usamos JSDoc para documentar tipos.
// Esses tipos espelham a estrutura de dados retornada pela API REST.
//
// Organização:
//   - Role: tipo de papel no sistema
//   - User: dados de um usuário comum
//   - Company: dados de uma empresa
//   - Address: dados de um endereço
//   - MaterialItem: item de material numa coleta
//   - Collection: dados de uma coleta
//   - Notification: dados de uma notificação
//   - DashboardStats: estatísticas do dashboard da empresa
//   - UserDashboardStats: estatísticas do dashboard do usuário
// ===================================================================

/**
 * @typedef {'user' | 'company' | 'admin'} Role
 * Define os três papéis possíveis no sistema.
 * - 'user'    → Usuário comum (gera resíduos, agenda coletas)
 * - 'company' → Empresa de coleta/reciclagem (aceita e realiza coletas)
 * - 'admin'   → Administrador (gerencia empresas e usuários)
 */

/**
 * @typedef {Object} Address
 * Representa um endereço cadastrado no sistema.
 * Pertence a um usuário (tabela addresses) ou é copiado para uma coleta.
 * Contém dados geográficos para cálculo de distância e exibição no mapa.
 * @property {number} id - ID do endereço (autoincrement)
 * @property {string} label - Nome/label (ex: "Casa", "Trabalho", "Principal")
 * @property {string} cep - CEP (código postal brasileiro, 8 dígitos)
 * @property {string} state - Estado (UF, 2 letras: "MG", "SP")
 * @property {string} city - Cidade (ex: "Uberlândia")
 * @property {string} neighborhood - Bairro (ex: "Centro")
 * @property {string} street - Rua/Logradouro (ex: "Rua das Flores")
 * @property {string} number - Número (ex: "123")
 * @property {string} complement - Complemento (ex: "Apto 101", "Bloco B")
 * @property {number|null} latitude - Latitude geográfica
 * @property {number|null} longitude - Longitude geográfica
 * @property {number} is_default - 1 = endereço padrão, 0 = não padrão
 */

/**
 * @typedef {Object} User
 * Dados de um usuário comum (gerador de resíduos).
 * Retorna do endpoint GET /api/users/me
 * @property {number} id - ID único do usuário
 * @property {string} name - Nome completo
 * @property {string} email - E-mail (usado para login)
 * @property {string} phone - Telefone para contato
 * @property {string} [cpf] - CPF (documento brasileiro, opcional na listagem)
 * @property {string} [city] - Cidade do endereço padrão (opcional)
 */

/**
 * @typedef {Object} Company
 * Dados de uma empresa de coleta/reciclagem.
 * Retorna do endpoint GET /api/companies/me
 * @property {number} id - ID único da empresa
 * @property {string} name - Nome da empresa
 * @property {string} cnpj - CNPJ (documento jurídico)
 * @property {string} responsible - Nome do responsável legal
 * @property {string} email - E-mail (usado para login)
 * @property {string} phone - Telefone de contato
 * @property {string} cep - CEP da empresa
 * @property {string} state - Estado
 * @property {string} city - Cidade
 * @property {string} neighborhood - Bairro
 * @property {string} street - Rua
 * @property {string} number - Número
 * @property {string} complement - Complemento
 * @property {string[]} materials - Array de materiais coletados (ex: ["Plástico","Papel"])
 * @property {number|null} latitude - Latitude (para cálculo de distância)
 * @property {number|null} longitude - Longitude (para cálculo de distância)
 */

/**
 * @typedef {Object} MaterialItem
 * Representa um item de material numa coleta.
 * Exemplo: { type: "Plástico", quantity: 5 } → 5 kg de plástico
 * @property {string} type - Tipo do material (ex: "Plástico", "Papel", "Vidro")
 * @property {number} quantity - Quantidade em kg
 */

/**
 * @typedef {Object} Collection
 * Dados completos de uma solicitação de coleta.
 * Retorna dos endpoints:
 *   GET /api/collections/mine     → Coletas do usuário
 *   GET /api/collections          → Coletas da empresa
 *   GET /api/collections/:id      → Detalhes de uma coleta
 * @property {number} id - ID da coleta
 * @property {number} user_id - ID do usuário que pediu
 * @property {number|null} company_id - ID da empresa (null se não atribuída)
 * @property {string} user_name - Nome do usuário
 * @property {string} user_phone - Telefone do usuário
 * @property {string|null} company_name - Nome da empresa
 * @property {MaterialItem[]} materials - Lista de materiais
 * @property {Address & { label?: string }} address - Endereço da coleta
 * @property {number|null} latitude - Latitude do local
 * @property {number|null} longitude - Longitude do local
 * @property {number|null} company_latitude - Latitude da empresa
 * @property {number|null} company_longitude - Longitude da empresa
 * @property {string} date - Data agendada (YYYY-MM-DD)
 * @property {string} period - Período: "manhã" ou "tarde"
 * @property {string} observations - Observações do usuário
 * @property {string} status - Status: "pendente", "aceita", "agendada", etc.
 * @property {string} status_label - Label em português: "Pendente", "Aceita", etc.
 * @property {string} created_at - Data de criação (ISO)
 * @property {string} updated_at - Data da última atualização (ISO)
 */

/**
 * @typedef {Object} Notification
 * Dados de uma notificação do sistema.
 * Tipos comuns:
 *   - 'bem_vindo'           → Boas-vindas ao novo usuário
 *   - 'solicitacao_recebida' → Coleta criada com sucesso
 *   - 'nova_solicitacao'     → Nova coleta disponível (para empresa)
 *   - 'coleta_aceita'        → Coleta aceita por empresa
 *   - 'coleta_cancelada'     → Coleta cancelada/recusada
 *   - 'nova_empresa_pendente' → Nova empresa pendente (para admin)
 *   - 'aprovacao'            → Empresa aprovada
 * @property {number} id - ID da notificação
 * @property {string} type - Tipo (chave para ícone/tradução)
 * @property {string} message - Texto exibido ao usuário
 * @property {number|null} collection_id - ID da coleta relacionada
 * @property {number} is_read - 0 = não lida, 1 = lida
 * @property {string} created_at - Data de criação (ISO)
 * @property {string} [date] - Data da coleta (se aplicável)
 * @property {string} [period] - Período da coleta (se aplicável)
 * @property {string} [status] - Status da coleta (se aplicável)
 */

/**
 * @typedef {Object} DashboardStats
 * Estatísticas do dashboard da empresa.
 * Retorna do endpoint GET /api/collections/dashboard
 * @property {number} total - Total de coletas
 * @property {Object.<string, number>} byStatus - Coletas por status: { pendente: 3, aceita: 5, ... }
 * @property {number} scheduled - Coletas agendadas (aceita + agendada + em_coleta)
 * @property {number} completed - Coletas concluídas
 * @property {number} pending - Coletas pendentes
 * @property {number} collectedWeight - Peso total coletado (kg)
 * @property {number} clientsServed - Clientes atendidos únicos
 * @property {Object.<string, number>} [byDate] - Coletas por data (para gráfico)
 */

/**
 * @typedef {Object} UserDashboardStats
 * Estatísticas do dashboard do usuário.
 * Retorna do endpoint GET /api/collections/user-dashboard
 * @property {number} total - Total de coletas do usuário
 * @property {Object.<string, number>} byStatus - Coletas por status
 * @property {number} pending - Coletas pendentes
 * @property {number} scheduled - Coletas agendadas
 * @property {number} completed - Coletas concluídas
 * @property {number} cancelled - Coletas canceladas/recusadas
 * @property {number} totalWeight - Peso total de materiais (kg)
 * @property {Collection[]} upcoming - Coletas próximas (pendentes/aceitas/agendadas)
 */