# GNR SmashStats — Badminton Results Tracker

React + Vite + Tailwind v4 frontend with one Neon Postgres-backed API contract.

- **Production**: `api/handler.js` is a Vercel Function reached through the
  `vercel.json` rewrite (`/api/:path* → /api/handler`). Players, matches, videos,
  photo metadata, court slots, and recovery snapshots are persisted in Neon.
- **Photo binaries only** remain in Vercel Blob. Postgres stores each photo's
  `{ id, dataUrl }` metadata; `dataUrl` is the public Blob URL after upload.
- **Local development** intentionally proxies `/api/*` to
  `https://gnrsmashstats-kohl.vercel.app` through `vite.config.js`. It therefore
  reads and writes the same real Neon data as the new production project. The old
  `server/apiPlugin.js` and `data/*.json` implementation remains in the repository
  only as legacy/reference code and is no longer registered by Vite.

## Repository and isolation

- Repository: `https://github.com/spadaga/gnrsmashstats` (plural).
- Active deployment branch: `migration/neon-postgres`.
- Vercel project/deployment: `gnrsmashstats` / `https://gnrsmashstats-kohl.vercel.app`.
- This is separate from the original `spadaga/gnrsmashstat` repository, its
  branches, Vercel project, Blob-backed production deployment, and live site.
  Do not point this checkout at, push to, or deploy over the original project.
- Migration implementation commits: `c1b3f0c` (Neon backend), `ac793ec`
  (portable dependencies), `c1cdc13` (safe DB configuration errors), `f4ff0f4`
  (Node/native bindings), and `dfddba5` (real-data local proxy and Blob URL import).

## Run locally

```
npm install
npm run dev      # http://localhost:5173
npm run build && npm run preview
npm run lint     # oxlint
```

Use Node `22.22.2` (`.nvmrc`; package requires `>=22.12.0`):

```powershell
nvm use 22.22.2
npm ci --include=optional
npm run dev
```

Windows bindings for Rolldown and Oxlint are root `optionalDependencies`. They
install on Windows and are skipped safely by Vercel's Linux builder. Do not move
them into regular `dependencies` or `devDependencies`; doing so causes Vercel
`EBADPLATFORM` failures.

Local `/api` calls affect the real new production database. Override the target
with `LOCAL_API_TARGET` only when deliberately using another deployment.

## Players schema (`{ name, pin? }` objects)

The `players` resource stored in Postgres is an ordered array of objects:

```json
[
  { "name": "Sanjeev Kumar",    "pin": "2682" },
  { "name": "Abdhulla",         "pin": "0492" },
  { "name": "Srinivas Padaga",  "pin": "0556" },
  { "name": "Suresh Padaga",    "pin": "2669" },
  { "name": "HR",               "pin": "8220" },
  { "name": "Narendra",         "pin": "1484" },
  { "name": "Manikyam",         "pin": "7158" },
  { "name": "Diwakar",          "pin": "8610" }
]
```

- Players **with** a `pin` = **admins**. Only the super admin (Suresh Padaga) has full write
  access though — regular admins can log matches (any date) and manage Party Dues, nothing else
  (see Admin auth below).
- Players **without** a `pin` = read-only.
- PIN = last 4 digits of mobile number.
- Old string-array format auto-migrates to objects on first read.
- Optional `role` field: `'admin'` promotes a player to show the **Admin** badge on `Players.jsx` and
  their `PlayerProfile`; anything else (including absent) shows **Contributor**. This is a *display*
  badge only — it does **not** grant write access or change login behavior, both of which stay governed
  by `pin` (can log in / log today's matches) and by being the fixed super admin (full write access, see
  `SUPER_ADMIN_NAME` below). Only the super admin can change another player's `role`, via a "Make Admin" /
  "Demote" toggle next to each row in `Players.jsx` (calls `PUT /api/players/:name` with `{ role: 'admin' }`
  or `{ role: '' }`). Suresh Padaga's own row always shows Admin and has no toggle — his badge is derived
  from his name, not this field.
- Optional `photo` field: a small downscaled JPEG data URL (`data:image/jpeg;base64,...`), set via
  `Players.jsx`'s avatar picker (super-admin only). Stored inline in the player's Postgres JSON value —
  no separate blob/file, unlike match photos — since avatars are capped to 300px/~150KB so the whole
  player JSON value stays small. `PUT /api/players/:name` accepts `photo` the same way it accepts `pin`:
  omit to keep the existing photo, pass a data URL to set it, pass `""` to clear it back to the
  initials-circle fallback. `POST /api/players` also accepts an initial `photo`.
- **Renaming a player cascades into match history**: `PUT /api/players/:name` with a new `name` doesn't
  just rename the player entry — the API also rewrites every match's `team1`/`team2` array, replacing
  the old name with the new one. Without this, `computeStats`/`computePairStats` (which key purely off the
  name strings stored on each match, not player IDs) would keep the old name alive as an orphaned "ghost"
  player with its own separate stats, split off from the renamed player's history. `Nayeem Abdhullah` →
  `Abdhulla` and `Pradeep Raghav` → `HR` were renamed this way (matching the short names those two already
  went by in `Court Slots`). `DEFAULT_PLAYERS` in `api/handler.js` is used only
  when an empty database is initialized; the live Neon database contains the
  imported production player list.

## Admin auth (PIN-first login)

- Site is **read-only by default** for all visitors.
- Click **Admin Login** → type your 4-digit PIN → system finds matching admin →
  shows name with ✅ → logs in automatically after 700 ms.
- Session persisted in `localStorage.adminName` — survives page reload until
  **Logout** is clicked (which clears localStorage).
- **Write access is mostly super-admin-only** (Suresh Padaga = `isSuperAdmin` in `App.jsx`), with two
  carve-outs for any regular admin (`isAdmin`, i.e. anyone with a valid PIN): logging a **new** match for
  **any past date, not just today** (`MatchForm`'s date field has no admin-tier restriction — any admin
  can log/back-date a match, capped only at `max=today`, no future dates), and adding/editing/deleting
  **Party Dues** entries (Report page's Party Dues tab, gated on `isAdmin`, not `isSuperAdmin`). Editing/
  deleting matches, add/delete/edit players, add/edit/delete slots/videos/photos, import/export snapshots,
  and restoring versions remain super-admin-only — `isAdmin` alone doesn't unlock those UIs (see
  components below, each gated on `isSuperAdmin`).
