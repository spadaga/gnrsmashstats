import { useState } from 'react'
import { Trophy, X } from 'lucide-react'
import { computeTopPairs, filterByPeriod, matchesForPair } from '../lib/ranking'
import MatchesModal from './MatchesModal'

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year' },
  { key: 'all',   label: 'Overall' },
]

function PairAllModal({ matches, onClose }) {
  const pairs = computeTopPairs(matches)
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mt-8 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Trophy size={15} className="text-orange-600" /> All Pair Combinations
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18} /></button>
        </div>
        {pairs.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No matches yet.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {pairs.map((p, i) => (
              <div key={p.players.join('&')} className="flex items-center justify-between px-3 py-2 rounded-xl border dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 transition">
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${i === 0 ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.players.join(' & ')}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{p.wins}W – {p.losses}L · {p.played} played</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${i === 0 ? 'text-orange-600' : 'text-slate-700 dark:text-slate-300'}`}>{p.winRate}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TopSeeds({ matches }) {
  const [showAll, setShowAll] = useState(false)
  const [period, setPeriod] = useState('all')
  const [drilldown, setDrilldown] = useState(null)
  const periodMatches = filterByPeriod(matches, period)
  // Same qualify rule as Leaderboard: Today can't hit 3 games so everyone who
  // played ranks; every other period needs the standard 3-match minimum.
  const minMatches = period === 'today' ? 1 : 3
  const pairs = computeTopPairs(periodMatches, minMatches).filter((p) => p.qualified)
  const top2 = pairs.slice(0, 2)
  const allTimePairs = computeTopPairs(matches)
  const periodLabel = PERIODS.find((p) => p.key === period)?.label.toLowerCase()

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          <Trophy size={16} className="text-orange-600" /> Top Seeds
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1 flex-wrap">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
                  period === p.key ? 'bg-slate-900 dark:bg-orange-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>{p.label}</button>
            ))}
          </div>
          {allTimePairs.length > 2 && (
            <button onClick={() => setShowAll(true)} className="text-xs font-bold uppercase tracking-wide text-orange-600 hover:text-orange-700 transition">
              View All →
            </button>
          )}
        </div>
      </div>
      {top2.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl">
          No qualified pairs {periodLabel === 'overall' ? 'yet' : periodLabel} yet.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {top2.map((p, i) => (
          <button type="button" key={p.players.join('&')}
            onClick={() => setDrilldown({ title: `${p.players.join(' & ')} matches`, list: matchesForPair(periodMatches, p.players) })}
            className={`text-left rounded-2xl p-3 relative overflow-hidden transition hover:opacity-90 ${i === 1 ? 'hidden sm:block' : ''} ${i === 0 ? 'bg-orange-600 text-white' : 'bg-white dark:bg-slate-800 border dark:border-slate-700'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${i === 0 ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                Top Seed #{i + 1}
              </span>
              <span className="text-right">
                <span className="text-lg font-extrabold block">{p.winRate}%</span>
                <span className={`text-[10px] uppercase tracking-wide ${i === 0 ? 'text-orange-100' : 'text-slate-400 dark:text-slate-500'}`}>Win Rate</span>
              </span>
            </div>
            <Trophy size={56} className={`absolute -bottom-2 -right-2 ${i === 0 ? 'text-white/10' : 'text-slate-100 dark:text-slate-700'}`} />
            <p className={`font-bold text-sm relative leading-tight ${i !== 0 ? 'text-slate-900 dark:text-white' : ''}`}>{p.players.join(' & ')}</p>
            <p className={`text-xs relative mt-0.5 ${i === 0 ? 'text-orange-100' : 'text-slate-500 dark:text-slate-400'}`}>{p.wins}W – {p.losses}L</p>
          </button>
        ))}
      </div>
      {showAll && <PairAllModal matches={matches} onClose={() => setShowAll(false)} />}
      {drilldown && <MatchesModal title={drilldown.title} matches={drilldown.list} onClose={() => setDrilldown(null)} />}
    </div>
  )
}