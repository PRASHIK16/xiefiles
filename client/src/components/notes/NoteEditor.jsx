import { useRef, useState } from 'react'
import { Bold, Italic, Underline, List, Code, Image as ImageIcon, Send } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const COLORS = [
  { key: 'default', cls: 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700' },
  { key: 'green',   cls: 'bg-brand-50 dark:bg-brand-900/20 border-brand-300' },
  { key: 'amber',   cls: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300' },
  { key: 'blue',    cls: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' },
  { key: 'purple',  cls: 'bg-purple-50 dark:bg-purple-900/20 border-purple-300' },
]

export default function NoteEditor({ onSubmit }) {
  const bodyRef = useRef(null)
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('default')
  const [busy, setBusy] = useState(false)

  const cmd = (command) => { document.execCommand(command, false, null); bodyRef.current?.focus() }
  const codeBlock = () => { document.execCommand('formatBlock', false, 'pre'); bodyRef.current?.focus() }

  const onPaste = (e) => {
    const items = e.clipboardData?.items || []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file.size > 3 * 1024 * 1024) { toast.error('Image too large (max 3 MB)'); return }
        const reader = new FileReader()
        reader.onload = () => {
          document.execCommand('insertHTML', false,
            `<img src="${reader.result}" style="max-width:100%;border-radius:8px;margin:6px 0" />`)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const pickImage = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'image/*'
    inp.onchange = () => {
      const file = inp.files[0]
      if (!file) return
      if (file.size > 3 * 1024 * 1024) { toast.error('Image too large (max 3 MB)'); return }
      const reader = new FileReader()
      reader.onload = () => {
        bodyRef.current?.focus()
        document.execCommand('insertHTML', false,
          `<img src="${reader.result}" style="max-width:100%;border-radius:8px;margin:6px 0" />`)
      }
      reader.readAsDataURL(file)
    }
    inp.click()
  }

  const submit = async () => {
    const content = bodyRef.current?.innerHTML.trim() || ''
    const plain = bodyRef.current?.innerText.trim() || ''
    if (!plain && !title.trim()) { toast.error('Write something first'); return }
    setBusy(true)
    try {
      await onSubmit({ title: title.trim(), content, color })
      setTitle('')
      if (bodyRef.current) bodyRef.current.innerHTML = ''
      setColor('default')
      toast.success('Note posted')
    } catch (e) { toast.error(e.message) }
    setBusy(false)
  }

  const Tool = ({ icon: Icon, onClick, label }) => (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} title={label}
      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
      <Icon size={16} />
    </button>
  )

  const colorCls = COLORS.find(c => c.key === color)?.cls || COLORS[0].cls

  return (
    <div className={`rounded-xl2 border shadow-card p-4 transition-colors ${colorCls}`}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title (optional)"
        className="w-full bg-transparent font-semibold text-[15px] outline-none placeholder:text-slate-400 mb-2" />

      <div className="flex items-center gap-0.5 flex-wrap border-y border-slate-200/70 dark:border-slate-700/70 py-1 mb-2">
        <Tool icon={Bold}      onClick={() => cmd('bold')}          label="Bold" />
        <Tool icon={Italic}    onClick={() => cmd('italic')}        label="Italic" />
        <Tool icon={Underline} onClick={() => cmd('underline')}     label="Underline" />
        <Tool icon={List}      onClick={() => cmd('insertUnorderedList')} label="Bullet list" />
        <Tool icon={Code}      onClick={codeBlock}                  label="Code block" />
        <Tool icon={ImageIcon} onClick={pickImage}                  label="Insert image" />
        <div className="flex items-center gap-1 ml-auto">
          {COLORS.map(c => (
            <button key={c.key} onClick={() => setColor(c.key)} title={c.key}
              className={`w-4 h-4 rounded-full border ${c.cls} ${color === c.key ? 'ring-2 ring-brand-400 ring-offset-1 dark:ring-offset-slate-900' : ''}`} />
          ))}
        </div>
      </div>

      <div ref={bodyRef} contentEditable onPaste={onPaste} suppressContentEditableWarning
        data-placeholder="Write or paste anything… (Ctrl+V for screenshots)"
        className="note-body min-h-[80px] max-h-[300px] overflow-auto text-sm outline-none
                   text-slate-700 dark:text-slate-200 leading-relaxed
                   empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400" />

      <div className="flex justify-end mt-3">
        <button onClick={submit} disabled={busy} className="btn btn-primary text-sm disabled:opacity-50">
          <Send size={15} /> {busy ? 'Posting…' : 'Post Note'}
        </button>
      </div>
    </div>
  )
}
