import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2, X } from 'lucide-react'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', danger = true, onConfirm, onCancel }) {
  const confirmRef = useRef(null)
  useEffect(() => { if (open) confirmRef.current?.focus() }, [open])
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18} /></button>
        <div className="flex items-start gap-4 mb-4">
          <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
            {danger ? <Trash2 size={18} className="text-red-600" /> : <AlertTriangle size={18} className="text-orange-600" />}
          </span>
          <div className="pt-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            {message && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
          <button ref={confirmRef} onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}