import { useEffect, useState, useMemo } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { showToast, showConfirm, showError, showSuccess, showWarning } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { crearComparador } from '../utils/ordenMultiple'
import { SortableHeader } from '../components/ui/SortableHeader'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'
import { formatNumeroTarjeta } from '../utils/formatters'
import { errorPasswordUsuario } from '../utils/passwordPolicy'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { FilaCargando } from '../components/ui/FilaCargando'
import { esRolCampo } from '../config/roles'
import { BotonVerClave } from '../components/ui/BotonVerClave'
import { useRecargaSilenciosa } from '../hooks/useRecargaSilenciosa'

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Solo Activos' },
  { value: 'INACTIVO', label: 'Solo Inactivos' },
]

const DEFAULT_USER_FORM = {
  id_trabajador: '',
  nombre_usuario: '',
  password: '',
  id_rol: '',
  estado: 'ACTIVO',
}

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// El servidor devuelve el motivo como messages.error o como un campo (p. ej. messages.usuario): se muestra el que haya.
function mensajeDeError(datos, respaldo) {
  const mensajes = datos?.messages
  if (mensajes && typeof mensajes === 'object') {
    const textos = Object.values(mensajes).flat().filter((valor) => typeof valor === 'string' && valor.trim())
    if (textos.length) return textos.join(' ')
  }
  return typeof datos?.message === 'string' && datos.message.trim() ? datos.message : respaldo
}

