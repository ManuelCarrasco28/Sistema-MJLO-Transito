import { lazy, Suspense, useState, useRef, useEffect, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Login } from './components/auth/Login'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { PREFETCH_MAP } from './config/navigation'
import { apiFetch } from './config/api'

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000

const DashboardHome = lazy(() => import('./pages/DashboardHome').then((module) => ({ default: module.DashboardHome })))
const Vehiculos = lazy(() => import('./pages/Vehiculos').then((module) => ({ default: module.Vehiculos })))
const Personas = lazy(() => import('./pages/Personas').then((module) => ({ default: module.Personas })))
const Trabajadores = lazy(() => import('./pages/Trabajadores').then((module) => ({ default: module.Trabajadores })))
const Asociaciones = lazy(() => import('./pages/Asociaciones').then((module) => ({ default: module.Asociaciones })))
const Documentos = lazy(() => import('./pages/Documentos').then((module) => ({ default: module.Documentos })))
const Inspecciones = lazy(() => import('./pages/Inspecciones').then((module) => ({ default: module.Inspecciones })))
const Papeletas = lazy(() => import('./pages/Papeletas').then((module) => ({ default: module.Papeletas })))
const CursosSeguridad = lazy(() => import('./pages/CursosSeguridad').then((module) => ({ default: module.CursosSeguridad })))
const Pagos = lazy(() => import('./pages/Pagos').then((module) => ({ default: module.Pagos })))
const Retenciones = lazy(() => import('./pages/Retenciones').then((module) => ({ default: module.Retenciones })))
const Permisos = lazy(() => import('./pages/Permisos').then((module) => ({ default: module.Permisos })))
const PermisoFormularioVentana = lazy(() => import('./pages/PermisoFormularioVentana').then((module) => ({ default: module.PermisoFormularioVentana })))
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard').then((module) => ({ default: module.SuperAdminDashboard })))
const Usuarios = lazy(() => import('./pages/Usuarios').then((module) => ({ default: module.Usuarios })))
const Operativos = lazy(() => import('./pages/Operativos').then((module) => ({ default: module.Operativos })))
const CursoDetalleVentana = lazy(() => import('./pages/CursoDetalleVentana'))


const isSuperAdminUser = (user) => (user?.rol || '').toUpperCase() === 'SUPERADMIN'

