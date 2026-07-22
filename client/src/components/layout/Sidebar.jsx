import { NavLink } from 'react-router-dom'
import { Home, StickyNote, MessageSquarePlus, Clock, Info, HelpCircle, Settings, Shield } from 'lucide-react'

const NAV = [
  { to: '/',         icon: Home,               label: 'Home' },
  { to: '/notes',    icon: StickyNote,         label: 'Notes' },
  { to: '/feedback', icon: MessageSquarePlus,  label: 'Feedback' },
  { to: '/recent',   icon: Clock,              label: 'Recent Uploads' },
  { to: '/about',    icon: Info,               label: 'About' },
  { to: '/help',     icon: HelpCircle,         label: 'Help' },
]

export default function Sidebar({ open, onClose }) {
  const content = (
    <nav className="flex flex-col h-full p-3">
      <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Menu</div>
      <div className="flex flex-col gap-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
            <Icon size={18} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <div className="nav-item opacity-50 cursor-not-allowed">
          <Settings size={18} /> Settings
          <span className="ml-auto text-[10px] chip bg-slate-100 dark:bg-slate-800 text-slate-400">Soon</span>
        </div>
        <a href="/admin.html" className="nav-item">
          <Shield size={18} /> Admin
        </a>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 shadow-soft animate-fadeUp">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
