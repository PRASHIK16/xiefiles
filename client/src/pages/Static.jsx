import { useState } from 'react'
import { Zap, ShieldCheck, Printer, Trash2, UploadCloud, ChevronDown } from 'lucide-react'
import FileCard from '../components/files/FileCard'
import PreviewModal from '../components/files/PreviewModal'
import { EmptyState } from '../components/ui'
import { useFiles } from '../context/FilesContext'

// ── RECENT ────────────────────────────────────────────────────────
export function Recent() {
  const { files } = useFiles()
  const [preview, setPreview] = useState(null)
  const recent = files.slice(0, 12)
  return (
    <div className="animate-fadeUp">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Recent Uploads</h1>
        <p className="text-sm text-slate-400 mt-1">The latest files shared across campus.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recent.length === 0
          ? <EmptyState icon="🕒" title="Nothing recent" sub="Uploaded files will show up here" />
          : recent.map(f => <FileCard key={f.id} file={f} onPreview={setPreview} />)}
      </div>
      <PreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

// ── ABOUT ─────────────────────────────────────────────────────────
export function About() {
  const features = [
    { icon: Zap,         title: 'Instant sync',   desc: 'Files appear on every open browser in under a second — no refresh.' },
    { icon: Printer,     title: 'Smart printing', desc: 'Documents auto-convert to PDF so you can print straight from the browser.' },
    { icon: ShieldCheck, title: 'No accounts',    desc: 'No login, no password. Open the page and you\'re in.' },
    { icon: Trash2,      title: 'Auto-cleanup',   desc: 'Files delete themselves after 30 days. You can delete yours anytime.' },
  ]
  return (
    <div className="animate-fadeUp max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">About XIE Files</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          XIE Files removes the friction of sharing and printing academic files inside college.
          No WhatsApp compression, no Drive sharing settings, no pen drives, no cyber café queues —
          just drop a file and it's instantly available to print or download.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card p-4">
            <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
              <Icon size={19} />
            </div>
            <h3 className="font-semibold text-[15px]">{title}</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <div className="card p-5 mt-4">
        <h3 className="font-semibold mb-1">The story</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Built as a gift for juniors at Xavier Institute of Engineering by Prashik Dongre,
          Department of Information Technology. The goal was simple: save every student a few
          minutes, every single day.
        </p>
      </div>
    </div>
  )
}

// ── HELP ──────────────────────────────────────────────────────────
const FAQ = [
  { q: 'How do I share a file?', a: 'Go to Home, drag a file onto the upload area (or click to browse). It uploads and appears for everyone instantly.' },
  { q: 'How do I print?', a: 'Once a file shows a green "PDF Ready" badge, click Print. Your browser\'s print dialog opens with the document loaded.' },
  { q: 'What do the coloured badges mean?', a: '🟢 PDF Ready — print now. 🟡 Converting — wait a few seconds. 🔵 Original Only — download and print manually. 🔴 Failed — download the original file.' },
  { q: 'Can I delete a file I uploaded?', a: 'Yes. Files you uploaded show a delete button. Only you can delete your own files (from the same browser).' },
  { q: 'How long do files stay?', a: 'Files auto-delete after 30 days. Anyone can also delete their own files earlier.' },
  { q: 'Do I need an account?', a: 'No. XIE Files has no login. It works like a shared table — open it and start sharing.' },
]

export function Help() {
  const [open, setOpen] = useState(0)
  return (
    <div className="animate-fadeUp max-w-2xl">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Help &amp; FAQ</h1>
        <p className="text-sm text-slate-400 mt-1">Everything you need to know in 30 seconds.</p>
      </div>

      <div className="card divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
        {FAQ.map((item, i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="text-sm font-medium">{item.q}</span>
              <ChevronDown size={17} className={`text-slate-400 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && (
              <div className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed animate-fadeUp">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card p-4 mt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <UploadCloud size={19} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Still stuck? Drop a note on the <span className="font-medium text-slate-700 dark:text-slate-200">Feedback</span> page — the admin reads every one.
        </p>
      </div>
    </div>
  )
}
