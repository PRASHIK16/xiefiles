import { useState, useEffect } from 'react'
import { Eye, Download, Printer, Trash2, Clock } from 'lucide-react'
import FileIcon from './FileIcon'
import { PreviewTag } from '../ui'
import { bytes, timeAgo, timeLeft, previewKind } from '../../lib/format'
import { api, tokens } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useFiles } from '../../context/FilesContext'

export default function FileCard({ file, onPreview }) {
  const toast = useToast()
  const { removeLocal } = useFiles()
  const [left, setLeft] = useState(timeLeft(file.expires_at))
  const mine = !!tokens.fileGet(file.id)

  const kind     = previewKind(file)
  const canPrint = kind === 'pdf' || kind === 'image'   // only these truly print in-browser

  useEffect(() => {
    const t = setInterval(() => setLeft(timeLeft(file.expires_at)), 60000)
    return () => clearInterval(t)
  }, [file.expires_at])

  const download = () => { window.location.href = api.downloadUrl(file.id) }

  const print = () => {
    // Not printable in-browser → guide the user cleanly, no error styling.
    if (!canPrint) {
      toast.info('Download this file to print it')
      return
    }
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
        <PreviewTag file={file} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Clock size={13} />
        <span className={left ? '' : 'text-red-500 font-semibold'}>
          {left ? `Expires in ${left}` : 'Expired'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Preview always available — modal shows content or a clean "download to open" */}
        <button onClick={() => onPreview(file)} className="btn btn-primary text-xs px-3 py-1.5">
          <Eye size={14} /> Preview
        </button>
        <button onClick={download} className="btn btn-ghost text-xs px-3 py-1.5">
          <Download size={14} /> Download
        </button>
        {/* Print always visible — printable files open the dialog, others get a clean hint */}
        <button onClick={print} className="btn btn-ghost text-xs px-3 py-1.5">
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