import { Pool, neonConfig } from '@neondatabase/serverless'
import crypto from 'node:crypto'
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
    await db.query(`CREATE TABLE IF NOT EXISTS players (
      id bigserial PRIMARY KEY,
      name text NOT NULL,
      pin text,
      photo text,
      role text,
      deleted_at timestamptz
    )`)
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS players_active_name_idx
      ON players (name) WHERE deleted_at IS NULL`)
    await db.query(`CREATE TABLE IF NOT EXISTS matches (
      id uuid PRIMARY KEY,
      team1_player1_id bigint NOT NULL REFERENCES players(id),
      team1_player2_id bigint NOT NULL REFERENCES players(id),
      team2_player1_id bigint NOT NULL REFERENCES players(id),
      team2_player2_id bigint NOT NULL REFERENCES players(id),
      score1 integer NOT NULL,
      score2 integer NOT NULL,
      match_date date NOT NULL,
      comment text NOT NULL DEFAULT '',
      logged_at timestamptz NOT NULL DEFAULT now(),
      seq bigserial
    )`)
    await db.query(`CREATE INDEX IF NOT EXISTS matches_date_idx ON matches (match_date)`)
    await db.query(`CREATE TABLE IF NOT EXISTS videos (
      id bigserial PRIMARY KEY,
      url text NOT NULL
    )`)
    await db.query(`CREATE TABLE IF NOT EXISTS photos (
      id uuid PRIMARY KEY,
      data_url text NOT NULL,
      seq bigserial
    )`)
    await db.query(`CREATE TABLE IF NOT EXISTS slots (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      time text NOT NULL,
      end_date date NOT NULL,
      seq bigserial
    )`)
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

function toDateStr(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value
}

async function selectPlayers(client) {
  const { rows } = await client.query(
    `SELECT name, pin, photo, role FROM players WHERE deleted_at IS NULL ORDER BY id`
  )
  return rows.map((r) => {
    const p = { name: r.name }
    if (r.pin) p.pin = r.pin
    if (r.photo) p.photo = r.photo
    if (r.role) p.role = r.role
    return p
  })
}

async function selectMatches(client) {
  const { rows } = await client.query(`
    SELECT m.id, m.score1, m.score2, m.match_date, m.comment, m.logged_at,
           p1.name AS t1p1, p2.name AS t1p2, p3.name AS t2p1, p4.name AS t2p2
    FROM matches m
    JOIN players p1 ON p1.id = m.team1_player1_id
    JOIN players p2 ON p2.id = m.team1_player2_id
    JOIN players p3 ON p3.id = m.team2_player1_id
    JOIN players p4 ON p4.id = m.team2_player2_id
    ORDER BY m.seq
  `)
  return rows.map((r) => ({
    id: r.id,
    team1: [r.t1p1, r.t1p2],
    team2: [r.t2p1, r.t2p2],
    score1: r.score1,
    score2: r.score2,
    date: toDateStr(r.match_date),
    comment: r.comment || '',
    loggedAt: r.logged_at.toISOString(),
  }))
}

async function selectVideos(client) {
  const { rows } = await client.query(`SELECT url FROM videos ORDER BY id`)
  return rows.map((r) => r.url)
}

async function selectPhotos(client) {
  const { rows } = await client.query(`SELECT id, data_url FROM photos ORDER BY seq`)
  return rows.map((r) => ({ id: r.id, dataUrl: r.data_url }))
}

async function selectSlots(client) {
  const { rows } = await client.query(`SELECT id, name, time, end_date FROM slots ORDER BY seq`)
  return rows.map((r) => ({ id: r.id, name: r.name, time: r.time, endDate: toDateStr(r.end_date) }))
}

export async function readState(defaultState) {
  await ensureSchema()
  const pool = getPool()
  const [players, matches, videos, photos, slots] = await Promise.all([
    selectPlayers(pool),
    selectMatches(pool),
    selectVideos(pool),
    selectPhotos(pool),
    selectSlots(pool),
  ])
  if (players.length || matches.length || videos.length || photos.length || slots.length) {
    return { players, matches, videos, photos, slots }
  }
  await writeState(defaultState)
  return defaultState
}

// Bulk full-state replace. Used only by POST /api/import, POST /api/restore/:ts,
// and scripts/migrate-json.js/scripts/backfill-normalized.js — all legitimately
// whole-state operations. Per-field mutations go through the targeted functions
// below instead, so a single player/match/etc edit no longer rewrites every table.
export async function writeState(state) {
  await ensureSchema()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT pg_advisory_xact_lock(684276491)`)
    await client.query(`TRUNCATE players, matches, videos, photos, slots RESTART IDENTITY`)

    const playerIdByName = new Map()
    for (const p of state.players || []) {
      const { rows } = await client.query(
        `INSERT INTO players (name, pin, photo, role) VALUES ($1,$2,$3,$4) RETURNING id`,
        [p.name, p.pin || null, p.photo || null, p.role || null]
      )
      playerIdByName.set(p.name, rows[0].id)
    }

    for (const m of state.matches || []) {
      const ids = [...m.team1, ...m.team2].map((n) => playerIdByName.get(n))
      if (ids.some((id) => id === undefined)) {
        throw new Error(`Match references unknown player: ${JSON.stringify(m)}`)
      }
      await client.query(
        `INSERT INTO matches
          (id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id,
           score1, score2, match_date, comment, logged_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [m.id || crypto.randomUUID(), ids[0], ids[1], ids[2], ids[3],
          m.score1, m.score2, m.date, m.comment || '', m.loggedAt || new Date().toISOString()]
      )
    }

    for (const url of state.videos || []) {
      await client.query(`INSERT INTO videos (url) VALUES ($1)`, [url])
    }

    for (const p of state.photos || []) {
      await client.query(`INSERT INTO photos (id, data_url) VALUES ($1,$2)`, [p.id || crypto.randomUUID(), p.dataUrl])
    }

    for (const s of state.slots || []) {
      await client.query(
        `INSERT INTO slots (id, name, time, end_date) VALUES ($1,$2,$3,$4)`,
        [s.id || crypto.randomUUID(), s.name, s.time, s.endDate]
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function addPlayer({ name, pin, photo }) {
  await ensureSchema()
  await getPool().query(
    `INSERT INTO players (name, pin, photo) VALUES ($1,$2,$3)`,
    [name, pin || null, photo || null]
  )
  return selectPlayers(getPool())
}

export async function updatePlayerByName(oldName, updated) {
  await ensureSchema()
  await getPool().query(
    `UPDATE players SET name=$1, pin=$2, photo=$3, role=$4 WHERE name=$5 AND deleted_at IS NULL`,
    [updated.name, updated.pin || null, updated.photo || null, updated.role || null, oldName]
  )
  return selectPlayers(getPool())
}

export async function deletePlayerByName(name) {
  await ensureSchema()
  await getPool().query(`UPDATE players SET deleted_at = now() WHERE name = $1 AND deleted_at IS NULL`, [name])
  return selectPlayers(getPool())
}

async function resolvePlayerIds(client, names) {
  const { rows } = await client.query(
    `SELECT id, name FROM players WHERE name = ANY($1) AND deleted_at IS NULL`,
    [names]
  )
  const idByName = new Map(rows.map((r) => [r.name, r.id]))
  const ids = names.map((n) => idByName.get(n))
  if (ids.some((id) => id === undefined)) throw new Error('Unknown player in match')
  return ids
}

export async function addMatch(match) {
  await ensureSchema()
  const pool = getPool()
  const ids = await resolvePlayerIds(pool, [...match.team1, ...match.team2])
  await pool.query(
    `INSERT INTO matches
      (id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id,
       score1, score2, match_date, comment, logged_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [match.id, ids[0], ids[1], ids[2], ids[3], match.score1, match.score2, match.date, match.comment || '', match.loggedAt]
  )
  return selectMatches(pool)
}

export async function updateMatch(id, updates) {
  await ensureSchema()
  const pool = getPool()
  const sets = []
  const values = []
  let i = 1
  if (updates.team1 && updates.team2) {
    const ids = await resolvePlayerIds(pool, [...updates.team1, ...updates.team2])
    const cols = ['team1_player1_id', 'team1_player2_id', 'team2_player1_id', 'team2_player2_id']
    cols.forEach((col, idx) => {
      sets.push(`${col} = $${i++}`)
      values.push(ids[idx])
    })
  }
  if (updates.score1 !== undefined) { sets.push(`score1 = $${i++}`); values.push(updates.score1) }
  if (updates.score2 !== undefined) { sets.push(`score2 = $${i++}`); values.push(updates.score2) }
  if (updates.date !== undefined) { sets.push(`match_date = $${i++}`); values.push(updates.date) }
  if (updates.comment !== undefined) { sets.push(`comment = $${i++}`); values.push(updates.comment) }
  if (sets.length) {
    values.push(id)
    await pool.query(`UPDATE matches SET ${sets.join(', ')} WHERE id = $${i}`, values)
  }
  return selectMatches(pool)
}

export async function deleteMatch(id) {
  await ensureSchema()
  await getPool().query(`DELETE FROM matches WHERE id = $1`, [id])
  return selectMatches(getPool())
}

export async function addVideo(url) {
  await ensureSchema()
  await getPool().query(`INSERT INTO videos (url) VALUES ($1)`, [url])
  return selectVideos(getPool())
}

export async function deleteVideoAt(index) {
  await ensureSchema()
  await getPool().query(
    `DELETE FROM videos WHERE id = (SELECT id FROM videos ORDER BY id OFFSET $1 LIMIT 1)`,
    [index]
  )
  return selectVideos(getPool())
}

export async function addPhoto({ id, dataUrl }) {
  await ensureSchema()
  await getPool().query(`INSERT INTO photos (id, data_url) VALUES ($1,$2)`, [id, dataUrl])
  return selectPhotos(getPool())
}

export async function deletePhotoById(id) {
  await ensureSchema()
  await getPool().query(`DELETE FROM photos WHERE id = $1`, [id])
  return selectPhotos(getPool())
}

export async function addSlot(slot) {
  await ensureSchema()
  await getPool().query(
    `INSERT INTO slots (id, name, time, end_date) VALUES ($1,$2,$3,$4)`,
    [slot.id, slot.name, slot.time, slot.endDate]
  )
  return selectSlots(getPool())
}

export async function updateSlotById(id, updates) {
  await ensureSchema()
  const sets = []
  const values = []
  let i = 1
  if (updates.name !== undefined) { sets.push(`name = $${i++}`); values.push(updates.name) }
  if (updates.time !== undefined) { sets.push(`time = $${i++}`); values.push(updates.time) }
  if (updates.endDate !== undefined) { sets.push(`end_date = $${i++}`); values.push(updates.endDate) }
  if (sets.length) {
    values.push(id)
    await getPool().query(`UPDATE slots SET ${sets.join(', ')} WHERE id = $${i}`, values)
  }
  return selectSlots(getPool())
}

export async function deleteSlotById(id) {
  await ensureSchema()
  await getPool().query(`DELETE FROM slots WHERE id = $1`, [id])
  return selectSlots(getPool())
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
