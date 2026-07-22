import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()
export const useSocket = () => useContext(SocketContext)

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [status, setStatus] = useState('connecting') // connecting | live | reconnecting
  const [liveUsers, setLiveUsers] = useState(0)

  if (!socketRef.current) {
    socketRef.current = io({ autoConnect: true, transports: ['websocket', 'polling'] })
  }

  useEffect(() => {
    const s = socketRef.current
    const onConnect    = () => setStatus('live')
    const onDisconnect = () => setStatus('reconnecting')
    const onError      = () => setStatus('reconnecting')
    const onPresence   = ({ users }) => setLiveUsers(users)

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('connect_error', onError)
    s.on('presence', onPresence)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('connect_error', onError)
      s.off('presence', onPresence)
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, status, liveUsers }}>
      {children}
    </SocketContext.Provider>
  )
}
