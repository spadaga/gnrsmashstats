import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws

let pool
let schemaReady

function getPool() {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.DATABASE_URL_UNPOOLED
    || process.env.POSTGRES_URL_NON_POOLING
  if (!connectionString) {
    const error = new Error('Neon is not connected. Add DATABASE_URL to this Vercel project and redeploy.')
    error.code = 'DATABASE_NOT_CONFIGURED'
    throw error
  }
  pool = new Pool({ connectionString })
  return pool
}

export function ensureSchema() {
  const db = getPool()
  schemaReady ||= (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS app_resources (
      resource text NOT NULL,
      item_key text NOT NULL,
      position integer NOT NULL,
      value jsonb NOT NULL,
      PRIMARY KEY (resource, item_key)
    )`)
    await db.query(`CREATE INDEX IF NOT EXISTS app_resources_order_idx
      ON app_resources (resource, position)`)
    await db.query(`CREATE TABLE IF NOT EXISTS app_snapshots (
      snapshot_date date PRIMARY KEY,
      state jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`)
  })().catch((error) => {
    schemaReady = undefined
    throw error
  })
  return schemaReady
}

const resources = ['players', 'matches', 'videos', 'photos', 'slots']

function keyFor(resource, value, index) {
  if (resource === 'players') return value.name
  if (resource === 'videos') return String(index)
  return value.id || String(index)
}

async function readWith(client) {
  const { rows } = await client.query(
    `SELECT resource, value FROM app_resources ORDER BY resource, position`
  )
  const state = Object.fromEntries(resources.map((name) => [name, []]))
  for (const row of rows) state[row.resource]?.push(row.value)
  return state
}

export async function readState(defaultState) {
  await ensureSchema()
  const state = await readWith(getPool())
  if (state.players.length || state.matches.length || state.videos.length || state.photos.length || state.slots.length) return state
  await writeState(defaultState)
  return defaultState
}

export async function writeState(state) {
  await ensureSchema()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT pg_advisory_xact_lock(684276491)`)
    for (const resource of resources) {
      await client.query(`DELETE FROM app_resources WHERE resource = $1`, [resource])
      for (const [position, value] of (state[resource] || []).entries()) {
        await client.query(
          `INSERT INTO app_resources (resource, item_key, position, value) VALUES ($1, $2, $3, $4::jsonb)`,
          [resource, keyFor(resource, value, position), position, JSON.stringify(value)]
        )
      }
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function snapshotState(state) {
  await ensureSchema()
  await getPool().query(
    `INSERT INTO app_snapshots (snapshot_date, state) VALUES (CURRENT_DATE, $1::jsonb)
     ON CONFLICT (snapshot_date) DO NOTHING`,
    [JSON.stringify(state)]
  )
  await getPool().query(`
    DELETE FROM app_snapshots
    WHERE snapshot_date NOT IN (
      SELECT snapshot_date FROM app_snapshots ORDER BY snapshot_date DESC LIMIT 3
    )
  `)
}

export async function listSnapshots() {
  await ensureSchema()
  const { rows } = await getPool().query(
    `SELECT snapshot_date::text AS ts, state FROM app_snapshots ORDER BY snapshot_date DESC LIMIT 3`
  )
  return rows
}

export async function getSnapshot(date) {
  await ensureSchema()
  const { rows } = await getPool().query(
    `SELECT state FROM app_snapshots WHERE snapshot_date = $1::date`, [date]
  )
  return rows[0]?.state
}

export async function closePool() {
  if (pool) await pool.end()
  pool = undefined
  schemaReady = undefined
}
