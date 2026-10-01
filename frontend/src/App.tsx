import { Navbar } from './components/Navbar.tsx'
import { Dashboard } from './pages/Dashboard.tsx'

export default function App() {
  return (
    <div className="min-h-svh bg-canvas font-sans text-ink">
      <Navbar />
      <Dashboard />
    </div>
  )
}
