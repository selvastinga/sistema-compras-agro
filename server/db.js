const path = require('path');

let pgPool = null;
let sqliteDb = null;

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

function getPgPool() {
  if (!pgPool && DATABASE_URL) {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      max: 10
    });
    console.log('Initialized PostgreSQL Pool.');
  }
  return pgPool;
}

function getSqliteDb() {
  if (!sqliteDb && !DATABASE_URL) {
    try {
      const Database = eval('require')('better-sqlite3');
      const dbPath = path.join(__dirname, 'compras_agro.db');
      sqliteDb = new Database(dbPath);
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('foreign_keys = ON');
      console.log('Initialized local SQLite DB:', dbPath);
    } catch (e) {
      console.warn('SQLite not available in this environment:', e.message);
    }
  }
  return sqliteDb;
}

// Helper: Convert ? parameters to $1, $2 for PostgreSQL
function convertSqlForPg(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Unified Query interface (Async)
async function query(sql, params = []) {
  const pool = getPgPool();
  if (pool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pool.query(pgSql, params);
    return res.rows;
  }
  
  const sqlite = getSqliteDb();
  if (sqlite) {
    return sqlite.prepare(sql).all(...params);
  }

  throw new Error('No database connection available. Please configure DATABASE_URL in Vercel environment variables.');
}

async function queryRow(sql, params = []) {
  const pool = getPgPool();
  if (pool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pool.query(pgSql, params);
    return res.rows[0] || null;
  }

  const sqlite = getSqliteDb();
  if (sqlite) {
    return sqlite.prepare(sql).get(...params) || null;
  }

  throw new Error('No database connection available. Please configure DATABASE_URL in Vercel environment variables.');
}

async function execute(sql, params = []) {
  const pool = getPgPool();
  if (pool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pool.query(pgSql, params);
    return { rowCount: res.rowCount };
  }

  const sqlite = getSqliteDb();
  if (sqlite) {
    return sqlite.prepare(sql).run(...params);
  }

  throw new Error('No database connection available. Please configure DATABASE_URL in Vercel environment variables.');
}

async function executeInsert(sql, params = []) {
  const pool = getPgPool();
  if (pool) {
    const pgSql = convertSqlForPg(sql) + ' RETURNING id';
    const res = await pool.query(pgSql, params);
    return { lastInsertRowid: res.rows[0]?.id || null };
  }

  const sqlite = getSqliteDb();
  if (sqlite) {
    const info = sqlite.prepare(sql).run(...params);
    return { lastInsertRowid: info.lastInsertRowid };
  }

  throw new Error('No database connection available. Please configure DATABASE_URL in Vercel environment variables.');
}

module.exports = {
  query,
  queryRow,
  execute,
  executeInsert,
  isPostgres: !!DATABASE_URL
};
