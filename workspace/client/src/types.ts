// ===================================================================
// types.ts — Definições de tipos TypeScript
// ===================================================================
// Este arquivo define todas as interfaces e tipos usados na aplicação.
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

// ── Tipo: Papel do usuário ──────────────────────────────────────────
/**
 * Role — Define os três papéis possíveis no sistema.
 * 
 * - 'user'    → Usuário comum (gera resíduos, agenda coletas)
 * - 'company'  → Empresa de coleta/reciclagem (aceita e realiza coletas)
 * - 'admin'    → Administrador (gerencia empresas e usuários)
 */
export type Role = 'user' | 'company' | 'admin';

// ── Interface: Endereço ─────────────────────────────────────────────
/**
 * Address — Representa um endereço cadastrado no sistema.
 * 
 * Pertence a um usuário (tabela addresses) ou é copiado para uma coleta.
 * Contém dados geográficos para cálculo de distância e exibição no mapa.
 */
export interface Address {
  id: number;              // ID do endereço (autoincrement)
  label: string;           // Nome/label (ex: "Casa", "Trabalho", "Principal")
  cep: string;             // CEP (código postal brasileiro, 8 dígitos)
  state: string;           // Estado (UF, 2 letras: "MG", "SP")
  city: string;            // Cidade (ex: "Uberlândia")
  neighborhood: string;    // Bairro (ex: "Centro")
  street: string;          // Rua/Logradouro (ex: "Rua das Flores")
  number: string;          // Número (ex: "123")
  complement: string;      // Complemento (ex: "Apto 101", "Bloco B")
  latitude: number | null;  // Latitude geográfica (para mapa/distância)
  longitude: number | null; // Longitude geográfica (para mapa/distância)
  is_default: number;      // 1 = endereço padrão, 0 = não padrão
}

// ── Interface: Usuário ──────────────────────────────────────────────
/**
 * User — Dados de um usuário comum (gerador de resíduos).
 * 
 * Retorna do endpoint GET /api/users/me
 */
export interface User {
  id: number;       // ID único do usuário
  name: string;     // Nome completo
  email: string;    // E-mail (usado para login)
  phone: string;    // Telefone para contato
  cpf?: string;     // CPF (documento brasileiro, opcional na listagem)
  city?: string;    // Cidade do endereço padrão (opcional)
}

// ── Interface: Empresa ──────────────────────────────────────────────
/**
 * Company — Dados de uma empresa de coleta/reciclagem.
 * 
 * Retorna do endpoint GET /api/companies/me
 */
export interface Company {
  id: number;              // ID único da empresa
  name: string;            // Nome da empresa
  cnpj: string;            // CNPJ (documento jurídico)
  responsible: string;     // Nome do responsável legal
  email: string;           // E-mail (usado para login)
  phone: string;           // Telefone de contato
  cep: string;             // CEP da empresa
  state: string;           // Estado
  city: string;            // Cidade
  neighborhood: string;    // Bairro
  street: string;          // Rua
  number: string;          // Número
  complement: string;      // Complemento
  materials: string[];     // Array de materiais coletados (ex: ["Plástico","Papel"])
  latitude: number | null;  // Latitude (para cálculo de distância)
  longitude: number | null; // Longitude (para cálculo de distância)
}

// ── Interface: Item de material ─────────────────────────────────────
/**
 * MaterialItem — Representa um item de material numa coleta.
 * 
 * Exemplo: { type: "Plástico", quantity: 5 }
 * Significa: 5 kg de plástico
 */
export interface MaterialItem {
  type: string;     // Tipo do material (ex: "Plástico", "Papel", "Vidro")
  quantity: number; // Quantidade em kg
}

// ── Interface: Coleta ───────────────────────────────────────────────
/**
 * Collection — Dados completos de uma solicitação de coleta.
 * 
 * Retorna dos endpoints:
 *   GET /api/collections/mine     → Coletas do usuário
 *   GET /api/collections          → Coletas da empresa
 *   GET /api/collections/:id      → Detalhes de uma coleta
 */
