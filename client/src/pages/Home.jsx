import { useState, useMemo, useEffect } from 'react'
import { Search, SlidersHorizontal, Lock, Copy, Check, ExternalLink, Trash2 } from 'lucide-react'
import UploadZone from '../components/files/UploadZone'
import FileCard from '../components/files/FileCard'
import PreviewModal from '../components/files/PreviewModal'
import { EmptyState, FileCardSkeleton } from '../components/ui'
import { useFiles } from '../context/FilesContext'
import { useToast } from '../context/ToastContext'
import { fileCategory, bytes, timeAgo } from '../lib/format'
import { privateLinks, api } from '../lib/api'

const FILTERS = [
  { key: 'all',   label: 'All' },
  { key: 'pdf',   label: 'PDF' },
  { key: 'doc',   label: 'Docs' },
  { key: 'image', label: 'Images' },
  { key: 'ready', label: 'Print Ready' },
]

// ── My Private Links (localStorage-backed) ─────────────────────────
function PrivateLinks() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [copiedSlug, setCopiedSlug] = useState(null)

  const refresh = () => setItems(privateLinks.all())
  useEffect(() => { refresh() }, [])

  // Refresh when returning to the tab (e.g. after a new private upload)
  useEffect(() => {
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  if (items.length === 0) return null

  const copy = async (slug) => {
    try {
      await navigator.clipboard.writeText(api.buildShareLink(slug))
      setCopiedSlug(slug); setTimeout(() => setCopiedSlug(null), 1600)
    } catch { toast.error('Could not copy') }
  }

  const remove = (slug) => {
    privateLinks.remove(slug)
    refresh()
    toast.info('Removed from this device')
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Lock size={15} className="text-slate-400" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-500">My Private Links</h2>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Saved on this device only. These files aren’t on the public board — share the link to give access.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(it => (
          <div key={it.slug} className="card p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 flex items-center justify-center shrink-0">
              <Lock size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" title={it.name}>{it.name}</p>
              <p className="text-[11px] text-slate-400">{bytes(it.size)} · {timeAgo(it.at)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => copy(it.slug)} className="btn btn-ghost text-xs px-2 py-1.5" title="Copy link">
                {copiedSlug === it.slug ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <a href={api.buildShareLink(it.slug)} target="_blank" rel="noreferrer"
                 className="btn btn-ghost text-xs px-2 py-1.5" title="Open">
                <ExternalLink size={14} />
              </a>
              <button onClick={() => remove(it.slug)} className="btn btn-danger text-xs px-2 py-1.5" title="Remove from device">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { files, loading } = useFiles()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [preview, setPreview] = useState(null)

  const shown = useMemo(() => {
    return files.filter(f => {
      if (q && !f.original_name.toLowerCase().includes(q.toLowerCase())) return false
      if (filter === 'all') return true
      if (filter === 'ready') return f.pdf_status === 'ready' || f.mime_type === 'application/pdf'
      if (filter === 'doc') return ['doc', 'ppt', 'xls', 'txt'].includes(fileCategory(f.mime_type))
      return fileCategory(f.mime_type) === filter
    })
  }, [files, q, filter])

  return (
    <div className="animate-fadeUp">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Shared Files</h1>
        <p className="text-sm text-slate-400 mt-1">Drop a file — it appears for everyone on campus instantly.</p>
      </div>

      <UploadZone />

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 mt-6 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search files…" className="input pl-9" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal size={15} className="text-slate-400 shrink-0 hidden sm:block" />
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`chip whitespace-nowrap transition-colors ${filter === f.key
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <FileCardSkeleton key={i} />)
        ) : shown.length === 0 ? (
          <EmptyState icon="🗂️"
            title={q || filter !== 'all' ? 'No matching files' : 'No files yet'}
            sub={q || filter !== 'all' ? 'Try a different search or filter' : 'Upload a file to get started'} />
        ) : (
          shown.map(f => <FileCard key={f.id} file={f} onPreview={setPreview} />)
        )}
      </div>

      {/* My Private Links */}
      <PrivateLinks />

      <PreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}