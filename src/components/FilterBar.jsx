import { Download, Upload } from 'lucide-react'

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year' },
  { key: 'all',   label: 'Overall' },
]

export default function FilterBar({ period, onPeriod, onExport, onImport, isAdmin }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => onPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition ${
              period === p.key
                ? 'bg-slate-900 dark:bg-orange-600 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      {isAdmin && (
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border dark:border-slate-600 text-sm font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
            <Upload size={15} /> Import
            <input type="file" accept="application/json" onChange={onImport} className="hidden" />
          </label>
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
            <Download size={15} /> Export
          </button>
        </div>
      )}
    </div>
  )
}