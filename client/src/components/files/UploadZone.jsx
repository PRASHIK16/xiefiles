import { useRef, useState } from 'react'
import { UploadCloud, Loader2, Globe, Lock, Copy, Check, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useToast } from '../../context/ToastContext'
import { useFiles } from '../../context/FilesContext'
import { tokens, privateLinks, api } from '../../lib/api'

export default function UploadZone() {
  const inputRef = useRef(null)
  const toast = useToast()
  const { upsertLocal } = useFiles()
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState(null)      // { name, pct }
  const [visibility, setVisibility] = useState('public')
  const [sharePanel, setSharePanel] = useState(null)  // { link, qr, name }
  const [copied, setCopied] = useState(false)

  const openPicker = () => inputRef.current?.click()

  const handleFiles = async (list) => {
    for (const file of list) await uploadOne(file)
  }

  const uploadOne = (file) => new Promise((resolve) => {
    setProgress({ name: file.name, pct: 0 })
    const form = new FormData()
    form.append('file', file)
    form.append('visibility', visibility)              // ← tell server public/private
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) setProgress({ name: file.name, pct: Math.round(e.loaded / e.total * 100) })
    }
    xhr.onload = async () => {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status === 200 && res.success) {
          tokens.fileSet(res.file.id, res.uploaderToken)

          if (res.visibility === 'private' && res.shareSlug) {
            // Private: DON'T add to public list. Save link + show share panel.
            const link = api.buildShareLink(res.shareSlug)
            privateLinks.add({
              slug: res.shareSlug, id: res.file.id, name: res.file.original_name,
              size: res.file.size, mime: res.file.mime_type, at: Date.now(),
            })
            let qr = ''
            try { qr = await QRCode.toDataURL(link, { width: 220, margin: 1 }) } catch {}
            setSharePanel({ link, qr, name: res.file.original_name })
            toast.success('Private file ready — copy your link')
          } else {
            // Public: show on board as before.
            upsertLocal({ ...res.file, _self: true })
            toast.success('Uploaded')
          }
        } else toast.error(res.error || 'Upload failed')
      } catch { toast.error('Server error') }
      resolve()
    }
    xhr.onerror = () => { setProgress(null); toast.error('Network error. Try again.'); resolve() }
    xhr.send(form)
  })

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(sharePanel.link)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch { toast.error('Could not copy') }
  }

  return (
    <div>
      {/* Public / Private toggle */}
      <div className="flex items-center gap-1.5 mb-3">
        <button onClick={() => setVisibility('public')}
          className={`chip transition-colors ${visibility === 'public'
            ? 'bg-brand-500 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Globe size={13} /> Public
        </button>
        <button onClick={() => setVisibility('private')}
          className={`chip transition-colors ${visibility === 'private'
            ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Lock size={13} /> Private
        </button>
        <span className="text-xs text-slate-400 ml-1">
          {visibility === 'public'
            ? 'Visible to everyone on campus'
            : 'Only reachable by a secret link'}
        </span>
      </div>

      <div
        onClick={e => e.target === e.currentTarget && openPicker()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) handleFiles([...e.dataTransfer.files]) }}
        className={`relative rounded-xl2 border-2 border-dashed cursor-pointer text-center
          px-6 py-10 transition-all duration-200 group
          ${drag
            ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 scale-[1.005] shadow-glow'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10'}`}
      >
        <div className="pointer-events-none flex flex-col items-center gap-2">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all
            ${drag ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 group-hover:scale-105'}`}>
            {visibility === 'private' ? <Lock size={24} /> : <UploadCloud size={26} />}
          </div>
          <p className="font-semibold text-[15px] mt-1">
            {visibility === 'private' ? 'Drop a private file' : 'Drop files to share instantly'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            or <span className="text-brand-600 dark:text-brand-400 font-medium">click to browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF · DOCX · PPTX · XLSX · Images · ZIP — up to 100 MB</p>
        </div>
        <input ref={inputRef} type="file" multiple hidden
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar"
          onChange={e => handleFiles([...e.target.files])} />
      </div>

      {/* Upload progress */}
      {progress && (
        <div className="card mt-3 px-4 py-3 animate-fadeUp">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center gap-2 font-medium truncate">
              <Loader2 size={15} className="animate-spin text-brand-500 shrink-0" />
              <span className="truncate">{progress.name}</span>
            </span>
            <span className="text-slate-500 tabular-nums shrink-0 ml-2">{progress.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-200"
                 style={{ width: progress.pct + '%' }} />
          </div>
        </div>
      )}

      {/* Private share panel — the one moment to grab the link */}
      {sharePanel && (
        <div className="card mt-3 p-4 animate-fadeUp border-brand-300 dark:border-brand-800">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 flex items-center justify-center shrink-0">
                <Lock size={15} />
              </div>
              <div>
                <p className="text-sm font-semibold">Private link ready</p>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">{sharePanel.name}</p>
              </div>
            </div>
            <button onClick={() => setSharePanel(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-3 items-center flex-col sm:flex-row">
            {sharePanel.qr && (
              <img src={sharePanel.qr} alt="QR code" className="w-28 h-28 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0" />
            )}
            <div className="flex-1 w-full min-w-0">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1.5">
                ⚠ Save this link now — private files don't appear on the board.
              </p>
              <div className="flex gap-1.5">
                <input readOnly value={sharePanel.link}
                  onFocus={e => e.target.select()}
                  className="input text-xs flex-1 min-w-0" />
                <button onClick={copyLink} className="btn btn-primary text-xs px-3 shrink-0">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Also saved under “My Private Links” below.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
