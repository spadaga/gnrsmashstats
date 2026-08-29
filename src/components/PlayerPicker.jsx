import { useEffect, useRef, useState, useMemo } from 'react'
import { ChevronDown, Ban } from 'lucide-react'
import Avatar from './Avatar'
import { sortPlayersByTier } from '../lib/ranking'

export default function PlayerPicker({
  value,
  onChange,
  options = [],
  players = [],
  inactivePlayers = [],
  photoByName = {},
  placeholder = 'Select player',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Build a set of inactive player names from players / inactivePlayers / options
  const inactiveSet = useMemo(() => {
    const set = new Set(
      (Array.isArray(inactivePlayers) ? inactivePlayers : []).map((n) =>
        String(n).trim().toLowerCase()
      )
    )
    players.forEach((p) => {
      if (typeof p === 'object' && p.inactive && p.name) {
        set.add(p.name.trim().toLowerCase())
      }
    })
    options.forEach((p) => {
      if (typeof p === 'object' && p.inactive && p.name) {
        set.add(p.name.trim().toLowerCase())
      }
    });
    return set;
  }, [players, inactivePlayers, options]);

  // Main players first, other players middle, guest players last, inactive at the bottom
  const sortedOptions = useMemo(() => {
    return sortPlayersByTier(options, inactiveSet).map((p) =>
      typeof p === "string" ? p : p.name,
    );
  }, [options, inactiveSet]);

  const isInactive = (name) => {
    if (!name) return false;
    return inactiveSet.has(String(name).trim().toLowerCase());
  };

  function select(v) {
    if (isInactive(v)) return; // Cannot select inactive player
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sortedOptions.filter((p) => p.toLowerCase().includes(q))
    : sortedOptions

  const firstSelectable = filtered.find((p) => !isInactive(p))
  const valueIsInactive = isInactive(value)

  return (
    <div className="relative" ref={ref}>
      {open ? (
        <div className="w-full flex items-center gap-2 border border-orange-400 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 ring-2 ring-orange-400">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false)
                setQuery('')
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered.length === 1 && !isInactive(filtered[0])) {
                  select(filtered[0])
                } else if (firstSelectable && filtered.length > 0) {
                  select(firstSelectable)
                }
              }
            }}
            placeholder={value || placeholder}
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400"
          />
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400 text-left"
        >
          {value ? (
            <>
              <Avatar name={value} photo={photoByName[value]} size="sm" />
              <span className="flex-1 truncate text-sm flex items-center gap-1.5">
                <span>{value}</span>
                {valueIsInactive && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-md">
                    Inactive
                  </span>
                )}
              </span>
            </>
          ) : (
            <span className="flex-1 text-sm text-slate-400">{placeholder}</span>
          )}
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </button>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg shadow-lg py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No matching players.</p>
          )}
          {filtered.map((p) => {
            const inactive = isInactive(p)
            const isSelected = p === value
            return (
              <button
                key={p}
                type="button"
                disabled={inactive}
                onClick={() => select(p)}
                title={inactive ? `${p} is deactivated and cannot be selected` : undefined}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition ${
                  inactive
                    ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/50 text-slate-400'
                    : isSelected
                    ? 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                    : 'hover:bg-orange-50 dark:hover:bg-orange-900/10'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={p} photo={photoByName[p]} size="sm" />
                  <span
                    className={`text-sm truncate ${
                      inactive
                        ? 'text-slate-400 dark:text-slate-500 line-through'
                        : 'text-slate-800 dark:text-slate-100 font-medium'
                    }`}
                  >
                    {p}
                  </span>
                </div>
                {inactive && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <Ban size={9} /> Inactive
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

