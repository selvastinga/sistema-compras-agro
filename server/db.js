const path = require('path');
const fs = require('fs');

let pgPool = null;
let sqliteDb = null;

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

if (DATABASE_URL) {
  // Use PostgreSQL (Supabase / Neon / Vercel Postgres)
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Connected to PostgreSQL database via connection string.');
} else {
  // Use local SQLite for local execution
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'compras_agro.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  console.log('Connected to local SQLite database:', dbPath);
}

// Helper: Convert ? parameters to $1, $2 for PostgreSQL
function convertSqlForPg(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Unified Query interface (Async)
async function query(sql, params = []) {
  if (pgPool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    return sqliteDb.prepare(sql).all(...params);
  }
}

async function queryRow(sql, params = []) {
  if (pgPool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0] || null;
  } else {
    return sqliteDb.prepare(sql).get(...params) || null;
  }
}

async function execute(sql, params = []) {
  if (pgPool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pgPool.query(pgSql, params);
    return { rowCount: res.rowCount };
  } else {
    return sqliteDb.prepare(sql).run(...params);
  }
}

async function executeInsert(sql, params = []) {
  if (pgPool) {
    const pgSql = convertSqlForPg(sql) + ' RETURNING id';
    const res = await pgPool.query(pgSql, params);
    return { lastInsertRowid: res.rows[0]?.id || null };
  } else {
    const info = sqliteDb.prepare(sql).run(...params);
    return { lastInsertRowid: info.lastInsertRowid };
  }
}

module.exports = {
  query,
  queryRow,
  execute,
  executeInsert,
  isPostgres: !!DATABASE_URL
};