export interface Collection {
  id: number;                     // ID da coleta
  user_id: number;                // ID do usuário que pediu
  company_id: number | null;      // ID da empresa (null se não atribuída)
  user_name: string;              // Nome do usuário
  user_phone: string;             // Telefone do usuário
  company_name: string | null;    // Nome da empresa
  materials: MaterialItem[];      // Lista de materiais
  address: Address & { label?: string }; // Endereço da coleta
  latitude: number | null;         // Latitude do local
  longitude: number | null;        // Longitude do local
  company_latitude: number | null;  // Latitude da empresa
  company_longitude: number | null; // Longitude da empresa
  date: string;                    // Data agendada (YYYY-MM-DD)
  period: string;                  // Período: "manhã" ou "tarde"
  observations: string;            // Observações do usuário
  status: string;                  // Status: "pendente", "aceita", "agendada", etc.
  status_label: string;            // Label em português: "Pendente", "Aceita", etc.
  created_at: string;              // Data de criação (ISO)
  updated_at: string;              // Data da última atualização (ISO)
}

// ── Interface: Notificação ──────────────────────────────────────────
/**
 * Notification — Dados de uma notificação do sistema.
 * 
 * Tipos comuns:
 *   - 'bem_vindo'          → Boas-vindas ao novo usuário
 *   - 'solicitacao_recebida' → Coleta criada com sucesso
 *   - 'nova_solicitacao'     → Nova coleta disponível (para empresa)
 *   - 'coleta_aceita'        → Coleta aceita por empresa
 *   - 'coleta_cancelada'     → Coleta cancelada/recusada
 *   - 'nova_empresa_pendente' → Nova empresa pendente (para admin)
 *   - 'aprovacao'            → Empresa aprovada
 */
export interface Notification {
  id: number;                // ID da notificação
  type: string;              // Tipo (chave para ícone/tradução)
  message: string;           // Texto exibido ao usuário
  collection_id: number | null; // ID da coleta relacionada
  is_read: number;           // 0 = não lida, 1 = lida
  created_at: string;        // Data de criação (ISO)
  date?: string;             // Data da coleta (se aplicável)
  period?: string;           // Período da coleta (se aplicável)
  status?: string;           // Status da coleta (se aplicável)
}

// ── Interface: Dashboard da empresa ─────────────────────────────────
/**
 * DashboardStats — Estatísticas do dashboard da empresa.
 * 
 * Retorna do endpoint GET /api/collections/dashboard
 */
export interface DashboardStats {
  total: number;                          // Total de coletas
  byStatus: Record<string, number>;       // Coletas por status: { pendente: 3, aceita: 5, ... }
  scheduled: number;                      // Coletas agendadas (aceita + agendada + em_coleta)
  completed: number;                      // Coletas concluídas
  pending: number;                        // Coletas pendentes
  collectedWeight: number;                // Peso total coletado (kg)
  clientsServed: number;                  // Clientes atendidos únicos
  byDate?: Record<string, number>;        // Coletas por data (para gráfico)
}

// ── Interface: Dashboard do usuário ─────────────────────────────────
/**
 * UserDashboardStats — Estatísticas do dashboard do usuário.
 * 
 * Retorna do endpoint GET /api/collections/user-dashboard
 */
export interface UserDashboardStats {
  total: number;                          // Total de coletas do usuário
  byStatus: Record<string, number>;       // Coletas por status
  pending: number;                        // Coletas pendentes
  scheduled: number;                      // Coletas agendadas
  completed: number;                      // Coletas concluídas
  cancelled: number;                      // Coletas canceladas/recusadas
  totalWeight: number;                    // Peso total de materiais (kg)
  upcoming: Collection[];                 // Coletas próximas (pendentes/aceitas/agendadas)
}
