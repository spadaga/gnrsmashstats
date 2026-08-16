// Vercel serverless backend. Structured application data and snapshots live
// in Neon Postgres; Vercel Blob is used only for uploaded photo binaries. Mirrors
// the route contract of server/apiPlugin.js (the local dev/preview backend)
// so src/lib/api.js works unchanged against either one.
//
// Requires DATABASE_URL (Neon pooled connection string) and a Blob store
// connected to this project (BLOB_READ_WRITE_TOKEN).
import { put, del } from '@vercel/blob'
import crypto from 'node:crypto'
import {
  addMatch,
  addPhoto,
  addPlayer,
  addSlot,
  addVideo,
  deleteMatch,
  deletePhotoById,
  deletePlayerByName,
  deleteSlotById,
  deleteVideoAt,
  getSnapshot,
  listSnapshots,
  readState as readDatabaseState,
  snapshotState,
  updateMatch,
  updatePlayerByName,
  updateSlotById,
  writeState,
} from './db.js'

const MAX_PHOTOS = 50
const MAX_VIDEOS = 20

// Players are stored as { name, pin? } objects.
// Those with a pin are admins; others are read-only.
const DEFAULT_PLAYERS = [
  { name: 'Sanjeev Kumar',    pin: '2682' },
  { name: 'Abdhulla',        pin: '0492' },
  { name: 'Srinivas Padaga',  pin: '0556' },
  { name: 'Suresh Padaga',    pin: '2669' },
  { name: 'HR',               pin: '8220' },
  { name: 'Narendra',         pin: '1484' },
  { name: 'Manikyam',         pin: '7158' },
  { name: 'Diwakar',          pin: '8610' },
]
const DEFAULT_SLOTS = [
  { name: 'Abdhulla', time: '6 to 7', endDate: '2026-08-12' },
  { name: 'HR', time: '6 to 7', endDate: '2026-09-01' },
  { name: 'MURALI', time: '6 to 7', endDate: '2026-09-01' },
  { name: 'Srinivas Padaga', time: '6 to 7', endDate: '2026-09-01' },
  { name: 'CHAKRI', time: '6 to 7', endDate: '2026-10-03' },
  { name: 'Manikyam', time: '6 to 7', endDate: '2026-10-07' },
  { name: 'SANJEEV', time: '6 to 7', endDate: '2026-10-18' },
  { name: 'Jittu', time: '6 to 7', endDate: '2026-10-19' },
  { name: 'NARENDAR REDDY T', time: '6 to 7', endDate: '2026-10-22' },
  { name: 'NARASIHA REDDY', time: '6 to 7', endDate: '2026-10-26' },
  { name: 'Suresh Padaga', time: '6 to 7', endDate: '2026-11-01' },
  { name: 'Vamsi', time: '6 to 7', endDate: '2026-09-05' },
].map((s) => ({ ...s, id: crypto.randomUUID() }))

async function readState() {
  return readDatabaseState({ players: DEFAULT_PLAYERS, matches: [], videos: [], photos: [], slots: DEFAULT_SLOTS })
}

const MAX_VERSIONS = 3

function parseDataUrl(dataUrl) {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('Invalid image data')
  return { ext: match[1] === 'jpeg' ? 'jpg' : match[1], mime: match[1], buffer: Buffer.from(match[2], 'base64') }
}

