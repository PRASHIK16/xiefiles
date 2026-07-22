import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import UploadZone from '../components/files/UploadZone'
import FileCard from '../components/files/FileCard'
import PreviewModal from '../components/files/PreviewModal'
import { EmptyState, FileCardSkeleton } from '../components/ui'
import { useFiles } from '../context/FilesContext'
import { fileCategory } from '../lib/format'

const FILTERS = [
  { key: 'all',   label: 'All' },
  { key: 'pdf',   label: 'PDF' },
  { key: 'doc',   label: 'Docs' },
  { key: 'image', label: 'Images' },
  { key: 'ready', label: 'Print Ready' },
]

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

      <PreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
