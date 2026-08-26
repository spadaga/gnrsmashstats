import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, KeyRound, X } from 'lucide-react'
import { findAdminByPin } from '../lib/admins'

export default function LoginModal({ open, players, onLogin, onClose }) {
  const [pin, setPin] = useState('')
  const [found, setFound] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) { setPin(''); setFound(null); setError('') }
    else setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function handlePinInput(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val); setError(''); setFound(null)
    if (val.length === 4) {
      const admin = findAdminByPin(players || [], val)
      if (admin) { setFound(admin); setTimeout(() => onLogin(admin.name), 700) }
      else setError('No admin found for this PIN. Try again.')
    }
  }

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18} /></button>
        <div className="flex flex-col items-center text-center">
          <span className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${found ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
            {found ? <CheckCircle2 size={28} className="text-emerald-600" /> : <KeyRound size={26} className="text-orange-600" />}
          </span>
          {found ? (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Welcome, {found.name}!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Logging you in…</p>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Login</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">Enter your 4-digit PIN<br />(last 4 digits of your mobile)</p>
              <div className="flex gap-3 mb-5">
                {[0,1,2,3].map((i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${pin.length > i ? 'bg-orange-600 border-orange-600 scale-110' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`} />
                ))}
              </div>
              <input ref={inputRef} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} onChange={handlePinInput}
                className="w-36 text-center border-2 dark:border-slate-600 rounded-xl px-3 py-2.5 text-xl font-bold tracking-[0.4em] focus:outline-none focus:border-orange-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition"
                placeholder="••••" />
              {error && <p className="mt-3 text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}