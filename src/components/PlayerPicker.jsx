import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Avatar from './Avatar'

// Avatar-aware, type-to-filter replacement for a native <select> of player
// names — a plain <select><option> can't render an inline <img>, so this is a
// small custom combobox instead. Typed text only ever *filters* `options`;
// `onChange` is called exclusively from clicking/selecting an actual option
// (or pressing Enter when exactly one match remains), so free-typed text can
// never become the picked value — an unmatched query just shows "No matching
// players." and leaves the previous selection (or none) in place.
export default function PlayerPicker({ value, onChange, options, photoByName = {}, placeholder = 'Select player' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function select(v) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter((p) => p.toLowerCase().includes(q)) : options

  return (
    <div className="relative" ref={ref}>
      {open ? (
        <div className="w-full flex items-center gap-2 border border-orange-400 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 ring-2 ring-orange-400">
          <input
            autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setOpen(false); setQuery('') }
              if (e.key === 'Enter') { e.preventDefault(); if (filtered.length === 1) select(filtered[0]) }
            }}
            placeholder={value || placeholder}
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400" />
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400 text-left">
          {value ? (
            <>
              <Avatar name={value} photo={photoByName[value]} size="sm" />
              <span className="flex-1 truncate text-sm">{value}</span>
            </>
          ) : (
            <span className="flex-1 text-sm text-slate-400">{placeholder}</span>
          )}
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </button>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg shadow-lg py-1">
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">No matching players.</p>}
          {filtered.map((p) => (
            <button key={p} type="button" onClick={() => select(p)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-orange-50 dark:hover:bg-orange-900/20 transition ${p === value ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
              <Avatar name={p} photo={photoByName[p]} size="sm" />
              <span className="text-sm text-slate-800 dark:text-slate-100">{p}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
