import { useState } from 'react'
import {
  Zap, ShieldCheck, Printer, Trash2, UploadCloud,
  Globe, KeyRound, Combine, Clock, HelpCircle, MessageSquarePlus,
} from 'lucide-react'
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

// ── HELP — side-by-side topic layout ───────────────────────────────
const TOPICS = [
  {
    key: 'public', icon: Globe, label: 'Public Files',
    body: (
      <>
        <p>Public files are the default way to share on XIE Files — drop a file and it appears for <strong>everyone on campus instantly</strong>, no login needed.</p>
        <ul className="list-disc pl-5 mt-3 space-y-1.5">
          <li>Go to <strong>Home</strong>, make sure the <strong>Public</strong> toggle is selected, then drag a file onto the upload area (or click to browse).</li>
          <li>It shows up on the shared board for every open browser within a second.</li>
          <li>Anyone can preview, download, or print it.</li>
          <li>Only you (the uploader) can delete your own file — a delete button appears on files you uploaded from this device.</li>
        </ul>
      </>
    ),
  },
  {
    key: 'otp', icon: KeyRound, label: 'Private Files (OTP)',
    body: (
      <>
        <p>Need to share something just with one person or a small group? Use <strong>OTP Share</strong> instead of Public.</p>
        <ul className="list-disc pl-5 mt-3 space-y-1.5">
          <li>On Home, switch the upload toggle to <strong>OTP Share</strong>, then add one or more files. They upload quietly and don't appear on the public board.</li>
          <li>Once you've added everything, click <strong>Share &amp; Get OTP</strong> — you'll get a 4-digit code.</li>
          <li>Send that code to whoever needs the files (WhatsApp, in person, however you like).</li>
          <li>They open <strong>Access with OTP</strong> from the sidebar, type in the code, and see every file in that batch — with preview, download, and print.</li>
          <li>The code stays valid for <strong>24 hours</strong>. If you never press Share, unshared files are automatically cleared after <strong>1 hour</strong>.</li>
          <li>Only the uploader sees a delete option on OTP files — anyone else who enters the code can only view and download.</li>
        </ul>
      </>
    ),
  },
  {
    key: 'merge', icon: Combine, label: 'Merge PDF',
    body: (
      <>
        <p>Combine several PDFs into a single file — handy before printing a full assignment or report.</p>
        <ul className="list-disc pl-5 mt-3 space-y-1.5">
          <li>Open <strong>Merge PDF</strong> from the sidebar.</li>
          <li>Add 2 or more PDFs by dragging them in or browsing.</li>
          <li>Drag the cards to set the order you want them combined in.</li>
          <li>Click <strong>Merge &amp; Download</strong> — the combined PDF downloads straight away. Nothing is stored on the server.</li>
        </ul>
      </>
    ),
  },
  {
    key: 'limits', icon: Clock, label: 'Expiry &amp; Limits',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Every uploaded file auto-deletes after <strong>30 days</strong>.</li>
          <li>You can delete your own files anytime before that.</li>
          <li>Maximum file size is <strong>100 MB</strong> per upload.</li>
          <li>Supported types: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT, images, ZIP/RAR.</li>
          <li>DOCX/PPTX/XLSX files can always be downloaded, but in-browser preview is only available for PDFs, images, and text files.</li>
        </ul>
      </>
    ),
  },
  {
    key: 'faq', icon: HelpCircle, label: 'FAQ',
    body: (
      <div className="space-y-4">
        {[
          ['Do I need an account?', 'No. XIE Files has no login for students — open the page and start sharing.'],
          ['How do I print a file?', 'Open Preview on any file and click Print — your browser\'s print dialog opens with the document loaded.'],
          ['Who can see my private (OTP) files?', 'Only people who have the 4-digit code. They never appear on the public board.'],
          ['What if I lose my OTP code?', 'You\'ll need to re-upload and share again — codes aren\'t recoverable once forgotten, for everyone\'s safety.'],
          ['Can I delete a file I uploaded?', 'Yes — a delete button appears on files uploaded from the same browser you\'re using.'],
        ].map(([q, a]) => (
          <div key={q}>
            <p className="text-sm font-medium">{q}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    ),
  },
]

export function Help() {
  const [active, setActive] = useState(TOPICS[0].key)
  const topic = TOPICS.find(t => t.key === active) || TOPICS[0]

  return (
    <div className="animate-fadeUp">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Help &amp; Guide</h1>
        <p className="text-sm text-slate-400 mt-1">Everything you need to know, in one place.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Topic nav — horizontal scroll on mobile, vertical sidebar on desktop */}
        <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0 md:w-56 shrink-0">
          {TOPICS.map(t => {
            const Icon = t.icon
            const isActive = t.key === active
            return (
              <button key={t.key} onClick={() => setActive(t.key)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0
                  transition-colors text-left
                  ${isActive
                    ? 'bg-brand-500 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'}`}>
                <Icon size={16} className="shrink-0" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content panel */}
        <div className="card p-5 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <topic.icon size={18} />
            </div>
            <h2 className="font-semibold text-[16px]">{topic.label}</h2>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {topic.body}
          </div>
        </div>
      </div>

      <div className="card p-4 mt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <MessageSquarePlus size={19} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Still stuck? Drop a note on the <span className="font-medium text-slate-700 dark:text-slate-200">Feedback</span> page — the admin reads every one.
        </p>
      </div>
    </div>
  )
}