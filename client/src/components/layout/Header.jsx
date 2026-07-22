import { useState, useEffect } from 'react'
import { Moon, Sun, Menu, Wifi, WifiOff } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useSocket } from '../../context/SocketContext'

export default function Header({ onMenu }) {
  const { theme, toggle } = useTheme()
  const { status, liveUsers } = useSocket()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const clock = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const live = status === 'live'

  return (
    <header className="sticky top-0 z-40 h-16 glass border-b flex items-center justify-between px-4 sm:px-6">
      {/* Left: logo */}
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Menu">
          <Menu size={20} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
          </svg>
        </div>
        <div className="leading-tight">
          <div className="font-display font-extrabold text-[17px] tracking-tight">XIE Files</div>
          <div className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Instant Campus File Transfer</div>
        </div>
      </div>

      {/* Right: status cluster */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden md:block text-sm font-medium tabular-nums text-slate-500 dark:text-slate-400">{clock}</span>

        <div className={`chip ${live ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
          {live ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-brand-500' : 'bg-amber-500 animate-pulseDot'}`} />
          {live ? 'Live' : 'Reconnecting'}
        </div>

        {live && liveUsers > 0 && (
          <div className="hidden sm:flex chip bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            {liveUsers} online
          </div>
        )}

        <button onClick={toggle} aria-label="Toggle theme"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer"
             title="Guest">
          G
        </div>
      </div>
    </header>
  )
}