async function savePhotoBlob(dataUrl) {
  const { ext, mime, buffer } = parseDataUrl(dataUrl)
  const id = crypto.randomUUID()
  const blob = await put(`photos/${id}.${ext}`, buffer, {
    access: 'public',
    contentType: `image/${mime}`,
    addRandomSuffix: false,
  })
  return { id, dataUrl: blob.url }
}

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost')
  const parts = pathname.split('/').filter(Boolean) // ['api', 'state'] or ['api', 'players', 'Name']
  const resource = parts[1]
  const param = parts[2] !== undefined ? decodeURIComponent(parts[2]) : undefined

  try {
    const state = await readState()

    if (resource === 'versions' && req.method === 'GET') {
      const versions = (await listSnapshots()).slice(0, MAX_VERSIONS).map(({ ts, state: s }) => ({
        ts,
        matchCount: s.matches?.length ?? 0,
        playerCount: s.players?.length ?? 0,
        slotCount: s.slots?.length ?? 0,
      }))
      return res.status(200).json(versions)
    }

    if (resource === 'restore' && req.method === 'POST') {
      const ts = param
      const restored = await getSnapshot(ts)
      if (!restored) return res.status(404).json({ error: 'Version not found' })
      await writeState(restored)
      return res.status(200).json(restored)
    }

    if (resource === 'state' && req.method === 'GET') {
      return res.status(200).json(state)
    }

    if (resource === 'export' && req.method === 'GET') {
      res.setHeader('Content-Disposition', 'attachment; filename="badminton-results.json"')
      return res.status(200).json(state)
    }

    if (resource === 'import' && req.method === 'POST') {
      const body = req.body || {}
      await snapshotState(state)
      const next = { ...state }
      if (Array.isArray(body.players)) next.players = body.players
      if (Array.isArray(body.matches)) next.matches = body.matches
      if (Array.isArray(body.videos)) next.videos = body.videos.slice(0, MAX_VIDEOS)
      if (Array.isArray(body.slots)) next.slots = body.slots
      if (Array.isArray(body.photos)) {
        const index = []
        for (const p of body.photos.slice(0, MAX_PHOTOS)) {
          if (typeof p.dataUrl === 'string' && p.dataUrl.startsWith('data:image/')) {
            index.push(await savePhotoBlob(p.dataUrl))
          } else if (typeof p.dataUrl === 'string' && /^https:\/\//.test(p.dataUrl)) {
            // Full exports from the old Blob-backed app contain durable public
            // Blob URLs rather than inline image bytes. Preserve those URLs;
            // photo metadata now lives in Neon while binaries remain in Blob.
            index.push({ id: p.id || crypto.randomUUID(), dataUrl: p.dataUrl })
          }
        }
        next.photos = index
      }
      await writeState(next)
      return res.status(200).json(next)
    }

    if (resource === 'players') {
      if (req.method === 'POST') {
        const { name, pin, photo } = req.body || {}
        if (name && !state.players.find((p) => p.name === name)) {
          await snapshotState(state)
          return res.status(200).json(await addPlayer({ name, pin, photo }))
        }
        return res.status(200).json(state.players)
      }
      if (req.method === 'DELETE') {
        await snapshotState(state)
        return res.status(200).json(await deletePlayerByName(param))
      }
      if (req.method === 'PUT') {
        const { name: newName, pin, photo, role } = req.body || {}
        const idx = state.players.findIndex((p) => p.name === param)
        if (idx === -1) return res.status(404).json({ error: 'Player not found' })
        await snapshotState(state)
        const existing = state.players[idx]
        const finalName = newName || param
        const updated = { name: finalName }
        if (pin !== undefined) { if (pin) updated.pin = pin }
        else if (existing.pin) updated.pin = existing.pin
        if (photo !== undefined) { if (photo) updated.photo = photo }
        else if (existing.photo) updated.photo = existing.photo
        // 'role' is the super-admin-assignable Admin/Contributor badge shown on the
        // Players page — separate from `pin` (which only governs login) and from the
        // single fixed super admin (Suresh Padaga, see SUPER_ADMIN_NAME in admins.js).
        if (role !== undefined) { if (role) updated.role = role }
        else if (existing.role) updated.role = existing.role
        // Matches reference players by id, not name, so a rename is a single-row
        // update here — no cascade into match history needed anymore.
        return res.status(200).json(await updatePlayerByName(param, updated))
      }
    }

    if (resource === 'matches') {
      if (req.method === 'POST') {
        const match = req.body || {}
        await snapshotState(state)
        return res.status(200).json(
          await addMatch({ ...match, id: crypto.randomUUID(), loggedAt: new Date().toISOString() })
        )
      }
      if (req.method === 'PUT') {
        return res.status(200).json(await updateMatch(param, req.body || {}))
      }
      if (req.method === 'DELETE') {
        await snapshotState(state)
        return res.status(200).json(await deleteMatch(param))
      }
    }

    if (resource === 'videos') {
      if (req.method === 'POST') {
        const { url } = req.body || {}
        if (state.videos.length >= MAX_VIDEOS) return res.status(400).json({ error: `Max ${MAX_VIDEOS} videos reached` })
        await snapshotState(state)
        return res.status(200).json(await addVideo(url))
      }
      if (req.method === 'DELETE') {
        await snapshotState(state)
        return res.status(200).json(await deleteVideoAt(Number(param)))
      }
    }

    if (resource === 'slots') {
      if (req.method === 'POST') {
        const slot = req.body || {}
        await snapshotState(state)
        return res.status(200).json(await addSlot({ ...slot, id: crypto.randomUUID() }))
      }
      if (req.method === 'PUT') {
        return res.status(200).json(await updateSlotById(param, req.body || {}))
      }
      if (req.method === 'DELETE') {
        await snapshotState(state)
        return res.status(200).json(await deleteSlotById(param))
      }
    }

    if (resource === 'photos') {
      if (req.method === 'POST') {
        const { dataUrl } = req.body || {}
        if (state.photos.length >= MAX_PHOTOS) return res.status(400).json({ error: `Max ${MAX_PHOTOS} photos reached` })
        await snapshotState(state)
        return res.status(200).json(await addPhoto(await savePhotoBlob(dataUrl)))
      }
      if (req.method === 'DELETE') {
        const entry = state.photos.find((p) => p.id === param)
        if (entry) await del(entry.dataUrl).catch(() => {})
        await snapshotState(state)
        return res.status(200).json(await deletePhotoById(param))
      }
    }

    return res.status(404).json({ error: 'Not found' })
  } catch (err) {
    const status = err.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 500
    return res.status(status).json({ error: err.message || String(err), code: err.code || 'INTERNAL_ERROR' })
  }
}
