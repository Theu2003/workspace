export function findUserByIdentifier(db, identifier) {
  const value = String(identifier || '').trim();
  return db.prepare(
    `SELECT * FROM users
     WHERE (primary_contact = 'email' AND lower(email) = lower(?))
        OR (primary_contact = 'phone' AND phone = ?)`
  ).get(value, value);
}

export function getPrimaryContact(user) {
  if (user?.primary_contact === 'email' && user.email) {
    return { channel: 'email', destination: user.email };
  }
  if (user?.primary_contact === 'phone' && user.phone) {
    return { channel: 'phone', destination: user.phone };
  }
  return null;
}
