import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!connectionString) throw new Error('DATABASE_URL (or POSTGRES_URL) is required')

const pool = new Pool({ connectionString })
let schemaReady

export function ensureSchema() {
  schemaReady ||= pool.query(`
    CREATE TABLE IF NOT EXISTS app_resources (
      resource text NOT NULL,
      item_key text NOT NULL,
      position integer NOT NULL,
      value jsonb NOT NULL,
      PRIMARY KEY (resource, item_key)
    );
    CREATE INDEX IF NOT EXISTS app_resources_order_idx
      ON app_resources (resource, position);
    CREATE TABLE IF NOT EXISTS app_snapshots (
      snapshot_date date PRIMARY KEY,
      state jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)
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
  const state = await readWith(pool)
  if (state.players.length || state.matches.length || state.videos.length || state.photos.length || state.slots.length) return state
  await writeState(defaultState)
  return defaultState
}

export async function writeState(state) {
  await ensureSchema()
  const client = await pool.connect()
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
  await pool.query(
    `INSERT INTO app_snapshots (snapshot_date, state) VALUES (CURRENT_DATE, $1::jsonb)
     ON CONFLICT (snapshot_date) DO NOTHING`,
    [JSON.stringify(state)]
  )
  await pool.query(`
    DELETE FROM app_snapshots
    WHERE snapshot_date NOT IN (
      SELECT snapshot_date FROM app_snapshots ORDER BY snapshot_date DESC LIMIT 3
    )
  `)
}

export async function listSnapshots() {
  await ensureSchema()
  const { rows } = await pool.query(
    `SELECT snapshot_date::text AS ts, state FROM app_snapshots ORDER BY snapshot_date DESC LIMIT 3`
  )
  return rows
}

export async function getSnapshot(date) {
  await ensureSchema()
  const { rows } = await pool.query(
    `SELECT state FROM app_snapshots WHERE snapshot_date = $1::date`, [date]
  )
  return rows[0]?.state
}

export async function closePool() {
  await pool.end()
}
