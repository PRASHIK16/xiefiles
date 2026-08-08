import { useState, useRef } from 'react'
import { KeyRound, Download, Printer, Eye, Trash2, Loader2, ArrowLeft, FileText, FileDown } from 'lucide-react'
import { api, tokens } from '../lib/api'
import { bytes, previewKind, mimeLabel } from '../lib/format'
import { useToast } from '../context/ToastContext'
import FileIcon from '../components/files/FileIcon'

// Map raw backend error text to friendlier, more actionable copy —
// no backend change required, this is purely a display-layer mapping.
function friendlyOtpError(message) {
  if (!message) return 'Something went wrong. Please try again.'
  if (/too many attempts/i.test(message)) return message // already explains the wait time
  if (/invalid or expired/i.test(message)) return 'That code doesn’t match any files. Double-check it, or ask for a new one.'
  if (/valid 4-digit/i.test(message)) return 'Enter all 4 digits of the code.'
  return message
}

// ── Inline preview — fills the content area (Google Drive style) ──
function InlinePreview({ file, otp, onBack }) {
  const toast = useToast()
  const kind = previewKind(file)
  const inlineUrl = api.otpPdfUrl(file.id, otp, true)
  const rawUrl    = api.otpDownloadUrl(file.id, otp)
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
        <button onClick={onBack} className="btn btn-ghost text-sm transition-all active:scale-95">
          <ArrowLeft size={16} /> Back to files
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate hidden sm:block max-w-[240px]" title={file.original_name}>
            {file.original_name}
          </span>
          {canPrint && (
            <button onClick={print} className="btn btn-ghost text-xs px-3 py-1.5 transition-all active:scale-95">
              <Printer size={14} /> <span className="hidden sm:inline">Print</span>
            </button>
          )}
          <button onClick={download} className="btn btn-primary text-xs px-3 py-1.5 transition-all active:scale-95">
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
        {kind !== 'pdf' && kind !== 'image' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6">
            <FileIcon mime={file.mime_type} />
            <div>
              <p className="font-semibold text-slate-200">Preview not available</p>
              <p className="text-sm text-slate-400 mt-1">
                {mimeLabel(file.mime_type)} files can’t be shown in the browser — download to open it.
              </p>
            </div>
            <button onClick={download} className="btn btn-primary text-sm transition-all active:scale-95">
              <FileDown size={16} /> Download to open
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AccessOtp() {
  const toast = useToast()
  const [digits, setDigits] = useState(['', '', '', ''])
  const [busy, setBusy] = useState(false)
  const [files, setFiles] = useState(null)     // null = not accessed yet
  const [preview, setPreview] = useState(null) // file being previewed inline
  const inputs = useRef([])

  const otp = digits.join('')

  const setDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = v; setDigits(next)
    if (v && i < 3) inputs.current[i + 1]?.focus()
  }

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const onPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4)
    if (text) {
      e.preventDefault()
      const next = ['', '', '', '']
      text.split('').forEach((d, i) => next[i] = d)
      setDigits(next)
      inputs.current[Math.min(text.length, 3)]?.focus()
    }
  }

  const access = async () => {
    if (otp.length !== 4) { toast.error('Enter all 4 digits of the code.'); return }
    setBusy(true)
    try {
      const res = await api.accessOtp(otp)
      setFiles(res.files || [])
      if ((res.files || []).length === 0) toast.info('No files were found for this code.')
    } catch (e) {
      toast.error(friendlyOtpError(e.message))
      setFiles(null)
    }
    setBusy(false)
  }

  const reset = () => { setDigits(['', '', '', '']); setFiles(null); setPreview(null); inputs.current[0]?.focus() }

  const canPrint = f => ['pdf', 'image'].includes(previewKind(f))

  const printFile = (f) => {
    if (!canPrint(f)) { toast.info('Download this file to print it'); return }
    const url = api.otpPdfUrl(f.id, otp, true)
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

  // Owner-only delete — only shows if this browser uploaded the file (token present)
  const deleteFile = async (f) => {
    const token = tokens.fileGet(f.id)
    if (!token) return
    if (!confirm(`Delete "${f.original_name}"? This can't be undone.`)) return
    try {
      await api.deleteFile(f.id, token)
      tokens.fileDel(f.id)
      setFiles(prev => prev.filter(x => x.id !== f.id))
      toast.success('File deleted')
    } catch (e) { toast.error(friendlyOtpError(e.message)) }
  }

  // ── Inline preview view — replaces the list ─────────────────────
  if (preview) {
    return (
      <div className="animate-fadeUp">
        <InlinePreview file={preview} otp={otp} onBack={() => setPreview(null)} />
      </div>
    )
  }

  return (
    <div className="animate-fadeUp max-w-2xl">
      <div className="mb-5 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
          <KeyRound size={22} className="text-brand-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Access with OTP</h1>
          <p className="text-sm text-slate-400 mt-1">Enter the 4-digit code someone shared with you.</p>
        </div>
      </div>

      {/* OTP input */}
      {!files && (
        <div className="card p-6 flex flex-col items-center gap-5">
          <div className="flex gap-3" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input key={i} ref={el => inputs.current[i] = el}
                value={d} onChange={e => setDigit(i, e.target.value)}
                onKeyDown={e => onKeyDown(i, e)}
                disabled={busy}
                inputMode="numeric" maxLength={1}
                className="w-14 h-16 text-center text-2xl font-bold rounded-xl border-2
                           border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                           outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25
                           disabled:opacity-50 transition" />
            ))}
          </div>
          <button onClick={access} disabled={busy || otp.length !== 4}
            className="btn btn-primary px-8 disabled:opacity-50 transition-all active:scale-[0.98]">
            {busy ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : 'Access Files'}
          </button>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            Don’t have a code? Ask whoever shared the files with you — codes are 4 digits and valid for 24 hours.
          </p>
        </div>
      )}

      {/* Results */}
      {files && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold">
              {files.length} file{files.length !== 1 ? 's' : ''} found
            </p>
            <button onClick={reset} className="btn btn-ghost text-xs transition-all active:scale-95">
              <ArrowLeft size={14} /> Enter another code
            </button>
          </div>

          {files.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <FileText size={22} className="text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No files found for this code.</p>
              <p className="text-xs text-slate-400 mt-1">Double-check the digits, or ask the sender for a new code.</p>
              <button onClick={reset} className="btn btn-ghost text-xs mt-4 transition-all active:scale-95">
                Try another code
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {files.map(f => {
                const isOwner = !!tokens.fileGet(f.id)
                return (
                  <div key={f.id}
                    className="card p-4 flex flex-col gap-3 hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-start gap-3">
                      <FileIcon mime={f.mime_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" title={f.original_name}>{f.original_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{bytes(f.size)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setPreview(f)} className="btn btn-primary text-xs px-3 py-1.5 transition-all active:scale-95">
                        <Eye size={14} /> Preview
                      </button>
                      <button onClick={() => { window.location.href = api.otpDownloadUrl(f.id, otp) }}
                        className="btn btn-ghost text-xs px-3 py-1.5 transition-all active:scale-95">
                        <Download size={14} /> Download
                      </button>
                      <button onClick={() => printFile(f)} className="btn btn-ghost text-xs px-3 py-1.5 transition-all active:scale-95">
                        <Printer size={14} /> Print
                      </button>
                      {isOwner && (
                        <button onClick={() => deleteFile(f)} className="btn btn-danger text-xs px-2.5 py-1.5 transition-all active:scale-95" aria-label="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}