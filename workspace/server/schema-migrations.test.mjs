import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { migrateUserContactColumns } from './src/schema-migrations.js';
import { findUserByIdentifier, getPrimaryContact } from './src/user-identifiers.js';

test('migration preserves duplicate legacy phones as email-primary and only phone-primary identifiers are unique', async () => {
  const SQL = await initSqlJs();
  const sqlDb = new SQL.Database();
  sqlDb.run('PRAGMA foreign_keys = ON');
  sqlDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cpf TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE addresses (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE collections (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id)
    );
    INSERT INTO users (id, name, cpf, email, phone, password_hash) VALUES
      (1, 'A', 'cpf1', 'a@example.invalid', '+14155552671', 'hash1'),
      (2, 'B', 'cpf2', 'b@example.invalid', '+14155552671', 'hash2'),
      (3, 'C', 'cpf3', 'c@example.invalid', '', 'hash3'),
      (4, 'D', 'cpf4', 'd@example.invalid', '+442071838750', 'hash4');
    INSERT INTO addresses (id, user_id) VALUES (10, 1);
    INSERT INTO collections (id, user_id) VALUES (20, 2);
  `);

  const query = (sql, params = []) => {
    const statement = sqlDb.prepare(sql);
    try {
      if (params.length) statement.bind(params);
      const rows = [];
      while (statement.step()) {
        const values = statement.get();
        const columns = statement.getColumnNames();
        rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
      }
      return rows;
    } finally {
      statement.free();
    }
  };
  const db = {
    exec: (sql) => sqlDb.exec(sql),
    prepare: (sql) => ({
      all: (...params) => query(sql, params),
      get: (...params) => query(sql, params)[0],
      run: (...params) => sqlDb.run(sql, params)
    })
  };
  const warnings = [];

  migrateUserContactColumns({ db, sqlDb, saveDb() {}, logger: { warn: (message) => warnings.push(message) } });

  const users = query('SELECT id, email, phone, primary_contact FROM users ORDER BY id');
  assert.equal(users.length, 4);
  assert.equal(users[0].phone, '+14155552671');
  assert.equal(users[1].phone, '+14155552671');
  assert.equal(users[2].phone, '');
  assert.equal(users[3].phone, '+442071838750');
  assert.ok(users.every((user) => user.primary_contact === 'email'));
  assert.deepEqual(query('SELECT * FROM addresses'), [{ id: 10, user_id: 1 }]);
  assert.deepEqual(query('SELECT * FROM collections'), [{ id: 20, user_id: 2 }]);
  assert.deepEqual(query('PRAGMA foreign_key_check'), []);
  assert.ok(warnings.some((message) => message.includes('retained')));
  assert.equal(findUserByIdentifier(db, '+14155552671'), undefined);
  assert.equal(findUserByIdentifier(db, 'a@example.invalid').id, 1);
  assert.deepEqual(getPrimaryContact(users[0]), { channel: 'email', destination: 'a@example.invalid' });

  sqlDb.run(
    "INSERT INTO users (name, cpf, email, phone, password_hash, primary_contact) VALUES ('E', 'cpf5', NULL, '+14155552671', 'hash5', 'phone')"
  );
  const phonePrimary = findUserByIdentifier(db, '+14155552671');
  assert.equal(phonePrimary.id, 5);
  assert.deepEqual(getPrimaryContact(phonePrimary), { channel: 'phone', destination: '+14155552671' });
  assert.throws(() => sqlDb.run(
    "INSERT INTO users (name, cpf, email, phone, password_hash, primary_contact) VALUES ('F', 'cpf6', NULL, '+14155552671', 'hash6', 'phone')"
  ));
  sqlDb.close();
});
