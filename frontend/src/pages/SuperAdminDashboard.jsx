import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { apiFetch } from '../config/api'
import { showConfirm, showSuccess, showError } from '../utils/SwalUtil'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { formatNumeroTarjeta } from '../utils/formatters'
import { FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'
import { Modal } from '../components/ui/Modal'
import { RolesTable } from '../components/superadmin/RolesTable'
import { ConfiguracionReadOnly } from '../components/superadmin/ConfiguracionReadOnly'
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
  // Empieza en null (no en true/false) para no mostrar un valor adivinado
  // mientras se carga la configuración real desde el servidor.
  const [mobilePermitePapeleta, setMobilePermitePapeleta] = useState(null)
  const [savingConfigSistema, setSavingConfigSistema] = useState(false)
  const [loadingMunicipalidad, setLoadingMunicipalidad] = useState(true)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditType, setAuditType] = useState('TODOS')
  const [auditSeverity, setAuditSeverity] = useState('TODOS')
  const [realAuditLogs, setRealAuditLogs] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [auditStats, setAuditStats] = useState({ total: 0, hoy: 0, porModulo: [] })
  const municipalidadRequestRef = useRef(0)

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
    } catch (_) {
      // Error silencioso en carga inicial de auditoría
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
    { id: 'auditoria', label: 'Auditoría y logs', detail: 'Revisar acciones críticas realizadas por usuarios.', icon: 'document', tone: 'from-amber-500 to-orange-500' }
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
    const requestId = ++municipalidadRequestRef.current
    setLoadingMunicipalidad(true)
    try {
      const res = await apiFetch('/municipalidad/config?_t=' + Date.now())
      const data = await res.json()
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo cargar la municipalidad.')

      // Si mientras esta petición estaba en vuelo se lanzó otra más nueva
      // (p. ej. el doble efecto de montaje de StrictMode, o un toggle del
      // usuario que ya disparó su propio refetch), esta respuesta llegó
      // tarde: aplicarla pisaría un cambio más reciente (como el toggle de
      // "permiso móvil") con datos desactualizados.
      if (requestId !== municipalidadRequestRef.current) return

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
      if (requestId === municipalidadRequestRef.current) {
        setMessage(error.message || 'Error al cargar configuración municipal.')
      }
    } finally {
      if (requestId === municipalidadRequestRef.current) {
        setLoadingMunicipalidad(false)
      }
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
    {
      label: 'Usuarios activos', value: moduleStats[0].value, detail: 'Cuentas habilitadas', icon: 'people',
      borderColor: 'border-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400', tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    },
    {
      label: 'Usuarios inactivos', value: moduleStats[1].value, detail: 'Cuentas bloqueadas', icon: 'lock',
      borderColor: 'border-rose-400', textColor: 'text-rose-600 dark:text-rose-400', tone: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
    },
    {
      label: 'Roles registrados', value: moduleStats[2].value, detail: 'Perfiles administrativos', icon: 'shieldCheck',
      borderColor: 'border-indigo-400', textColor: 'text-indigo-600 dark:text-indigo-400', tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
    },
    {
      label: 'Permiso móvil',
      value: mobilePermitePapeleta === null ? '...' : mobilePermitePapeleta ? 'ACTIVO' : 'INACTIVO',
      detail: mobilePermitePapeleta === null ? 'Cargando configuración...' : mobilePermitePapeleta ? 'Móvil aplica papeletas' : 'Solo reportes/evidencias',
      icon: 'deviceMobile',
      borderColor: 'border-violet-400', textColor: 'text-violet-600 dark:text-violet-400', tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',
      isToggle: true
    }
  ]

  return (
    <div className="space-y-4">
      {/* Cabecera Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/20 dark:bg-[var(--bg-surface)] dark:border dark:border-[var(--border)] dark:shadow-none">
            <Icon name={isDashboard ? 'shieldCheck' : activeModuleInfo.icon} className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {isDashboard ? 'Panel Super Admin' : activeModuleInfo.label}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
          {/* Tarjetas KPI con Bordes de Colores */}
          <div className="grid gap-2.5 grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className={`relative overflow-hidden rounded-xl border-[1.5px] ${stat.borderColor} bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${stat.textColor}`}>{stat.label}</span>
                  <span className={`grid size-6 place-items-center rounded-md ${stat.tone}`}>
                    <Icon name={stat.icon} className="size-3.5" />
                  </span>
                </div>
                <div className="mt-1">
                  <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
                    {typeof stat.value === 'number' ? formatNumeroTarjeta(stat.value) : stat.value}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{stat.detail}</p>
                </div>
                {stat.isToggle && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[var(--border)] flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                      {mobilePermitePapeleta === null ? 'Cargando...' : savingConfigSistema ? 'Guardando...' : mobilePermitePapeleta ? 'Nueva Papeleta' : 'Registrar Evidencia'}
                    </span>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={mobilePermitePapeleta === true}
                        disabled={savingConfigSistema || mobilePermitePapeleta === null}
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
                      <span className="h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-violet-600 peer-disabled:opacity-60 dark:bg-slate-700"></span>
                      <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"></span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

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
                <table className="w-full text-left text-xs">
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
                        <td className="px-4 py-3 text-xs font-mono text-slate-500 text-center">
                          {event.fecha_hora ? new Date(event.fecha_hora).toLocaleString('es-PE') : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                            {event.modulo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
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
                          <p className="font-semibold text-xs text-slate-800 dark:text-white leading-snug">{event.descripcion}</p>
                          {event.user_agent && (
                            <p className="mt-0.5 text-[10px] text-slate-400  " title={event.user_agent}>
                              {event.user_agent}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 ">
                          {event.nombre_usuario || 'sistema'}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500 ">
                          {event.rol || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500 text-center">
                          {event.ip || '—'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="p-12 text-center">
                          <Icon name="folderShield" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                          <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron registros de auditoría</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