- **Super-admin identity is keyed on name, not PIN**: `isSuperAdmin = adminName === SUPER_ADMIN_NAME`
  (`'Suresh Padaga'`). PINs are meant to be changeable by their owner (last 4 digits of mobile, and mobile
  numbers change) — an earlier version of this check also required `pin === '2669'`, which meant Suresh
  updating his own PIN silently stripped his super-admin rights on next login. Keying on name alone fixes
  that; the only remaining edge case is if Suresh Padaga's own player entry is ever renamed, which would
  need `SUPER_ADMIN_NAME` updated to match (same caveat the old PIN-based check had, just moved).

`src/lib/admins.js` helpers:
- `SUPER_ADMIN_NAME` — the one player name with full write access (`'Suresh Padaga'`). Imported by
  `App.jsx` (for `isSuperAdmin`) and by `Players.jsx`/`PlayerProfile.jsx` (to always show his badge as
  Admin, un-editable, regardless of the `role` field).
- `getAdmins(players)` — players with a pin
- `findAdminByPin(players, pin)` — lookup by PIN (used by login)
- `verifyPin(players, name, pin)` — verify name+pin
- `playerNames(players)` — extract name strings for forms/ranking

## Dark / Light theme

- Toggle button (Moon/Sun) in Header nav.
- Applies the `dark` CSS class to `<html>` element (Tailwind v4 `@custom-variant dark`).
- Choice saved in `localStorage.theme` (`'dark'` | `'light'`).
- Applied before first React render (top of `App.jsx`) to prevent flash.

## Version history

Snapshot-enabled mutations save history (last **3** kept, **one per calendar day**):
- **Local and production**: Neon table `app_snapshots`, keyed by
  `snapshot_date`. Local uses the production API, so there is only one history.

The snapshot captures the **pre-mutation state** on the **first write of each day** only.
Subsequent writes that day skip snapshotting (start-of-day state is preserved for recovery).

How to check versions:
```js
// In browser console:
fetch('/api/versions').then(r => r.json()).then(console.log)
```
To restore: `POST /api/restore/:date` (date is `YYYY-MM-DD`)
The `VersionsModal` is wired into Header (desktop: History button; mobile: hamburger menu). Labels: Today / Yesterday / Day Before Yesterday.

The API snapshots the pre-mutation state before destructive writes, so deleting
a match preserves the start-of-day state. Restoring writes the snapshot back to
the normalized resource rows without creating a snapshot of the restore itself.

## Neon Postgres storage

`api/db.js` owns persistence and creates the schema idempotently on first use.
The reviewable DDL is also in `db/schema.sql`. Storage is **normalized real
tables**, not a jsonb blob per resource (an earlier `app_resources(resource,
item_key, position, value jsonb)` generic-table design was replaced — see
"Schema history" below):

- `players(id bigserial PK, name, pin, photo, role, deleted_at)`. `name` has a
  **partial** unique index (`WHERE deleted_at IS NULL`) so a soft-deleted name
  can be reused. Deleting a player (`DELETE /api/players/:name`) sets
  `deleted_at` rather than removing the row — matches always join to a
  player's real `id`, so a deleted player's name still resolves correctly in
  historical matches, exactly like the old behavior, but via a real foreign
  key instead of a name string baked into every match.
- `matches(id uuid PK, team1_player1_id, team1_player2_id, team2_player1_id,
  team2_player2_id → players.id, score1, score2, match_date, comment,
  logged_at, seq)`. Four fixed FK columns (not a join table) match the actual
  invariant `MatchForm.jsx` enforces: always exactly 2 vs 2, all 4 unique.
  Because matches reference players by `id`, **renaming a player is a single
  `UPDATE players SET name = ...` — there is no cascade into match history
  anymore** (the old `app_resources` design stored player names as plain
  strings on each match, so a rename required rewriting every match's
  `team1`/`team2` array to avoid an orphaned "ghost player"; see
  `PUT /api/players/:name` below).
- `videos(id bigserial PK, url)`, `photos(id uuid PK, data_url, seq)`,
  `slots(id uuid PK, name, time, end_date, seq)`, `dues(id uuid PK, name,
  count, comment, seq)` — party-due entries (`count` is a plain occurrence
  count, not a currency amount), read by everyone, written super-admin-only
  via the Report page's Party Dues tab.
- `id`/`seq` columns are `bigserial`, giving stable insertion order for free —
  no `position` bookkeeping to maintain on every write.
- `app_snapshots(snapshot_date, state jsonb, created_at)` is unchanged: still
  stores up to three daily pre-mutation full-state snapshots as a jsonb blob,
  which is the right shape for "the whole app at time T", restored wholesale.
- **Targeted writes**: `api/db.js` exposes one function per mutation
  (`addPlayer`, `updatePlayerByName`, `deletePlayerByName`, `addMatch`,
  `updateMatch`, `deleteMatch`, `addVideo`, `deleteVideoAt`, `addPhoto`,
  `deletePhotoById`, `addSlot`, `updateSlotById`, `deleteSlotById`, `addDue`,
  `updateDueById`, `deleteDueById`) — each touches only the relevant row(s),
  unlike the old design where every single edit deleted and re-inserted all
  rows of all resources.
- `writeState(state)` still exists as a **bulk full-replace** (advisory lock
  `684276491`, `TRUNCATE` + re-insert all 6 tables in one transaction) — used
  only by genuinely whole-state operations: `POST /api/import`,
  `POST /api/restore/:ts`, and `scripts/migrate-json.js`/
  `scripts/backfill-normalized.js`. `readState()` reads all 6 tables (joining
  `matches` to `players` 4× to resolve names) and reconstructs the same JSON
  shape the frontend has always received.
- On a truly empty database, the API seeds `DEFAULT_PLAYERS`, empty matches,
  videos/photos/dues, and `DEFAULT_SLOTS` through the targeted insert functions.

### Schema history

The original Neon migration (`c1b3f0c`) used a single generic
`app_resources(resource, item_key, position, value jsonb)` table for all five
resources, functionally mirroring the old flat-JSON-file model. It was later
replaced with the normalized tables above to fix three issues: every write
rewriting all rows of all resources, no referential integrity (player renames
needed a manual cascade into every match), and no indexed/SQL-level
filtering. `scripts/backfill-normalized.js` is the one-time script that
migrates existing `app_resources` data into the new tables — it should be run
against a Neon database branch first to verify, then against production, and
the old `app_resources` table should be left in place afterward as a rollback
safety net rather than dropped immediately.

