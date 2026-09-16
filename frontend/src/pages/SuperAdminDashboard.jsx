import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { apiFetch } from '../config/api'

const DEFAULT_USER_FORM = {
  numero_documento: '',
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  nombre_usuario: '',
  password: '',
  cargo: 'INSPECTOR DE TRÁNSITO MUNICIPAL',
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

const CARGOS = [
  'ADMINISTRADOR',
  'SUBGERENTE DE TRÁNSITO Y TRANSPORTE',
  'INSPECTOR DE TRÁNSITO MUNICIPAL',
  'INSPECTOR TÉCNICO VEHICULAR',
  'ADMINISTRADOR DE DEPÓSITO MUNICIPAL',
  'ESPECIALISTA EN EDUCACIÓN VIAL',
  'CAJERO DE RECAUDACIÓN'
]

export function SuperAdminDashboard({ user }) {
  const navigate = useNavigate()
  const { moduleId } = useParams()
  const [activeModule, setActiveModule] = useState(moduleId || null)
  const [usuarios, setUsuarios] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [message, setMessage] = useState('')
  const [userForm, setUserForm] = useState(DEFAULT_USER_FORM)
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

  const adminModules = [
    { id: 'usuarios', label: 'Gestión de usuarios', detail: 'Crear cuentas, activar usuarios y asignar responsables.', icon: 'people', tone: 'from-blue-600 to-indigo-500' },
    { id: 'roles', label: 'Roles y permisos', detail: 'Definir accesos por perfil y estado de cuenta.', icon: 'shieldCheck', tone: 'from-emerald-600 to-teal-500' },
    { id: 'configuracion', label: 'Configuración del sistema', detail: 'Parámetros globales, seguridad y sesiones.', icon: 'settings', tone: 'from-violet-600 to-purple-500' },
    { id: 'auditoria', label: 'Auditoría y logs', detail: 'Revisar acciones críticas realizadas por usuarios.', icon: 'document', tone: 'from-amber-500 to-orange-500' },
    { id: 'catalogos', label: 'Catálogos maestros', detail: 'Mantener cargos, oficinas y tipos base.', icon: 'folderShield', tone: 'from-cyan-600 to-sky-500' },
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
    fetchMunicipalidadConfig()
  }, [])

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

  const saveUser = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      const res = await apiFetch('/usuarios', { method: 'POST', body: userForm })
      const data = await res.json()
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo crear el usuario.')
      setUsuarios((current) => [data.data, ...current])
      setUserForm(DEFAULT_USER_FORM)
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
        body: { cargo: editingUser.cargo, estado: editingUser.usuario_estado }
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

  const moduleStats = [
    { label: 'Usuarios activos', value: usuarios.filter((u) => u.usuario_estado === 'ACTIVO').length },
    { label: 'Usuarios inactivos', value: usuarios.filter((u) => u.usuario_estado !== 'ACTIVO').length },
    { label: 'Roles registrados', value: new Set(usuarios.map((u) => u.cargo).filter(Boolean)).size },
    { label: 'Módulos admin', value: adminModules.length }
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
        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Usuario activo</p>
          <p className="mt-1 font-black text-slate-900 dark:text-white">{user?.usuario || 'superadmin'}</p>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          {message}
        </div>
      )}

      {isDashboard && (
        <>
          <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-2xl shadow-blue-950/20">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
              <Icon name="shieldCheck" className="size-4" />
              Administración del sistema
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Módulos administrativos</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium text-blue-100/80">
              Selecciona un módulo para gestionar solo funciones de superadministración. Los módulos operativos quedan fuera de este perfil.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {adminModules.map((module) => (
              <button
                key={module.id}
                type="button"
                onClick={() => navigate(`/superadmin/${module.id}`)}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-[#0f172a]"
              >
                <div className="flex items-start gap-4">
                  <span className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${module.tone} text-white shadow-lg`}>
                    <Icon name={module.icon} className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-slate-950 dark:text-white">{module.label}</h2>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-500 dark:text-slate-400">{module.detail}</p>
                    <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      Abrir módulo
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        </>
      )}

      {!isDashboard && (
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${activeModuleInfo.tone} text-white shadow-lg`}>
              <Icon name={activeModuleInfo.icon} className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{activeModuleInfo.label}</h2>
              <p className="text-sm font-semibold text-slate-500">{activeModuleInfo.detail}</p>
            </div>
          </div>
          {(activeModule === 'usuarios' || activeModule === 'roles') && (
            <button onClick={fetchUsuarios} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
              Actualizar
            </button>
          )}
        </div>

        {activeModule === 'usuarios' && (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={saveUser} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Nuevo usuario</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required value={userForm.numero_documento} onChange={(e) => setUserForm({ ...userForm, numero_documento: e.target.value })} placeholder="DNI" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input required value={userForm.nombres} onChange={(e) => setUserForm({ ...userForm, nombres: e.target.value })} placeholder="Nombres" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input required value={userForm.apellido_paterno} onChange={(e) => setUserForm({ ...userForm, apellido_paterno: e.target.value })} placeholder="Apellido paterno" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input value={userForm.apellido_materno} onChange={(e) => setUserForm({ ...userForm, apellido_materno: e.target.value })} placeholder="Apellido materno" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input required value={userForm.nombre_usuario} onChange={(e) => setUserForm({ ...userForm, nombre_usuario: e.target.value.toLowerCase().replace(/\s+/g, '') })} placeholder="Usuario" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input required minLength={6} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Contraseña" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <select value={userForm.cargo} onChange={(e) => setUserForm({ ...userForm, cargo: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2">
                  {CARGOS.map((cargo) => <option key={cargo} value={cargo}>{cargo}</option>)}
                </select>
              </div>
              <button className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
                Crear usuario
              </button>
            </form>

            <UsersTable
              usuarios={filteredUsers}
              loading={loadingUsers}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onEdit={setEditingUser}
              onPassword={setPasswordUser}
            />
          </div>
        )}

        {activeModule === 'roles' && (
          <UsersTable
            usuarios={filteredUsers}
            loading={loadingUsers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onEdit={setEditingUser}
            onPassword={setPasswordUser}
          />
        )}

        {activeModule === 'configuracion' && (
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <form onSubmit={saveMunicipalidad} className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Datos de municipalidad</h3>
                  <p className="text-xs font-semibold text-slate-500">Información institucional usada por el sistema.</p>
                </div>
                <button type="button" onClick={fetchMunicipalidadConfig} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
                  {loadingMunicipalidad ? 'Cargando...' : 'Recargar'}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <LabeledInput label="RUC" value={municipalidadForm.ruc} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, ruc: value.replace(/\D/g, '').slice(0, 11) })} required />
                <LabeledInput label="Razón social" value={municipalidadForm.razon_social} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, razon_social: value })} required />
                <LabeledInput label="Nombre abreviado" value={municipalidadForm.nombre_abreviado} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, nombre_abreviado: value })} />
                <LabeledInput label="Sigla" value={municipalidadForm.sigla} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, sigla: value.toUpperCase().slice(0, 10) })} />
                <LabeledInput label="Dirección fiscal" value={municipalidadForm.direccion_fiscal} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, direccion_fiscal: value })} className="md:col-span-2" required />
                <LabeledInput label="Departamento" value={municipalidadForm.departamento} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, departamento: value })} required />
                <LabeledInput label="Provincia" value={municipalidadForm.provincia} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, provincia: value })} required />
                <LabeledInput label="Distrito" value={municipalidadForm.distrito} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, distrito: value })} required />
                <LabeledInput label="Teléfono" value={municipalidadForm.telefono} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, telefono: value })} required />
                <LabeledInput label="Email" type="email" value={municipalidadForm.email} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, email: value })} required />
                <LabeledInput label="Mesa de partes" value={municipalidadForm.mesa_partes} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, mesa_partes: value })} required />
                <LabeledInput label="Logo / ruta" value={municipalidadForm.logo} onChange={(value) => setMunicipalidadForm({ ...municipalidadForm, logo: value })} />
                <label className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Estado</span>
                  <select value={municipalidadForm.estado || 'ACTIVO'} onChange={(e) => setMunicipalidadForm({ ...municipalidadForm, estado: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </label>
              </div>

              <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700">
                Guardar municipalidad
              </button>
            </form>

            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Permiso general móvil</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      Si está activo, todos los inspectores podrán aplicar papeletas desde el móvil. Si está inactivo, el móvil debe ocultar esa opción y trabajar solo con reportes/evidencias.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={mobilePermitePapeleta}
                      disabled={savingConfigSistema}
                      onChange={(event) => {
                        const next = event.target.checked
                        setMobilePermitePapeleta(next)
                        saveConfigSistema(
                          'mobile_permite_aplicar_papeleta',
                          next,
                          next
                            ? 'Papeletas desde móvil habilitadas para todos los inspectores.'
                            : 'Papeletas desde móvil deshabilitadas. El móvil deberá registrar reportes/evidencias.'
                        )
                      }}
                      className="peer sr-only"
                    />
                    <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-violet-600 peer-disabled:opacity-60"></span>
                    <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
                  </label>
                </div>
                <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${
                  mobilePermitePapeleta ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {mobilePermitePapeleta
                    ? 'ACTIVO: el móvil muestra “Aplicar papeleta”.'
                    : 'INACTIVO: el móvil debe mostrar solo “Registrar reporte/evidencia”.'}
                </div>
              </div>

              <form onSubmit={saveAnio} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">UIT por año</h3>
                  <p className="text-xs font-semibold text-slate-500">La multa se calcula desde municipalidad_anio.</p>
                </div>
                <LabeledInput label="Nombre" value={anioForm.nombre} onChange={(value) => setAnioForm({ ...anioForm, nombre: value })} placeholder="Año Fiscal 2026" />
                <LabeledInput label="Año" value={anioForm.anio} onChange={(value) => setAnioForm({ ...anioForm, anio: value.replace(/\D/g, '').slice(0, 4) })} required />
                <LabeledInput label="UIT" type="number" value={anioForm.uit} onChange={(value) => setAnioForm({ ...anioForm, uit: value })} required />
                <button className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700">
                  Guardar UIT
                </button>
              </form>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Años configurados</h3>
                <div className="mt-3 space-y-2">
                  {municipalidadAnios.length ? municipalidadAnios.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAnioForm({ nombre: item.nombre || '', anio: String(item.anio), uit: String(item.uit) })}
                      className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-blue-50"
                    >
                      <span>{item.anio} · {item.nombre}</span>
                      <span className="text-blue-700">S/ {Number(item.uit || 0).toFixed(2)}</span>
                    </button>
                  )) : (
                    <p className="rounded-xl bg-amber-50 px-3 py-3 text-xs font-bold text-amber-700">Aún no hay UIT configurada.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeModule === 'auditoria' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Evento</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="px-4 py-3 font-bold">Inicio de sesión superadmin</td><td className="px-4 py-3">{user?.usuario}</td><td className="px-4 py-3 text-emerald-600 font-bold">Activo</td></tr>
                <tr><td className="px-4 py-3 font-bold">Gestión de usuarios habilitada</td><td className="px-4 py-3">{user?.usuario}</td><td className="px-4 py-3 text-blue-600 font-bold">Sistema</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {activeModule === 'catalogos' && (
          <div className="grid gap-3 md:grid-cols-3">
            {['Cargos', 'Oficinas', 'Tipos de documento', 'Tipos de vehículo', 'Estados del sistema', 'Parámetros UIT'].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
                <p className="font-black text-slate-900 dark:text-white">{item}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Catálogo maestro administrativo.</p>
              </div>
            ))}
          </div>
        )}

        {activeModule === 'respaldo' && (
          <div className="grid gap-4 md:grid-cols-3">
            {moduleStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
                <p className="text-xs font-black uppercase text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {editingUser && (
        <Modal title="Editar rol y estado" onClose={() => setEditingUser(null)}>
          <form onSubmit={saveRole} className="space-y-4">
            <p className="font-bold">{editingUser.nombre_usuario}</p>
            <select value={editingUser.cargo || ''} onChange={(e) => setEditingUser({ ...editingUser, cargo: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {CARGOS.map((cargo) => <option key={cargo} value={cargo}>{cargo}</option>)}
            </select>
            <select value={editingUser.usuario_estado || 'ACTIVO'} onChange={(e) => setEditingUser({ ...editingUser, usuario_estado: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
            <button className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Guardar cambios</button>
          </form>
        </Modal>
      )}

      {passwordUser && (
        <Modal title="Restablecer contraseña" onClose={() => setPasswordUser(null)}>
          <form onSubmit={resetPassword} className="space-y-4">
            <p className="text-sm font-semibold text-slate-600">Usuario: <strong>{passwordUser.nombre_usuario}</strong></p>
            <input minLength={6} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña temporal" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white">Restablecer contraseña</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function UsersTable({ usuarios, loading, searchTerm, setSearchTerm, onEdit, onPassword }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-black text-slate-900 dark:text-white">Usuarios registrados</h3>
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar usuario, nombre o rol..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center font-bold text-slate-500">Cargando...</td></tr>
            ) : usuarios.length ? usuarios.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-black">{item.nombre_usuario}</td>
                <td className="px-4 py-3">{item.nombre_completo}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">{item.cargo || 'Sin rol'}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${item.usuario_estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.usuario_estado}</span></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(item)} className="rounded-lg bg-blue-50 p-2 text-blue-600" title="Editar rol"><Icon name="shieldCheck" className="size-4" /></button>
                    <button onClick={() => onPassword(item)} className="rounded-lg bg-amber-50 p-2 text-amber-600" title="Contraseña"><Icon name="settings" className="size-4" /></button>
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

function LabeledInput({ label, value, onChange, className = '', type = 'text', placeholder = '', required = false }) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      <input
        required={required}
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || label}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><Icon name="close" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
