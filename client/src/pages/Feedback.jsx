import { useState } from 'react'
import { Send, CheckCircle2, MessageSquareHeart } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

const TYPES = ['Suggestion', 'Bug / Issue', 'Feature Request', 'General']

export default function Feedback() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState('Suggestion')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!message.trim()) { toast.error('Please write your feedback'); return }
    setBusy(true)
    try {
      await api.submitFeedback({ name: name.trim() || 'Anonymous', type, message: message.trim() })
      setDone(true)
      setName(''); setMessage(''); setType('Suggestion')
    } catch (e) { toast.error(e.message) }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="animate-fadeUp flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-4">
          <CheckCircle2 size={30} className="text-brand-500" />
        </div>
        <h2 className="font-display text-xl font-bold">Thanks for your feedback!</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">It's been sent to the team and will help make XIE Files better.</p>
        <button onClick={() => setDone(false)} className="btn btn-ghost mt-5">Submit another</button>
      </div>
    )
  }

  return (
    <div className="animate-fadeUp max-w-xl">
      <div className="mb-5 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
          <MessageSquareHeart size={22} className="text-brand-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Feedback</h1>
          <p className="text-sm text-slate-400 mt-1">Found a bug? Have an idea? Tell us — only the admin sees this.</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Your name (optional)</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rohan (or leave blank)" className="input" />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`chip transition-colors ${type === t
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
            placeholder="Tell us what's on your mind…" className="input resize-none" />
        </div>

        <button onClick={submit} disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-50">
          <Send size={16} /> {busy ? 'Sending…' : 'Send Feedback'}
        </button>
      </div>
    </div>
  )
}
