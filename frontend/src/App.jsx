import { useState, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Login } from './components/auth/Login'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { DashboardHome } from './pages/DashboardHome'
import { Vehiculos } from './pages/Vehiculos'
import { Personas } from './pages/Personas'
import { Organizaciones } from './pages/Organizaciones'
import { Documentos } from './pages/Documentos'
import { Inspecciones } from './pages/Inspecciones'
import { Papeletas } from './pages/Papeletas'
import { CursosSeguridad } from './pages/CursosSeguridad'
import { Pagos } from './pages/Pagos'
import { Retenciones } from './pages/Retenciones'
import { Permisos } from './pages/Permisos'
import { apiFetch, getCachedData, setCachedData } from './config/api'

function Layout({ onLogout, user }) {
  const location = useLocation()
  
  useEffect(() => {
    const timer = setTimeout(async () => {
      const endpoints = ['/vehiculos', '/personas', '/organizaciones', '/documentos']
      for (const ep of endpoints) {
        if (!getCachedData(ep)) {
          try {
            const res = await apiFetch(ep)
            if (res.ok) {
              const payload = await res.json()
              if (payload?.data) setCachedData(ep, payload.data)
            }
          } catch (_) {}
        }
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  const getActiveItem = () => {
    const path = location.pathname
    if (path.includes('/vehiculos')) return 'Vehículos'
    if (path.includes('/personas')) return 'Personas'
    if (path.includes('/organizaciones')) return 'Organizaciones'
    if (path.includes('/documentos')) return 'Documentos'
    if (path.includes('/inspecciones')) return 'Inspecciones'
    if (path.includes('/papeletas')) return 'Papeletas'
    if (path.includes('/cursos')) return 'Cursos'
    if (path.includes('/pagos')) return 'Pagos'
    if (path.includes('/retenciones')) return 'Retenciones'
    if (path.includes('/permisos')) return 'Permisos'
    return 'Dashboard'
  }

  const [activeItem, setActiveItem] = useState(getActiveItem())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [notifications, setNotifications] = useState([])
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
    setActiveItem(getActiveItem())
  }, [location.pathname])

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
      <div className="min-w-0 lg:h-dvh lg:overflow-y-auto flex flex-col">
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
          user={user}
        />

        <div className="mx-auto w-full max-w-[96rem] flex-1 space-y-6 p-4 sm:p-6 lg:p-7 xl:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/vehiculos" element={<Vehiculos />} />
            <Route path="/personas" element={<Personas />} />
            <Route path="/organizaciones" element={<Organizaciones />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/inspecciones" element={<Inspecciones />} />
            <Route path="/papeletas" element={<Papeletas />} />
            <Route path="/cursos" element={<CursosSeguridad />} />
            <Route path="/cursos-seguridad" element={<CursosSeguridad />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/retenciones" element={<Retenciones />} />
            <Route path="/permisos" element={<Permisos />} />
            <Route path="*" element={
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">
                <h2 className="text-xl font-bold">Módulo en desarrollo</h2>
                <p className="mt-2 text-slate-500">Esta sección estará disponible próximamente.</p>
              </div>
            } />
          </Routes>
        </div>
      </div>
    </main>
  )
}

function App() {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null

    const savedUser = localStorage.getItem('user')
    if (!savedUser) return null

    try {
      return JSON.parse(savedUser)
    } catch {
      localStorage.removeItem('user')
      return null
    }
  })

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
  }
  
  return (
    <BrowserRouter>
      {user ? (
        <Layout onLogout={handleLogout} user={user} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </BrowserRouter>
  )
}

export default App
