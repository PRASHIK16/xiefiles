import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

const ToastContext = createContext()
export const useToast = () => useContext(ToastContext)

let idc = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, type = 'info') => {
    const id = ++idc
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  const toast = {
    success: m => push(m, 'success'),
    error:   m => push(m, 'error'),
    info:    m => push(m, 'info'),
  }

  const Icon = { success: CheckCircle2, error: XCircle, info: Info }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center">
        {toasts.map(t => {
          const I = Icon[t.type]
          return (
            <div key={t.id}
              className={`animate-popIn flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium
                shadow-soft backdrop-blur-xl border min-w-[220px]
                ${t.type === 'success' ? 'bg-brand-600/95 text-white border-brand-500'
                : t.type === 'error'   ? 'bg-red-600/95 text-white border-red-500'
                : 'bg-slate-900/95 text-white border-slate-700'}`}>
              <I size={17} className="shrink-0" />
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
