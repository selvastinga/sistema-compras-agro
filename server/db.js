const path = require('path');

let pgPool = null;
let sqliteDb = null;
let schemaMigrated = false;
let migrationPromise = null;

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

function getPgPool() {
  if (!pgPool && DATABASE_URL) {
    const { Pool } = require('pg');
    const cleanUrl = DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, '');
    pgPool = new Pool({
      connectionString: cleanUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
      idleTimeoutMillis: 10000,
      max: 3,
      allowExitOnIdle: true,
      keepAlive: true
    });
    pgPool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err.message);
      pgPool = null;
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

async function ensureSchema() {
  if (schemaMigrated) return;
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      if (DATABASE_URL) {
        const pool = getPgPool();
        await pool.query(`ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS presupuesto_base NUMERIC(15, 2) NOT NULL DEFAULT 0.00;`);
        await pool.query(`ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS partida_especial NUMERIC(15, 2) NOT NULL DEFAULT 0.00;`);
        await pool.query(`ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS remanente_anterior NUMERIC(15, 2) NOT NULL DEFAULT 0.00;`);
        await pool.query(`
          UPDATE fiscal_years 
          SET presupuesto_base = initial_budget 
          WHERE presupuesto_base = 0 AND partida_especial = 0 AND remanente_anterior = 0 AND initial_budget > 0;
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS viaticos (
            id SERIAL PRIMARY KEY,
            year INTEGER NOT NULL REFERENCES fiscal_years(year) ON DELETE CASCADE,
            area_id INTEGER NOT NULL REFERENCES areas(id),
            docente VARCHAR(255) NOT NULL,
            destino VARCHAR(255) NOT NULL,
            dias NUMERIC(10, 1) NOT NULL DEFAULT 1,
            monto NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
            fecha DATE NOT NULL DEFAULT CURRENT_DATE,
            observaciones TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      } else {
        const sqlite = getSqliteDb();
        if (sqlite) {
          const cols = sqlite.prepare("PRAGMA table_info(fiscal_years)").all().map(c => c.name);
          if (!cols.includes('presupuesto_base')) {
            sqlite.prepare("ALTER TABLE fiscal_years ADD COLUMN presupuesto_base REAL NOT NULL DEFAULT 0").run();
          }
          if (!cols.includes('partida_especial')) {
            sqlite.prepare("ALTER TABLE fiscal_years ADD COLUMN partida_especial REAL NOT NULL DEFAULT 0").run();
          }
          if (!cols.includes('remanente_anterior')) {
            sqlite.prepare("ALTER TABLE fiscal_years ADD COLUMN remanente_anterior REAL NOT NULL DEFAULT 0").run();
          }
          sqlite.prepare(`
            UPDATE fiscal_years 
            SET presupuesto_base = initial_budget 
            WHERE presupuesto_base = 0 AND partida_especial = 0 AND remanente_anterior = 0 AND initial_budget > 0
          `).run();
          sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS viaticos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              year INTEGER NOT NULL,
              area_id INTEGER NOT NULL,
              docente TEXT NOT NULL,
              destino TEXT NOT NULL,
              dias REAL NOT NULL DEFAULT 1,
              monto REAL NOT NULL DEFAULT 0,
              fecha TEXT NOT NULL DEFAULT (date('now')),
              observaciones TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (year) REFERENCES fiscal_years(year) ON DELETE CASCADE,
              FOREIGN KEY (area_id) REFERENCES areas(id)
            )
          `).run();
        }
      }
      schemaMigrated = true;
    } catch (err) {
      console.error('Schema migration error:', err.message);
    } finally {
      migrationPromise = null;
    }
  })();

  return migrationPromise;
}

async function runPgQuery(pgSql, params = []) {
  try {
    await ensureSchema();
    const pool = getPgPool();
    return await pool.query(pgSql, params);
  } catch (err) {
    console.error('PG Query error, resetting pool:', err.message);
    pgPool = null;
    if (err.message && (err.message.includes('timeout') || err.message.includes('terminated') || err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED'))) {
      throw new Error(
        'La base de datos de Supabase no responde (Timeout). Por favor ingresá a supabase.com, verificá que el proyecto no esté Pausado (botón "Restore project") y que haya terminado de iniciar.'
      );
    }
    throw err;
  }
}

// Helper: Convert ? parameters to $1, $2 for PostgreSQL
function convertSqlForPg(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Unified Query interface (Async)
async function query(sql, params = []) {
  if (DATABASE_URL) {
    const pgSql = convertSqlForPg(sql);
    const res = await runPgQuery(pgSql, params);
    return res.rows;
  }
  
  await ensureSchema();
  const sqlite = getSqliteDb();
  if (sqlite) {
    return sqlite.prepare(sql).all(...params);
  }

  throw new Error('No database connection available. Please configure DATABASE_URL in Vercel environment variables.');
}

async function queryRow(sql, params = []) {
  if (DATABASE_URL) {
    const pgSql = convertSqlForPg(sql);
    const res = await runPgQuery(pgSql, params);
    return res.rows[0] || null;
  }

  await ensureSchema();
  const sqlite = getSqliteDb();
  if (sqlite) {
    return sqlite.prepare(sql).get(...params) || null;
  }

  throw new Error('No database connection available. Please configure DATABASE_URL in Vercel environment variables.');
}

async function execute(sql, params = []) {
  if (DATABASE_URL) {
    const pgSql = convertSqlForPg(sql);
    const res = await runPgQuery(pgSql, params);
    return { rowCount: res.rowCount };
  }

  await ensureSchema();
  const sqlite = getSqliteDb();
  if (sqlite) {
    return sqlite.prepare(sql).run(...params);
  }

  throw new Error('No database connection available. Please configure DATABASE_URL in Vercel environment variables.');
}

async function executeInsert(sql, params = []) {
  if (DATABASE_URL) {
    const pgSql = convertSqlForPg(sql) + ' RETURNING id';
    const res = await runPgQuery(pgSql, params);
    return { lastInsertRowid: res.rows[0]?.id || null };
  }

  await ensureSchema();
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
