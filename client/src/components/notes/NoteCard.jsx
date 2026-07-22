import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { timeAgo } from '../../lib/format'
import { api, tokens } from '../../lib/api'
import { useToast } from '../../context/ToastContext'

const COLOR_CLS = {
  default: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
  green:   'bg-brand-50 dark:bg-brand-900/15 border-brand-200 dark:border-brand-900/40',
  amber:   'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-900/40',
  blue:    'bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-900/40',
  purple:  'bg-purple-50 dark:bg-purple-900/15 border-purple-200 dark:border-purple-900/40',
}

export default function NoteCard({ note, onRemoved, onUpdated }) {
  const toast = useToast()
  const mine = !!tokens.noteGet(note.id)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)

  const save = async () => {
    try {
      await api.updateNote(note.id, { token: tokens.noteGet(note.id), title, content })
      setEditing(false)
      onUpdated?.({ ...note, title, content, updated_at: Date.now() })
      toast.success('Note updated')
    } catch (e) { toast.error(e.message) }
  }

  const del = async () => {
    if (!confirm('Delete this note?')) return
    try {
      await api.deleteNote(note.id, tokens.noteGet(note.id))
      tokens.noteDel(note.id)
      onRemoved?.(note.id)
      toast.success('Note deleted')
    } catch (e) { toast.error(e.message) }
  }

  const cls = COLOR_CLS[note.color] || COLOR_CLS.default

  return (
    <div className={`rounded-xl2 border shadow-card p-4 break-inside-avoid mb-3 animate-fadeUp ${cls}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        {editing
          ? <input value={title} onChange={e => setTitle(e.target.value)}
              className="flex-1 bg-transparent font-semibold text-[15px] outline-none border-b border-slate-300 dark:border-slate-600" />
          : note.title && <h3 className="font-semibold text-[15px] flex-1">{note.title}</h3>}
        {mine && !editing && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400" aria-label="Edit"><Pencil size={14} /></button>
            <button onClick={del} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500" aria-label="Delete"><Trash2 size={14} /></button>
          </div>
        )}
        {editing && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={save} className="p-1 rounded hover:bg-brand-50 text-brand-600" aria-label="Save"><Check size={15} /></button>
            <button onClick={() => { setEditing(false); setTitle(note.title); setContent(note.content) }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Cancel"><X size={15} /></button>
          </div>
        )}
      </div>

      {editing
        ? <div contentEditable suppressContentEditableWarning
            onInput={e => setContent(e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{ __html: content }}
            className="note-body text-sm outline-none border border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[60px]" />
        : <div className="note-body text-sm text-slate-700 dark:text-slate-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: note.content }} />}

      <div className="text-[11px] text-slate-400 mt-2.5">{timeAgo(note.updated_at)}</div>
    </div>
  )
}
