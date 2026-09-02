const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

const db = new Database(path.join(__dirname, 'compras_agro.db'));

// Drop and recreate admin_users and sessions
db.exec(`
  DROP TABLE IF EXISTS sessions;
  DROP TABLE IF EXISTS admin_users;

  CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );
`);

const users = [
  { username: 'director', name: 'Director (Omar)', password: 'Omar26+' },
  { username: 'vicedir', name: 'Vicedirectora (Marisa)', password: 'Marisa26+' },
  { username: 'dpto', name: 'Departamento (Selva)', password: 'Selva26+' }
];

const insertStmt = db.prepare(`
  INSERT INTO admin_users (username, name, password_hash, salt, is_active)
  VALUES (@username, @name, @password_hash, @salt, 1)
`);

for (const u of users) {
  const salt = generateSalt();
  const hash = hashPassword(u.password, salt);
  insertStmt.run({
    username: u.username,
    name: u.name,
    password_hash: hash,
    salt
  });
}

console.log('=== USERS INITIALIZED SUCCESSFULLY ===');
const list = db.prepare('SELECT id, username, name, is_active FROM admin_users').all();
console.log(list);

db.close();
