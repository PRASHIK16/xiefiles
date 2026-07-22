import { useState, useEffect } from 'react'
import { Eye, Download, Printer, Trash2, Clock } from 'lucide-react'
import FileIcon from './FileIcon'
import { PrintBadge } from '../ui'
import { bytes, timeAgo, timeLeft } from '../../lib/format'
import { api, tokens } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useFiles } from '../../context/FilesContext'

function canPreview(f) {
  return f.mime_type === 'application/pdf'
    || f.mime_type?.startsWith('image/')
    || (f.pdf_status === 'ready' && f.pdf_stored_name)
}

export default function FileCard({ file, onPreview }) {
  const toast = useToast()
  const { removeLocal } = useFiles()
  const [left, setLeft] = useState(timeLeft(file.expires_at))
  const mine = !!tokens.fileGet(file.id)
  const ready = canPreview(file)

  useEffect(() => {
    const t = setInterval(() => setLeft(timeLeft(file.expires_at)), 60000)
    return () => clearInterval(t)
  }, [file.expires_at])

  const download = () => { window.location.href = api.downloadUrl(file.id) }

  const print = () => {
    if (!ready) return toast.info('Print version not ready yet')
    const url = api.pdfUrl(file.id, true)
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

  const del = async () => {
    const token = tokens.fileGet(file.id)
    if (!token) return
    if (!confirm(`Delete "${file.original_name}"? This can't be undone.`)) return
    try {
      await api.deleteFile(file.id, token)
      tokens.fileDel(file.id)
      removeLocal(file.id)
      toast.success('File deleted')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className={`card p-4 flex flex-col gap-3 hover:shadow-soft hover:-translate-y-0.5
                     transition-all duration-200 ${file._isNew ? 'animate-flash' : ''} animate-fadeUp`}>
      <div className="flex items-start gap-3">
        <FileIcon mime={file.mime_type} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" title={file.original_name}>{file.original_name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{bytes(file.size)} · {timeAgo(file.uploaded_at)}</p>
        </div>
        <PrintBadge status={file.pdf_status} mime={file.mime_type} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Clock size={13} />
        <span className={left ? '' : 'text-red-500 font-semibold'}>
          {left ? `Expires in ${left}` : 'Expired'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onPreview(file)} disabled={!ready}
          className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed">
          <Eye size={14} /> Preview
        </button>
        <button onClick={download} className="btn btn-ghost text-xs px-3 py-1.5">
          <Download size={14} /> Download
        </button>
        <button onClick={print} disabled={!ready}
          className="btn btn-ghost text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
          <Printer size={14} /> Print
        </button>
        {mine && (
          <button onClick={del} className="btn btn-danger text-xs px-2.5 py-1.5" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
