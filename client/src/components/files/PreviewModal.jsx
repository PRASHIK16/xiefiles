import { useState, useEffect } from 'react'
import { Printer, Download, FileDown, Loader2 } from 'lucide-react'
import { Modal } from '../ui'
import FileIcon from './FileIcon'
import { api } from '../../lib/api'
import { previewKind, mimeLabel } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

// ── Text / CSV preview (fetches the file as text) ─────────────────
function TextPreview({ url }) {
  const [state, setState] = useState('loading') // loading | ok | error
  const [text, setText] = useState('')

  useEffect(() => {
    let alive = true
    fetch(url)
      .then(r => r.text())
      .then(t => { if (alive) { setText(t.slice(0, 100000)); setState('ok') } })  // cap 100k chars
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

// ── "Can't preview" placeholder — clean, no error styling ─────────
function NoPreview({ file, onDownload }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6 py-10">
      <FileIcon mime={file.mime_type} />
      <div>
        <p className="font-semibold text-slate-200">Preview not available</p>
        <p className="text-sm text-slate-400 mt-1">
          {mimeLabel(file.mime_type)} files can’t be shown in the browser — download to open it.
        </p>
      </div>
      <button onClick={onDownload} className="btn btn-primary text-sm">
        <FileDown size={16} /> Download to open
      </button>
    </div>
  )
}

export default function PreviewModal({ file, onClose }) {
  const toast = useToast()
  if (!file) return null

  const kind = previewKind(file)
  const inlineUrl = api.pdfUrl(file.id, true)          // pdf/converted → inline pdf
  const rawUrl    = api.downloadUrl(file.id)           // original bytes
  const canPrint  = kind === 'pdf' || kind === 'image'

  const download = () => { window.location.href = rawUrl }

  const print = () => {
    if (!canPrint) return
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
    <Modal open={!!file} onClose={onClose} title={file.original_name} wide
      actions={
        <>
          {canPrint && (
            <button onClick={print} className="btn btn-primary text-xs px-3 py-1.5">
              <Printer size={14} /> <span className="hidden sm:inline">Print</span>
            </button>
          )}
          <button onClick={download} className="btn btn-ghost text-xs px-3 py-1.5">
            <Download size={14} /> <span className="hidden sm:inline">Download</span>
          </button>
        </>
      }>
      <div className="bg-slate-700 dark:bg-slate-950 h-[70vh] flex items-center justify-center">
        {kind === 'pdf'   && <iframe src={inlineUrl} title="Preview" className="w-full h-full border-0" />}
        {kind === 'image' && <img src={inlineUrl} alt={file.original_name} className="max-w-full max-h-full object-contain" />}
        {kind === 'text'  && <TextPreview url={rawUrl} />}
        {kind === 'audio' && (
          <div className="flex flex-col items-center gap-4">
            <FileIcon mime={file.mime_type} />
            <audio src={rawUrl} controls className="w-[min(80vw,420px)]" />
          </div>
        )}
        {kind === 'video' && (
          <video src={rawUrl} controls className="max-w-full max-h-full" />
        )}
        {kind === 'none'  && <NoPreview file={file} onDownload={download} />}
      </div>
    </Modal>
  )
}