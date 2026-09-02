const crypto = require('crypto');
const { query, queryRow, execute } = require('./db');

// Helper: Hash password with salt using PBKDF2
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Helper: clean expired sessions periodically
async function cleanExpiredSessions() {
  try {
    await execute("DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP");
  } catch (e) {
    console.error('Error cleaning sessions:', e);
  }
}

// Authenticate user with username and password
async function authenticateUser(username, password) {
  if (!username || !password) return null;
  
  const user = await queryRow(`
    SELECT * FROM admin_users 
    WHERE LOWER(username) = LOWER(?) AND is_active = 1
  `, [username.trim()]);

  if (!user) return null;

  const inputHash = hashPassword(password, user.salt);
  if (inputHash === user.password_hash) {
    return user;
  }
  return null;
}

// Generate secure session token
async function createSession(user) {
  await cleanExpiredSessions();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  await execute(`
    INSERT INTO sessions (token, username, expires_at)
    VALUES (?, ?, ?)
  `, [token, user.username.toLowerCase().trim(), expiresAt]);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: 'admin'
    }
  };
}

// Middleware: Require Admin Authentication
async function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Acceso no autorizado', 
      message: 'Se requiere iniciar sesión como Administrador (director, vicedir o dpto) para realizar modificaciones.' 
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token de sesión ausente' });
  }

  try {
    await cleanExpiredSessions();
    const session = await queryRow(`
      SELECT s.*, u.id as user_id, u.name, u.username, u.is_active
      FROM sessions s
      JOIN admin_users u ON LOWER(s.username) = LOWER(u.username)
      WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1
    `, [token]);

    if (!session) {
      return res.status(401).json({ 
        error: 'Sesión inválida o expirada', 
        message: 'Por favor inicia sesión nuevamente con tu usuario y clave.' 
      });
    }

    req.user = {
      id: session.user_id,
      username: session.username,
      name: session.name || session.username,
      role: 'admin'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Error en la verificación de sesión' });
  }
}

module.exports = {
  hashPassword,
  generateSalt,
  authenticateUser,
  createSession,
  requireAdminAuth
};
