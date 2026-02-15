// caminho: api/db.js
const { Pool } = require('pg')

/**
 * Conexão via ENV:
 * - Preferência: DATABASE_URL
 * - Alternativa: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 */

const connectionString = process.env.DATABASE_URL

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'plugconversa',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || ''
    })

// teste simples de conexão + log seguro (sem senha)
// ⚠️ agora lança erro se falhar (arquitetura correta para SaaS)
async function testDbConnection() {
  try {
    const res = await pool.query(
      'SELECT current_database() db, current_user usr, now() ts;'
    )
    const row = res?.rows?.[0] || {}

    console.log('[DB] conectado ✅', {
      db: row.db,
      user: row.usr,
      ts: row.ts
    })

    return true
  } catch (err) {
    console.error('[DB] falha ao conectar ❌', {
      message: err?.message,
      code: err?.code
    })

    // 🔥 agora propaga erro para server.js
    throw err
  }
}

module.exports = { pool, testDbConnection }
// fim: api/db.js