export function Usuarios({ user }) {
  const cachedUsers = getCachedData('/usuarios')
  const [usuarios, setUsuarios] = useState(cachedUsers || [])
  const [trabajadores, setTrabajadores] = useState([])
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(!cachedUsers)
  const [loadError, setLoadError] = useState('')

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterRol, setFilterRol] = useState('TODOS')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Estados de formularios
  const [selectedUser, setSelectedUser] = useState(null)
  const [userForm, setUserForm] = useState(DEFAULT_USER_FORM)
  const [verClaveNueva, setVerClaveNueva] = useState(false)
  // Errores por campo del alta de usuario; cada uno se borra cuando se toca o se corrige su campo
  const [erroresAlta, setErroresAlta] = useState({})
  const quitarErrorAlta = (campo) => setErroresAlta((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev))
  const [avisoEspacios, setAvisoEspacios] = useState(false)
  // El aviso de espacios se retira solo a los pocos segundos
  useEffect(() => {
    if (!avisoEspacios) return undefined
    const temporizador = setTimeout(() => setAvisoEspacios(false), 3000)
    return () => clearTimeout(temporizador)
  }, [avisoEspacios])
  const [trabajadorSearch, setTrabajadorSearch] = useState('')
  const [trabajadorDropdownOpen, setTrabajadorDropdownOpen] = useState(false)
  const [personaElegida, setPersonaElegida] = useState(null)
  const [resultadosPadron, setResultadosPadron] = useState([])
  const [buscandoPadron, setBuscandoPadron] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  // Carga de datos
  const loadData = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [usersRes, trabRes, rolesRes] = await Promise.all([
        apiFetch('/usuarios'),
        apiFetch('/personal'),
        apiFetch('/usuarios/roles'),
      ])

      if (!usersRes.ok) throw new Error('No se pudo cargar la lista de usuarios.')
      const usersData = await usersRes.json()
      const usersList = usersData.data || []
      setUsuarios(usersList)
      setCachedData('/usuarios', usersList)

      if (trabRes.ok) {
        const trabData = await trabRes.json()
        setTrabajadores(trabData.data || [])
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        const fetchedRoles = rolesData.data || []
        setRoles(fetchedRoles)
      }
    } catch (err) {
      setLoadError(err.message || 'Error al conectar con la base de datos.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRecargaSilenciosa('/usuarios', [() => loadData()])

  // Métricas KPI
  const totalUsuarios = usuarios.length
  const activos = usuarios.filter((u) => u.usuario_estado === 'ACTIVO').length
  const inactivos = usuarios.filter((u) => u.usuario_estado !== 'ACTIVO').length
  const administradores = usuarios.filter((u) => {
    const r = (u.rol || '').toUpperCase()
    return r === 'SUPERADMIN' || r === 'GERENTE' || r === 'SUBGERENTE'
  }).length
  // Personal de campo: usa solo la app móvil (inspectores y encargado del depósito)
  const inspectores = usuarios.filter((u) => esRolCampo(u.rol)).length

  // Filtrado
  const filteredUsuarios = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return usuarios.filter((item) => {
      const matchSearch =
        !q ||
        [item.nombre_usuario, item.nombre_completo, item.rol, item.cargo, item.numero_documento]
          .some((val) => String(val || '').toLowerCase().includes(q))

      const matchEstado =
        filterEstado === 'TODOS' || item.usuario_estado === filterEstado

      const matchCargo =
        filterRol === 'TODOS' || String(item.id_rol) === String(filterRol)

      return matchSearch && matchEstado && matchCargo
    })
  }, [usuarios, searchTerm, filterEstado, filterRol])

  // Paginación
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado, filterRol])

  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }

  const sortedUsuarios = useMemo(() => {
    if (!sortBy) return filteredUsuarios
    return [...filteredUsuarios].sort(crearComparador(sortBy, sortDir))
  }, [filteredUsuarios, sortBy, sortDir])

  const paginatedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedUsuarios.slice(start, start + itemsPerPage)
  }, [sortedUsuarios, currentPage, itemsPerPage])

  const busquedaPadron = useDebounce(trabajadorSearch.trim(), 300)
  const personasConCuenta = useMemo(
    () => new Set(usuarios.map((u) => String(u.id_persona || u.id_trabajador || ''))),
    [usuarios],
  )
  const cargoDe = (idPersona) => trabajadores.find((t) => String(t.id_persona || t.id) === String(idPersona))?.cargo || ''

  useEffect(() => {
    if (!isCreateModalOpen || personaElegida || busquedaPadron.length < 2) {
      setResultadosPadron([])
      return undefined
    }
    const controlador = new AbortController()
    setBuscandoPadron(true)
    apiFetch(`/personas?buscar=${encodeURIComponent(busquedaPadron)}&page=1&porPagina=8`, { signal: controlador.signal })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => setResultadosPadron(payload.data || []))
      .catch(() => { })
      .finally(() => setBuscandoPadron(false))
    return () => controlador.abort()
  }, [busquedaPadron, isCreateModalOpen, personaElegida])

  const elegirPersona = (persona) => {
    setPersonaElegida(persona)
    setUserForm((prev) => ({ ...prev, id_trabajador: persona.id }))
    setTrabajadorSearch(`${persona.numeroDocumento} - ${persona.nombres} ${persona.apellidoPaterno || ''} ${persona.apellidoMaterno || ''}`.replace(/\s+/g, ' ').trim())
    setTrabajadorDropdownOpen(false)
  }

  // Acciones: Nuevo Usuario
  const handleOpenCreateModal = () => {
    setUserForm(DEFAULT_USER_FORM)
    setTrabajadorSearch('')
    setPersonaElegida(null)
    setResultadosPadron([])
    setTrabajadorDropdownOpen(false)
    setVerClaveNueva(false)
    setAvisoEspacios(false)
    setErroresAlta({})
    setIsCreateModalOpen(true)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    const errores = {}
    if (!userForm.id_trabajador) errores.persona = 'Seleccione un trabajador.'
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(userForm.nombre_usuario || '')) {
      errores.nombre_usuario = 'Use de 3 a 50 caracteres: letras, números, guion o guion bajo.'
    }
    const errorPassword = errorPasswordUsuario(userForm.password, userForm.nombre_usuario)
    if (errorPassword) errores.password = errorPassword
    if (!userForm.id_rol) errores.id_rol = 'Seleccione el rol del usuario.'
    if (Object.keys(errores).length) {
      setErroresAlta(errores)
      return
    }
    setErroresAlta({})

    setSaving(true)
    try {
      const res = await apiFetch('/usuarios', {
        method: 'POST',
        body: { ...userForm, estado: 'ACTIVO' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(mensajeDeError(data, 'No se pudo crear el usuario.'))

      showToast('Usuario registrado correctamente', 'crear')
      setIsCreateModalOpen(false)
      loadData()
    } catch (err) {
      // El servidor rechaza por reglas de negocio (usuario repetido, contraseña débil…): es un aviso, no un fallo
      const mensaje = sanitizarMensaje(err.message, 'Revise los datos e intente nuevamente.')
      if (/usuario/i.test(mensaje) && /(existe|registrad|uso|repetid)/i.test(mensaje)) {
        setErroresAlta({ nombre_usuario: mensaje })
      } else {
        showWarning('No se pudo crear el usuario', mensaje)
      }
    } finally {
      setSaving(false)
    }
  }

  // Acciones: Editar usuario (rol, estado y, si se desea, nueva contraseña)
  const handleOpenEditModal = (u) => {
    setSelectedUser(u)
    setNewPassword('')
    setShowPassword(false)
    setUserForm({
      id_rol: u.id_rol || '',
      estado: u.usuario_estado || 'ACTIVO',
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditUser = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    // La contraseña es opcional: solo se cambia si se escribió una nueva
    if (newPassword) {
      const errorPassword = errorPasswordUsuario(newPassword, selectedUser.nombre_usuario)
      if (errorPassword) {
        showWarning('Contraseña inválida', errorPassword)
        return
      }
    }
    setSaving(true)
    try {
      const res = await apiFetch(`/usuarios/${selectedUser.id}`, {
        method: 'PUT',
        body: {
          id_rol: userForm.id_rol,
          estado: userForm.estado,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(mensajeDeError(data, 'No se pudo actualizar el usuario.'))

      if (newPassword) {
        const resClave = await apiFetch(`/usuarios/${selectedUser.id}/password`, {
          method: 'PUT',
          body: { password: newPassword },
        })
        const datosClave = await resClave.json().catch(() => ({}))
        if (!resClave.ok) throw new Error(mensajeDeError(datosClave, 'Se guardaron los cambios, pero no se pudo cambiar la contraseña.'))
      }

      showToast('Usuario actualizado correctamente', 'editar')
      setIsEditModalOpen(false)
      loadData()
    } catch (err) {
      showError('Error al editar', sanitizarMensaje(err.message, 'No se pudo editar el usuario.'))
    } finally {
      setSaving(false)
    }
  }

  // Acciones: Eliminar Usuario
  const handleDeleteUser = async (u) => {
    const confirm = await showConfirm(
      '¿Eliminar usuario?',
      `Esta acción dará de baja la cuenta de acceso de @${u.nombre_usuario} (${u.nombre_completo || 'Colaborador'}).`,
      'Sí, eliminar',
      'Cancelar'
    )
    if (confirm.isConfirmed) {
      try {
        const res = await apiFetch(`/usuarios/${u.id}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(mensajeDeError(data, 'No se pudo eliminar el usuario.'))
        showToast('Usuario eliminado correctamente')
        loadData()
      } catch (err) {
        showError('Error al eliminar', sanitizarMensaje(err.message, 'No se pudo eliminar el usuario.'))
      }
    }
  }

  // Exportar PDF

  // Estilos y badges de roles
  const getRoleBadge = (rol) => {
    const r = (rol || '').toUpperCase()
    if (r === 'SUPERADMIN') {
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-[var(--border)]'
    }
    if (r === 'GERENTE' || r === 'SUBGERENTE') {
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-[var(--border)]'
    }
    if (r === 'INSPECTOR DE TRÁNSITO' || r === 'INSPECTOR TÉCNICO' || r === 'ENCARGADO DE DEPÓSITO') {
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-[var(--border)]'
    }
    if (r === 'SECRETARIA') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-[var(--border)]'
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:border-[var(--border-strong)]'
  }

  return (
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} onRetry={loadData} />}

      {/* Cabecera Principal con gradiente idéntico a Personas.jsx */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="people" className="size-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Gestión de Usuarios
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas idénticas al diseño de Personas.jsx */}
      <div className="kpi-grid">
        {/* 1. Total usuarios */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total usuarios
            </span>
            <span className="grid size-6 place-items-center rounded-md text-indigo-600 dark:text-indigo-400">
              <Icon name="people" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalUsuarios)}
            </p>
          </div>
        </div>

        {/* 2. Administradores */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Administración
            </span>
            <span className="grid size-6 place-items-center rounded-md text-amber-600 dark:text-amber-400">
              <Icon name="shieldCheck" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(administradores)}
            </p>
          </div>
        </div>

        {/* 3. Inspectores */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Personal móvil
            </span>
            <span className="grid size-6 place-items-center rounded-md text-cyan-600 dark:text-cyan-400">
              <Icon name="deviceMobile" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(inspectores)}
            </p>
          </div>
        </div>

        {/* 4. Activos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Activos
            </span>
            <span className="grid size-6 place-items-center rounded-md text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(activos)}
            </p>
          </div>
        </div>

        {/* 5. Inactivos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Inactivos
            </span>
            <span className="grid size-6 place-items-center rounded-md text-rose-600 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(inactivos)}
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor de la Tabla con estilo exacto de Personas.jsx */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
        {/* Barra de Filtros y Acciones */}
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, nombre, DNI o rol"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterEstado}
              onChange={setFilterEstado}
              options={FILTER_ESTADO_OPTIONS}
            />

            <RoundedSelect
              value={filterRol}
              onChange={setFilterRol}
              options={[
                { value: 'TODOS', label: 'Todos los roles' },
                ...roles.map((r) => ({ value: String(r.id), label: r.nombre })),
              ]}
            />

            {(filterEstado !== 'TODOS' || filterRol !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterEstado('TODOS')
                  setFilterRol('TODOS')
                  setSearchTerm('')
                }}
                title="Limpiar filtros"
                className="grid size-8.5 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Nuevo usuario</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[28%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
              <tr>
                <th className="px-4 py-3 "><SortableHeader column="nombre_usuario" label="Usuario" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 "><SortableHeader column="nombre_completo" label="Colaborador Asignado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 ">Rol / Permiso</th>
                <th className="px-4 py-3 "><SortableHeader column="usuario_estado" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="sticky right-0 z-20 px-4 py-3 text-right bg-slate-50/95 dark:bg-slate-900/95 border-l border-slate-200/60 dark:border-[var(--border)] shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isLoading && usuarios.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && usuarios.length === 0 ? (
                <FilaCargando colSpan={5} />
              ) : filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="mx-auto max-w-xs space-y-1.5">
                      <Icon name="people" className="size-8 mx-auto opacity-40 text-slate-400" />
                      <p className="font-semibold text-slate-800 dark:text-white">
                        No se encontraron usuarios
                      </p>
                      <p className="text-[12.5px]">
                        Intenta con otro término de búsqueda o limpia los filtros activos.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsuarios.map((u) => {
                  const initial = (u.nombre_usuario || 'U').slice(0, 2).toUpperCase()
                  const isSuperadmin = (u.rol || '').toUpperCase() === 'SUPERADMIN'

                  return (
                    <tr
                      key={u.id}
                      className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-[var(--bg-subtle)]"
                    >
                      {/* Usuario */}
                      <td className="px-4 py-3 ">
                        <div className="flex items-center gap-3">
                          <div className="size-9 shrink-0 rounded-full font-bold flex items-center justify-center text-xs select-none border border-indigo-200/80 bg-indigo-50 text-indigo-700 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-indigo-300 shadow-2xs">
                            {initial}
                          </div>
                          <div>
                            <p className="font-mono text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              @{u.nombre_usuario}
                              {isSuperadmin && (
                                <span className="text-amber-500 text-xs" title="Super Administrador">
                                  ★
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              ID trabajador: {u.id_trabajador || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Colaborador */}
                      <td className="px-4 py-3 ">
                        <p className="font-bold text-slate-800 dark:text-white text-xs">
                          {u.nombre_completo || 'Sin personal vinculado'}
                        </p>
                        {u.numero_documento && (
                          <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                            DNI: {u.numero_documento}
                          </p>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-3 ">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wide border ${getRoleBadge(
                            u.rol
                          )}`}
                        >
                          {u.rol || 'Sin rol asignado'}
                        </span>
                        {u.cargo && (
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {u.cargo}
                          </p>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 ">
                        <StatusBadge status={u.usuario_estado || 'ACTIVO'} />
                      </td>

                      {/* Acciones */}
                      <td className="sticky right-0 z-10 px-4 py-3 text-right bg-white dark:bg-[#1C2438] border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/50">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* EDITAR: Modificar Rol / Estado */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            title="Editar usuario"
                            className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                            style={{
                              backgroundColor: 'var(--action-edit-bg)',
                              borderColor: 'var(--action-edit-border)',
                              color: 'var(--action-edit-text)',
                              borderWidth: '1.5px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-edit-hover)'
                              e.currentTarget.style.borderColor = 'var(--action-edit-hover)'
                              e.currentTarget.style.color = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-edit-bg)'
                              e.currentTarget.style.borderColor = 'var(--action-edit-border)'
                              e.currentTarget.style.color = 'var(--action-edit-text)'
                            }}
                          >
                            <Icon name="pencil" className="size-4" />
                          </button>

                          {/* ELIMINAR: Dar de baja */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            title="Eliminar usuario"
                            className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                            style={{
                              backgroundColor: 'var(--action-del-bg)',
                              borderColor: 'var(--action-del-border)',
                              color: 'var(--action-del-text)',
                              borderWidth: '1.5px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-del-hover)'
                              e.currentTarget.style.borderColor = 'var(--action-del-hover)'
                              e.currentTarget.style.color = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-del-bg)'
                              e.currentTarget.style.borderColor = 'var(--action-del-border)'
                              e.currentTarget.style.color = 'var(--action-del-text)'
                            }}
                          >
                            <Icon name="trash" className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredUsuarios.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
          disabled={isLoading}
        />
      </div>

      {/* MODAL 1: NUEVO USUARIO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)] overflow-visible">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-[var(--border)] dark:bg-[#1C2438] rounded-t-3xl">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Icon name="people" className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Registrar Nuevo Usuario
                  </h3>
                </div>
              </div>
              <BotonCerrarModal onClick={() => setIsCreateModalOpen(false)} title="Cerrar" />
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6 p-6 sm:p-8">
              {/* Buscador de Colaborador */}
              <div className="relative">
                <label className="mb-2.5 block text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  1. Trabajador *
                </label>
                <div className="relative">
                  <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={trabajadorSearch}
                    onFocus={() => { setTrabajadorDropdownOpen(true); quitarErrorAlta('persona') }}
                    onBlur={() => setTimeout(() => setTrabajadorDropdownOpen(false), 200)}
                    onChange={(e) => {
                      setTrabajadorSearch(e.target.value)
                      setPersonaElegida(null)
                      setUserForm((prev) => ({ ...prev, id_trabajador: '' }))
                      setTrabajadorDropdownOpen(true)
                      quitarErrorAlta('persona')
                    }}
                    placeholder="Escribe DNI o nombres para buscar un trabajador"
                    aria-invalid={erroresAlta.persona ? true : undefined}
                    className={`w-full rounded-xl border bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-1 focus:ring-indigo-500/20 dark:bg-[#1C2438] dark:text-white ${erroresAlta.persona ? 'border-red-500 dark:border-red-500' : 'border-slate-200 dark:border-[var(--border-strong)]'}`}
                  />
                </div>
                {erroresAlta.persona && (
                  <p role="alert" className="mt-1 px-1 text-[11px] font-medium leading-4 text-red-600 dark:text-red-400">{erroresAlta.persona}</p>
                )}

                {personaElegida && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-[var(--border)] dark:bg-emerald-950/30">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                      <Icon name="check" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="min-w-0 break-words text-sm font-black text-slate-800 dark:text-white">
                        {personaElegida.nombres} {personaElegida.apellidoPaterno} {personaElegida.apellidoMaterno}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="font-mono text-slate-500 dark:text-slate-400">DNI {personaElegida.numeroDocumento}</span>
                        <span className="font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          {cargoDe(personaElegida.id)}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {trabajadorDropdownOpen && !personaElegida && busquedaPadron.length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                    {buscandoPadron && !resultadosPadron.length ? (
                      <p className="p-3 text-center text-xs text-slate-500">Buscando en el padrón...</p>
                    ) : resultadosPadron.some((persona) => cargoDe(persona.id)) ? (
                      resultadosPadron.filter((persona) => cargoDe(persona.id)).map((persona) => {
                        const conCuenta = personasConCuenta.has(String(persona.id))
                        return (
                          <button
                            key={persona.id}
                            type="button"
                            disabled={conCuenta}
                            onMouseDown={() => !conCuenta && elegirPersona(persona)}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-indigo-50 dark:hover:bg-slate-700 transition flex items-center justify-between disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                          >
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white">
                                {persona.nombres} {persona.apellidoPaterno} {persona.apellidoMaterno}
                              </p>
                              <p className="font-mono text-[11px] text-slate-500">
                                DNI: {persona.numeroDocumento}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {conCuenta ? 'Ya tiene usuario' : cargoDe(persona.id)}
                            </span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="p-3 text-center text-xs text-slate-500">
                        No hay trabajadores que coincidan.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Formulario de Cuenta */}
              <div className="grid grid-cols-1 items-start gap-x-5 gap-y-6 sm:grid-cols-2">
                <div>
                  <FloatingInput
                    id="nombre_usuario"
                    label="2. Nombre de Usuario"
                    value={userForm.nombre_usuario}
                    error={erroresAlta.nombre_usuario}
                    onFocus={() => quitarErrorAlta('nombre_usuario')}
                    onChange={(e) => {
                      quitarErrorAlta('nombre_usuario')
                      // Los espacios se quitan solos; si se intentó escribir uno, se avisa.
                      setAvisoEspacios(/\s/.test(e.target.value))
                      setUserForm({
                        ...userForm,
                        nombre_usuario: e.target.value.toLowerCase().replace(/\s+/g, ''),
                      })
                    }}
                  />
                  {avisoEspacios && (
                    <p className="mt-2 px-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      El nombre de usuario no puede tener espacios.
                    </p>
                  )}
                </div>

                <div className="relative">
                  <FloatingInput
                    id="password_inicial"
                    label="3. Contraseña Inicial"
                    type={verClaveNueva ? 'text' : 'password'}
                    maxLength={128}
                    value={userForm.password}
                    error={erroresAlta.password}
                    onFocus={() => quitarErrorAlta('password')}
                    onChange={(e) => { quitarErrorAlta('password'); setUserForm({ ...userForm, password: e.target.value }) }}
                    inputClassName="pr-12"
                  />
                  <BotonVerClave visible={verClaveNueva} onToggle={() => setVerClaveNueva((v) => !v)} />
                </div>

                <div onClickCapture={() => quitarErrorAlta('id_rol')}>
                <FloatingSelect
                  id="cargo_usuario"
                  label="4. Rol / Permiso Asignado"
                  placeholder="Seleccionar rol"
                  menuGrande
                  value={userForm.id_rol}
                  error={erroresAlta.id_rol}
                  onChange={(e) => { quitarErrorAlta('id_rol'); setUserForm({ ...userForm, id_rol: e.target.value }) }}
                  options={roles.map((r) => ({ value: String(r.id), label: r.nombre }))}
                />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-[var(--border)]">
                <BotonCancelar onClick={() => setIsCreateModalOpen(false)} />
                <BotonGuardar disabled={saving}>
                  <Icon name="check" className="size-4" />
                  <span>{saving ? 'Guardando...' : 'Crear Usuario'}</span>
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR USUARIO */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)] overflow-visible">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 sm:px-8 dark:border-[var(--border)] dark:bg-[#1C2438] rounded-t-3xl">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Icon name="pencil" className="size-4" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Editar Usuario
                  </h3>
                  <p className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                    @{selectedUser.nombre_usuario}
                  </p>
                </div>
              </div>
              <BotonCerrarModal onClick={() => setIsEditModalOpen(false)} title="Cerrar" />
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-6 p-6 sm:p-8">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                <p className="text-xs font-bold text-slate-500">Colaborador:</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">
                  {selectedUser.nombre_completo || 'Sin personal asignado'}
                </p>
              </div>

              <FloatingSelect
                id="cargo_edit"
                label="Rol en el Sistema"
                menuGrande
                value={userForm.id_rol}
                onChange={(e) => setUserForm({ ...userForm, id_rol: e.target.value })}
                options={roles.map((r) => ({ value: String(r.id), label: r.nombre }))}
              />

              <FloatingSelect
                id="estado_edit"
                label="Estado"
                menuGrande
                value={userForm.estado}
                onChange={(e) => setUserForm({ ...userForm, estado: e.target.value })}
                options={[
                  { value: 'ACTIVO', label: 'ACTIVO (Permite acceso al sistema)' },
                  { value: 'INACTIVO', label: 'INACTIVO (Bloquear acceso)' },
                ]}
              />

              <div>
                <div className="relative">
                  <FloatingInput
                    id="nueva_password"
                    label="Nueva contraseña (opcional)"
                    type={showPassword ? 'text' : 'password'}
                    maxLength={128}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    inputClassName="pr-12"
                  />
                  <BotonVerClave visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                </div>
                <p className="mt-2.5 px-1 text-[11px] leading-relaxed text-slate-400">
                  Déjela vacía para conservar la actual. Si escribe una, la anterior dejará de ser válida.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-[var(--border)]">
                <BotonCancelar onClick={() => setIsEditModalOpen(false)} />
                <BotonGuardar disabled={saving}>
                  <Icon name="check" className="size-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
