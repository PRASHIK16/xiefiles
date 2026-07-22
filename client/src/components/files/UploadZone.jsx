import { useRef, useState } from 'react'
import { UploadCloud, Loader2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useFiles } from '../../context/FilesContext'
import { tokens } from '../../lib/api'

export default function UploadZone() {
  const inputRef = useRef(null)
  const toast = useToast()
  const { upsertLocal } = useFiles()
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState(null) // { name, pct }

  const openPicker = () => inputRef.current?.click()

  const handleFiles = async (list) => {
    for (const file of list) await uploadOne(file)
  }

  const uploadOne = (file) => new Promise((resolve) => {
    setProgress({ name: file.name, pct: 0 })
    const form = new FormData()
    form.append('file', file)
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
          upsertLocal({ ...res.file, _self: true })
          toast.success('Uploaded')
        } else toast.error(res.error || 'Upload failed')
      } catch { toast.error('Server error') }
      resolve()
    }
    xhr.onerror = () => { setProgress(null); toast.error('Network error. Try again.'); resolve() }
    xhr.send(form)
  })

  return (
    <div>
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
            <UploadCloud size={26} />
          </div>
          <p className="font-semibold text-[15px] mt-1">Drop files to share instantly</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            or <span className="text-brand-600 dark:text-brand-400 font-medium">click to browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF · DOCX · PPTX · XLSX · Images · ZIP — up to 100 MB</p>
        </div>
        <input ref={inputRef} type="file" multiple hidden
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar"
          onChange={e => handleFiles([...e.target.files])} />
      </div>

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
    </div>
  )
}
