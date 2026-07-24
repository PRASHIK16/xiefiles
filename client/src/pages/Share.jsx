import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Lock, Download, Printer, Eye, FileWarning, ArrowLeft, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { bytes, timeAgo } from '../lib/format'
import { useToast } from '../context/ToastContext'

export default function Share() {
  const { slug } = useParams()
  const toast = useToast()
  const [state, setState] = useState('loading')   // loading | ready | notfound
  const [file, setFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    let alive = true
    api.getShared(slug)
      .then(({ file }) => { if (alive) { setFile(file); setState('ready') } })
      .catch(() => { if (alive) setState('notfound') })
    return () => { alive = false }
  }, [slug])

  const canPreview = file && (
    file.mime_type === 'application/pdf' ||
    file.mime_type?.startsWith('image/') ||
    (file.pdf_status === 'ready' && file.pdf_stored_name)
  )
  const isImage = file?.mime_type?.startsWith('image/')

  const download = () => { window.location.href = api.shareDownloadUrl(file.id, slug) }

  const print = () => {
    if (!canPreview) return toast.info('Print version not ready yet')
    const url = api.sharePdfUrl(file.id, slug, true)
    let frame = document.getElementById('xie-print-frame')
    if (!frame) {
      frame = document.createElement('iframe')
      frame.id = 'xie-print-frame'
      frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:0'
      document.body.appendChild(frame)
    }
    frame.src = url
    frame.onload = () => { try { frame.contentWindow.focus(); frame.contentWindow.print() } catch { window.open(url, '_blank') } }
    toast.info('Opening print dialog…')
  }

  // ── Loading ──────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={28} className="animate-spin text-brand-500" />
        <p className="text-sm">Loading private file…</p>
      </div>
    )
  }

  // ── Not found / expired ──────────────────────────────────
  if (state === 'notfound') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-4">
          <FileWarning size={30} className="text-red-500" />
        </div>
        <h1 className="font-display text-xl font-bold">Link invalid or expired</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          This private link doesn’t exist anymore, or the file has expired. Ask the sender to share a new one.
        </p>
        <Link to="/" className="btn btn-ghost mt-5"><ArrowLeft size={16} /> Back to XIE Files</Link>
      </div>
    )
  }

  // ── Ready ────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto animate-fadeUp">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-500 mb-4">
        <ArrowLeft size={15} /> XIE Files
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="chip bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900">
            <Lock size={12} /> Private file
          </span>
        </div>

        <h1 className="font-display text-xl font-extrabold tracking-tight break-words">{file.original_name}</h1>
        <p className="text-sm text-slate-400 mt-1">{bytes(file.size)} · shared {timeAgo(file.uploaded_at)}</p>

        <div className="flex flex-wrap gap-2 mt-5">
          {canPreview && (
            <button onClick={() => setShowPreview(v => !v)} className="btn btn-ghost text-sm">
              <Eye size={15} /> {showPreview ? 'Hide preview' : 'Preview'}
            </button>
          )}
          <button onClick={download} className="btn btn-primary text-sm"><Download size={15} /> Download</button>
          <button onClick={print} disabled={!canPreview}
            className="btn btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <Printer size={15} /> Print
          </button>
        </div>

        {!canPreview && (
          <p className="text-xs text-slate-400 mt-3">
            This file type can’t be previewed in the browser — download it to open.
          </p>
        )}

        {showPreview && canPreview && (
          <div className="mt-5 rounded-xl2 overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-700 dark:bg-slate-950 h-[65vh] flex items-center justify-center">
            {isImage
              ? <img src={api.sharePdfUrl(file.id, slug, true)} alt={file.original_name} className="max-w-full max-h-full object-contain" />
              : <iframe src={api.sharePdfUrl(file.id, slug, true)} title="Preview" className="w-full h-full border-0" />}
          </div>
        )}
      </div>
    </div>
  )
}