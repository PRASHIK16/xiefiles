import { useState, useRef } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Combine, UploadCloud, FileText, GripVertical, X, Loader2, Download } from 'lucide-react'
import { EmptyState } from '../components/ui'
import { bytes } from '../lib/format'
import { useToast } from '../context/ToastContext'

// ── One sortable PDF row ──────────────────────────────────────────
function SortableItem({ item, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}
      className="card p-3 flex items-center gap-3 bg-white dark:bg-slate-900">
      <button {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 touch-none"
        aria-label="Drag to reorder">
        <GripVertical size={18} />
      </button>
      <span className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400
                       flex items-center justify-center text-xs font-bold shrink-0">
        {index + 1}
      </span>
      <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400
                      flex items-center justify-center shrink-0">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" title={item.file.name}>{item.file.name}</p>
        <p className="text-[11px] text-slate-400">{bytes(item.file.size)}</p>
      </div>
      <button onClick={() => onRemove(item.id)}
        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 shrink-0"
        aria-label="Remove">
        <X size={16} />
      </button>
    </div>
  )
}

export default function MergePdf() {
  const toast = useToast()
  const inputRef = useRef(null)
  const [items, setItems] = useState([])       // { id, file }
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const addFiles = (fileList) => {
    const pdfs = [...fileList].filter(f => f.type === 'application/pdf')
    const rejected = fileList.length - pdfs.length
    if (rejected > 0) toast.info(`${rejected} non-PDF file(s) skipped`)
    if (pdfs.length === 0) return
    const next = pdfs.map(f => ({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`, file: f }))
    setItems(prev => [...prev, ...next])
  }

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    setItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id))
  const clearAll = () => setItems([])

  const merge = async () => {
    if (items.length < 2) { toast.error('Add at least 2 PDFs to merge'); return }
    setBusy(true)
    try {
      const form = new FormData()
      items.forEach(it => form.append('files', it.file))
      // order = indexes in current display order (0,1,2,...) since we append in order
      form.append('order', items.map((_, i) => i).join(','))

      const res = await fetch('/api/merge-pdf', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Merge failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'merged.pdf'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Merged PDF downloaded')
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }

  return (
    <div className="animate-fadeUp">
      <div className="mb-5 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
          <Combine size={22} className="text-brand-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Merge PDF</h1>
          <p className="text-sm text-slate-400 mt-1">Combine multiple PDFs into one. Drag to set the order.</p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onClick={e => e.target === e.currentTarget && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
        className={`rounded-xl2 border-2 border-dashed cursor-pointer text-center px-6 py-8 transition-all
          ${drag
            ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 shadow-glow'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand-400'}`}
      >
        <div className="pointer-events-none flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 flex items-center justify-center">
            <UploadCloud size={22} />
          </div>
          <p className="font-semibold text-sm">Drop PDFs here or <span className="text-brand-600 dark:text-brand-400">click to browse</span></p>
          <p className="text-xs text-slate-400">PDF only · up to 50 MB each · max 20 files</p>
        </div>
        <input ref={inputRef} type="file" multiple accept="application/pdf,.pdf" hidden
          onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
      </div>

      {/* List + reorder */}
      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState icon="📄" title="No PDFs added yet" sub="Add 2 or more PDFs to merge them" />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">{items.length} PDF{items.length !== 1 ? 's' : ''} · drag to reorder</p>
              <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500">Clear all</button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {items.map((item, index) => (
                    <SortableItem key={item.id} item={item} index={index} onRemove={remove} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button onClick={merge} disabled={busy || items.length < 2}
              className="btn btn-primary w-full justify-center mt-5 py-2.5 disabled:opacity-50">
              {busy ? <><Loader2 size={17} className="animate-spin" /> Merging…</>
                    : <><Download size={17} /> Merge &amp; Download</>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}