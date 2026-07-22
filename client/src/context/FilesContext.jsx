import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useSocket } from './SocketContext'
import { useToast } from './ToastContext'

const FilesContext = createContext()
export const useFiles = () => useContext(FilesContext)

export function FilesProvider({ children }) {
  const { socket } = useSocket()
  const toast = useToast()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  const upsert = useCallback((f) => {
    setFiles(prev => {
      const i = prev.findIndex(x => x.id === f.id)
      if (i === -1) return [{ ...f, _isNew: true }, ...prev]
      const copy = [...prev]; copy[i] = { ...copy[i], ...f }; return copy
    })
  }, [])

  const remove = useCallback((id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  useEffect(() => {
    if (!socket) return
    const onInit  = list => { setFiles(list); setLoading(false) }
    const onAdd   = f => { upsert(f); if (!f._self) toast.success(`New file: ${f.original_name}`) }
    const onRemove= ({ id }) => remove(id)
    const onBadge = ({ id, pdf_status, pdf_stored_name }) => {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, pdf_status, ...(pdf_stored_name && { pdf_stored_name }) } : f))
      if (pdf_status === 'ready') toast.info('A file is now ready to print')
    }
    socket.on('init', onInit)
    socket.on('file:added', onAdd)
    socket.on('file:removed', onRemove)
    socket.on('file:badge_update', onBadge)
    // request current state if already connected
    if (socket.connected) socket.emit('request:init')
    return () => {
      socket.off('init', onInit)
      socket.off('file:added', onAdd)
      socket.off('file:removed', onRemove)
      socket.off('file:badge_update', onBadge)
    }
  }, [socket, upsert, remove, toast])

  // Derived stats
  const stats = {
    count: files.length,
    bytes: files.reduce((s, f) => s + (f.size || 0), 0),
    ready: files.filter(f => f.pdf_status === 'ready' || f.mime_type === 'application/pdf').length,
  }

  return (
    <FilesContext.Provider value={{ files, loading, stats, upsertLocal: upsert, removeLocal: remove }}>
      {children}
    </FilesContext.Provider>
  )
}
