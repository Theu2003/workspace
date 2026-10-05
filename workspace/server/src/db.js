// Titulo: db
// Autor: Mateus Martins Peres
// Finalidade: Modulo do backend responsavel por db.
import './env.js';
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireEnv, optionalEnv } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'ecopickup.sqlite');

const SQL = await initSqlJs();

let sqlDb;
if (fs.existsSync(dbPath)) {

  const buffer = fs.readFileSync(dbPath);
  sqlDb = new SQL.Database(buffer);
} else {

  sqlDb = new SQL.Database();
}

sqlDb.run('PRAGMA foreign_keys = ON');

function saveDb() {
  const data = sqlDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function rowsFromResult(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((vals) => {
    const row = {};
    columns.forEach((col, i) => (row[col] = vals[i]));
    return row;
  });
}

const db = {

  exec(sql) {
    sqlDb.exec(sql);
    saveDb();
  },

  prepare(sql) {
    return {

      get(...params) {
        const stmt = sqlDb.prepare(sql);
        try {
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            columns.forEach((col, i) => (row[col] = values[i]));
            return row;
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all(...params) {
        const stmt = sqlDb.prepare(sql);
        try {
          if (params.length > 0) stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            columns.forEach((col, i) => (row[col] = values[i]));
            rows.push(row);
          }
          return rows;
        } finally {
          stmt.free();
        }
      },

      run(...params) {
        sqlDb.run(sql, params.length > 0 ? params : undefined);
        const changes = sqlDb.getRowsModified();
        const liResult = sqlDb.exec('SELECT last_insert_rowid()');
        const lastInsertRowid = liResult[0]?.values[0]?.[0] ?? 0;
        saveDb();
        return { changes, lastInsertRowid };
      },
    };
  },
};

db.exec(`
-- ┌─────────────────────────────────────────────────────────────────┐
-- │ TABELA: users — Usuários comuns (geradores de resíduos)        │
-- │ Campos: id, name, cpf, email, phone, password_hash, role,     │
-- │         created_at                                            │
-- │ role pode ser: 'user' (padrão) ou 'admin'                     │
-- └─────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Nome completo do usuário
  cpf TEXT UNIQUE NOT NULL,              -- CPF (documento brasileiro, 11 dígitos)
  email TEXT UNIQUE NOT NULL,            -- E-mail (usado para login)
  phone TEXT NOT NULL,                   -- Telefone para contato
  password_hash TEXT NOT NULL,           -- Senha hasheada com bcrypt (nunca armazena texto puro)
  role TEXT NOT NULL DEFAULT 'user',     -- Papel: 'user' ou 'admin'
  created_at TEXT DEFAULT (datetime('now')) -- Data de criação automática
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ TABELA: addresses — Endereços dos usuários                     │
-- │ Cada usuário pode ter vários endereços (ex: casa, trabalho)    │
-- │ Um endereço é marcado como "padrão" (is_default = 1)           │
-- └─────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Se o usuário for deletado, seus endereços são deletados automaticamente
  label TEXT DEFAULT 'Principal',         -- Nome/label do endereço (ex: "Casa", "Trabalho")
  cep TEXT NOT NULL,                      -- CEP (código postal brasileiro)
  state TEXT NOT NULL,                    -- Estado (UF)
  city TEXT NOT NULL,                     -- Cidade
  neighborhood TEXT NOT NULL,             -- Bairro
  street TEXT NOT NULL,                   -- Rua/Logradouro
  number TEXT NOT NULL,                   -- Número
  complement TEXT DEFAULT '',             -- Complemento (apt, bloco, etc.)
  latitude REAL,                          -- Latitude geográfica (para mapa)
  longitude REAL,                         -- Longitude geográfica (para mapa)
  is_default INTEGER DEFAULT 0           -- 1 = endereço padrão, 0 = não padrão
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ TABELA: companies — Empresas de coleta/reciclagem              │
-- │ Cada empresa tem CNPJ, endereço, materiais que coleta,        │
-- │ e precisa de aprovação do admin para ficar ativa               │
-- └─────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                     -- Nome da empresa
  cnpj TEXT UNIQUE NOT NULL,              -- CNPJ (documento jurídico, 14 dígitos)
  responsible TEXT NOT NULL,              -- Nome do responsável legal
  email TEXT UNIQUE NOT NULL,             -- E-mail (usado para login)
  phone TEXT NOT NULL,                    -- Telefone de contato
  password_hash TEXT NOT NULL,            -- Senha hasheada com bcrypt
  cep TEXT NOT NULL,                      -- CEP da empresa
  state TEXT NOT NULL,                    -- Estado
  city TEXT NOT NULL,                     -- Cidade
  neighborhood TEXT NOT NULL,             -- Bairro
  street TEXT NOT NULL,                   -- Rua
  number TEXT NOT NULL,                   -- Número
  complement TEXT DEFAULT '',             -- Complemento
  materials TEXT NOT NULL DEFAULT '[]',   -- JSON array de materiais coletados (ex: ["Plástico","Papel"])
  latitude REAL,                          -- Latitude (para cálculo de distância)
  longitude REAL,                         -- Longitude (para cálculo de distância)
  is_approved INTEGER NOT NULL DEFAULT 0, -- 0 = pendente de aprovação, 1 = aprovada pelo admin
  created_at TEXT DEFAULT (datetime('now'))
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ TABELA: collections — Solicitações de coleta                   │
-- │ Uma coleta é criada por um usuário e aceita/gerenciada         │
-- │ por uma empresa. Passa por vários status:                      │
-- │ pendente → aceita → agendada → em_coleta → concluida          │
-- │ (também pode ser cancelada ou recusada)                        │
-- └─────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),        -- Usuário que pediu a coleta
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  -- Empresa que aceitou a coleta (NULL se ninguém aceitou ainda)
  -- Se a empresa for deletada, company_id vira NULL (coleta volta para pendente)
  materials TEXT NOT NULL,    -- JSON: [{ type: "Plástico", quantity: 5 }, ...]
  address TEXT NOT NULL,      -- JSON: { cep, city, street, number, ... } (cópia do endereço)
  latitude REAL,              -- Latitude do local de coleta
  longitude REAL,             -- Longitude do local de coleta
  date TEXT NOT NULL,         -- Data agendada para coleta (YYYY-MM-DD)
  period TEXT NOT NULL,       -- Período: "manhã" ou "tarde"
  observations TEXT DEFAULT '', -- Observações do usuário (ex: "_PORTÃO AZUL")
  status TEXT NOT NULL DEFAULT 'pendente', -- Status atual da coleta
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ TABELA: notifications — Notificações do sistema                │
-- │ Cada notificação pertence a um usuário OU uma empresa          │
-- │ (ex: "sua coleta foi aceita", "nova empresa pendente")         │
-- └─────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  -- ID do usuário destinatário (NULL se a notificação é para empresa)
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  -- ID da empresa destinatária (NULL se a notificação é para usuário)
  type TEXT NOT NULL,          -- Tipo da notificação (ex: 'solicitacao_recebida', 'coleta_aceita')
  message TEXT NOT NULL,       -- Texto da notificação exibido ao usuário
  collection_id INTEGER,       -- ID da coleta relacionada (pode ser NULL)
  is_read INTEGER DEFAULT 0,  -- 0 = não lida, 1 = lida
  created_at TEXT DEFAULT (datetime('now'))
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ TABELA: messages — Mensagens diretas (admin ↔ empresa)         │
-- │ Permite comunicação entre administradores e empresas           │
-- │ Cada mensagem tem um remetente e um destinatário               │
-- └─────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('admin', 'company')),
  -- Tipo do remetente: 'admin' ou 'company'
  sender_id INTEGER NOT NULL,   -- ID do remetente
  receiver_type TEXT NOT NULL CHECK(receiver_type IN ('admin', 'company')),
  -- Tipo do destinatário: 'admin' ou 'company'
  receiver_id INTEGER NOT NULL, -- ID do destinatário
  message TEXT NOT NULL,        -- Texto da mensagem
  is_read INTEGER DEFAULT 0,   -- 0 = não lida, 1 = lida
  created_at TEXT DEFAULT (datetime('now'))
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ TABELA: collection_messages — Mensagens por coleta              │
-- │ Permite conversa entre usuário e empresa sobre uma coleta      │
-- │ específica (ex: "posso adiar para terça?", "sim, sem problema")│
-- └─────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS collection_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  -- Se a coleta for deletada, as mensagens também são deletadas
  sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'company')),
  -- Tipo do remetente: 'user' (usuário) ou 'company' (empresa)
  sender_id INTEGER NOT NULL,  -- ID do remetente
  message TEXT NOT NULL,        -- Texto da mensagem
  is_read INTEGER DEFAULT 0,   -- 0 = não lida, 1 = lida
  created_at TEXT DEFAULT (datetime('now'))
);
`);

import bcrypt from 'bcryptjs';

const adminEmail = requireEnv('ADMIN_EMAIL');
const adminPassword = requireEnv('ADMIN_PASSWORD');
const adminName = optionalEnv('ADMIN_NAME', 'Administrador');

if (adminPassword.length < 6) {
  console.error('❌ ADMIN_PASSWORD deve ter pelo menos 6 caracteres');
  process.exit(1);
}

const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  const adminHash = bcrypt.hashSync(adminPassword, 10);
  db.prepare(
    `INSERT INTO users (name, cpf, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(adminName, '00000000000', adminEmail, '', adminHash, 'admin');
  console.log(`✅ Usuário administrador criado (${adminEmail})`);
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
} catch {

}

try {
  db.exec(`ALTER TABLE companies ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 0`);
} catch {

}

try {
  db.exec(`ALTER TABLE collections ADD COLUMN rejected_by TEXT NOT NULL DEFAULT '[]'`);
} catch {

}

export default db;
