import { useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Pencil, Save, Search, Swords, Trophy, Trash2, X } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'
import { isAbandoned } from '../lib/ranking'

const MODES = [
  { key: 'today', label: 'Today' },
  { key: 'h2h',   label: 'Head-to-Head' },
  { key: 'all',   label: 'All Matches' },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

function formatDateHeader(iso) {
  if (iso === todayISO()) {
    const label = new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return `Today (${label})`
  }
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function groupByDate(matches) {
  const map = {}
  matches.forEach((m, i) => { (map[m.date] ||= []).push({ m, i }) })
  return Object.entries(map).sort(([a], [b]) => (a < b ? 1 : -1)).map(([date, entries]) => ({
    date,
    // Newest-first: by loggedAt when both have it, else by original array position (later = more recent)
    items: entries.slice().sort((a, b) => {
      if (a.m.loggedAt && b.m.loggedAt) return a.m.loggedAt < b.m.loggedAt ? 1 : -1
      return b.i - a.i
    }).map((e) => e.m),
  }))
}

function PlayerSelect({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="border dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:border-orange-400 focus:outline-none">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  )
}

const pairKey = (a, b) => [a, b].sort().join('|')

function EditScoreForm({ match, players, onSave, onCancel }) {
  const [s1, setS1] = useState(String(match.score1))
  const [s2, setS2] = useState(String(match.score2))
  const [p1, setP1] = useState(match.team1[0])
  const [p2, setP2] = useState(match.team1[1])
  const [p3, setP3] = useState(match.team2[0])
  const [p4, setP4] = useState(match.team2[1])
  const [err, setErr] = useState('')

  const chosen = [p1, p2, p3, p4]
  const options = Array.from(new Set([...players, ...chosen]))
  const availableFor = (current) => options.filter((p) => p === current || !chosen.includes(p))

  function handleSave() {
    const n1 = Number(s1), n2 = Number(s2)
    if (!Number.isInteger(n1) || !Number.isInteger(n2) || n1 < 0 || n1 > 30 || n2 < 0 || n2 > 30)
      return setErr('Scores must be 0–30.')
    if (n1 === n2) return setErr('Scores cannot be tied.')
    if (new Set(chosen).size < 4) return setErr('All four players must be different.')
    onSave({ score1: n1, score2: n2, team1: [p1, p2], team2: [p3, p4] })
  }
  const inp = 'w-14 border dark:border-slate-600 rounded-lg px-2 py-1 text-sm text-center font-bold bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:border-orange-400 focus:outline-none'
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <PlayerSelect value={p1} onChange={setP1} options={availableFor(p1)} />
        <span className="text-slate-400 text-xs">&</span>
        <PlayerSelect value={p2} onChange={setP2} options={availableFor(p2)} />
        <span className="text-slate-300 dark:text-slate-600 text-xs mx-1">vs</span>
        <PlayerSelect value={p3} onChange={setP3} options={availableFor(p3)} />
        <span className="text-slate-400 text-xs">&</span>
        <PlayerSelect value={p4} onChange={setP4} options={availableFor(p4)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <input type="number" min={0} max={30} value={s1} onChange={(e) => { setS1(e.target.value); setErr('') }} className={inp} />
          <span className="text-slate-400 text-sm">–</span>
          <input type="number" min={0} max={30} value={s2} onChange={(e) => { setS2(e.target.value); setErr('') }} className={inp} />
        </div>
        {err && <span className="text-xs text-red-500">{err}</span>}
        <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition">
          <Save size={12} /> Save
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  )
}

export default function MatchList({ matches, players, onDelete, onUpdate, onLogMatch, isAdmin, isSuperAdmin }) {
  const [mode, setMode] = useState('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [h2h, setH2h] = useState(['', '', '', ''])

  const playerNames = (players || []).map((p) => (typeof p === 'string' ? p : p.name))

  // Sequence number per match, derived from the full (unfiltered) list so the
  // same match shows the same number regardless of which of the 3 mode tabs
  // it's viewed in. Oldest match = #1; since the UI lists newest-first, this
  // reads as descending (132, 131, 130, ...) top to bottom.
  const seqById = useMemo(() => {
    const oldestFirst = matches.map((m, i) => ({ m, i })).sort((a, b) => {
      if (a.m.loggedAt && b.m.loggedAt) return a.m.loggedAt < b.m.loggedAt ? -1 : 1
      return a.i - b.i
    })
    return new Map(oldestFirst.map(({ m }, idx) => [m.id, idx + 1]))
  }, [matches])

  const [ha, hb, hc, hd] = h2h
  const h2hChosen = h2h.filter(Boolean)
  const h2hActive = mode === 'h2h' && h2hChosen.length === 4 && new Set(h2hChosen).size === 4

  function selectMode(next) {
    setMode(next)
    if (next !== 'h2h') setH2h(['', '', '', ''])
  }
  const h2hOptions = (current) => playerNames.filter((p) => p === current || !h2hChosen.includes(p))
  const selA = h2hActive ? pairKey(ha, hb) : null
  const selB = h2hActive ? pairKey(hc, hd) : null

  const visible = matches.filter((m) => {
    if (mode === 'today' && m.date !== todayISO()) return false
    if (mode === 'all' && ((from && m.date < from) || (to && m.date > to))) return false
    if (search) {
      const q = search.trim().toLowerCase()
      const haystack = [...m.team1, ...m.team2, m.comment || ''].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (h2hActive) {
      const mA = pairKey(m.team1[0], m.team1[1])
      const mB = pairKey(m.team2[0], m.team2[1])
      const isMatchup = (mA === selA && mB === selB) || (mA === selB && mB === selA)
      if (!isMatchup) return false
    }
    return true
  })
  const groups = groupByDate(visible)

  let h2hSummary = null
  if (h2hActive) {
    let winsA = 0, winsB = 0
    visible.forEach((m) => {
      const team1Won = m.score1 > m.score2
      const team1IsA = pairKey(m.team1[0], m.team1[1]) === selA
      if (team1Won === team1IsA) winsA++
      else winsB++
    })
    const labelA = `${ha} & ${hb}`, labelB = `${hc} & ${hd}`
    if (winsA === 0 && winsB === 0) h2hSummary = `No matches yet between ${labelA} and ${labelB}.`
    else if (winsA === winsB) h2hSummary = `${labelA} vs ${labelB}: tied ${winsA}–${winsB}.`
    else if (winsA > winsB) h2hSummary = `${labelA} lead ${labelB} ${winsA}–${winsB}.`
    else h2hSummary = `${labelB} lead ${labelA} ${winsB}–${winsA}.`
  }

  async function handleDelete() {
    const id = confirm; setConfirm(null); setDeleting(true)
    try { await onDelete(id) } finally { setDeleting(false) }
  }
  async function handleSaveScore(id, updates) { setEditingId(null); await onUpdate(id, updates) }

  const inputCls = 'border dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100'

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4">
      <div className="relative mb-3">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by player or comment…"
          className={`${inputCls} w-full pl-7 font-bold text-sm text-slate-900 dark:text-white placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500`} />
      </div>

      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">Recent Matches</h2>
        {onLogMatch && isAdmin && (
          <button onClick={onLogMatch} className="text-xs font-bold uppercase tracking-wide text-orange-600 hover:text-orange-700">Log Match →</button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1">
          {MODES.map((r) => (
            <button key={r.key} onClick={() => selectMode(r.key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
                mode === r.key ? 'bg-slate-900 dark:bg-orange-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>{r.key === 'h2h' && <Swords size={12} />}{r.label}</button>
          ))}
        </div>
        {mode === 'all' && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            <span className="text-slate-400 text-xs">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo('') }} className="text-xs font-medium text-slate-400 hover:text-orange-500">Clear</button>
            )}
          </div>
        )}
      </div>

      {mode === 'h2h' && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <PlayerSelect value={ha} onChange={(v) => setH2h([v, hb, hc, hd])} options={h2hOptions(ha)} placeholder="Player 1" />
          <span className="text-slate-400 text-xs">&</span>
          <PlayerSelect value={hb} onChange={(v) => setH2h([ha, v, hc, hd])} options={h2hOptions(hb)} placeholder="Player 2" />
          <span className="text-slate-300 dark:text-slate-600 text-xs mx-1">vs</span>
          <PlayerSelect value={hc} onChange={(v) => setH2h([ha, hb, v, hd])} options={h2hOptions(hc)} placeholder="Player 3" />
          <span className="text-slate-400 text-xs">&</span>
          <PlayerSelect value={hd} onChange={(v) => setH2h([ha, hb, hc, v])} options={h2hOptions(hd)} placeholder="Player 4" />
          {h2hChosen.length > 0 && (
            <button onClick={() => setH2h(['', '', '', ''])} className="text-xs font-medium text-slate-400 hover:text-orange-500 ml-1">Clear</button>
          )}
        </div>
      )}

      {h2hSummary && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-semibold text-center">
          {h2hSummary}
        </div>
      )}

      <div className="space-y-4 max-h-[40rem] overflow-y-auto pr-1">
        {groups.map(({ date, items }) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold uppercase tracking-wide ${date === todayISO() ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`}>
                {formatDateHeader(date)}
              </span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{items.length} match{items.length !== 1 ? 'es' : ''}</span>
            </div>
            <div className="space-y-2">
              {items.map((m) => {
                const team1Won = m.score1 > m.score2
                const isEditing = editingId === m.id
                const canModify = isSuperAdmin
                const abandoned = isAbandoned(m)
                return (
                  <div key={m.id} className={`rounded-xl px-3 py-2.5 transition ${
                    abandoned
                      ? 'border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                      : 'border dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">Match #{seqById.get(m.id)}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <div className={`text-right flex-1 ${team1Won ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {team1Won && <Trophy size={12} className="inline mb-0.5 mr-1 text-orange-500" />}
                            {m.team1.join(' & ')}
                          </div>
                          <div className="flex flex-col items-center shrink-0">
                            <div className="flex items-center gap-1 font-bold bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1">
                              <span className={team1Won ? 'text-orange-600' : 'text-slate-400 dark:text-slate-500'}>{m.score1}</span>
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                              <span className={!team1Won ? 'text-orange-600' : 'text-slate-400 dark:text-slate-500'}>{m.score2}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">+{Math.abs(m.score1 - m.score2)}</span>
                          </div>
                          <div className={`flex-1 ${!team1Won ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {m.team2.join(' & ')}
                            {!team1Won && <Trophy size={12} className="inline mb-0.5 ml-1 text-orange-500" />}
                          </div>
                        </div>
                        {abandoned && (
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mt-1">
                            <AlertTriangle size={11} /> Abandoned — did not reach 21
                          </p>
                        )}
                        {m.comment && <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium mt-1">"{m.comment}"</p>}
                        {isEditing && <EditScoreForm match={m} players={playerNames} onSave={(u) => handleSaveScore(m.id, u)} onCancel={() => setEditingId(null)} />}
                      </div>
                      {canModify && !isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setEditingId(m.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition" title="Edit score">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setConfirm(m.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Delete match">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">No matches in this range.</p>}
      </div>

      <ConfirmDialog
        open={!!confirm} title="Delete this match?" message="This match record will be permanently removed."
        confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setConfirm(null)} />

      {deleting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg px-5 py-3">
            <Loader2 size={18} className="animate-spin text-orange-600" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Deleting…</span>
          </div>
        </div>
      )}
    </div>
  )
}