Current migrated live dataset (from `badminton-resultslatest.json`, verified
after import): **19 players, 132 matches, 4 videos, 8 photo records, 12 slots**.
The local proxy and live API were both verified against these counts.

### Environment variables

- `DATABASE_URL` — preferred Neon pooled connection string.
- Accepted fallbacks: `POSTGRES_URL`, `DATABASE_URL_UNPOOLED`, and
  `POSTGRES_URL_NON_POOLING`.
- `BLOB_READ_WRITE_TOKEN` — required for new photo upload/delete operations;
  injected by connecting a separate Vercel Blob store to this new project.
- `LOCAL_API_TARGET` — optional Vite proxy override; defaults to the new live URL.

If no database URL exists, the module still loads and the API returns HTTP 503
JSON with code `DATABASE_NOT_CONFIGURED`; it must not throw during module import
or Vercel will report `FUNCTION_INVOCATION_FAILED`.

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/state` | Full app state |
| POST | `/api/players` | Add player `{ name, pin? }` |
| PUT | `/api/players/:name` | Update player name/pin/photo/role |
| DELETE | `/api/players/:name` | Remove player |
| POST | `/api/matches` | Add match |
| PUT | `/api/matches/:id` | Update match score/comment |
| DELETE | `/api/matches/:id` | Delete match |
| POST | `/api/videos` | Add YouTube URL (max 20) |
| DELETE | `/api/videos/:index` | Remove video |
| POST | `/api/photos` | Upload photo as base64 dataUrl (max 50) |
| DELETE | `/api/photos/:id` | Delete photo |
| POST | `/api/slots` | Add court slot |
| PUT | `/api/slots/:id` | Update slot |
| DELETE | `/api/slots/:id` | Delete slot |
| POST | `/api/dues` | Add party-due entry `{ name, count, comment? }` |
| PUT | `/api/dues/:id` | Update a due entry |
| DELETE | `/api/dues/:id` | Delete a due entry |
| GET | `/api/export` | Download full JSON snapshot |
| POST | `/api/import` | Restore full snapshot |
| GET | `/api/versions` | List last 3 daily snapshots |
| POST | `/api/restore/:ts` | Restore a snapshot |

## Vercel and migration setup

1. Import only `spadaga/gnrsmashstats`, branch `migration/neon-postgres`, into a
   new Vercel project.
2. Connect a new Neon resource to Production and Preview. The integration
   injects `DATABASE_URL` and related Postgres variables; redeploy after connecting.
3. Connect a separate Vercel Blob store to this new project for photo binaries.
4. The first `/api/state` request creates the Postgres schema and seeds defaults
   only if there are no resource rows.
5. Import a full snapshot through `POST /api/import` or, with a database URL,
   `npm run db:migrate -- <full-export.json>`.

The full importer accepts both inline `data:image/...` photos (uploads them to
the connected Blob store) and existing public `https://...` Blob URLs (preserves
the URL and writes only metadata to Neon). It deliberately does not delete old
Blob objects during a full import, preventing damage to the original store.

## Ranking

`src/lib/ranking.js`:
- `isGuestName(name)` — `true` for a one-off player name like `Guest1`/`Guest 2` (regex
  `/^guest\s*\d*$/i`). There's no DB flag for this, just the naming convention. `computeStats` skips
  guest names when seeding from `players` and when discovering names from matches (a real player's W/L
  against a guest still counts for the real player); `computePairStats` skips a pair entirely if either
  member is a guest. This is how a pair like "Guest1 & Sepuri" gets excluded from every
  ranking/leaderboard display while still showing normally in match lists/history (`MatchList`,
  `MatchesModal`, etc. show every match regardless of guest involvement — only rankings filter them out).
- `computeStats(matches, players, minMatches = 4)` — wins/losses/pointDiff/winRate/played, plus
  `qualified: boolean`. Players with `played >= minMatches` are "qualified" and sorted Win% → Wins →
  fewer Losses; players below that (but > 0 played) are sorted the same way but always listed below
  qualified players; 0 played = unranked, listed last. `minMatches` defaults to 4 for `Report.jsx`'s
  Individual Rankings and `PlayerProfile`'s overall win-rate line; `Leaderboard`/`TopSeeds` pass `3` for
  every period except Today — see their sections below.
- `computeRanks(rows)` — standard competition ranking (1-2-2-4): rows tied on `winRate` share a rank, the
  next distinct rank skips the tied count. Works unmodified against `computeStats` or `computeTopPairs`
  output. Shared by `Leaderboard` (singles + doubles) and `PlayerProfile`'s per-period "Your Ranking" card.
- `applyPeriod(matches, period, from, to)` — like `filterByPeriod` but also supports an explicit
  `'custom'` from/to date range. Backs the period-tab UI (`PeriodTabs`, exported from `Report.jsx`) shared
  by `Report.jsx`'s Individual/Pair Rankings tabs and `PlayerProfile`'s "Your Ranking" card.
- `filterByPeriod(matches, period)` — keys: `'all'` / `'today'` / `'year'` / `'month'` / `'week'`
- `filterByWeek(matches, which)` — keys: `'current'` / `'last'`. Week starts Sunday. No longer used by any
  component (`TopSeeds` moved to the shared `filterByPeriod` tab set below) — kept as a ranking.js export
  in case a This-Week/Last-Week comparison view is added back later.
- `isAbandoned(m)` — `true` when neither side's score reached 21 (`Math.max(m.score1, m.score2) < 21`),
  i.e. the match was cut short (rain, injury, court time running out, etc) rather than played to a normal
  finish. Ties are already disallowed at entry so the winning score is just the max of the two.
- `computeAbandonedMatches(matches)` — every abandoned match, newest-first. Backs the Report page's
  Abandoned Matches tab; `isAbandoned` alone is used inline by `MatchList`, `PlayerProfile`, and
  `MatchesModal` to highlight/badge individual rows wherever matches are listed.
