import { useEffect, useRef } from 'react'
import { X, Eye } from 'lucide-react'
import { previewKind } from '../../lib/format'

// ── Preview tag ───────────────────────────────────────────────────
// Only shows a small positive hint when a file can be previewed.
// Never shows errors, "converting", or "failed" — clean by design.
export function PreviewTag({ file }) {
  const kind = previewKind(file)
  if (kind === 'none') return null
  return (
    <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
      <Eye size={11} />
      Previewable
    </span>
  )
}

// ── Skeleton block ────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function FileCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, actions, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose?.()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-5
                    bg-slate-950/60 backdrop-blur-sm animate-popIn"
         onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`card shadow-soft w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h3 className="font-semibold text-[15px] truncate pr-3">{title}</h3>
          <div className="flex items-center gap-2">
            {actions}
            <button onClick={onClose} aria-label="Close"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────
export function EmptyState({ icon, title, sub }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center animate-fadeUp">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-3">
        {icon}
      </div>
      <p className="font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Ripple button ─────────────────────────────────────────────────
export function RippleButton({ children, className = '', onClick, ...rest }) {
  const ref = useRef(null)
  const handle = e => {
    const el = ref.current
    if (el) {
      const r = el.getBoundingClientRect()
      const span = document.createElement('span')
      const size = Math.max(r.width, r.height)
      span.className = 'rp'
      span.style.width = span.style.height = size + 'px'
      span.style.left = e.clientX - r.left - size / 2 + 'px'
      span.style.top  = e.clientY - r.top  - size / 2 + 'px'
      el.appendChild(span)
      setTimeout(() => span.remove(), 600)
    }
    onClick?.(e)
  }
  return (
    <button ref={ref} onClick={handle} className={`ripple ${className}`} {...rest}>
      {children}
    </button>
  )
}