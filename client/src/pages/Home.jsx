import { useState, useMemo, useEffect } from 'react'
import { Search, SlidersHorizontal, Quote, ArrowLeft, Download, Printer, FileDown, Loader2 } from 'lucide-react'
import UploadZone from '../components/files/UploadZone'
import FileCard from '../components/files/FileCard'
import FileIcon from '../components/files/FileIcon'
import { EmptyState, FileCardSkeleton } from '../components/ui'
import { useFiles } from '../context/FilesContext'
import { useToast } from '../context/ToastContext'
import { fileCategory, previewKind, mimeLabel } from '../lib/format'
import { api } from '../lib/api'

const FILTERS = [
  { key: 'all',   label: 'All' },
  { key: 'pdf',   label: 'PDF' },
  { key: 'doc',   label: 'Docs' },
  { key: 'image', label: 'Images' },
  { key: 'ready', label: 'Print Ready' },
]

// ── Featured feedback ("What students say") ────────────────────────
function FeaturedFeedback() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let alive = true
    fetch('/api/feedback/featured')
      .then(r => r.json())
      .then(d => { if (alive) setItems(d.items || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Quote size={15} className="text-brand-500" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-500">What students say</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(f => (
          <div key={f.id} className="card p-4 flex flex-col gap-2 animate-fadeUp">
            <Quote size={18} className="text-brand-400/60" />
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{f.message}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {(f.name && f.name !== 'Anonymous' ? f.name : '★').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-500">
                {f.name && f.name !== 'Anonymous' ? f.name : 'A student'}
                <span className="text-slate-400 font-normal"> · {f.type}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Text / CSV preview (fetches the file as text) ─────────────────
function TextPreview({ url }) {
  const [state, setState] = useState('loading')
  const [text, setText] = useState('')

  useEffect(() => {
    let alive = true
    fetch(url)
      .then(r => r.text())
      .then(t => { if (alive) { setText(t.slice(0, 100000)); setState('ok') } })
      .catch(() => { if (alive) setState('error') })
    return () => { alive = false }
  }, [url])

  if (state === 'loading')
    return <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={22} /></div>
  if (state === 'error')
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Couldn’t load preview. Try downloading.</div>

  return (
    <pre className="w-full h-full overflow-auto p-4 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap font-mono">
      {text}
    </pre>
  )
}

// ── Inline preview — fills the content area (Google Drive style) ──
function InlinePreview({ file, onBack }) {
  const toast = useToast()
  const kind = previewKind(file)
  const inlineUrl = api.pdfUrl(file.id, true)
  const rawUrl    = api.downloadUrl(file.id)
  const canPrint  = kind === 'pdf' || kind === 'image'

  const download = () => { window.location.href = rawUrl }

  const print = () => {
    if (!canPrint) { toast.info('Download this file to print it'); return }
    let frame = document.getElementById('xie-print-frame')
    if (!frame) {
      frame = document.createElement('iframe')
      frame.id = 'xie-print-frame'
      frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:0'
      document.body.appendChild(frame)
    }
    frame.src = inlineUrl
    frame.onload = () => { try { frame.contentWindow.focus(); frame.contentWindow.print() } catch { window.open(inlineUrl, '_blank') } }
    toast.info('Opening print dialog…')
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)', minHeight: '400px' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
        <button onClick={onBack} className="btn btn-ghost text-sm">
          <ArrowLeft size={16} /> Back to files
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate hidden sm:block max-w-[240px]" title={file.original_name}>
            {file.original_name}
          </span>
          {canPrint && (
            <button onClick={print} className="btn btn-ghost text-xs px-3 py-1.5">
              <Printer size={14} /> <span className="hidden sm:inline">Print</span>
            </button>
          )}
          <button onClick={download} className="btn btn-primary text-xs px-3 py-1.5">
            <Download size={14} /> <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Viewer — fills all remaining space */}
      <div className="flex-1 min-h-0 rounded-xl2 overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-700 dark:bg-slate-950">
        {kind === 'pdf' && (
          <iframe src={inlineUrl} title={file.original_name} className="w-full h-full border-0" />
        )}
        {kind === 'image' && (
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <img src={inlineUrl} alt={file.original_name} className="max-w-full max-h-full object-contain" />
          </div>
        )}
        {kind === 'text' && <TextPreview url={rawUrl} />}
        {kind === 'audio' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <FileIcon mime={file.mime_type} />
            <audio src={rawUrl} controls className="w-[min(80vw,420px)]" />
          </div>
        )}
        {kind === 'video' && (
          <div className="w-full h-full flex items-center justify-center">
            <video src={rawUrl} controls className="max-w-full max-h-full" />
          </div>
        )}
        {kind === 'none' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6">
            <FileIcon mime={file.mime_type} />
            <div>
              <p className="font-semibold text-slate-200">Preview not available</p>
              <p className="text-sm text-slate-400 mt-1">
                {mimeLabel(file.mime_type)} files can’t be shown in the browser — download to open it.
              </p>
            </div>
            <button onClick={download} className="btn btn-primary text-sm">
              <FileDown size={16} /> Download to open
            </button>
          </div>
        )}
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

  // ── Inline preview view — replaces the list ─────────────────────
  if (preview) {
    return (
      <div className="animate-fadeUp">
        <InlinePreview file={preview} onBack={() => setPreview(null)} />
      </div>
    )
  }

  return (
    <div className="animate-fadeUp">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Shared Files</h1>
        <p className="text-sm text-slate-400 mt-1">Drop a file — it appears for everyone on campus instantly.</p>
      </div>

      <UploadZone />

      {/* What students say */}
      <FeaturedFeedback />

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
    </div>
  )
}