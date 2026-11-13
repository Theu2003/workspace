// varre e remove QUALQUER residuo de teste (teste-cbf-*) do arquivo do banco.
// roda somente com o servidor PARADO.
import initSqlJs from 'sql.js';
import fs from 'node:fs';
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync('data/ecopickup.sqlite'));
const q = (sql, p = []) => db.exec(sql, p)[0]?.values ?? [];
const userIds = q(`SELECT id FROM users WHERE email LIKE 'teste-cbf-%'`).map(r => r[0]);
const compIds = q(`SELECT id FROM companies WHERE email LIKE 'teste-cbf-%'`).map(r => r[0]);
usIds: for (const uid of userIds) {
  for (const [cid] of q('SELECT id FROM collections WHERE user_id = ?', [uid])) {
    db.run('DELETE FROM collection_messages WHERE collection_id = ?', [cid]);
  }
  db.run('DELETE FROM collections WHERE user_id = ?', [uid]);
  db.run('DELETE FROM notifications WHERE user_id = ?', [uid]);
  db.run('DELETE FROM addresses WHERE user_id = ?', [uid]);
  db.run('DELETE FROM users WHERE id = ?', [uid]);
}
for (const cid of compIds) {
  db.run('DELETE FROM notifications WHERE company_id = ?', [cid]);
  db.run(`DELETE FROM messages WHERE (sender_type = 'company' AND sender_id = ?) OR (receiver_type = 'company' AND receiver_id = ?)`, [cid, cid]);
  db.run('DELETE FROM companies WHERE id = ?', [cid]);
}
fs.writeFileSync('data/ecopickup.sqlite', Buffer.from(db.export()));
console.log('varredura concluída. estado do banco:',
  '| usuarios teste:', q(`SELECT COUNT(*) FROM users WHERE email LIKE 'teste-cbf-%'`)[0][0],
  '| empresas teste:', q(`SELECT COUNT(*) FROM companies WHERE email LIKE 'teste-cbf-%'`)[0][0],
  '| total usuarios:', q('SELECT COUNT(*) FROM users')[0][0],
  '| empresas:', q('SELECT COUNT(*) FROM companies')[0][0],
  '| coletas:', q('SELECT COUNT(*) FROM collections')[0][0],
  '| notifications:', q('SELECT COUNT(*) FROM notifications')[0][0]);
