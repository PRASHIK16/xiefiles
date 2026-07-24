import { Routes, Route } from 'react-router-dom'
import { FilesProvider } from './context/FilesContext'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Notes from './pages/Notes'
import Feedback from './pages/Feedback'
import Share from './pages/Share'
import { Recent, About, Help } from './pages/Static'

export default function App() {
  return (
    <FilesProvider>
      <Routes>
        {/* Private share page — standalone, outside the main layout */}
        <Route path="/f/:slug" element={<Share />} />

        <Route element={<Layout />}>
          <Route path="/"         element={<Home />} />
          <Route path="/notes"    element={<Notes />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/recent"   element={<Recent />} />
          <Route path="/about"    element={<About />} />
          <Route path="/help"     element={<Help />} />
          <Route path="*"         element={<Home />} />
        </Route>
      </Routes>
    </FilesProvider>
  )
}