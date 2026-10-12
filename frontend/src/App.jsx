import { lazy, Suspense, useState, useRef, useEffect, useMemo } from 'react'
import { suscribirConfigMovil } from './utils/configMovil'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Login } from './components/auth/Login'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { NotFound } from './pages/NotFound'
import { PREFETCH_MAP } from './config/navigation'
import { apiFetch } from './config/api'
import { limpiarDatosLocales } from './utils/sesionLocal'
import { esRolOficina } from './config/roles'

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000

const DashboardHome = lazy(() => import('./pages/DashboardHome').then((module) => ({ default: module.DashboardHome })))
const Vehiculos = lazy(() => import('./pages/Vehiculos').then((module) => ({ default: module.Vehiculos })))
const CentroImpresion = lazy(() => import('./pages/CentroImpresion').then((module) => ({ default: module.CentroImpresion })))
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
const isOfficeUser = (user) => esRolOficina((user?.rol || '').toUpperCase())

const onlyNormalUser = (user, element) => isSuperAdminUser(user) ? <Navigate to="/superadmin" replace /> : element
const onlyOfficeUser = (user, element) => isSuperAdminUser(user) ? <Navigate to="/superadmin" replace /> : (!isOfficeUser(user) ? <Navigate to="/dashboard" replace /> : element)

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
          <div key={i} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438]">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
            <div className="mt-3 h-6 w-12 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
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
    if (p.startsWith('/impresion'))                return 'Centro de impresión'
    if (p.startsWith('/inspecciones'))             return 'Inspección Técnica Vehicular'
    if (p.startsWith('/papeletas'))                return 'Papeletas'
    if (p.startsWith('/operativos'))               return 'Operativos'
    if (p.startsWith('/cursos'))                   return 'Cursos de Seguridad Vial'
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
    const controller = new AbortController()
    let pending = false
    const fetchNotifications = async () => {
      if (document.visibilityState === 'hidden' || pending || cancelled) return
      pending = true
      try {
        const response = await apiFetch('/notificaciones/resumen', { signal: controller.signal })
        if (response.ok) {
          const payload = await response.json()
          if (!cancelled && payload.data) {
            // Las ya leídas se recuerdan: el sondeo periódico no debe volver a marcarlas como nuevas
            let leidas = []
            try { leidas = JSON.parse(localStorage.getItem('notif_leidas') || '[]') } catch { /* sin almacenamiento */ }
            setNotifications(payload.data.map((n) => ({ ...n, unread: !leidas.includes(n.id) })))
          }
        }
      } catch {
        // Silencioso: es un sondeo periódico en segundo plano, se reintentará en el próximo ciclo.
      } finally { pending = false }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // cada 20 s, para que un cambio de configuración se refleje solo
    document.addEventListener('visibilitychange', fetchNotifications)
    window.addEventListener('focus', fetchNotifications)
    const dejarDeEscuchar = suscribirConfigMovil(fetchNotifications)

    return () => {
      cancelled = true;
      controller.abort()
      clearInterval(interval);
      document.removeEventListener('visibilitychange', fetchNotifications)
      window.removeEventListener('focus', fetchNotifications)
      dejarDeEscuchar()
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

  // Precargar solo los módulos frecuentes, uno por turno libre del navegador.
  // El resto se mantiene lazy y se anticipa al pasar por el menú.
  useEffect(() => {
    const rolNorm = (user?.rol || '').toUpperCase()
    const isSA = rolNorm === 'SUPERADMIN'
    const isOff = esRolOficina(rolNorm)

    let cancelled = false
    let idleId
    const connection = navigator.connection
    if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return
    const frecuentes = new Set(isSA ? ['/superadmin/usuarios'] : ['/personas', '/vehiculos', '/papeletas'])
    const pendientes = Object.entries(PREFETCH_MAP).filter(([path]) => frecuentes.has(path))
    const precargar = () => {
      if (cancelled || document.visibilityState === 'hidden') return
      const siguiente = pendientes.shift()
      if (!siguiente) return
      const [path, fn] = siguiente
        // Filtrar rutas superadmin si no aplica, y rutas de office si no aplica
        const needsOffice = ['/personas','/trabajadores','/asociaciones','/documentos','/permisos','/cursos','/pagos','/impresion'].includes(path)
      if (needsOffice && !isOff) { programar(); return }
      fn().catch(() => {}).finally(() => { if (!cancelled) programar() })
    }
    const programar = () => {
      idleId = window.requestIdleCallback ? window.requestIdleCallback(precargar) : window.setTimeout(precargar, 1500)
    }
    programar()

    return () => {
      cancelled = true
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleId)
      else clearTimeout(idleId)
    }
  }, [user])

  return (
    <main
      className={`app-viewport bg-[#eef6fb] text-slate-900 transition-[grid-template-columns] duration-300 ease-in-out dark:bg-[#151A2D] dark:text-slate-100 lg:grid lg:overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white ${sidebarCollapsed ? 'lg:grid-cols-[5rem_minmax(0,1fr)]' : 'lg:grid-cols-[16rem_minmax(0,1fr)]'
        }`}
    >
      <div className="min-h-0 print:hidden lg:h-full">
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
      <div className="no-scrollbar min-h-0 min-w-0 flex flex-col lg:h-full lg:overflow-y-auto print:block print:h-auto print:overflow-visible">
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
            <Outlet />
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
        if (String(payload.data?.rol || '').toUpperCase() === 'TRABAJADOR') {
          // El inspector solo usa la app móvil: se cierra cualquier sesión suya abierta en el navegador
          apiFetch('/logout', { method: 'POST' }).catch(() => {})
          throw new Error('rol-movil')
        }
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
    limpiarDatosLocales()
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

    let ultimoReinicio = 0
    const resetInactivityTimer = () => {
      // mousemove dispara decenas de eventos por segundo: basta reiniciar el contador una vez por segundo
      const ahora = Date.now()
      if (inactivityTimerRef.current && ahora - ultimoReinicio < 1000) return
      ultimoReinicio = ahora
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
          {/* Rutas autenticadas dentro del Layout (Sidebar + Header) */}
          <Route element={<ProtectedApp user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />}>
            <Route path="/" element={<Navigate to={isSuperAdminUser(user) ? "/superadmin" : "/dashboard"} replace />} />
            <Route path="/admin" element={<Navigate to={isSuperAdminUser(user) ? "/superadmin" : "/dashboard"} replace />} />
            <Route path="/superadmin" element={isSuperAdminUser(user) ? <SuperAdminDashboard user={user} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/superadmin/personas" element={isSuperAdminUser(user) ? <Personas user={user} onUserUpdate={handleUserUpdate} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/superadmin/trabajadores" element={isSuperAdminUser(user) ? <Trabajadores /> : <Navigate to="/dashboard" replace />} />
            <Route path="/superadmin/usuarios" element={isSuperAdminUser(user) ? <Usuarios user={user} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/superadmin/:moduleId" element={isSuperAdminUser(user) ? <SuperAdminDashboard user={user} /> : <Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={onlyNormalUser(user, <DashboardHome user={user} />)} />
            <Route path="/vehiculos" element={onlyNormalUser(user, <Vehiculos user={user} />)} />
            <Route path="/impresion" element={onlyOfficeUser(user, <CentroImpresion />)} />
            <Route path="/personas" element={onlyOfficeUser(user, <Personas user={user} onUserUpdate={handleUserUpdate} />)} />
            <Route path="/trabajadores" element={onlyOfficeUser(user, <Trabajadores />)} />
            <Route path="/asociaciones" element={onlyOfficeUser(user, <Asociaciones />)} />
            <Route path="/documentos" element={onlyOfficeUser(user, <Documentos />)} />
            <Route path="/inspecciones" element={onlyNormalUser(user, <Inspecciones />)} />
            <Route path="/papeletas" element={onlyNormalUser(user, <Papeletas user={user} />)} />
            <Route path="/operativos" element={onlyNormalUser(user, <Operativos user={user} />)} />
            <Route path="/cursos" element={onlyOfficeUser(user, <CursosSeguridad />)} />
            <Route path="/cursos-seguridad" element={onlyOfficeUser(user, <CursosSeguridad />)} />
            <Route path="/pagos" element={onlyOfficeUser(user, <Pagos />)} />
            <Route path="/internamientos" element={onlyNormalUser(user, <Retenciones user={user} />)} />
            <Route path="/retenciones" element={onlyNormalUser(user, <Navigate to="/internamientos" replace />)} />
            <Route path="/permisos" element={onlyOfficeUser(user, <Permisos />)} />
          </Route>

          {/* Página 404 independiente y completa para cualquier ruta desconocida */}
          <Route path="/404" element={<NotFound user={user} />} />
          <Route path="*" element={<NotFound user={user} />} />
        </Routes>
      )}
    </BrowserRouter>
  )
}

export default App