- `computeDuoStats(matches, a, b)` — **teammate** head-to-head: `togetherWins`/`togetherLosses` (a & b on
  the same team) plus `aWithoutBWins`/`aWithoutBLosses` (a's record when partnered with anyone but b).
  Also returns `.matches` — `{ togetherWins, togetherLosses, aWithoutBWins, aWithoutBLosses }`, each the
  actual array of matches behind that count, so the UI can show "what made up this number" on click.
  Used by the Report page's Duo Head-to-Head tab.
- `computeHeadToHead(matches, a, b)` — **individual, any-partner** head-to-head: how `a` and `b` fare when
  directly *opposing* each other on a match, regardless of who else is on either side. Returns
  `{ aWins, bWins, played, matches: { aWins, bWins } }` (again with the backing match arrays). This is
  distinct from `computeDuoStats`' `aWithoutBWins`, which is `a`'s overall record without `b` as a
  teammate — `b` might not even be in that match. Used by the Report page's Duo Head-to-Head tab
  alongside `computeDuoStats` (teammate stats and any-partner opponent stats are shown together, not
  as alternatives).
- `computeTopPairs(matches, minMatches = 4)` — pair ranking for `TopSeeds` **and** `Leaderboard`'s Doubles
  tab: win rate → wins → fewer losses, with the same configurable qualify rule as `computeStats` (pairs
  below `minMatches` games are listed after qualified ones). Both `TopSeeds` and `Leaderboard` pass `1`
  only for the Today period, and the default 4 for every other period (Week/Month/Year/Overall) — see
  their sections below. Each entry carries a `qualified: boolean` just like `computeStats`, so the same
  1-2-2-4 tie-aware rank computation works unmodified against either. `computePairStats` sorts by raw win
  count instead and has no qualify gate — kept as-is for `Report.jsx`'s wins-based Pair Rankings/Player
  Combos tabs.
- `matchesForPlayer(matches, name)` / `matchesForPair(matches, [a, b])` — filter a match list down to the
  ones a given player (either team) or pair (both on the same team, either side) actually appears in. Used
  throughout `Report.jsx` to drill down from a ranking row/stat tile to the matches behind that number.

## Player avatars

- `src/components/Avatar.jsx` — `<Avatar name photo size className />`. Renders the player's `photo` if
  set, else a colored circle with initials (color deterministically hashed from the name, so a given
  player always gets the same fallback color across sessions/components). Sizes: `xs`/`sm`/`md`/`lg`/`xl`.
- **`Avatar` circles appear in `Players.jsx`, the Log Match dropdowns, `Leaderboard`, and
  `PlayerProfile`'s header.** `Leaderboard` shows one avatar per singles row and two overlapping avatars
  per doubles row (`photoByName` prop, threaded from `App.jsx` → `Dashboard.jsx` → `Leaderboard`), on both
  desktop and mobile. `TopSeeds`, `MatchList`, and `Report.jsx` (all tabs, including match drill-down rows)
  still show plain name text only — no avatar, unchanged from before.
- `src/lib/admins.js`'s `photoMap(players)` builds a `{ [name]: photo }` lookup, computed once in `App.jsx`
  and passed only to `LogMatch` → `MatchForm` → `PlayerPicker` (`Players.jsx` gets full player objects
  directly, so it doesn't need this lookup — it reads `p.photo` straight off each player).
- `src/components/PlayerPicker.jsx` — an avatar-aware replacement for a native `<select>` of player names
  (plain `<option>`s can't render an inline `<img>`). A button showing the selected player's `Avatar` +
  name opens a custom listbox of the same for each option; closes on selection or on an outside click.
  Used for `MatchForm`'s 4 team-slot pickers only — `MatchList`'s H2H filter/edit-score dropdowns and
  `Report.jsx`'s player selects are still plain `<select>`s.
- `Players.jsx`'s `PlayerAvatarPicker` doubles the avatar as the upload target (super-admin only, consistent
  with the write-access lockdown above): hovering a player's avatar reveals a camera icon overlay (click to
  pick a file) and, if a photo is set, a small red × to clear it back to the initials circle. Guests/regular
  admins just see the plain `Avatar` (read-only). `prepareAvatar(file)` downscales to
  `MAX_AVATAR_DIMENSION = 300`px and recompresses JPEG down through quality steps until under
  `MAX_AVATAR_BYTES = 150KB` — same technique as `PhotoGallery`'s `prepareUpload`, just tuned much smaller
  since it only ever renders as a small circle.

## Structure

### `src/App.jsx`
Router (dashboard / log / players / slots / report / **profile**). Reads `localStorage.adminName` on
mount to restore session. Reads `localStorage.theme` and applies `dark` class to
`<html>` before render. `toggleDark()` flips class + saves preference.
All 16 actions go through `withFeedback()` → full-screen transparent overlay +
toast on settle.
- **`viewProfile(name)`**: scrolls the window to the top (`window.scrollTo({top:0,behavior:'instant'})` —
  otherwise the profile page could render mid-scroll-position from whatever page it was opened from),
  remembers the current page as `profileFrom`, sets `profilePlayer`, and navigates to `page: 'profile'`.
  Passed down as `onViewProfile` to `Dashboard` (→ `Leaderboard`) and to `Players`, so clicking a singles
  Leaderboard row's name/avatar or a Players-page name opens the same `PlayerProfile`. `PlayerProfile`'s
  `onBack` returns to `profileFrom` rather than always `dashboard`.
- `photoByName` (from `photoMap(data.players)`) is also passed to `Dashboard` → `Leaderboard`, not
  just to `LogMatch`.
- **Live polling for cross-device sync**: a `setInterval` (10s) re-calls `api.getState()` and swaps it
  into `data`, so a match logged on one device shows up on other open devices without a manual reload.
  Skips the tick while `busy` (an in-flight mutation) to avoid clobbering an optimistic update, and
  swallows poll failures silently (routed through `.catch(() => {})`, not `setLoadError`, which stays
  reserved for the initial load) so a transient network blip doesn't blank the app. No WebSocket
  infrastructure — plain polling is enough at this app's scale.

### `src/components/Header.jsx`
Logo + wordmark + nav pills: Dashboard / Log Match (admin only) / Players / Court Slots / Report.
Moon/Sun theme toggle. Admin Login button (guests) / name badge + Logout (admins).

### `src/components/LoginModal.jsx`
PIN-first: type 4 digits → `findAdminByPin()` → name + ✅ → auto-login 700 ms.

### `src/components/ConfirmDialog.jsx`
Modal confirmation (Trash / AlertTriangle icon). Replaces all `window.confirm`.

### `src/components/VersionsModal.jsx`
Admin-only modal. Lists the last 3 daily snapshots with date, match/player count,
Latest badge, Restore button. Restore triggers ConfirmDialog then `POST /api/restore/:ts`.

### `src/components/SlotsTicker.jsx`
Horizontal auto-scrolling ticker strip on the Dashboard showing court slot names
and days remaining. Items duplicate for seamless loop (`animate-ticker` CSS keyframes).
Red badge if < 10 days. Pauses on hover. Hidden if no slots.
Compact sizing: `py-1` strip height, `text-xs` slot name, `text-[10px]` days badge.

### `src/components/Footer.jsx`
Sticky footer: `© {year} GNR SmashStats. All rights reserved. | 🏸 GNR Team · {today}`.

### `src/pages/Dashboard.jsx`
SlotsTicker → FilterBar → StatCards → TopSeeds → [Leaderboard | MatchList] → [VideoSection | PhotoGallery].
`Leaderboard` gets raw `data.matches`/`data.players` (not pre-filtered) — it owns its own period tabs,
independent of the FilterBar period which only drives StatCards context (`TopSeeds` also owns its own
period tabs independently, same as `Leaderboard`). Forwards `photoByName` and `onViewProfile` through to
`Leaderboard`.

### `src/pages/LogMatch.jsx`
Wraps `MatchForm.jsx`, navigates back to Dashboard on save.

### `src/pages/Report.jsx`
Analytics page (nav: Report), mostly read-only. 6 tabs; the first 4 each have a bar chart (plain
div-width bars, no chart lib) + text list. Exports `PeriodTabs` (takes an optional `periods` prop,
defaulting to this file's own Day/Week/Month/Year/Custom Range set) as a named export alongside the
default `Report` component, so `PlayerProfile.jsx` can reuse the same period-tab UI with its own period
list — `applyPeriod` itself lives in `ranking.js`, not here, so this file's exports stay component-only
(mixing a plain utility function in here trips the react-refresh `only-export-components` lint rule).
- **Duo Head-to-Head**: pick players A & B → two stacked sub-sections:
  - **As Teammates** (`computeDuoStats`): wins together, losses with B, and A's wins *without* B as partner.
  - **Head-to-Head — any partner** (`computeHeadToHead`): A's wins vs B and B's wins vs A when they were
    directly opposing each other, regardless of who else was on either team — plus a "leads X–Y" / "tied"
    summary line. Hidden (replaced by a "haven't faced each other" message) if they've never been direct
    opponents.
  - Every stat tile in both sub-sections is clickable (`StatTile`'s `onClick`/`active` props) — clicking
    toggles a `MatchResultsPanel` below showing the actual matches behind that number (date, teams, score),
    via `MatchRow`. Click the same tile again to collapse.
- **Player Combos**: pick one player → every partner combination they've played, played/wins/losses
  per combo (`computePairStats` filtered to pairs containing that player). "Total matches"/"Overall
  record" tiles and each partner row are clickable — drills down to that player's full match list or
  just the matches with that specific partner (`matchesForPlayer`/`matchesForPair`).
- **Individual Rankings**: `computeStats` ranked by wins, period-filterable (Day/Week/Month/Year/Custom
  Range). Each row is clickable — drills down to that player's matches within the current period filter.
- **Pair Rankings**: `computePairStats` ranked by wins, same period filter options. Each row is clickable —
  drills down to that pair's matches within the current period filter.
- **Abandoned Matches**: every match where `isAbandoned(m)` is true (winning score under 21 — cut short
  for rain/injury/court time/etc, see Ranking above), newest-first, each row showing date, both teams,
  score, and the match's `comment` if one was logged (comment text uses `text-slate-600 dark:text-slate-300`
  for contrast in both themes — see Known limits). No period filter or drill-down, just the flat list.
- The first four tabs' drill-downs render via the shared `StatTile` (clickable variant)/`MatchResultsPanel`/
  `MatchRow` helpers built for Duo Head-to-Head — same toggle-to-collapse behavior throughout. `MatchRow`
  also now renders a match's `comment` (previously omitted), needed for the Abandoned Matches tab context
  even though this Report page's other tabs rarely have commented matches.
- **Party Dues** (`PartyDueSection`): read-only list of `{name, count, comment}` rows for everyone.
  **Any admin** (`canModify` prop, fed `isAdmin` from `App.jsx` — not `isSuperAdmin`, unlike every other
  write-gated feature in this app): an add form (player `<select>` + count number input + comment text) at
  top, plus per-row Edit (inline count/comment inputs, mirroring `MatchList.jsx`'s `EditScoreForm`
  Save/Cancel pattern) and Delete (`ConfirmDialog`, mirroring `Slots.jsx`). Calls
  `actions.addDue`/`updateDue`/`deleteDue` (passed into `Report` as an `actions` prop alongside `isAdmin`
  — `Report`'s signature is `Report({ data, actions, isAdmin })`, where `data` now also carries `dues`).
  No period filter or drill-down, just the flat list.

### `src/pages/Players.jsx`
Add/remove/edit players — **super admin only** (`isAdmin` prop here is fed `isSuperAdmin` from `App.jsx`,
not plain `isAdmin`). Regular admins and guests get the read-only list. Each row shows an `Avatar` via
`PlayerAvatarPicker` — super-admin only for the hover upload/clear overlay, see Player avatars above;
everyone else just sees the plain avatar/initials circle.
- **Role badge**: `SUPER_ADMIN_NAME` (Suresh Padaga) always shows **Admin**; every other player shows
  **Admin** only if `p.role === 'admin'`, otherwise **Contributor** — regardless of whether they have a
  `pin` (having a pin only controls login/regular-admin-for-today capability, not this badge).
- **Role toggle** ("Make Admin" / "Demote" text button next to the badge): visible to the super admin
  only, on every row except Suresh's own (his is fixed, not editable). Calls
  `actions.updatePlayer(playerName, { role: 'admin' | '' })` — the super admin has full, sole control over
  who else displays as Admin.
- Clicking a player's **name** (not the avatar, which stays the super-admin upload target) calls
  `onViewProfile(playerName)`, navigating to `PlayerProfile`.

### `src/pages/Slots.jsx`
Court slots table. **Super admin only**: inline editable cells + add/delete. Everyone else: read-only.
Rows within 10 days of `endDate` highlight red. Sorted by `endDate` ascending.
**Time column hidden on mobile** (`hidden sm:table-cell`) to save width; visible from `sm` breakpoint up.

### `src/components/MatchForm.jsx`
**`PlayerPicker` dropdowns** (avatar + name, not free text or a plain `<select>`) for all 4 players
sourced from the players list — see Player avatars above. Each dropdown filters out already-selected
players so all 4 are always unique. Scores: 0–30, no ties. Comment optional.
**Date field has no admin-tier restriction** — any admin (not just the super admin) can pick any past
date up to `max=today` (no future dates allowed). This was previously super-admin-only; opened up to all
admins by request.
**Duplicate-matchup confirmation**: takes a `matches` prop (threaded `App.jsx` → `LogMatch.jsx` →
`MatchForm.jsx`); before submitting, checks whether the exact same team1-vs-team2 pairing (as an
unordered pair-of-pairs, so which side is which doesn't matter) already has a match logged for the same
date being submitted. If so, shows a `ConfirmDialog` ("Log it anyway?") instead of submitting immediately
— catches accidentally re-logging the same game, without blocking a genuinely repeated matchup later in
the day.

### `src/components/StatCards.jsx`
Single orange card showing **Total Matches** and **Total Players** side by side (divider between).
Responds to period filter. Both numbers are clickable:
- **Total Matches** opens `MatchesModal` listing every match in the current filtered period.
- **Total Players** opens a small local `PlayersModal` listing every player (avatar + name).

### `src/components/TopSeeds.jsx`
Top pair(s) by win rate (`computeTopPairs`), scoped via **Today / This Week / This Month / This Year /
Overall** pills (`filterByPeriod`) — independent of the Dashboard's FilterBar period, always receives full
`data.matches`. Defaults to **Overall**. Seed #1 = orange card.
**Seed #2 card is hidden on mobile** (`hidden sm:block`) — only Top Seed #1 shows below the `sm` breakpoint.
- **Same qualify rule as `Leaderboard`**: `minMatches = period === 'today' ? 1 : 3` passed to
  `computeTopPairs`, and only `qualified` pairs are shown as a Top Seed — Today ranks any pair that's
  played at all (a pair can't realistically hit 3 games in one day), every other period needs a 3-game
  minimum. If no pair qualifies for the selected period, shows a "No qualified pairs…" message instead of
  an empty grid.
- Each Top Seed card is clickable — opens `MatchesModal` with that pair's matches within the selected
  period (`matchesForPair`).
"View All →" modal lists all pair combos **across all-time matches** (not scoped to the selected period,
and not gated by the qualify rule) — button visibility is likewise based on the all-time pair count.
Dark mode supported.

### `src/components/Leaderboard.jsx`
**Two top-level tabs: Singles / Doubles**, each with its own **Today / Weekly / Monthly / Yearly /
Overall** period pills (`filterByPeriod`), **defaulting to Today**. Receives raw `matches`/`players` plus
`photoByName` and `onViewProfile` from `Dashboard`, and computes stats internally, independent of the
Dashboard's FilterBar period.
- **Qualify rule matches `TopSeeds`**: `minMatches = period === 'today' ? 1 : 3` passed to
  `computeStats`/`computeTopPairs` — Today ranks everyone/every pair that's played at least once (nothing
  realistically reaches 3 games in a single day), every other period requires a 3-game minimum before a
  rank is awarded. Unqualified/no-rank rows show **NA** for rank rather than a bare dash. `computeRanks`
  is imported from `ranking.js` (moved there so `PlayerProfile.jsx` can share it too), not defined locally.
- **Row layout, identical in every mode/tab and at every breakpoint**: avatar/circle **always** comes
  first (leftmost), then the name; below the name reads `{wins}W - {losses}L · {played} played ·
  {winRate}%` — win % lives here now, not on the right. The **right side holds only the rank**: a small
  circular badge (number, or `NA` if unqualified/unranked), orange-filled for rank 1.
- **Singles**: `computeStats` — one row per player, with an `Avatar` (from `photoByName`). Clicking the
  avatar or name calls `onViewProfile(name)`, opening `PlayerProfile`.
- **Doubles**: `computeTopPairs` — one row per pair, with two overlapping avatars (no click-through to a
  profile — a pair isn't a single player).
- Clicking the win-rate/rank side of any row (singles or doubles) opens `MatchesModal` with that
  player's/pair's matches in the current filtered period (`matchesForPlayer`/`matchesForPair`) — this is
  separate from the avatar/name click, which only exists for Singles.
- **Standard competition ranking (1-2-2-4)** for both: rows tied on win rate share the same rank, and the
  next distinct rank skips the tied count (shared `computeRanks()` helper — works unmodified against
  either mode since both `computeStats` and `computeTopPairs` rows carry `qualified`/`winRate`/`wins`/
  `losses`). Shows W-L and **played count** under the name; subtitle under rank reads `NA` for
  partial/unranked rows the same way as everywhere else.

### `src/components/MatchList.jsx`
- **Search box sits above the "Recent Matches" heading.** Input text is bold (`font-bold text-sm
  text-slate-900 dark:text-white`) so a typed query stands out more than the surrounding UI.
- **Abandoned matches** (`isAbandoned(m)` — winning score under 21, see Ranking above) get a highlighted
  row: thicker amber border + amber tint background, plus an "Abandoned — did not reach 21" badge under
  the score line, in every mode (Today/Head-to-Head/All Matches) — not just Today, so the highlight is
  consistent wherever the match happens to be visible. A logged `comment` renders in
  `text-slate-600 dark:text-slate-300 italic font-medium` (was `text-slate-400`, too low-contrast in dark
  mode) so it stays legible in both themes.
- Single 3-way mode pill row (no separate tabs row): **Today** (default) / **Head-to-Head** / **All
  Matches**. Switching away from Head-to-Head clears the picked players.
  - **All Matches**: reveals an optional from/to date-range pair inline (with a Clear button); leaving
    both blank shows every match.
  - **Head-to-Head**: reveals 4 player dropdowns (Player 1 & 2 vs Player 3 & 4, all unique). When all 4
    are chosen the list narrows to matches between that exact pair matchup (team sides ignored) and a
    summary banner shows the record, e.g. "A & B lead C & D 3–1" (or tied / no matches yet).
- Matches **grouped by date** with date headers. Today's header shows **"Today (Aug 10)"** in orange.
  The per-date match-count label is dark/bold (`text-slate-600 dark:text-slate-300`), not faint gray.
- Edit (✏️, **super admin only**): inline form (`EditScoreForm`) with 4 player dropdowns (reassign either
  team, all-4-unique validated) alongside the score inputs; validates scores 0–30, no ties. **Team pickers
  are grouped left/right** (`grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr]`, each side's Player-&-Player pair
  in its own `flex` group with a centered "vs" between them) so Team 1 and Team 2 stay visually distinct
  and stack cleanly on narrow phones instead of the 4 dropdowns free-wrapping into a confusing order.
- Delete (🗑️, **super admin only**): ConfirmDialog + local overlay during in-flight request.
- Edit/Delete are gated purely by `canModify = isSuperAdmin` — regular admins can no longer edit/delete
  even today's matches (only the super admin, Suresh Padaga, has this). `isAdmin` still controls
  the "Log Match →" button (any admin can log a new match for today) and the mode filters.
- Receives `players` prop (from `data.players`) for the edit-form dropdowns.
- **Head-to-Head filter**: 4 player dropdowns (Player 1 & 2 vs Player 3 & 4, all unique). When all 4 are
  chosen, the list narrows to matches between that exact pair matchup (team sides ignored) and a summary
  banner shows the record, e.g. "A & B lead C & D 3–1" (or tied / no matches yet). `Clear` resets it.
- Score box shows the point differential (`+{Math.abs(score1 - score2)}`) beneath the score, e.g. "21-17"
  with "+4" underneath — same for every match row across all three modes.
- **Two sequence numbers per match**: a **day-local** number (`items.length - idx` within that date's
  already-sorted-newest-first group — the first match of the day is `#1`, counting up across the day) and
  an **overall** number (`seqById`, a `useMemo` over the full unfiltered `matches` prop, oldest match = `#1`,
  identical across all 3 tabs for a given match since it's derived from the whole list, not the filtered
  one). **Today** mode shows only the day-local number ("Match #22"); **Head-to-Head**/**All Matches** show
  both ("Match #22 · Overall #126") since those views span multiple dates.

### `src/components/VideoSection.jsx` / `PhotoGallery.jsx`
Carousel (default) ↔ Manage (**super admin only** — `isAdmin` prop fed `isSuperAdmin` from `Dashboard.jsx`).
Video max 20, photos max 50.

### `src/components/Carousel.jsx`
Auto-advances every 4 s. Orange active dot.

### `src/components/FilterBar.jsx`
Period pills: **Today / This Week / This Month / This Year / Overall** (`all`, the default in
`Dashboard.jsx`'s `useState`, is now labeled "Overall" rather than "All Time").
Import + Export visible to the **super admin only** (`isAdmin` prop fed `isSuperAdmin` from `Dashboard.jsx`).

### `src/components/MatchesModal.jsx`
Shared "here's what's behind that number" modal — takes `{ title, matches, onClose }`. Groups matches by
date (newest date first, via `sortMatchesDesc`), one date header (with a match count) per group, and below
it each match as **team1 · score · team2** using equal-width `flex-1` columns on either side of a
fixed-size score badge — the same alignment pattern as `MatchList`/`Report`'s `MatchRow`. This keeps the
score badge at a consistent horizontal position across every row regardless of how long either team's
names are (an earlier single-line-text version let the score drift row to row since it sized to content
instead of splitting the row into equal columns — "zig-zag," not a professional scoreboard look). Same
abandoned-match amber highlight/badge and comment display as `MatchList`. Used by `StatCards` (Total
Matches), `TopSeeds` (each Top Seed card), `Leaderboard` (each row's win-rate/rank side), and
`PlayerProfile` (every stat tile and Activity Breakdown card) so every "click a number, see its matches"
drill-down outside the Report page looks and behaves the same. Report's own drill-downs keep using their
existing inline `StatTile`/`MatchResultsPanel` pattern rather than this modal, since those need to stay
inline under the tile instead of overlaying the page.

### `src/pages/PlayerProfile.jsx`
A per-player dashboard, reached by clicking a name/avatar in `Leaderboard` (Singles) or `Players.jsx`.
Takes `{ playerName, players, matches, slots, dues, onBack }` — no fetching of its own, just derives
everything from the same `data` App.jsx already has in memory.
- **Header card**: large `Avatar`, name, role badge (Admin for `SUPER_ADMIN_NAME` or any player with
  `role === 'admin'`, else Contributor — same logic as `Players.jsx`), and a **"renewal date"**: looked up
  by matching the player's name (case-insensitive) against `slots`' `name` field and showing that slot's
  `endDate`, or "No active court slot" if nothing matches. This is a best-effort join — Court Slots and
  Players are otherwise independent lists (a slot's `name` is free text, not a player reference), so a
  slot only shows here if its name happens to match the player's name exactly (case-insensitively). Also
  shows their overall win rate if they're `qualified` (≥4 games) per `computeStats`, and, if a matching
  entry exists in `dues` (matched by exact name), a **Party dues: {count}** line with the comment if set —
  read-only here; editing lives only in Report's Party Dues tab (super-admin only).
- **Stat tiles**: Total Played / Total Wins / Total Losses / Win Rate, computed directly off every match
  the player appears in (not gated by the 4-game qualify rule — these are raw totals, not a rank). Each
  is clickable, opening `MatchesModal` with the matching subset (all / wins-only / losses-only / all again
  for Win Rate).
- **Activity Breakdown**: Today / This Week / This Month / This Year cards, each with played/W/L **and
  win%** for that period alone (`filterByPeriod` + a local `recordFor()` tally, which now also returns
  `winRate`). Each card is clickable too — opens `MatchesModal` with that player's matches in that
  specific period (`matchesForPlayer` + `filterByPeriod`).
- **Your Ranking** (card, between Activity Breakdown and Player Combos): this player's rank + win% for a
  selected period — Day / Week / Month / Overall / Date Range, via the shared `PeriodTabs` component
  imported from `Report.jsx` (passed its own `periods` list, since this page wants "Overall" where
  Report's own tabs use "Year") and `applyPeriod` from `ranking.js`. Computes
  `computeStats(periodMatches, players, minMatches)` for **everyone** (`minMatches = period==='today'?1:3`,
  same rule as `Leaderboard`/`TopSeeds`), runs it through the shared `computeRanks`, then picks out this
  player's own row — same rank badge / NA-if-unqualified convention as `Leaderboard`.
- **Player Combos** (`PlayerCombosCard`, between Your Ranking and Recent Matches): this player's partner
  combinations, reusing `Report.jsx`'s `CombosSection` logic/layout but fixed to this page's `playerName`
  (no player picker) — `computePairStats(matches)` filtered to pairs containing this player, the same
  "Combinations played / Total matches / Overall record" tile row, a `Bar` chart per partner (`Bar`
  exported from `Report.jsx`, same component used there), and a clickable list of partner records
  (played/W/L/win%) that drills into `MatchesModal` via `matchesForPair`.
- **Recent Matches**: up to the last 15 matches (newest-first), each tagged Won/Lost for this player, with
  the same abandoned-match highlight/badge and comment display used elsewhere. The header's abandoned-count
  badge is **clickable** (not just a static count) — opens `MatchesModal` with just this player's abandoned
  matches.

### `src/lib/api.js`
All mutations return updated resource array. `updateMatch(id, updates)` → `PUT /api/matches/:id`.
`addDue`/`updateDue`/`deleteDue` mirror the slot functions. `getVersions()` / `restoreVersion(ts)` for
version history.

### `src/index.css`
```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@layer base { *, ::before, ::after { border-color: var(--color-slate-200, #e2e8f0); } }
@keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
.animate-ticker { animation: ticker 30s linear infinite; }
.animate-ticker:hover { animation-play-state: paused; }
```
The `@layer base` rule restores a v3-style default border color for light theme. Tailwind v4 changed the
default `border` utility color from v3's `gray-200` to `currentColor`, and almost every card in this app
uses `border dark:border-slate-700` with no explicit light-mode color — so light theme fell back to
`currentColor`, producing harsh/inconsistent borders (this is what read as "unprofessional" borders in
light mode). Dark mode is unaffected: every component's explicit `dark:border-slate-700` (etc.) still
overrides this base rule as before; only the previously-undefined light-mode default changed.

## Favicon

`public/favicon.svg` — custom badminton racket SVG (orange racket head with string lines, slate handle, orange grip band).

## Known limits

- Admin auth is client-side only — PIN check happens in the browser.
  Do not store sensitive data.
- Vercel Blob photo URLs are public and accessible to anyone with the URL.
- Local and production data are intentionally the same: Vite proxies local
  `/api/*` calls to the new live deployment. Local mutations are production writes.
- Existing imported photos still reference the original public Blob URLs. New
  uploads require the new project's `BLOB_READ_WRITE_TOKEN`. Do not retire the
  original Blob store until all eight binaries are copied to the new store and
  their Neon metadata URLs are updated and visually verified.
- Scores: 0–30, no deuce logic.
- `isSuperAdmin` (Suresh Padaga) computed once in `App.jsx`: `adminName === SUPER_ADMIN_NAME`. Keyed on
  name, not PIN — see Admin auth above for why. As of the write-access lockdown, this is effectively the
  only role with write access:
  - `VersionsModal` / History button (passed to `Header` as `canViewHistory`) — desktop nav + mobile menu.
  - Edit/delete matches in `MatchList` (`canModify = isSuperAdmin`), add/edit/delete players (`Players.jsx`),
    add/edit/delete slots (`Slots.jsx`), manage videos/photos (`VideoSection`/`PhotoGallery`), Import/Export
    (`FilterBar`) — all gated on `isSuperAdmin`, not plain `isAdmin`.
  - Two exceptions: any regular admin can log a **new** match for **any past date** (`MatchForm`'s date
    field has no admin-tier restriction, capped only at `max=today`), and any regular admin can
    add/edit/delete **Party Dues** entries (Report page, `canModify = isAdmin`).
  - This is enforced client-side only (see the auth limitation above) — a regular admin could still hit
    the API routes directly to bypass these UI gates, same caveat as the rest of the auth model.
- Snapshots are taken **once per day** (pre-mutation), labeled Today / Yesterday / Day Before Yesterday.
- `matches[].loggedAt` ISO timestamp added on creation — `MatchList` sorts newest-first within each day,
  falling back to original array position (later = more recent) for legacy matches without `loggedAt`.
- `computePairStats(matches)` in ranking.js computes wins/losses per 2-player pair combination.
- `TopSeeds` shows top 2 pairs (not individuals), with "View All →" modal for all combinations.
- `PUT /api/players/:name` edits player name/pin/photo/role in Neon and cascades
  name changes into all stored matches.
- **"Abandoned" is a heuristic, not a stored flag**: any match where the winning score is under 21 is
  treated as abandoned (`isAbandoned` in ranking.js). There's no separate "was this actually cut short"
  field — a genuinely low-scoring-but-complete alternate scoring format would also get flagged, but the
  app doesn't support any scoring format other than race-to-21/cap-30 today.
- **`role` is display-only**: promoting a player to `role: 'admin'` only changes their badge on
  `Players.jsx`/`PlayerProfile` — it does not grant write access, unlock the super-admin-only UIs listed
  above, or change their login/PIN behavior. Only `SUPER_ADMIN_NAME` (Suresh Padaga) has real write access.
- **"Guest" players are a naming convention, not a data flag**: any player named `Guest`/`Guest1`/`Guest 2`
  etc. (`isGuestName` in `ranking.js`) is excluded from every ranking/leaderboard display (Leaderboard,
  TopSeeds, Report's Individual/Pair Rankings) but still appears normally in raw match lists/history
  (`MatchList`, `MatchesModal`) — only the ranking computation filters them out, nothing hides the matches
  themselves.
- **Qualify threshold is 3 games for `Leaderboard`/`TopSeeds`** (Today period still ranks anyone who's
  played at all), but stays **4 games** for `Report.jsx`'s Individual/Pair Rankings and `PlayerProfile`'s
  overall win-rate line (`computeStats`'s own default) — these two qualify rules are intentionally
  different call sites, not a single global constant.
- **Live sync is polling, not push**: `App.jsx` re-fetches `/api/state` every 10s so other open devices
  pick up new/edited matches without a manual reload. There's no WebSocket/SSE layer — at this app's scale
  a 10s poll is enough, and it avoids new infrastructure.

## Deploy

Push to `migration/neon-postgres` in `spadaga/gnrsmashstats`; the separate
`gnrsmashstats` Vercel project auto-deploys that branch. Never push these changes
to the original singular repository or connect this Vercel project to it.

Deployment prerequisites/checks:

1. Node `>=22.12.0` (project `.nvmrc` is `22.22.2`).
2. Neon integration variables available to the target environment.
3. Separate Blob store connected before testing photo creation/deletion.
4. `npm run lint` (four currently known pre-existing `no-unused-expressions`
   warnings) and `npm run build` pass.
5. `/api/state` returns HTTP 200 and the expected live counts.
6. Verify local `/api/state` through `npm run dev` matches the live API.

### Migration record

- Source snapshot: `S:\MYdocs&downloads\Downloads\badminton-resultslatest.json`.
- Import was first verified for 132 matches, then the full snapshot was imported.
- Final live and local verification: 19 players, 132 matches, 4 videos,
  8 photos, 12 slots.
- The original repository remained on `main` with its pre-existing uncommitted
  `package-lock.json`, `data/players - Copy.json`, and `data/slots - Copy.json`
  changes untouched throughout the migration.

---
*CLAUDE.md is updated with every code change to stay in sync.*
