import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import RightPanel from './RightPanel'
import Footer from './Footer'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <Header onMenu={() => setMenuOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="flex-1 min-w-0 overflow-auto flex flex-col">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
            <Outlet />
          </div>
          <Footer />
        </main>
        <RightPanel />
      </div>
    </div>
  )
}
