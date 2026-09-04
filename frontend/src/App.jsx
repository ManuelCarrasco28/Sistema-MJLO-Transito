import { useState, useRef, useEffect } from 'react'
import { sampleNotifications } from '../public/js/dashboardData'
import { Icon } from './components/ui/Icon'
import { Login } from './components/auth/Login'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { MetricCards } from './components/dashboard/MetricCards'
import { QuickActions } from './components/dashboard/QuickActions'
import { ChartsSection } from './components/dashboard/ChartsSection'
import { ActivityTable } from './components/dashboard/ActivityTable'

function Dashboard({ onLogout }) {
  const [activeItem, setActiveItem] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState(sampleNotifications)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 lg:flex transition-colors duration-200">
      <Sidebar
        activeItem={activeItem}
        onSelect={setActiveItem}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={onLogout}
      />
      <div className="min-w-0 flex-1">
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          notifications={notifications}
          setNotifications={setNotifications}
          notifOpen={notifOpen}
          setNotifOpen={setNotifOpen}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          notifRef={notifRef}
          userMenuRef={userMenuRef}
          onLogout={onLogout}
        />

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white sm:text-3xl">
                Panel de Control Operativo
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Subgerencia de Tránsito, Transporte y Seguridad Vial · MDJLO
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-xs">
                <span className="size-2 rounded-full bg-emerald-500" />
                Actualizado en vivo
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <Icon name="document" className="size-3.5 text-slate-400" />
                <span>Exportar resumen</span>
              </button>
            </div>
          </div>

          <MetricCards />
          <QuickActions />
          <ChartsSection />
          <ActivityTable />
        </div>
      </div>
    </main>
  )
}

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  return authenticated ? (
    <Dashboard onLogout={() => setAuthenticated(false)} />
  ) : (
    <Login onLogin={() => setAuthenticated(true)} />
  )
}

export default App
