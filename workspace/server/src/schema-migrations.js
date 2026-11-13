export function migrateUserContactColumns({ db, sqlDb, saveDb, logger = console }) {
  const columns = db.prepare('PRAGMA table_info(users)').all();
  const required = columns.filter((column) => ['email', 'phone'].includes(column.name));
  const hasPrimaryContact = columns.some((column) => column.name === 'primary_contact');
  const needsRebuild = !hasPrimaryContact || required.some((column) => column.notnull === 1);
  const duplicates = db.prepare(
    `SELECT phone, GROUP_CONCAT(id) AS user_ids FROM users
     WHERE phone IS NOT NULL AND TRIM(phone) != ''
     GROUP BY phone HAVING COUNT(*) > 1`
  ).all();
  if (duplicates.length) {
    logger.warn('Duplicate legacy user phone numbers are retained; affected users remain email-primary:');
    for (const duplicate of duplicates) logger.warn(`  shared by user IDs ${duplicate.user_ids}`);
  }

  if (needsRebuild) {
    const hasRole = columns.some((column) => column.name === 'role');
    sqlDb.run('PRAGMA foreign_keys = OFF');
    try {
      sqlDb.run('BEGIN IMMEDIATE');
      sqlDb.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          cpf TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          phone TEXT,
          password_hash TEXT NOT NULL,
          primary_contact TEXT NOT NULL DEFAULT 'email' CHECK(primary_contact IN ('email', 'phone')),
          role TEXT NOT NULL DEFAULT 'user',
          created_at TEXT DEFAULT (datetime('now'))
        );
        INSERT INTO users_new (id, name, cpf, email, phone, password_hash, primary_contact, role, created_at)
        SELECT id, name, cpf, email, phone, password_hash,
          ${hasPrimaryContact ? "COALESCE(primary_contact, 'email')" : "'email'"},
          ${hasRole ? "COALESCE(role, 'user')" : "'user'"}, created_at
        FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      sqlDb.run('COMMIT');
    } catch (error) {
      sqlDb.run('ROLLBACK');
      throw new Error(`Could not migrate user contact columns without risking existing data: ${error.message}`);
    } finally {
      sqlDb.run('PRAGMA foreign_keys = ON');
    }
    saveDb();
  }

  db.exec(`DROP INDEX IF EXISTS users_phone_unique`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_primary_phone_unique
    ON users(phone) WHERE primary_contact = 'phone' AND phone IS NOT NULL AND TRIM(phone) != ''`);
}
