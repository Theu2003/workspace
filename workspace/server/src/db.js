import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'ecopickup.sqlite');

// Initialize sql.js with top-level await (supported in ES modules)
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

// Helper to convert sql.js column results into objects
function rowsFromResult(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((vals) => {
    const row = {};
    columns.forEach((col, i) => (row[col] = vals[i]));
    return row;
  });
}

function singleRow(result) {
  const rows = rowsFromResult(result);
  return rows.length > 0 ? rows[0] : undefined;
}

// Wrapper that mimics the better-sqlite3 API used in this project
const db = {
  exec(sql) {
    sqlDb.exec(sql);
    saveDb();
  },

  pragma(_str) {
    // sql.js doesn't support WAL (in-memory), ignore gracefully
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

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Principal',
  cep TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT DEFAULT '',
  latitude REAL,
  longitude REAL,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  responsible TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  cep TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT DEFAULT '',
  materials TEXT NOT NULL DEFAULT '[]',
  latitude REAL,
  longitude REAL,
  is_approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  materials TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  date TEXT NOT NULL,
  period TEXT NOT NULL,
  observations TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  collection_id INTEGER,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Seed admin user
import bcrypt from 'bcryptjs';

const adminEmail = 'mateusmartinsperes53@gmail.com';
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  const adminHash = bcrypt.hashSync('Peres2003/', 10);
  db.prepare(
    `INSERT INTO users (name, cpf, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`
  ).run('Administrador', '00000000000', adminEmail, '38998962288', adminHash, 'admin');
  console.log('✅ Usuário administrador criado com sucesso');
}

// Try to add role column if it doesn't exist (migration for existing DBs)
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
} catch {
  // Column already exists, ignore
}

// Try to add is_approved column if it doesn't exist (migration for existing DBs)
try {
  db.exec(`ALTER TABLE companies ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 0`);
} catch {
  // Column already exists, ignore
}

export default db;