function ModuleFallback() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="size-12 shrink-0 rounded-2xl bg-slate-200 dark:bg-[var(--bg-subtle)]" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
          <div className="h-3 w-72 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
            <div className="mt-3 h-6 w-12 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
        <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-[var(--border)]">
          <div className="h-10 flex-1 rounded-xl bg-slate-100 dark:bg-[var(--bg-subtle)]" />
          <div className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-[var(--bg-subtle)]" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-[var(--border)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-3.5 flex-1 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
              <div className="h-3.5 w-24 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
              <div className="h-3.5 w-20 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Layout({ onLogout, user, onUserUpdate }) {
  const location = useLocation()

  // useMemo derivado directo de pathname — sin useState ni useEffect extra,
  // evita el flash de 1 render con valor incorrecto al navegar.
  const activeItem = useMemo(() => {
    const p = location.pathname
    if (p.startsWith('/superadmin/respaldo'))      return 'Respaldo'
    if (p.startsWith('/superadmin/auditoria'))     return 'Auditoría y logs'
    if (p.startsWith('/superadmin/configuracion')) return 'Configuración'
    if (p.startsWith('/superadmin/roles'))         return 'Roles y permisos'
    if (p.startsWith('/superadmin/usuarios'))      return 'Gestión de usuarios'
    if (p.startsWith('/superadmin/personas'))      return 'Personas'
    if (p.startsWith('/superadmin/trabajadores'))  return 'Trabajadores'
    if (p.startsWith('/superadmin'))               return 'Dashboard Super Admin'
    if (p.startsWith('/vehiculos'))                return 'Vehículos'
    if (p.startsWith('/personas'))                 return 'Personas'
    if (p.startsWith('/trabajadores'))             return 'Trabajadores'
    if (p.startsWith('/asociaciones'))             return 'Asociaciones'
    if (p.startsWith('/documentos'))               return 'Documentos del Vehículo'
    if (p.startsWith('/inspecciones'))             return 'Certicav'
    if (p.startsWith('/papeletas'))                return 'Papeletas'
    if (p.startsWith('/operativos'))               return 'Operativos'
    if (p.startsWith('/cursos'))                   return 'Curso de Seguridad Vial'
    if (p.startsWith('/pagos'))                    return 'Pagos'
    if (p.startsWith('/internamientos') || p.startsWith('/retenciones')) return 'Internamientos'
    if (p.startsWith('/permisos'))                 return 'Permisos y Autorizaciones'
    return 'Dashboard'
  }, [location.pathname])

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
    let cancelled = false;
    const fetchNotifications = async () => {
      try {
        const response = await apiFetch('/notificaciones/resumen')
        if (response.ok) {
          const payload = await response.json()
          if (!cancelled && payload.data) {
            setNotifications(payload.data)
          }
        }
      } catch {
        // Silencioso: es un sondeo periódico en segundo plano, se reintentará en el próximo ciclo.
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    }
  }, [])

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

  // Prefetch de todos los módulos visibles para este rol en segundo plano.
  // Se ejecuta 1.5s después del montaje del layout (cuando el dashboard ya se ve)
  // para no competir con el render inicial. Los imports() se cachean: si el
  // usuario ya visitó un módulo, este effect simplemente reutiliza la caché.
  useEffect(() => {
    const rolNorm = (user?.rol || '').toUpperCase()
    const isSA = rolNorm === 'SUPERADMIN'
    const isOff = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA'].includes(rolNorm)

    const timer = setTimeout(() => {
      Object.entries(PREFETCH_MAP).forEach(([path, fn]) => {
        // Filtrar rutas superadmin si no aplica, y rutas de office si no aplica
        if (path.startsWith('/superadmin') && !isSA) return
        if (!path.startsWith('/superadmin') && isSA) return
        const needsOffice = ['/personas','/trabajadores','/asociaciones','/documentos','/permisos','/cursos','/pagos'].includes(path)
        if (needsOffice && !isOff) return
        fn().catch(() => {})
      })
    }, 1500)

    return () => clearTimeout(timer)
  }, [user])

  const isSuperAdmin = isSuperAdminUser(user)
  const isOffice = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA'].includes((user?.rol || '').toUpperCase())

  const onlyNormalUser = (element) => isSuperAdmin ? <Navigate to="/superadmin" replace /> : element
  const onlyOfficeUser = (element) => isSuperAdmin ? <Navigate to="/superadmin" replace /> : (!isOffice ? <Navigate to="/dashboard" replace /> : element)

  return (
    <main
      className={`min-h-dvh bg-[#eef6fb] text-slate-900 transition-[grid-template-columns] duration-300 ease-in-out dark:bg-[#0b1120] dark:text-slate-100 lg:grid lg:h-dvh lg:overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white ${sidebarCollapsed ? 'lg:grid-cols-[5rem_minmax(0,1fr)]' : 'lg:grid-cols-[16rem_minmax(0,1fr)]'
        }`}
    >
      <div className="print:hidden">
        <Sidebar
          activeItem={activeItem}
          onSelect={() => {}}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onLogout={onLogout}
          collapsedOnDesktop={sidebarCollapsed}
          user={user}
          onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
        />
      </div>
      <div className="no-scrollbar min-w-0 lg:h-dvh lg:overflow-y-auto flex flex-col print:block print:h-auto print:overflow-visible">
        <div className="print:hidden sticky top-0 z-40 border-b border-transparent">
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
        </div>

        <div className="app-content mx-auto w-full max-w-[96rem] flex-1 space-y-4 px-3.5 sm:px-5 lg:px-6 pt-1.5 pb-6 print:block print:p-0 print:space-y-0 print:m-0 print:max-w-none">
          <Suspense fallback={<ModuleFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to={isSuperAdmin ? "/superadmin" : "/dashboard"} replace />} />
              <Route path="/superadmin" element={isSuperAdmin ? <SuperAdminDashboard user={user} /> : <Navigate to="/dashboard" replace />} />
              <Route path="/superadmin/personas" element={isSuperAdmin ? <Personas user={user} onUserUpdate={onUserUpdate} /> : <Navigate to="/dashboard" replace />} />
              <Route path="/superadmin/trabajadores" element={isSuperAdmin ? <Trabajadores /> : <Navigate to="/dashboard" replace />} />
              <Route path="/superadmin/usuarios" element={isSuperAdmin ? <Usuarios user={user} /> : <Navigate to="/dashboard" replace />} />
              <Route path="/superadmin/:moduleId" element={isSuperAdmin ? <SuperAdminDashboard user={user} /> : <Navigate to="/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to={isSuperAdmin ? "/superadmin" : "/dashboard"} replace />} />
              <Route path="/dashboard" element={onlyNormalUser(<DashboardHome user={user} />)} />
              <Route path="/vehiculos" element={onlyNormalUser(<Vehiculos user={user} />)} />
              <Route path="/personas" element={onlyOfficeUser(<Personas user={user} onUserUpdate={onUserUpdate} />)} />
              <Route path="/trabajadores" element={onlyOfficeUser(<Trabajadores />)} />
              <Route path="/asociaciones" element={onlyOfficeUser(<Asociaciones />)} />
              <Route path="/documentos" element={onlyOfficeUser(<Documentos />)} />
              <Route path="/inspecciones" element={onlyNormalUser(<Inspecciones />)} />
              <Route path="/papeletas" element={onlyNormalUser(<Papeletas user={user} />)} />
              <Route path="/operativos" element={onlyNormalUser(<Operativos user={user} />)} />
              <Route path="/cursos" element={onlyOfficeUser(<CursosSeguridad />)} />
              <Route path="/cursos-seguridad" element={onlyOfficeUser(<CursosSeguridad />)} />
              <Route path="/pagos" element={onlyOfficeUser(<Pagos />)} />
              <Route path="/internamientos" element={onlyNormalUser(<Retenciones user={user} />)} />
              <Route path="/retenciones" element={onlyNormalUser(<Navigate to="/internamientos" replace />)} />
              <Route path="/permisos" element={onlyOfficeUser(<Permisos />)} />
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)] shadow-xs">
                  <div className="size-16 rounded-2xl bg-slate-100 dark:bg-[var(--bg-subtle)] flex items-center justify-center text-slate-500 mb-4">
                    <span className="text-2xl font-black">404</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Página no encontrada</h2>
                  <p className="mt-2 text-sm text-slate-500 max-w-md">La dirección a la que intenta acceder no existe o fue movida a otra ubicación.</p>
                  <a href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700">
                    Volver al Dashboard
                  </a>
                </div>
              } />
            </Routes>
          </Suspense>
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
            path="/permisos-formulario"
            element={user ? (
              <Suspense fallback={<ModuleFallback />}>
                <PermisoFormularioVentana />
              </Suspense>
            ) : <Navigate to="/login" replace />}
          />
          <Route
            path="/permisos/formulario"
            element={user ? (
              <Suspense fallback={<ModuleFallback />}>
                <PermisoFormularioVentana />
              </Suspense>
            ) : <Navigate to="/login" replace />}
          />
          
          <Route
            path="/cursos/:id/popup"
            element={user ? (
              <Suspense fallback={<ModuleFallback />}>
                <CursoDetalleVentana />
              </Suspense>
            ) : <Navigate to="/login" replace />}
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
