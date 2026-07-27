import { useRef, useState } from 'react'
import { UploadCloud, Loader2, Globe, KeyRound, Copy, Check, X, FileText, Send } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useFiles } from '../../context/FilesContext'
import { tokens } from '../../lib/api'
import { bytes } from '../../lib/format'

export default function UploadZone() {
  const inputRef = useRef(null)
  const toast = useToast()
  const { upsertLocal } = useFiles()

  const [mode, setMode] = useState('public')        // 'public' | 'otp'
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState(null)     // { name, pct }

  // OTP draft state
  // batchRef is a ref (not state) — it updates synchronously so every file
  // in the same upload batch sees the SAME id, even mid-loop. Using state
  // here caused a stale-closure bug where each file got a different batch id.
  const batchRef = useRef(null)
  const [drafts, setDrafts] = useState([])           // uploaded draft files (this session)
  const [sharing, setSharing] = useState(false)
  const [otpResult, setOtpResult] = useState(null)   // { otp, count }
  const [copied, setCopied] = useState(false)

  const openPicker = () => inputRef.current?.click()

  const handleFiles = async (list) => {
    for (const file of list) await uploadOne(file)
  }

  const uploadOne = (file) => new Promise((resolve) => {
    setProgress({ name: file.name, pct: 0 })
    const form = new FormData()
    form.append('file', file)
    form.append('visibility', mode)                  // 'public' or 'otp'
    if (mode === 'otp') {
      // Generate the batch id ONCE per session, synchronously via ref.
      // All files uploaded before "Share" is pressed reuse this same id.
      if (!batchRef.current) batchRef.current = crypto.randomUUID()
      form.append('batch', batchRef.current)
    }
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) setProgress({ name: file.name, pct: Math.round(e.loaded / e.total * 100) })
    }
    xhr.onload = () => {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status === 200 && res.success) {
          tokens.fileSet(res.file.id, res.uploaderToken)
          if (res.visibility === 'otp') {
            // draft — keep it locally, don't touch the public board
            setDrafts(prev => [...prev, res.file])
            setOtpResult(null)   // new upload invalidates any previous OTP for this session
          } else {
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

  const shareOtp = async () => {
    if (!batchRef.current || drafts.length === 0) { toast.error('Add files first'); return }
    setSharing(true)
    try {
      const res = await fetch('/api/otp/share', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: batchRef.current }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpResult({ otp: data.otp, count: data.count })
        toast.success('OTP generated')
      } else toast.error(data.error || 'Could not share')
    } catch { toast.error('Server error') }
    setSharing(false)
  }

  const copyOtp = async () => {
    try {
      await navigator.clipboard.writeText(otpResult.otp)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch { toast.error('Could not copy') }
  }

  const resetOtp = () => {
    batchRef.current = null   // fresh batch id for the next OTP session
    setDrafts([]); setOtpResult(null)
  }

  const isOtp = mode === 'otp'

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex items-center gap-1.5 mb-3">
        <button onClick={() => setMode('public')}
          className={`chip transition-colors ${mode === 'public'
            ? 'bg-brand-500 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Globe size={13} /> Public
        </button>
        <button onClick={() => setMode('otp')}
          className={`chip transition-colors ${mode === 'otp'
            ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <KeyRound size={13} /> OTP Share
        </button>
        <span className="text-xs text-slate-400 ml-1">
          {isOtp ? 'Files shared with a 4-digit code' : 'Visible to everyone on campus'}
        </span>
      </div>

      {/* Drop zone */}
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
            {isOtp ? <KeyRound size={24} /> : <UploadCloud size={26} />}
          </div>
          <p className="font-semibold text-[15px] mt-1">
            {isOtp ? 'Add files to share with a code' : 'Drop files to share instantly'}
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

      {/* OTP staging area — shows draft files + Share button */}
      {isOtp && drafts.length > 0 && !otpResult && (
        <div className="card mt-3 p-4 animate-fadeUp">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">{drafts.length} file{drafts.length !== 1 ? 's' : ''} ready to share</p>
            <button onClick={resetOtp} className="text-xs text-slate-400 hover:text-red-500">Clear</button>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {drafts.map(f => (
              <div key={f.id} className="flex items-center gap-2.5 text-sm">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <FileText size={15} className="text-slate-500" />
                </div>
                <span className="truncate flex-1">{f.original_name}</span>
                <span className="text-xs text-slate-400 shrink-0">{bytes(f.size)}</span>
              </div>
            ))}
          </div>
          <button onClick={shareOtp} disabled={sharing}
            className="btn btn-primary w-full justify-center disabled:opacity-50">
            {sharing ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                     : <><Send size={16} /> Share &amp; Get OTP</>}
          </button>
        </div>
      )}

      {/* OTP result — the code to share */}
      {otpResult && (
        <div className="card mt-3 p-5 animate-fadeUp border-brand-300 dark:border-brand-800 text-center">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <KeyRound size={15} className="text-brand-500" />
              {otpResult.count} file{otpResult.count !== 1 ? 's' : ''} shared
            </p>
            <button onClick={resetOtp} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Done">
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-2">Share this code — anyone can open the files with it</p>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="text-4xl font-extrabold tracking-[0.3em] font-display text-brand-600 dark:text-brand-400 pl-[0.3em]">
              {otpResult.otp}
            </div>
            <button onClick={copyOtp} className="btn btn-ghost text-xs px-2.5 py-2 shrink-0" title="Copy">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            ⚠ Valid for 24 hours. To access: open "Access with OTP" and enter this code.
          </p>
        </div>
      )}
    </div>
  )
}