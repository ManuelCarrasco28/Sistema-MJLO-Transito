import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { apiFetch } from '../config/api'
import { showConfirm, showSuccess, showError } from '../utils/SwalUtil'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { FloatingInput, FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'
import { Usuarios } from './Usuarios'

const DEFAULT_USER_FORM = {
  id_trabajador: '',
  nombre_usuario: '',
  password: '',
  id_rol: '',
  estado: 'ACTIVO'
}

const DEFAULT_MUNICIPALIDAD_FORM = {
  ruc: '',
  razon_social: '',
  nombre_abreviado: '',
  sigla: '',
  direccion_fiscal: '',
  departamento: '',
  provincia: '',
  distrito: '',
  telefono: '',
  email: '',
  mesa_partes: '',
  logo: '',
  estado: 'ACTIVO'
}

const DEFAULT_ANIO_FORM = {
  nombre: '',
  anio: String(new Date().getFullYear()),
  uit: ''
}

export function SuperAdminDashboard({ user }) {
  const navigate = useNavigate()
  const { moduleId } = useParams()
  const [activeModule, setActiveModule] = useState(moduleId || null)
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [trabajadorSearch, setTrabajadorSearch] = useState('')
  const [trabajadorDropdownOpen, setTrabajadorDropdownOpen] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [message, setMessage] = useState('')
  const [userForm, setUserForm] = useState(DEFAULT_USER_FORM)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [passwordUser, setPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [municipalidad, setMunicipalidad] = useState(null)
  const [municipalidadForm, setMunicipalidadForm] = useState(DEFAULT_MUNICIPALIDAD_FORM)
  const [municipalidadAnios, setMunicipalidadAnios] = useState([])
  const [anioForm, setAnioForm] = useState(DEFAULT_ANIO_FORM)
  const [mobilePermitePapeleta, setMobilePermitePapeleta] = useState(true)
  const [savingConfigSistema, setSavingConfigSistema] = useState(false)
  const [loadingMunicipalidad, setLoadingMunicipalidad] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditType, setAuditType] = useState('TODOS')
  const [auditSeverity, setAuditSeverity] = useState('TODOS')
  const [realAuditLogs, setRealAuditLogs] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [auditStats, setAuditStats] = useState({ total: 0, hoy: 0, porModulo: [] })

  const fetchAuditLogs = async () => {
    setLoadingAudit(true)
    try {
      const params = new URLSearchParams()
      if (auditSearch.trim()) params.set('search', auditSearch.trim())
      if (auditType !== 'TODOS') params.set('modulo', auditType)
      if (auditSeverity !== 'TODOS') params.set('accion', auditSeverity)
      params.set('limit', '100')

      const res = await apiFetch(`/auditoria?${params.toString()}`)
      const data = await res.json()
      if (res.ok && data.data) {
        setRealAuditLogs(data.data)
      }

      const resStats = await apiFetch('/auditoria/estadisticas')
      const dataStats = await resStats.json()
      if (resStats.ok && dataStats.data) {
        setAuditStats(dataStats.data)
      }
    } catch (err) {
      console.error('Error cargando auditoría:', err)
    } finally {
      setLoadingAudit(false)
    }
  }

  
  const handleExportAuditoriaPdf = () => {
    exportToPdf({
      filename: `Auditoria_Sistema_${new Date().getFullYear()}.pdf`,
      title: 'Reporte de Auditoría del Sistema',
      subtitle: 'Registro de acciones críticas',
      metadata: [
        { label: 'Generado por', value: user?.nombres + ' ' + user?.apellidoPaterno || 'Super Admin' },
        { label: 'Fecha', value: new Date().toLocaleString('es-PE') }
      ],
      columns: [
        { header: 'FECHA Y HORA', dataKey: 'fecha_hora' },
        { header: 'MÓDULO', dataKey: 'modulo' },
        { header: 'ACCIÓN', dataKey: 'accion' },
        { header: 'DESCRIPCIÓN', dataKey: 'descripcion' },
        { header: 'USUARIO', dataKey: 'nombre_usuario' },
        { header: 'ROL', dataKey: 'rol_nombre' },
        { header: 'IP', dataKey: 'direccion_ip' }
      ],
      data: realAuditLogs.map(log => ({
        ...log,
        fecha_hora: new Date(log.fecha_hora).toLocaleString('es-PE')
      }))
    })
  }

  const handleExportAuditoria = () => {
    exportToExcel({
      filename: `Auditoria_Sistema_${new Date().getFullYear()}.xls`,
      sheetName: 'Auditoria',
      title: 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
      subtitle: 'Subgerencia de Tránsito y Transporte · Registro Oficial de Auditoría y Trazabilidad',
      metadata: [
        { label: 'Total eventos', value: String(realAuditLogs.length) },
        { label: 'Filtro Módulo', value: auditType },
        { label: 'Filtro Acción', value: auditSeverity },
      ],
      columns: [
        { header: 'N°', align: 'center', width: 45, render: (_, __, i) => i + 1 },
        { header: 'Fecha y Hora', key: 'fecha_hora', width: 160, align: 'center' },
        { header: 'Módulo', key: 'modulo', width: 130, align: 'center' },
        { header: 'Acción', key: 'accion', width: 120, align: 'center' },
        { header: 'Descripción del Evento', key: 'descripcion', width: 350 },
        { header: 'Usuario Responsable', key: 'nombre_usuario', width: 140, align: 'center' },
        { header: 'Rol', key: 'rol', width: 130, align: 'center' },
        { header: 'Dirección IP', key: 'ip', width: 120, align: 'center', isText: true },
        { header: 'Dispositivo / Navegador', key: 'user_agent', width: 220 },
      ],
      data: realAuditLogs,
    })
  }

  const adminModules = [
    { id: 'personas', label: 'Personas', detail: 'Registrar y mantener datos personales base del sistema.', icon: 'idCard', tone: 'from-sky-600 to-cyan-500' },
    { id: 'trabajadores', label: 'Trabajadores', detail: 'Gestionar personal municipal antes de crear credenciales.', icon: 'workerBadge', tone: 'from-indigo-600 to-blue-500' },
    { id: 'usuarios', label: 'Gestión de usuarios', detail: 'Crear cuentas, activar usuarios y asignar responsables.', icon: 'people', tone: 'from-blue-600 to-indigo-500' },
    { id: 'roles', label: 'Roles y permisos', detail: 'Definir accesos por perfil y estado de cuenta.', icon: 'shieldCheck', tone: 'from-emerald-600 to-teal-500' },
    { id: 'configuracion', label: 'Configuración del sistema', detail: 'Parámetros globales, seguridad y sesiones.', icon: 'settings', tone: 'from-violet-600 to-purple-500' },
    { id: 'auditoria', label: 'Auditoría y logs', detail: 'Revisar acciones críticas realizadas por usuarios.', icon: 'document', tone: 'from-amber-500 to-orange-500' },
    { id: 'respaldo', label: 'Respaldo y mantenimiento', detail: 'Control de copias, restauración y estado.', icon: 'lock', tone: 'from-slate-700 to-slate-500' }
  ]

  useEffect(() => {
    setActiveModule(moduleId || null)
  }, [moduleId])

  const activeModuleInfo = adminModules.find((module) => module.id === activeModule)
  const isDashboard = !activeModuleInfo

  const fetchUsuarios = async () => {
    setLoadingUsers(true)
    setMessage('')
    try {
      const res = await apiFetch('/usuarios')
      const data = await res.json()
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo cargar usuarios.')
      setUsuarios(data.data || [])
    } catch (error) {
      setMessage(error.message || 'Error al cargar usuarios.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await apiFetch('/usuarios/roles')
      const data = await res.json()
      if (res.ok) setRoles(data.data || [])
    } catch {
      // silencioso: el select de roles simplemente quedará vacío
    }
  }

  const fetchTrabajadores = async () => {
    try {
      const res = await apiFetch('/personal')
      const data = await res.json()
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo cargar trabajadores.')
      setTrabajadores(data.data || [])
    } catch (error) {
      setMessage(error.message || 'Error al cargar trabajadores.')
    }
  }

  const fetchMunicipalidadConfig = async () => {
    setLoadingMunicipalidad(true)
    try {
      const res = await apiFetch('/municipalidad/config')
      const data = await res.json()
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo cargar la municipalidad.')
      const payload = data.data || {}
      const muni = payload.municipalidad || null
      setMunicipalidad(muni)
      setMunicipalidadForm(muni ? { ...DEFAULT_MUNICIPALIDAD_FORM, ...muni } : DEFAULT_MUNICIPALIDAD_FORM)
      setMunicipalidadAnios(payload.anios || [])
      setMobilePermitePapeleta((payload.configuracion?.mobile_permite_aplicar_papeleta?.valor ?? '1') === '1')
      const currentYear = String(new Date().getFullYear())
      const current = (payload.anios || []).find((item) => String(item.anio) === currentYear) || (payload.anios || [])[0]
      setAnioForm(current
        ? { nombre: current.nombre || `Año Fiscal ${current.anio}`, anio: String(current.anio), uit: String(current.uit ?? '') }
        : DEFAULT_ANIO_FORM
      )
    } catch (error) {
      setMessage(error.message || 'Error al cargar configuración municipal.')
    } finally {
      setLoadingMunicipalidad(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
    fetchRoles()
    fetchTrabajadores()
    fetchMunicipalidadConfig()
    fetchAuditLogs()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuditLogs()
    }, 250)
    return () => clearTimeout(timer)
  }, [auditSearch, auditType, auditSeverity, activeModule])

  const saveMunicipalidad = async (event) => {
    event.preventDefault()
    if (!municipalidad?.id) {
      setMessage('Primero debe existir una municipalidad registrada en la base de datos.')
      return
    }
    setMessage('')
    try {
      const res = await apiFetch(`/municipalidad/${municipalidad.id}`, { method: 'PUT', body: municipalidadForm })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo guardar la municipalidad.')
      setMunicipalidad(data.data || { ...municipalidad, ...municipalidadForm })
      setMessage('Datos de municipalidad actualizados correctamente.')
      fetchMunicipalidadConfig()
    } catch (error) {
      setMessage(error.message || 'Error al guardar municipalidad.')
    }
  }

  const saveAnio = async (event) => {
    event.preventDefault()
    if (!municipalidad?.id) {
      setMessage('Primero debe existir una municipalidad registrada en la base de datos.')
      return
    }
    setMessage('')
    try {
      const res = await apiFetch('/municipalidad/anios', {
        method: 'POST',
        body: { ...anioForm, id_municipalidad: municipalidad.id, uit: Number(anioForm.uit) }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo guardar la UIT.')
      setMessage('UIT del año guardada correctamente.')
      fetchMunicipalidadConfig()
    } catch (error) {
      setMessage(error.message || 'Error al guardar UIT.')
    }
  }

  const saveConfigSistema = async (clave, valor, successMessage) => {
    setSavingConfigSistema(true)
    setMessage('')
    try {
      const res = await apiFetch('/configuracion-sistema', {
        method: 'PUT',
        body: { clave, valor: valor ? '1' : '0' }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo guardar la configuración.')
      setMessage(successMessage || 'Configuración actualizada correctamente.')
      fetchMunicipalidadConfig()
    } catch (error) {
      setMessage(error.message || 'Error al guardar configuración.')
    } finally {
      setSavingConfigSistema(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((item) =>
      [item.nombre_usuario, item.nombre_completo, item.cargo, item.usuario_estado]
        .some((value) => String(value || '').toLowerCase().includes(q))
    )
  }, [usuarios, searchTerm])

  const trabajadoresSinUsuario = useMemo(() => {
    const q = trabajadorSearch.trim().toLowerCase()
    return trabajadores
      .filter((trabajador) => Number(trabajador.tiene_cuenta) !== 1 || String(trabajador.id_persona || trabajador.id) === String(userForm.id_trabajador))
      .filter((trabajador) => {
        if (!q) return true
        return `${trabajador.numero_documento} ${trabajador.nombres} ${trabajador.apellidos} ${trabajador.cargo}`.toLowerCase().includes(q)
      })
      .slice(0, 8)
  }, [trabajadores, trabajadorSearch, userForm.id_trabajador])

  const selectedTrabajador = trabajadores.find((trabajador) => String(trabajador.id_persona || trabajador.id) === String(userForm.id_trabajador))

  const auditEvents = useMemo(() => {
    const now = new Date()
    const toDateLabel = (value, fallbackMinutes = 0) => {
      const date = value ? new Date(value) : new Date(now.getTime() - fallbackMinutes * 60000)
      return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
    }

    const userEvents = usuarios.slice(0, 30).map((item, index) => ({
      id: `usuario-${item.id || index}`,
      fecha: toDateLabel(item.fecha_updated || item.fecha_created, 15 + index * 7),
      tipo: 'USUARIOS',
      severidad: item.usuario_estado === 'INACTIVO' ? 'MEDIA' : 'BAJA',
      evento: item.usuario_estado === 'INACTIVO' ? 'Cuenta de usuario inactiva' : 'Cuenta de usuario habilitada',
      detalle: `${item.nombre_usuario || 'Usuario'} · ${item.cargo || 'Sin rol asignado'}`,
      usuario: user?.usuario || 'superadmin',
      origen: 'Panel web',
      estado: item.usuario_estado || 'ACTIVO'
    }))

    const baseEvents = [
      {
        id: 'login-superadmin',
        fecha: toDateLabel(null, 2),
        tipo: 'SEGURIDAD',
        severidad: 'BAJA',
        evento: 'Inicio de sesión administrativo',
        detalle: 'Acceso al panel de Super Admin',
        usuario: user?.usuario || 'superadmin',
        origen: 'Web · navegador',
        estado: 'OK'
      },
      {
        id: 'mobile-permission',
        fecha: toDateLabel(null, 5),
        tipo: 'CONFIGURACIÓN',
        severidad: mobilePermitePapeleta ? 'ALTA' : 'MEDIA',
        evento: 'Permiso general móvil',
        detalle: mobilePermitePapeleta
          ? 'Inspectores pueden aplicar papeletas desde el móvil'
          : 'Inspectores registran solo evidencias para revisión administrativa',
        usuario: user?.usuario || 'superadmin',
        origen: 'Configuración global',
        estado: mobilePermitePapeleta ? 'ACTIVO' : 'INACTIVO'
      },
      {
        id: 'uit-config',
        fecha: toDateLabel(null, 12),
        tipo: 'CONFIGURACIÓN',
        severidad: municipalidadAnios.length ? 'BAJA' : 'ALTA',
        evento: 'UIT fiscal configurada',
        detalle: municipalidadAnios.length
          ? `${municipalidadAnios.length} año(s) fiscal(es) registrado(s)`
          : 'Falta configurar la UIT para calcular papeletas',
        usuario: user?.usuario || 'superadmin',
        origen: 'Municipalidad',
        estado: municipalidadAnios.length ? 'OK' : 'PENDIENTE'
      },
      {
        id: 'municipalidad-config',
        fecha: toDateLabel(municipalidad?.fecha_updated || municipalidad?.fecha_created, 20),
        tipo: 'CONFIGURACIÓN',
        severidad: municipalidad?.estado === 'ACTIVO' ? 'BAJA' : 'ALTA',
        evento: 'Datos institucionales',
        detalle: municipalidad?.razon_social || 'Municipalidad pendiente de configurar',
        usuario: user?.usuario || 'superadmin',
        origen: 'Panel web',
        estado: municipalidad?.estado || 'PENDIENTE'
      }
    ]

    return [...baseEvents, ...userEvents]
  }, [usuarios, user, mobilePermitePapeleta, municipalidadAnios, municipalidad])

  const filteredAuditEvents = useMemo(() => {
    const q = auditSearch.trim().toLowerCase()
    return auditEvents.filter((event) => {
      const matchesSearch = !q || [event.evento, event.detalle, event.usuario, event.origen, event.estado]
        .some((value) => String(value || '').toLowerCase().includes(q))
      const matchesType = auditType === 'TODOS' || event.tipo === auditType
      const matchesSeverity = auditSeverity === 'TODOS' || event.severidad === auditSeverity
      return matchesSearch && matchesType && matchesSeverity
    })
  }, [auditEvents, auditSearch, auditType, auditSeverity])

  const saveUser = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      const res = await apiFetch('/usuarios', { method: 'POST', body: userForm })
      const data = await res.json()
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo crear el usuario.')
      setUsuarios((current) => [data.data, ...current])
      setUserForm(DEFAULT_USER_FORM)
      setTrabajadorSearch('')
      setTrabajadorDropdownOpen(false)
      setUserModalOpen(false)
      fetchTrabajadores()
      setMessage('Usuario creado correctamente.')
    } catch (error) {
      setMessage(error.message || 'Error al crear usuario.')
    }
  }

  const saveRole = async (event) => {
    event.preventDefault()
    if (!editingUser) return
    setMessage('')
    try {
      const res = await apiFetch(`/usuarios/${editingUser.id}`, {
        method: 'PUT',
        body: { id_rol: editingUser.id_rol, estado: editingUser.usuario_estado }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo actualizar el usuario.')
      setUsuarios((current) => current.map((item) => item.id === editingUser.id ? editingUser : item))
      setEditingUser(null)
      setMessage('Usuario actualizado correctamente.')
    } catch (error) {
      setMessage(error.message || 'Error al actualizar usuario.')
    }
  }

  const resetPassword = async (event) => {
    event.preventDefault()
    if (!passwordUser || !newPassword.trim()) return
    setMessage('')
    try {
      const res = await apiFetch(`/usuarios/${passwordUser.id}/password`, {
        method: 'PUT',
        body: { password: newPassword }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo restablecer la contraseña.')
      setPasswordUser(null)
      setNewPassword('')
      setMessage('Contraseña restablecida correctamente.')
    } catch (error) {
      setMessage(error.message || 'Error al restablecer contraseña.')
    }
  }

  const deleteUser = async (userToDelete) => {
    setMessage('')
    try {
      const res = await apiFetch(`/usuarios/${userToDelete.id}`, {
        method: 'DELETE'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo eliminar el usuario.')
      setUsuarios((current) => current.filter((item) => item.id !== userToDelete.id))
      setMessage('Usuario eliminado correctamente.')
    } catch (error) {
      setMessage(error.message || 'Error al eliminar usuario.')
    }
  }

  const moduleStats = [
    { label: 'Usuarios activos', value: usuarios.filter((u) => u.usuario_estado === 'ACTIVO').length },
    { label: 'Usuarios inactivos', value: usuarios.filter((u) => u.usuario_estado !== 'ACTIVO').length },
    { label: 'Roles registrados', value: new Set(usuarios.map((u) => u.rol).filter(Boolean)).size },
    { label: 'Módulos admin', value: adminModules.length }
  ]

  const rolesAgrupados = useMemo(() => {
    const grupos = usuarios.reduce((acc, usuario) => {
      const rol = usuario.rol || 'Sin rol asignado'
      if (!acc[rol]) acc[rol] = []
      acc[rol].push(usuario)
      return acc
    }, {})
    return Object.entries(grupos)
      .map(([rol, miembros]) => ({ rol, miembros }))
      .sort((a, b) => a.rol.localeCompare(b.rol))
  }, [usuarios])

  const dashboardStats = [
    { label: 'Usuarios activos', value: moduleStats[0].value, detail: 'Cuentas habilitadas', icon: 'people', tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Usuarios inactivos', value: moduleStats[1].value, detail: 'Cuentas bloqueadas', icon: 'lock', tone: 'text-rose-600 bg-rose-50' },
    { label: 'Roles registrados', value: moduleStats[2].value, detail: 'Perfiles administrativos', icon: 'shieldCheck', tone: 'text-blue-600 bg-blue-50' },
    {
      label: 'Permiso móvil',
      value: mobilePermitePapeleta ? 'ACTIVO' : 'INACTIVO',
      detail: mobilePermitePapeleta ? 'Móvil aplica papeletas' : 'Solo reportes/evidencias',
      icon: 'deviceMobile',
      tone: mobilePermitePapeleta ? 'text-violet-600 bg-violet-50 dark:bg-violet-950/60 dark:text-violet-300' : 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300',
      isToggle: true
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${
            isDashboard ? 'bg-gradient-to-br from-slate-950 to-indigo-700 shadow-indigo-500/20' : `bg-gradient-to-br ${activeModuleInfo.tone}`
          }`}>
            <Icon name={isDashboard ? 'shieldCheck' : activeModuleInfo.icon} className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {isDashboard ? 'Panel Super Admin' : activeModuleInfo.label}
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {isDashboard
                ? `Bienvenido, ${user?.nombres || 'Super Admin'}. Gestión administrativa, seguridad y configuración global.`
                : activeModuleInfo.detail}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          {message}
        </div>
      )}

      {isDashboard && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)] flex flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{stat.value}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{stat.detail}</p>
                  </div>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${stat.tone}`}>
                    <Icon name={stat.icon} className="size-5" />
                  </span>
                </div>
                {stat.isToggle && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[var(--border)] flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                      {savingConfigSistema ? 'Guardando...' : mobilePermitePapeleta ? 'Nueva Papeleta' : 'Registrar Evidencia'}
                    </span>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={mobilePermitePapeleta}
                        disabled={savingConfigSistema}
                        onChange={(e) => {
                          const next = e.target.checked
                          setMobilePermitePapeleta(next)
                          saveConfigSistema(
                            'mobile_permite_aplicar_papeleta',
                            next,
                            next
                              ? 'Papeletas desde el móvil habilitadas: los inspectores verán "Nueva Papeleta".'
                              : 'Papeletas desde el móvil deshabilitadas: los inspectores verán "Registrar Evidencia".'
                          )
                        }}
                        className="peer sr-only"
                      />
                      <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-violet-600 peer-disabled:opacity-60 dark:bg-slate-700"></span>
                      <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Administración del sistema</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Módulos administrativos</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Funciones exclusivas para superadministración. Los módulos operativos quedan fuera de este perfil.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {adminModules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => navigate(`/superadmin/${module.id}`)}
                  className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-lg dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]"
                >
                  <div className="flex items-start gap-4">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${module.tone} text-white shadow-lg`}>
                      <Icon name={module.icon} className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-black text-slate-950 dark:text-white">{module.label}</h2>
                      <p className="mt-1 text-sm font-semibold leading-5 text-slate-500 dark:text-slate-400">{module.detail}</p>
                      <span className="mt-4 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm group-hover:text-blue-700 dark:bg-[var(--bg-surface)] dark:text-slate-300">
                        Abrir módulo
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {!isDashboard && (
        activeModule === 'usuarios' ? (
          <Usuarios user={user} />
        ) : (
          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Módulo administrativo</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{activeModuleInfo?.detail}</p>
              </div>
              {activeModule === 'roles' && (
                <button onClick={fetchUsuarios} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white cursor-pointer">
                  Actualizar
                </button>
              )}
            </div>

            {activeModule === 'roles' && (
              <RolesTable roles={rolesAgrupados} loading={loadingUsers} onEdit={setEditingUser} />
            )}

        {activeModule === 'configuracion' && (
          <ConfiguracionReadOnly
            municipalidad={municipalidad}
            municipalidadAnios={municipalidadAnios}
            mobilePermitePapeleta={mobilePermitePapeleta}
            savingConfigSistema={savingConfigSistema}
            onToggleMobilePermitePapeleta={(next) => {
              setMobilePermitePapeleta(next)
              saveConfigSistema(
                'mobile_permite_aplicar_papeleta',
                next,
                next
                  ? 'Papeletas desde el móvil habilitadas: los inspectores verán "Nueva Papeleta".'
                  : 'Papeletas desde el móvil deshabilitadas: los inspectores verán "Registrar Evidencia".'
              )
            }}
            loading={loadingMunicipalidad}
            onReload={fetchMunicipalidadConfig}
          />
        )}

        {activeModule === 'auditoria' && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { label: 'Total eventos', value: auditStats.total || realAuditLogs.length, detail: 'Registros en base de datos', tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200' },
                { label: 'Eventos hoy', value: auditStats.hoy, detail: 'Actividad de la jornada', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' },
                { label: 'Módulos activos', value: (auditStats.porModulo || []).length || '6', detail: 'Trazabilidad del sistema', tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200' },
                { label: 'Mostrados', value: realAuditLogs.length, detail: 'Coincidencias con filtros', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200' }
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl px-4 py-4 ${item.tone}`}>
                  <p className="text-[11px] font-black uppercase tracking-wider opacity-70">{item.label}</p>
                  <p className="mt-2 text-3xl font-black">{item.value}</p>
                  <p className="mt-1 text-xs font-bold opacity-80">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-[var(--border)] lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Centro de auditoría institucional</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Registro formal y trazabilidad de eventos, inicios de sesión y modificaciones de datos en el sistema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportAuditoria}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Icon name="table" className="size-4" />
                  <span>Exportar a Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAuditoriaPdf}
                  disabled={loadingAudit || realAuditLogs.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 shadow-xs hover:bg-rose-50 active:scale-95 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400 cursor-pointer"
                >
                  <Icon name="document" className="size-4" />
                  <span>Exportar a PDF</span>
                </button>

              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_200px_200px]">
                <input
                  value={auditSearch}
                  onChange={(event) => setAuditSearch(event.target.value)}
                  placeholder="Buscar por descripción, usuario, módulo o IP..."
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 dark:border-[var(--border-strong)] dark:bg-slate-950 dark:text-white"
                />
                <RoundedSelect
                  value={auditType}
                  onChange={setAuditType}
                  options={[
                    { value: 'TODOS', label: 'Todos los módulos' },
                    { value: 'SEGURIDAD', label: 'Seguridad (Login/Logout)' },
                    { value: 'USUARIOS', label: 'Usuarios' },
                    { value: 'VEHICULOS', label: 'Vehículos' },
                    { value: 'ASOCIACIONES', label: 'Asociaciones' },
                    { value: 'PAGOS', label: 'Pagos y Recaudación' },
                    { value: 'PAPELETAS', label: 'Papeletas' },
                    { value: 'CONFIGURACION', label: 'Configuración' }
                  ]}
                />
                <RoundedSelect
                  value={auditSeverity}
                  onChange={setAuditSeverity}
                  options={[
                    { value: 'TODOS', label: 'Todas las acciones' },
                    { value: 'CREAR', label: 'Creación' },
                    { value: 'MODIFICAR', label: 'Modificación' },
                    { value: 'ELIMINAR', label: 'Eliminación' },
                    { value: 'LOGIN', label: 'Inicio de sesión' },
                    { value: 'LOGOUT', label: 'Cierre de sesión' },
                    { value: 'CONFIRMAR', label: 'Confirmación de pago' },
                    { value: 'ANULAR', label: 'Anulación' }
                  ]}
                />
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 dark:border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-center">Fecha y Hora</th>
                      <th className="px-4 py-3 text-center">Módulo</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                      <th className="px-4 py-3">Descripción del Evento</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Dirección IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                    {loadingAudit ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm font-bold text-slate-500">
                          Cargando eventos de auditoría desde la base de datos...
                        </td>
                      </tr>
                    ) : realAuditLogs.length ? realAuditLogs.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap text-center">
                          {event.fecha_hora ? new Date(event.fecha_hora).toLocaleString('es-PE') : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                            {event.modulo}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                            event.accion === 'ELIMINAR' || event.accion === 'ANULAR'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
                              : event.accion === 'MODIFICAR' || event.accion === 'CAMBIO_PASSWORD'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
                                : event.accion === 'CREAR' || event.accion === 'CONFIRMAR'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
                                  : 'bg-slate-100 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300'
                          }`}>
                            {event.accion}
                          </span>
                        </td>
                        <td className="px-4 py-3 ">
                          <p className="font-semibold text-slate-800 dark:text-white leading-snug">{event.descripcion}</p>
                          {event.user_agent && (
                            <p className="mt-0.5 text-[10px] text-slate-400  " title={event.user_agent}>
                              {event.user_agent}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {event.nombre_usuario || 'sistema'}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                          {event.rol || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap text-center">
                          {event.ip || '—'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm font-bold text-slate-500">
                          No se encontraron registros de auditoría que coincidan con los filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeModule === 'respaldo' && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { title: 'Base de datos', detail: 'Preparado para exportar copia de seguridad del sistema.', status: 'Pendiente de integrar' },
              { title: 'Archivos y evidencias', detail: 'Control de fotos, reportes móviles y documentos adjuntos.', status: 'En revisión' },
              { title: 'Restauración', detail: 'Proceso reservado para mantenimiento técnico autorizado.', status: 'Restringido' }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                <p className="font-black text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{item.detail}</p>
                <span className="mt-4 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
        )
      )}

      {editingUser && (
        <Modal title="Editar rol y estado" onClose={() => setEditingUser(null)}>
          <form onSubmit={saveRole} className="space-y-4">
            <p className="font-bold text-slate-800 dark:text-white">{editingUser.nombre_usuario}</p>
            <FloatingSelect
              id="edit_rol"
              label="Rol del sistema"
              value={editingUser.id_rol || ''}
              onChange={(e) => setEditingUser({ ...editingUser, id_rol: e.target.value })}
              options={roles.map((r) => ({ value: r.id, label: r.nombre }))}
            />
            <FloatingSelect
              id="edit_estado"
              label="Estado del usuario"
              value={editingUser.usuario_estado || 'ACTIVO'}
              onChange={(e) => setEditingUser({ ...editingUser, usuario_estado: e.target.value })}
              options={[
                { value: 'ACTIVO', label: 'ACTIVO' },
                { value: 'INACTIVO', label: 'INACTIVO' }
              ]}
            />
            <button className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 cursor-pointer">Guardar cambios</button>
          </form>
        </Modal>
      )}

      {userModalOpen && (
        <Modal title="Nuevo usuario" onClose={() => setUserModalOpen(false)} maxWidth="max-w-3xl">
          <form onSubmit={saveUser} className="space-y-4">
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-400">Trabajador municipal</label>
                <input
                  required
                  value={trabajadorSearch}
                  onFocus={() => setTrabajadorDropdownOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setTrabajadorDropdownOpen(false), 120)
                  }}
                  onChange={(e) => {
                    setTrabajadorSearch(e.target.value)
                    setTrabajadorDropdownOpen(true)
                    setUserForm({ ...userForm, id_trabajador: '' })
                  }}
                  placeholder="Busca por DNI, nombre o cargo..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
                />
                {trabajadorDropdownOpen && !selectedTrabajador && (
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)]">
                    {trabajadoresSinUsuario.map((trabajador) => (
                      <button
                        key={trabajador.id_persona || trabajador.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          const idTrabajador = trabajador.id_persona || trabajador.id
                          setUserForm((current) => ({ ...current, id_trabajador: idTrabajador }))
                          setTrabajadorSearch(`${trabajador.numero_documento} — ${trabajador.nombres} ${trabajador.apellidos || ''}`.trim())
                          setTrabajadorDropdownOpen(false)
                        }}
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50 dark:border-[var(--border)] dark:hover:bg-[var(--bg-subtle)]"
                      >
                        <p className="font-bold text-slate-900 dark:text-white">{trabajador.nombres} {trabajador.apellidos}</p>
                        <p className="text-xs font-semibold text-blue-600">{trabajador.tipo_documento}: {trabajador.numero_documento} · {trabajador.cargo || 'Sin cargo'}</p>
                      </button>
                    ))}
                    {!trabajadoresSinUsuario.length && (
                      <p className="px-3 py-3 text-sm font-semibold text-slate-500">
                        No hay trabajadores disponibles. Registra primero al trabajador o verifica que no tenga usuario activo.
                      </p>
                    )}
                  </div>
                )}
                {selectedTrabajador && (
                  <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    Seleccionado: {selectedTrabajador.nombres} {selectedTrabajador.apellidos} · {selectedTrabajador.numero_documento}
                  </p>
                )}
                {!selectedTrabajador && (
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Primero selecciona un trabajador para poder crearle su cuenta de usuario.
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required value={userForm.nombre_usuario} onChange={(e) => setUserForm({ ...userForm, nombre_usuario: e.target.value.toLowerCase().replace(/\s+/g, '') })} placeholder="Usuario" className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white" />
              <input required minLength={6} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Contraseña" className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white" />
              <select required value={userForm.id_rol} onChange={(e) => setUserForm({ ...userForm, id_rol: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white sm:col-span-2">
                <option value="" disabled>Selecciona un rol...</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-[var(--border)]">
              <button type="button" onClick={() => setUserModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)]">
                Cancelar
              </button>
              <button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-black text-white shadow-md shadow-blue-600/20 hover:shadow-lg">
                Crear usuario
              </button>
            </div>
          </form>
        </Modal>
      )}

      {passwordUser && (
        <Modal title="Restablecer contraseña" onClose={() => setPasswordUser(null)}>
          <form onSubmit={resetPassword} className="space-y-4">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Usuario: <strong className="text-slate-900 dark:text-white">{passwordUser.nombre_usuario}</strong></p>
            <input minLength={6} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white outline-none" />
            <button className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 cursor-pointer">Actualizar contraseña</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function UsersTable({ usuarios, totalUsuarios, loading, searchTerm, setSearchTerm, onCreate, onEdit, onPassword, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar usuario, nombre o rol..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95"
        >
          <span className="text-base leading-none font-black">+</span>
          <span>Nuevo usuario</span>
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-medium text-slate-500 dark:border-[var(--border)] dark:bg-slate-900/30 dark:text-slate-400">
        <span>
          Mostrando <strong className="text-slate-800 dark:text-white">{usuarios.length}</strong> de{' '}
          <strong className="text-slate-800 dark:text-white">{totalUsuarios}</strong> usuarios registrados
        </span>
        <span className="hidden sm:inline text-[11px] text-slate-400">
          Administración de accesos MDJLO · {new Date().getFullYear()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-[var(--border)] dark:bg-slate-900/80 dark:text-slate-400">
            <tr>
              <th className="px-3.5 py-3.5 whitespace-nowrap">Usuario</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap">Nombre completo</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap">Rol</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap text-center">Estado</th>
              <th className="sticky right-0 z-20 bg-slate-50/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:border-[var(--border)] dark:bg-slate-900/95 dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center font-bold text-slate-500">Cargando...</td></tr>
            ) : usuarios.length ? usuarios.map((item) => (
              <tr key={item.id} className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-[var(--bg-subtle)]">
                <td className="px-3.5 py-3.5">
                  <p className="font-black text-slate-800 dark:text-white">{item.nombre_usuario}</p>
                  <p className="text-xs font-semibold text-slate-400">ID trabajador: {item.id_trabajador}</p>
                </td>
                <td className="px-3.5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">{item.nombre_completo}</td>
                <td className="px-3.5 py-3.5">
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black uppercase leading-4 text-blue-700">
                    {item.cargo || 'Sin rol'}
                  </span>
                </td>
                <td className="px-3.5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${item.usuario_estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {item.usuario_estado}
                  </span>
                </td>
                <td className="sticky right-0 z-10 bg-white px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] group-hover:bg-blue-50/40 dark:border-slate-800/80 dark:bg-[var(--bg-surface)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] dark:group-hover:bg-slate-800/60">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(item)} className="rounded-xl bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-500 hover:text-white dark:bg-blue-950/60 dark:text-blue-400" title="Editar"><Icon name="pencil" className="size-4" /></button>
                    <button onClick={() => onPassword(item)} className="rounded-xl bg-amber-50 p-2 text-amber-600 transition hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400" title="Contraseña"><Icon name="settings" className="size-4" /></button>
                    <button onClick={async () => {
                      const result = await showConfirm('¿Eliminar usuario?', '¿Está seguro de eliminar este usuario?', 'Sí, eliminar', 'Cancelar')
                      if (result.isConfirmed) onDelete(item)
                    }} className="rounded-xl bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-500 hover:text-white dark:bg-rose-950/60 dark:text-rose-400" title="Eliminar"><Icon name="trash" className="size-4" /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center font-bold text-slate-500">No hay usuarios.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RolesTable({ roles, loading, onEdit }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return roles
    return roles.filter((grupo) => {
      const matchRol = (grupo.rol || '').toLowerCase().includes(q)
      const matchMiembro = (grupo.miembros || []).some((m) =>
        (m.nombre_usuario || '').toLowerCase().includes(q) ||
        (m.nombre_completo || '').toLowerCase().includes(q)
      )
      return matchRol || matchMiembro
    })
  }, [roles, searchTerm])

  const totalAsignaciones = useMemo(() => {
    return roles.reduce((acc, r) => acc + (r.miembros?.length || 0), 0)
  }, [roles])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar rol, cargo o usuario asignado..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-medium text-slate-500 dark:border-[var(--border)] dark:bg-slate-900/30 dark:text-slate-400">
        <span>
          Mostrando <strong className="text-slate-800 dark:text-white">{filteredRoles.length}</strong> de{' '}
          <strong className="text-slate-800 dark:text-white">{roles.length}</strong> roles registrados ({totalAsignaciones} usuarios vinculados)
        </span>
        <span className="hidden sm:inline text-[11px] text-slate-400">
          Roles y perfiles de usuario MDJLO · {new Date().getFullYear()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-[var(--border)] dark:bg-slate-900/80 dark:text-slate-400">
            <tr>
              <th className="px-3.5 py-3.5 whitespace-nowrap">Rol / Cargo</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap text-center">Total Asignados</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap">Usuarios con este Rol</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap text-center">Estado</th>
              <th className="sticky right-0 z-20 bg-slate-50/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:border-[var(--border)] dark:bg-slate-900/95 dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center font-bold text-slate-500">Cargando roles...</td></tr>
            ) : filteredRoles.length ? filteredRoles.map((grupo) => (
              <tr key={grupo.rol} className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-[var(--bg-subtle)]">
                <td className="px-3.5 py-3.5 align-top">
                  <p className="font-black text-slate-800 dark:text-white">{grupo.rol}</p>
                  <p className="text-xs font-semibold text-slate-400">Perfil del sistema</p>
                </td>
                <td className="px-3.5 py-3.5 align-top">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <span className="size-1.5 rounded-full bg-blue-500" />
                    {grupo.miembros.length} {grupo.miembros.length === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </td>
                <td className="px-3.5 py-3.5 align-top">
                  <div className="flex flex-wrap gap-1.5 max-w-xl">
                    {grupo.miembros.length ? grupo.miembros.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{m.nombre_usuario}</span>
                        <span className="text-[11px] text-slate-400">({m.nombre_completo})</span>
                      </span>
                    )) : (
                      <span className="text-xs italic text-slate-400">Sin usuarios asignados</span>
                    )}
                  </div>
                </td>
                <td className="px-3.5 py-3.5 align-top">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <span className="size-1.5 rounded-full bg-current" />
                    ACTIVO
                  </span>
                </td>
                <td className="sticky right-0 z-10 bg-white px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] group-hover:bg-blue-50/40 dark:border-slate-800/80 dark:bg-[var(--bg-surface)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] dark:group-hover:bg-slate-800/60 align-top">
                  <div className="flex justify-end gap-1.5">
                    {grupo.miembros.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => onEdit(grupo.miembros[0])}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-500 hover:text-white dark:bg-blue-950/60 dark:text-blue-400"
                        title="Gestionar rol"
                      >
                        <Icon name="shieldCheck" className="size-4" />
                        <span>Gestionar</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">N/A</span>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-4 py-8 text-center font-bold text-slate-500">No se encontraron roles coincidentes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConfiguracionReadOnly({
  municipalidad,
  municipalidadAnios,
  mobilePermitePapeleta,
  savingConfigSistema,
  onToggleMobilePermitePapeleta,
  loading,
  onReload
}) {
  const [formData, setFormData] = useState({
    ruc: '',
    razon_social: '',
    nombre_abreviado: '',
    sigla: '',
    direccion_fiscal: '',
    departamento: '',
    provincia: '',
    distrito: '',
    telefono: '',
    email: '',
    mesa_partes: '',
    logo: ''
  })
  
  useEffect(() => {
    if (municipalidad) {
      setFormData({
        ruc: municipalidad.ruc || '',
        razon_social: municipalidad.razon_social || '',
        nombre_abreviado: municipalidad.nombre_abreviado || '',
        sigla: municipalidad.sigla || '',
        direccion_fiscal: municipalidad.direccion_fiscal || '',
        departamento: municipalidad.departamento || '',
        provincia: municipalidad.provincia || '',
        distrito: municipalidad.distrito || '',
        telefono: municipalidad.telefono || '',
        email: municipalidad.email || '',
        mesa_partes: municipalidad.mesa_partes || '',
        logo: municipalidad.logo || ''
      })
    }
  }, [municipalidad])

  const [saving, setSaving] = useState(false)
  const [anioModalOpen, setAnioModalOpen] = useState(false)
  const [anioForm, setAnioForm] = useState({ id: '', anio: '', nombre: '', uit: '', token: '' })
  
  const handleSave = async (e) => {
    e.preventDefault()
    if (!municipalidad?.id) return
    setSaving(true)
    try {
      const res = await apiFetch(`/municipalidad/${municipalidad.id}`, {
        method: 'PUT',
        body: formData
      })
      if (res.ok) {
        showSuccess('Datos de la municipalidad guardados correctamente')
        onReload()
      } else {
        const error = await res.json()
        showError(error.message || 'Error al guardar los datos')
      }
    } catch (err) {
      showError('Error de red al guardar los datos')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAnio = async (e) => {
    e.preventDefault()
    if (!municipalidad?.id) return
    try {
      const isEdit = !!anioForm.id
      const url = '/municipalidad/anios'
      const method = 'POST'
      
      const payload = { ...anioForm, id_municipalidad: municipalidad.id }
      if (isEdit) delete payload.id
      
      const res = await apiFetch(url, {
        method,
        body: payload
      })
      if (res.ok) {
        showSuccess(isEdit ? 'Año actualizado correctamente' : 'Año registrado correctamente')
        setAnioModalOpen(false)
        onReload()
      } else {
        const error = await res.json()
        showError(error.message || 'Error al guardar año')
      }
    } catch (err) {
      showError('Error de red al guardar año')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* TARJETA INTERACTIVA DE PERMISO GENERAL MÓVIL */}
      <div className="rounded-3xl border border-violet-200/90 bg-gradient-to-r from-violet-50/90 via-purple-50/70 to-indigo-50/80 p-5 shadow-sm dark:border-[var(--border)] dark:bg-none dark:bg-[var(--bg-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-md transition-all ${
              mobilePermitePapeleta
                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/25'
                : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25'
            }`}>
              <Icon name="deviceMobile" className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Permiso general móvil
                </h3>
              </div>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                Control general para permitir a los inspectores aplicar papeletas en la app móvil.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
              {savingConfigSistema ? 'Guardando...' : mobilePermitePapeleta ? 'Activo' : 'Inactivo'}
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={mobilePermitePapeleta}
                disabled={savingConfigSistema}
                onChange={(e) => onToggleMobilePermitePapeleta && onToggleMobilePermitePapeleta(e.target.checked)}
                className="peer sr-only"
              />
              <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-violet-600 peer-disabled:opacity-60 dark:bg-slate-700"></span>
              <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-5"></span>
            </label>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <fieldset className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white shadow-xs dark:bg-[var(--bg-surface)] dark:border-[var(--border)]">
          <legend className="px-3 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-white dark:bg-[var(--bg-surface)]">
            Datos Institucionales
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            <FloatingInput id="mun_ruc" label="RUC" value={formData.ruc} onChange={(e) => setFormData({...formData, ruc: e.target.value})} maxLength={11} required />
            <div className="sm:col-span-2">
              <FloatingInput id="mun_razon" label="Razón Social" value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} required />
            </div>
            
            <FloatingInput id="mun_abrev" label="Nombre Abreviado" value={formData.nombre_abreviado} onChange={(e) => setFormData({...formData, nombre_abreviado: e.target.value})} />
            <FloatingInput id="mun_sigla" label="Sigla Oficial" value={formData.sigla} onChange={(e) => setFormData({...formData, sigla: e.target.value})} />
            <FloatingInput id="mun_logo" label="Logo URL" value={formData.logo} onChange={(e) => setFormData({...formData, logo: e.target.value})} />
          </div>
        </fieldset>

        <fieldset className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white shadow-xs dark:bg-[var(--bg-surface)] dark:border-[var(--border)]">
          <legend className="px-3 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-white dark:bg-[var(--bg-surface)]">
            Contacto y Ubicación
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            <div className="sm:col-span-3">
              <FloatingInput id="mun_dir" label="Dirección Fiscal" value={formData.direccion_fiscal} onChange={(e) => setFormData({...formData, direccion_fiscal: e.target.value})} required />
            </div>
            <FloatingInput id="mun_dep" label="Departamento" value={formData.departamento} onChange={(e) => setFormData({...formData, departamento: e.target.value})} />
            <FloatingInput id="mun_prov" label="Provincia" value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value})} />
            <FloatingInput id="mun_dist" label="Distrito" value={formData.distrito} onChange={(e) => setFormData({...formData, distrito: e.target.value})} />
            
            <FloatingInput id="mun_tel" label="Teléfono de Contacto" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
            <FloatingInput id="mun_email" label="Correo Oficial" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <FloatingInput id="mun_mesa" label="Mesa de Partes" value={formData.mesa_partes} onChange={(e) => setFormData({...formData, mesa_partes: e.target.value})} />
          </div>
        </fieldset>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Icon name="save" className="size-4" />
            {saving ? 'Guardando...' : 'Guardar Datos Institucionales'}
          </button>
        </div>
      </form>

      {/* Configuración UIT */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:bg-[var(--bg-surface)] dark:border-[var(--border)] mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Configuración UIT (Años Fiscales)</h3>
            <p className="text-xs font-semibold text-slate-500">Valores de la Unidad Impositiva Tributaria para el cálculo de papeletas.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAnioForm({ id: '', anio: String(new Date().getFullYear()), nombre: '', uit: '', token: '' })
              setAnioModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
          >
            <Icon name="add" className="size-4" />
            <span>Nuevo Año</span>
          </button>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-center">Año</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 text-center">Valor UIT</th>
                <th className="px-4 py-3 text-center">Token</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
              {municipalidadAnios.length > 0 ? municipalidadAnios.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{item.anio}</td>
                  <td className="px-4 py-3 font-medium">{item.nombre}</td>
                  <td className="px-4 py-3 text-center font-mono font-black text-blue-600 dark:text-blue-400">
                    S/ {Number(item.uit || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.token ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">✓ Configurado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">✗ Falta token</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAnioForm({ id: item.id, anio: item.anio, nombre: item.nombre, uit: item.uit, token: item.token || '' })
                        setAnioModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 transition-colors cursor-pointer"
                    >
                      <Icon name="edit" className="size-3.5" />
                      Editar
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-sm font-semibold text-slate-400">
                    No hay registros de UIT.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {anioModalOpen && (
        <Modal title={anioForm.id ? "Editar Año Fiscal" : "Nuevo Año Fiscal"} icon="receiptCheck" onClose={() => setAnioModalOpen(false)}>
          <form onSubmit={handleSaveAnio} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 mt-2">
              <FloatingInput id="anio_val" label="Año" required value={anioForm.anio} onChange={(e) => setAnioForm({...anioForm, anio: e.target.value})} />
              <FloatingInput id="anio_nombre" label="Denominación (Opcional)" value={anioForm.nombre} onChange={(e) => setAnioForm({...anioForm, nombre: e.target.value})} />
              <FloatingInput id="anio_uit" label="Valor UIT (S/)" required type="number" step="0.01" value={anioForm.uit} onChange={(e) => setAnioForm({...anioForm, uit: e.target.value})} inputClassName="font-mono font-bold text-blue-700 dark:text-blue-400" />
              <FloatingInput id="anio_token" label="Token API (MTC / PIDE)" value={anioForm.token} onChange={(e) => setAnioForm({...anioForm, token: e.target.value})} />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
              >
                Guardar Año Fiscal
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function LabeledInput({ label, value, onChange, className = '', type = 'text', placeholder = '', required = false }) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <input
        required={required}
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || label}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:ring-blue-500/20"
      />
    </label>
  )
}

function Modal({ title, children, onClose, maxWidth = '' }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className={`w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[var(--bg-surface)]`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-[var(--border)]">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-subtle)] dark:hover:text-white cursor-pointer"><Icon name="close" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
