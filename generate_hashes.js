const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

const users = [
  { username: 'director', name: 'Director (Omar)', pass: 'Omar26+' },
  { username: 'vicedir', name: 'Vicedirectora (Marisa)', pass: 'Marisa26+' },
  { username: 'dpto', name: 'Departamento (Selva)', pass: 'Selva26+' }
];

console.log('-- =======================================================');
console.log('-- COPIA Y PEGA ESTE BLOQUE EN SUPABASE > SQL EDITOR');
console.log('-- =======================================================\n');

users.forEach(u => {
  const salt = generateSalt();
  const hash = hashPassword(u.pass, salt);
  // Verify matching
  const verify = hashPassword(u.pass, salt) === hash;
  if (!verify) throw new Error('Verification failed for ' + u.username);
  
  console.log(`UPDATE admin_users SET name = '${u.name}', password_hash = '${hash}', salt = '${salt}', is_active = 1 WHERE username = '${u.username}';`);
});

console.log('\n-- Si por alguna razon no existieran las filas, las inserta:');
console.log(`INSERT INTO admin_users (username, name, password_hash, salt, is_active)
VALUES 
  ('director', 'Director (Omar)', '${hashPassword('Omar26+', '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d')}', '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', 1),
  ('vicedir', 'Vicedirectora (Marisa)', '${hashPassword('Marisa26+', '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a')}', '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a', 1),
  ('dpto', 'Departamento (Selva)', '${hashPassword('Selva26+', '3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a2b')}', '3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a2b', 1)
ON CONFLICT (username) DO UPDATE SET 
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  salt = EXCLUDED.salt,
  is_active = 1;
`);
