import { useState, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Login } from './components/auth/Login'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { DashboardHome } from './pages/DashboardHome'
import { Vehiculos } from './pages/Vehiculos'
import { Personas } from './pages/Personas'
import { Personal } from './pages/Personal'
import { Asociaciones } from './pages/Asociaciones'
import { Documentos } from './pages/Documentos'
import { Inspecciones } from './pages/Inspecciones'
import { Papeletas } from './pages/Papeletas'
import { CursosSeguridad } from './pages/CursosSeguridad'
import { Pagos } from './pages/Pagos'
import { Retenciones } from './pages/Retenciones'
import { Permisos } from './pages/Permisos'
import { SuperAdminDashboard } from './pages/SuperAdminDashboard'
import { Operativos } from './pages/Operativos'
import { navigationGroups } from './config/navigation'
import { apiFetch } from './config/api'

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000

const isSuperAdminUser = (user) => user?.usuario?.toLowerCase() === 'superadmin'

function Layout({ onLogout, user, onUserUpdate }) {
  const location = useLocation()
  
  const getActiveItem = () => {
    const path = location.pathname
    if (path.includes('/superadmin/respaldo')) return 'Respaldo'
    if (path.includes('/superadmin/catalogos')) return 'Catálogos maestros'
    if (path.includes('/superadmin/auditoria')) return 'Auditoría y logs'
    if (path.includes('/superadmin/configuracion')) return 'Configuración'
    if (path.includes('/superadmin/roles')) return 'Roles y permisos'
    if (path.includes('/superadmin/usuarios')) return 'Gestión de usuarios'
    if (path.includes('/superadmin/personas')) return 'Personas'
    if (path.includes('/superadmin/trabajadores')) return 'Trabajadores'
    if (path.includes('/superadmin')) return 'Dashboard Super Admin'
    if (path.includes('/vehiculos')) return 'Vehículos'
    if (path.includes('/personas')) return 'Personas'
    if (path.includes('/personal')) return 'Personal'
    if (path.includes('/asociaciones')) return 'Asociaciones'
    if (path.includes('/documentos')) return 'Documentos'
    if (path.includes('/inspecciones')) return 'Inspecciones'
    if (path.includes('/papeletas')) return 'Papeletas'
    if (path.includes('/operativos')) return 'Operativos'
    if (path.includes('/cursos')) return 'Cursos'
    if (path.includes('/pagos')) return 'Pagos'
    if (path.includes('/internamientos') || path.includes('/retenciones')) return 'Internamientos'
    if (path.includes('/permisos')) return 'Permisos'
    return 'Dashboard'
  }

  const [activeItem, setActiveItem] = useState(getActiveItem())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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

  const isSuperAdmin = isSuperAdminUser(user)
  const onlyNormalUser = (element) => isSuperAdmin ? <Navigate to="/superadmin" replace /> : element

  return (
    <main
      className={`min-h-dvh bg-[#eef6fb] text-slate-900 transition-[grid-template-columns] duration-300 ease-in-out dark:bg-[#0b1120] dark:text-slate-100 lg:grid lg:h-dvh lg:overflow-hidden ${
        sidebarCollapsed ? 'lg:grid-cols-[5.5rem_minmax(0,1fr)]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]'
      }`}
    >
      <Sidebar
        activeItem={activeItem}
        onSelect={setActiveItem}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={onLogout}
        collapsedOnDesktop={sidebarCollapsed}
        user={user}
        onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
      />
      <div className="no-scrollbar min-w-0 lg:h-dvh lg:overflow-y-auto flex flex-col">
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
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

        <div className="mx-auto w-full max-w-[96rem] flex-1 space-y-4 p-3.5 sm:p-5 lg:p-6">
          <Routes>
            <Route path="/" element={<Navigate to={isSuperAdmin ? "/superadmin" : "/dashboard"} replace />} />
            <Route path="/superadmin" element={isSuperAdmin ? <SuperAdminDashboard user={user} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/superadmin/personas" element={isSuperAdmin ? <Personas user={user} onUserUpdate={onUserUpdate} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/superadmin/trabajadores" element={isSuperAdmin ? <Personal /> : <Navigate to="/dashboard" replace />} />
            <Route path="/superadmin/:moduleId" element={isSuperAdmin ? <SuperAdminDashboard user={user} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/admin" element={<Navigate to={isSuperAdmin ? "/superadmin" : "/dashboard"} replace />} />
            <Route path="/dashboard" element={onlyNormalUser(<DashboardHome />)} />
            <Route path="/vehiculos" element={onlyNormalUser(<Vehiculos />)} />
            <Route path="/personas" element={onlyNormalUser(<Personas user={user} onUserUpdate={onUserUpdate} />)} />
            <Route path="/personal" element={onlyNormalUser(<Personal />)} />
            <Route path="/asociaciones" element={onlyNormalUser(<Asociaciones />)} />
            <Route path="/documentos" element={onlyNormalUser(<Documentos />)} />
            <Route path="/inspecciones" element={onlyNormalUser(<Inspecciones />)} />
            <Route path="/papeletas" element={onlyNormalUser(<Papeletas />)} />
            <Route path="/operativos" element={onlyNormalUser(<Operativos user={user} />)} />
            <Route path="/cursos" element={onlyNormalUser(<CursosSeguridad />)} />
            <Route path="/cursos-seguridad" element={onlyNormalUser(<CursosSeguridad />)} />
            <Route path="/pagos" element={onlyNormalUser(<Pagos />)} />
            <Route path="/internamientos" element={onlyNormalUser(<Retenciones />)} />
            <Route path="/retenciones" element={onlyNormalUser(<Navigate to="/internamientos" replace />)} />
            <Route path="/permisos" element={onlyNormalUser(<Permisos />)} />
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

function LoginRoute({ onLogin }) {
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from?.pathname || '/dashboard'

  const handleLogin = (userData, remember = false) => {
    onLogin(userData, remember)
    const target = from === '/dashboard' && isSuperAdminUser(userData) ? '/superadmin' : from
    navigate(target, { replace: true })
  }

  return <Login onLogin={handleLogin} />
}

function ProtectedApp({ user, onLogout, onUserUpdate }) {
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Layout onLogout={onLogout} user={user} onUserUpdate={onUserUpdate} />
}

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const inactivityTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const response = await apiFetch('/me')
        if (!response.ok) throw response
        const payload = await response.json()
        if (!cancelled) {
          setUser(payload.data)
        }
      } catch (_) {
        localStorage.removeItem('user')
        sessionStorage.removeItem('user')
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = (userData) => {
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    setUser(userData)
  }

  const handleLogout = async () => {
    try {
      await apiFetch('/logout', { method: 'POST' })
    } catch (_) {
      // Si el servidor ya no tiene sesión, limpiamos igualmente el cliente.
    }
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    setUser(null)
  }

  const handleUserUpdate = (nextUser) => {
    setUser(nextUser)
  }
  useEffect(() => {
    if (!user) {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      return undefined
    }

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current)
      }

      inactivityTimerRef.current = window.setTimeout(() => {
        handleLogout()
      }, INACTIVITY_LIMIT_MS)
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']

    resetInactivityTimer()
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true })
    })

    return () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer)
      })
    }
  }, [user])
  return (
    <BrowserRouter>
      {checkingSession ? (
        <div className="grid min-h-dvh place-items-center bg-[#eef6fb] text-sm font-bold text-slate-500">
          Validando sesión...
        </div>
      ) : (
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to={isSuperAdminUser(user) ? "/superadmin" : "/dashboard"} replace /> : <LoginRoute onLogin={handleLogin} />}
          />
          <Route
            path="/*"
            element={<ProtectedApp user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />}
          />
        </Routes>
      )}
    </BrowserRouter>
  )
}

export default App
