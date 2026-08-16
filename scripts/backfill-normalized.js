// One-time migration: reads the legacy jsonb-blob `app_resources` table and
// bulk-inserts it into the new normalized players/matches/videos/photos/slots
// tables via writeState() (which also creates those tables if missing). The
// old app_resources table is left untouched — nothing here drops it.
//
// Usage: DATABASE_URL=<connection string> node scripts/backfill-normalized.js
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { closePool, writeState } from '../api/db.js'

if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL
  || process.env.POSTGRES_URL
  || process.env.DATABASE_URL_UNPOOLED
  || process.env.POSTGRES_URL_NON_POOLING
if (!connectionString) throw new Error('Set DATABASE_URL (or a Postgres fallback) before running this script.')

const resources = ['players', 'matches', 'videos', 'photos', 'slots']

async function readLegacyState() {
  const legacyPool = new Pool({ connectionString })
  try {
    const { rows } = await legacyPool.query(
      `SELECT resource, value FROM app_resources ORDER BY resource, position`
    )
    const state = Object.fromEntries(resources.map((name) => [name, []]))
    for (const row of rows) state[row.resource]?.push(row.value)
    return state
  } finally {
    await legacyPool.end()
  }
}

const legacyState = await readLegacyState()
console.log(
  `Read legacy state: ${legacyState.players.length} players, ${legacyState.matches.length} matches, `
  + `${legacyState.videos.length} videos, ${legacyState.photos.length} photos, ${legacyState.slots.length} slots.`
)

await writeState(legacyState)
await closePool()

console.log('Backfill complete — normalized tables now hold the legacy data.')
console.log('Verify via GET /api/state before dropping the old app_resources table.')
