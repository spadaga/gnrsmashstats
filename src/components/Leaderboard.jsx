import { useState } from 'react'
import { Medal } from 'lucide-react'
import { computeStats, computeTopPairs, computeRanks, filterByPeriod, matchesForPlayer, matchesForPair } from '../lib/ranking'
import Avatar from './Avatar'
import MatchesModal from './MatchesModal'

const MODES = [
  { key: 'singles', label: 'Singles' },
  { key: 'doubles', label: 'Doubles' },
]

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year',  label: 'Yearly' },
  { key: 'all',   label: 'Overall' },
]

export default function Leaderboard({ matches, players, photoByName = {}, onViewProfile }) {
  const [mode, setMode] = useState('singles')
  const [period, setPeriod] = useState('today')
  const [drilldown, setDrilldown] = useState(null)
  const filtered = filterByPeriod(matches, period)
  // Today can't realistically hit 3 games, so it ranks everyone who played at
  // all; every other period (week/month/year/overall) requires the standard
  // 3-match qualify rule before a rank is awarded — same rule TopSeeds uses.
  const minMatches = period === 'today' ? 1 : 3
  const rows = mode === 'singles' ? computeStats(filtered, players, minMatches) : computeTopPairs(filtered, minMatches)
  const ranks = computeRanks(rows)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          <Medal size={16} className="text-orange-600" /> Leaderboard
        </h2>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1">
          {MODES.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
                mode === m.key ? 'bg-slate-900 dark:bg-orange-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>{m.label}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1 mb-3 w-fit flex-wrap">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
              period === p.key ? 'bg-slate-900 dark:bg-orange-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>{p.label}</button>
        ))}
      </div>
      <div className="space-y-1">
        {rows.map((s, i) => {
          const rank = ranks[i]
          const label = mode === 'singles' ? s.name : s.players.join(' & ')
          const key = mode === 'singles' ? s.name : s.players.join('|')
          const rowMatches = mode === 'singles' ? matchesForPlayer(filtered, s.name) : matchesForPair(filtered, s.players)
          return (
            <div key={key} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
              {/* Left: avatar/circle always first, then name — same order on mobile and desktop. */}
              <button type="button"
                onClick={() => mode === 'singles' && onViewProfile?.(s.name)}
                className={`flex items-center gap-3 text-left ${mode === 'singles' ? 'cursor-pointer' : 'cursor-default'}`}>
                {mode === 'singles' ? (
                  <Avatar name={s.name} photo={photoByName[s.name]} size="sm" />
                ) : (
                  <span className="flex -space-x-2 shrink-0">
                    {s.players.map((n) => <Avatar key={n} name={n} photo={photoByName[n]} size="sm" className="ring-2 ring-white dark:ring-slate-800" />)}
                  </span>
                )}
                <div>
                  <p className={`text-sm font-semibold text-slate-800 dark:text-slate-100 ${mode === 'singles' ? 'hover:text-orange-600 dark:hover:text-orange-400' : ''}`}>{label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{s.wins}W - {s.losses}L · {s.played} played · {s.winRate}%</p>
                </div>
              </button>
              {/* Right: rank circle badge only — win % now lives under the name on the left. */}
              <button type="button" onClick={() => setDrilldown({ title: `${label}'s matches`, list: rowMatches })}
                className="hover:opacity-75 transition shrink-0">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${rank === 1 ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  {rank ?? 'NA'}
                </span>
              </button>
            </div>
          )
        })}
        {rows.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">No matches yet.</p>}
      </div>
      {drilldown && <MatchesModal title={drilldown.title} matches={drilldown.list} onClose={() => setDrilldown(null)} />}
    </div>
  )
}
