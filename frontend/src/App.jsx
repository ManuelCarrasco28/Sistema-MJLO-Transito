import { useState, useRef, useEffect } from 'react'
import { sampleNotifications } from '../public/js/dashboardData'
import { Login } from './components/auth/Login'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { MetricCards } from './components/dashboard/MetricCards'
import { QuickActions } from './components/dashboard/QuickActions'
import { ChartsSection } from './components/dashboard/ChartsSection'

function Dashboard({ onLogout }) {
  const [activeItem, setActiveItem] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
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
    <main
      className={`min-h-dvh bg-[#eef6fb] text-slate-900 transition-colors duration-200 dark:bg-[#0b1120] dark:text-slate-100 lg:grid lg:h-dvh lg:overflow-hidden ${
        sidebarHidden ? 'lg:grid-cols-[minmax(0,1fr)]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]'
      }`}
    >
      <Sidebar
        activeItem={activeItem}
        onSelect={setActiveItem}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={onLogout}
        hiddenOnDesktop={sidebarHidden}
      />
      <div className="min-w-0 lg:h-dvh lg:overflow-y-auto">
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          sidebarHidden={sidebarHidden}
          onToggleSidebar={() => setSidebarHidden((current) => !current)}
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

        <div className="mx-auto max-w-[96rem] space-y-6 p-4 sm:p-6 lg:p-7 xl:p-8">
          <div className="rounded-2xl border border-blue-900/10 bg-[#123b6d] p-5 text-white shadow-[0_12px_28px_rgba(15,42,82,0.18)] dark:border-blue-900/40 dark:bg-[#102a4d] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="border-l-4 border-cyan-300 pl-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                  Municipalidad Distrital de José Leonardo Ortiz
                </p>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[2rem]">
                  Panel de Control Operativo
                </h1>
                <p className="mt-1 text-sm text-blue-50/90">
                  Subgerencia de Tránsito, Transporte y Seguridad Vial · MDJLO
                </p>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[32rem]">
                {[
                  ['Turno', 'Diario'],
                  ['Sede', 'Palacio Municipal'],
                  ['Fecha', '04/09/2026'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-100/80">{label}</p>
                    <p className="mt-1 font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white sm:text-xl">
                Resumen de gestión municipal
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Indicadores simulados para presentación del sistema.
              </p>
            </div>
          </div>

          <MetricCards />
          <QuickActions />
          <ChartsSection />
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
