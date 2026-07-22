import { useEffect, useState } from 'react'
import NoteEditor from '../components/notes/NoteEditor'
import NoteCard from '../components/notes/NoteCard'
import { EmptyState, Skeleton } from '../components/ui'
import { api, tokens } from '../lib/api'
import { useSocket } from '../context/SocketContext'

export default function Notes() {
  const { socket } = useSocket()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listNotes().then(n => { setNotes(n); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!socket) return
    const onAdd    = n => setNotes(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev])
    const onUpdate = n => setNotes(prev => prev.map(x => x.id === n.id ? { ...x, ...n } : x))
    const onRemove = ({ id }) => setNotes(prev => prev.filter(x => x.id !== id))
    const onInit   = list => setNotes(list)
    socket.on('note:added', onAdd)
    socket.on('note:updated', onUpdate)
    socket.on('note:removed', onRemove)
    socket.on('notes:init', onInit)
    return () => {
      socket.off('note:added', onAdd)
      socket.off('note:updated', onUpdate)
      socket.off('note:removed', onRemove)
      socket.off('notes:init', onInit)
    }
  }, [socket])

  const create = async ({ title, content, color }) => {
    const res = await api.createNote({ title, content, color })
    tokens.noteSet(res.note.id, res.ownerToken)
    setNotes(prev => prev.some(x => x.id === res.note.id) ? prev : [res.note, ...prev])
  }

  return (
    <div className="animate-fadeUp">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Notes Board</h1>
        <p className="text-sm text-slate-400 mt-1">A live notice board. Post a note — everyone sees it instantly.</p>
      </div>

      <NoteEditor onSubmit={create} />

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : notes.length === 0 ? (
          <EmptyState icon="📝" title="No notes yet" sub="Be the first to post something" />
        ) : (
          <div className="columns-1 md:columns-2 gap-3">
            {notes.map(n => (
              <NoteCard key={n.id} note={n}
                onRemoved={id => setNotes(prev => prev.filter(x => x.id !== id))}
                onUpdated={u => setNotes(prev => prev.map(x => x.id === u.id ? u : x))} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
