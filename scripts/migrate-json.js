import fs from 'node:fs/promises'
import path from 'node:path'
import { closePool, writeState } from '../api/db.js'

const source = process.argv[2]
if (!source) throw new Error('Usage: npm run db:migrate -- <path-to-full-export.json>')

const state = JSON.parse(await fs.readFile(path.resolve(source), 'utf8'))
const resources = ['players', 'matches', 'videos', 'photos', 'slots']
for (const resource of resources) {
  if (!Array.isArray(state[resource])) throw new Error(`${resource} must be an array`)
}

const playerNames = new Set(state.players.map((player) => player?.name).filter(Boolean))
if (playerNames.size !== state.players.length) throw new Error('Players must have unique, non-empty names')

const matchIds = new Set(state.matches.map((match) => match?.id).filter(Boolean))
if (matchIds.size !== state.matches.length) throw new Error('Matches must have unique, non-empty ids')

await writeState(Object.fromEntries(resources.map((resource) => [resource, state[resource]])))
await closePool()

console.log(`Migrated ${state.players.length} players, ${state.matches.length} matches, ${state.videos.length} videos, ${state.photos.length} photo records, and ${state.slots.length} slots.`)
