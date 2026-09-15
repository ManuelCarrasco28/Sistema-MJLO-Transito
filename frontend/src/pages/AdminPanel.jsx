import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { apiFetch } from '../config/api'

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState('permisos')
  const [usuarios, setUsuarios] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPassModalOpen, setIsPassModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editForm, setEditForm] = useState({ cargo: '', estado: '' })
  const [passForm, setPassForm] = useState({ password: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    numero_documento: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombre_usuario: '',
    password: '',
    cargo: 'INSPECTOR DE TRÁNSITO MUNICIPAL',
    estado: 'ACTIVO'
  })

  const tabs = [
    { id: 'permisos', label: 'Permisos de Usuarios', icon: 'shieldCheck' },
    { id: 'configuracion', label: 'Configuración del Sistema', icon: 'settings' },
    { id: 'auditoria', label: 'Auditoría y Logs', icon: 'document' },
  ]

  const fetchUsuarios = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch('/usuarios')
      const data = await res.json()
      if (res.ok) {
        setUsuarios(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'permisos') {
      fetchUsuarios()
    }
  }, [activeTab])

  const openEditModal = (user) => {
    setSelectedUser(user)
    setEditForm({ cargo: user.cargo || 'INSPECTOR DE TRÁNSITO MUNICIPAL', estado: user.usuario_estado || 'ACTIVO' })
    setIsEditModalOpen(true)
  }

  const openPassModal = (user) => {
    setSelectedUser(user)
    setPassForm({ password: '' })
    setIsPassModalOpen(true)
  }

  const handleUpdateRole = async (e) => {
    e.preventDefault()
    try {
      const res = await apiFetch(`/usuarios/${selectedUser.id}`, {
        method: 'PUT',
        body: editForm
      })
      if (res.ok) {
        setUsuarios(usuarios.map(u => u.id === selectedUser.id ? { ...u, cargo: editForm.cargo, usuario_estado: editForm.estado } : u))
        setIsEditModalOpen(false)
      } else {
        alert('Error al actualizar permisos')
      }
    } catch (err) {
      alert('Error de conexión')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      const res = await apiFetch(`/usuarios/${selectedUser.id}/password`, {
        method: 'PUT',
        body: passForm
      })
      if (res.ok) {
        alert('Contraseña restablecida correctamente.')
        setIsPassModalOpen(false)
      } else {
        alert('Error al restablecer contraseña')
      }
    } catch (err) {
      alert('Error de conexión')
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!createForm.numero_documento.trim() || !createForm.nombres.trim() || !createForm.apellido_paterno.trim() || !createForm.nombre_usuario.trim() || !createForm.password.trim()) {
      alert('Por favor completa todos los campos requeridos (Documento, Nombres, Apellidos, Usuario y Contraseña).')
      return
    }
    if (createForm.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await apiFetch('/usuarios', {
        method: 'POST',
        body: createForm
      })
      const data = await res.json()
      if (res.ok) {
        setUsuarios([data.data, ...usuarios])
        setIsCreateModalOpen(false)
        setCreateForm({
          numero_documento: '',
          nombres: '',
          apellido_paterno: '',
          apellido_materno: '',
          nombre_usuario: '',
          password: '',
          cargo: 'INSPECTOR DE TRÁNSITO MUNICIPAL',
          estado: 'ACTIVO'
        })
        alert('Usuario creado exitosamente.')
      } else {
        alert(data.messages?.error || data.messages || data.message || 'Error al crear usuario.')
      }
    } catch (err) {
      alert('Error de conexión con el servidor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredUsuarios = usuarios.filter((u) => {
    const q = searchTerm.toLowerCase()
    return (
      (u.nombre_usuario || '').toLowerCase().includes(q) ||
      (u.nombre_completo || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <Icon name="settings" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Panel de Administración
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Gestión avanzada, control de accesos y configuración global del sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon name={tab.icon} className={`size-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenido de los Tabs */}
      <div className="min-h-[400px]">
        {activeTab === 'permisos' && (
          <div className="space-y-4 animate-enter">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Icon name="shieldCheck" className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Gestión de Permisos y Cuentas</h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Asignación de roles, accesos y altas de personal</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar usuario o nombre..."
                      className="w-44 sm:w-60 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <Icon name="plus" className="size-4" />
                    <span>Nuevo Usuario</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4 font-bold">Usuario</th>
                        <th className="px-6 py-4 font-bold">Nombre Completo</th>
                        <th className="px-6 py-4 font-bold">Cargo / Rol</th>
                        <th className="px-6 py-4 font-bold">Estado</th>
                        <th className="px-6 py-4 font-bold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {isLoading ? (
                        <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Cargando usuarios...</td></tr>
                      ) : filteredUsuarios.length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No se encontraron cuentas de usuario registradas{searchTerm ? ' con ese criterio' : ''}.</td></tr>
                      ) : (
                        filteredUsuarios.map((u) => (
                          <tr key={u.id} className="bg-white hover:bg-slate-50 dark:bg-[#0f172a] dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{u.nombre_usuario}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{u.nombre_completo}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                u.cargo === 'Administrador' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {u.cargo || 'Sin cargo'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                u.usuario_estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {u.usuario_estado}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openEditModal(u)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Editar Permisos">
                                  <Icon name="shieldCheck" className="size-4" />
                                </button>
                                <button onClick={() => openPassModal(u)} className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors" title="Restablecer Contraseña">
                                  <Icon name="settings" className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuracion' && (
          <div className="space-y-6 animate-enter">
            {/* Parámetros Institucionales */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex items-center gap-3 mb-6">
                <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <Icon name="building" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Datos Institucionales</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Información oficial de la entidad para documentos y actas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Entidad Municipal</label>
                  <input type="text" readOnly defaultValue="Municipalidad Distrital José Leonardo Ortiz" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">RUC Institucional</label>
                  <input type="text" readOnly defaultValue="20164995471" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Sede Central</label>
                  <input type="text" readOnly defaultValue="Av. Sáenz Peña 2151, Chiclayo" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Gerencia Responsable</label>
                  <input type="text" readOnly defaultValue="Subgerencia de Tránsito y Transporte" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Período Operativo</label>
                  <input type="text" readOnly defaultValue="Año Fiscal 2026" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Teléfono Mesa de Partes</label>
                  <input type="text" readOnly defaultValue="(074) 251911" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
              </div>
            </div>

            {/* Parámetros de Tránsito y Fiscalización */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex items-center gap-3 mb-6">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Icon name="ticket" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Parámetros de Tránsito y Multas</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cálculos tributarios y plazos administrativos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Unidad Impositiva Tributaria (UIT)</p>
                  <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">S/ 5,350.00</p>
                  <p className="mt-1 text-xs text-slate-400">Base legal vigente D.S. N° 309-2025-EF</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Descuento Pronto Pago</p>
                  <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">83% Multa</p>
                  <p className="mt-1 text-xs text-slate-400">Primeros 5 días hábiles tras notificación</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Tasa Diaria Depósito Municipal</p>
                  <p className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">S/ 15.00 / día</p>
                  <p className="mt-1 text-xs text-slate-400">Custodia vehicular en canchón municipal</p>
                </div>
              </div>
            </div>

            {/* Parámetros de Seguridad del Sistema */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex items-center gap-3 mb-6">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Icon name="shieldCheck" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Seguridad y Sesiones</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Control de conexiones y persistencia</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Recordar Sesión Prolongada</p>
                    <p className="text-xs text-slate-400">Permite a los operarios mantener la sesión iniciada en equipos de confianza</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Activo
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Cifrado de Credenciales</p>
                    <p className="text-xs text-slate-400">Algoritmo BCrypt con coste estándar 10 para todas las contraseñas</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Activo
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Control de Acceso Basado en Roles (RBAC)</p>
                    <p className="text-xs text-slate-400">Separación estricta entre Administradores y Trabajadores / Inspectores</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Activo
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'auditoria' && (
          <div className="space-y-4 animate-enter">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <Icon name="document" className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Registro de Auditoría y Logs</h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trazabilidad de eventos críticos en el sistema municipal</p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Monitoreo en Tiempo Real
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4 font-bold">Fecha / Hora</th>
                        <th className="px-6 py-4 font-bold">Usuario</th>
                        <th className="px-6 py-4 font-bold">Acción</th>
                        <th className="px-6 py-4 font-bold">Módulo</th>
                        <th className="px-6 py-4 font-bold">IP / Origen</th>
                        <th className="px-6 py-4 font-bold text-center">Nivel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-medium">
                      <tr className="bg-white hover:bg-slate-50 dark:bg-[#0f172a] dark:hover:bg-slate-800/50">
                        <td className="px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">14/09/2026 12:45:10</td>
                        <td className="px-6 py-3.5 text-slate-900 dark:text-white font-bold">diegobarturen</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">Inicio de sesión exitoso al panel de administración</td>
                        <td className="px-6 py-3.5"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold dark:bg-slate-800">AUTH</span></td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-500">127.0.0.1</td>
                        <td className="px-6 py-3.5 text-center"><span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">SUCCESS</span></td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50 dark:bg-[#0f172a] dark:hover:bg-slate-800/50">
                        <td className="px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">14/09/2026 12:30:22</td>
                        <td className="px-6 py-3.5 text-slate-900 dark:text-white font-bold">diegobarturen</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">Actualización en padrón de personas del municipio</td>
                        <td className="px-6 py-3.5"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold dark:bg-slate-800">PERSONAS</span></td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-500">127.0.0.1</td>
                        <td className="px-6 py-3.5 text-center"><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">INFO</span></td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50 dark:bg-[#0f172a] dark:hover:bg-slate-800/50">
                        <td className="px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">14/09/2026 11:15:04</td>
                        <td className="px-6 py-3.5 text-slate-900 dark:text-white font-bold">inspector_vial</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">Consulta de datos vehiculares en operativo móvil</td>
                        <td className="px-6 py-3.5"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold dark:bg-slate-800">VEHICULOS</span></td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-500">192.168.81.14</td>
                        <td className="px-6 py-3.5 text-center"><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">INFO</span></td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50 dark:bg-[#0f172a] dark:hover:bg-slate-800/50">
                        <td className="px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">14/09/2026 10:02:45</td>
                        <td className="px-6 py-3.5 text-slate-900 dark:text-white font-bold">caja_transito</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">Registro de pago de papeleta con descuento 83%</td>
                        <td className="px-6 py-3.5"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold dark:bg-slate-800">PAGOS</span></td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-500">192.168.81.20</td>
                        <td className="px-6 py-3.5 text-center"><span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">SUCCESS</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDICION PERMISOS */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all dark:bg-slate-900">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Permisos</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-500"><Icon name="close" className="size-5" /></button>
            </div>
            <form onSubmit={handleUpdateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
                <input type="text" value={selectedUser.nombre_usuario} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol / Cargo</label>
                <select 
                  value={editForm.cargo}
                  onChange={(e) => setEditForm({...editForm, cargo: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  <option value="SUBGERENTE DE TRÁNSITO Y TRANSPORTE">SUBGERENTE DE TRÁNSITO Y TRANSPORTE</option>
                  <option value="INSPECTOR DE TRÁNSITO MUNICIPAL">INSPECTOR DE TRÁNSITO MUNICIPAL</option>
                  <option value="INSPECTOR TÉCNICO VEHICULAR">INSPECTOR TÉCNICO VEHICULAR</option>
                  <option value="ADMINISTRADOR DE DEPÓSITO MUNICIPAL">ADMINISTRADOR DE DEPÓSITO MUNICIPAL</option>
                  <option value="ESPECIALISTA EN EDUCACIÓN VIAL">ESPECIALISTA EN EDUCACIÓN VIAL</option>
                  <option value="CAJERO DE RECAUDACIÓN">CAJERO DE RECAUDACIÓN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado de la cuenta</label>
                <select 
                  value={editForm.estado}
                  onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="ACTIVO">Activo (Permitir acceso)</option>
                  <option value="INACTIVO">Bloqueado (Denegar acceso)</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 shadow-md">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESET PASSWORD */}
      {isPassModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsPassModalOpen(false)}></div>
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all dark:bg-slate-900">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Restablecer Contraseña</h3>
              <button onClick={() => setIsPassModalOpen(false)} className="text-slate-400 hover:text-slate-500"><Icon name="close" className="size-5" /></button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Estás a punto de sobrescribir la contraseña del usuario <strong>{selectedUser.nombre_usuario}</strong>. Él/ella deberá usar esta nueva clave para ingresar.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
                <input 
                  type="text" 
                  required
                  value={passForm.password}
                  onChange={(e) => setPassForm({...passForm, password: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-amber-500 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" 
                  placeholder="Escribe la nueva contraseña temporal"
                />
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPassModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 shadow-md">Restablecer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR USUARIO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 animate-enter">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsCreateModalOpen(false)}></div>
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Icon name="people" className="size-4" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Registrar Nuevo Usuario</h3>
              </div>
              <button onClick={() => !isSubmitting && setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-500 cursor-pointer"><Icon name="close" className="size-5" /></button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    DNI / Documento <span className="text-blue-600">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    maxLength={12}
                    value={createForm.numero_documento}
                    onChange={(e) => setCreateForm({...createForm, numero_documento: e.target.value})}
                    placeholder="Ej. 74829103"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Nombres <span className="text-blue-600">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={createForm.nombres}
                    onChange={(e) => setCreateForm({...createForm, nombres: e.target.value})}
                    placeholder="Ej. Juan Carlos"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Apellido Paterno <span className="text-blue-600">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={createForm.apellido_paterno}
                    onChange={(e) => setCreateForm({...createForm, apellido_paterno: e.target.value})}
                    placeholder="Ej. Perez"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Apellido Materno
                  </label>
                  <input 
                    type="text" 
                    value={createForm.apellido_materno}
                    onChange={(e) => setCreateForm({...createForm, apellido_materno: e.target.value})}
                    placeholder="Ej. Ramos"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de Usuario <span className="text-blue-600">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={createForm.nombre_usuario}
                    onChange={(e) => setCreateForm({...createForm, nombre_usuario: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                    placeholder="Ej. jperez o 74829103"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Contraseña Inicial <span className="text-blue-600">*</span>
                  </label>
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Rol / Cargo <span className="text-blue-600">*</span>
                  </label>
                  <select 
                    value={createForm.cargo}
                    onChange={(e) => setCreateForm({...createForm, cargo: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                    <option value="SUBGERENTE DE TRÁNSITO Y TRANSPORTE">SUBGERENTE DE TRÁNSITO Y TRANSPORTE</option>
                    <option value="INSPECTOR DE TRÁNSITO MUNICIPAL">INSPECTOR DE TRÁNSITO MUNICIPAL</option>
                    <option value="INSPECTOR TÉCNICO VEHICULAR">INSPECTOR TÉCNICO VEHICULAR</option>
                    <option value="ADMINISTRADOR DE DEPÓSITO MUNICIPAL">ADMINISTRADOR DE DEPÓSITO MUNICIPAL</option>
                    <option value="ESPECIALISTA EN EDUCACIÓN VIAL">ESPECIALISTA EN EDUCACIÓN VIAL</option>
                    <option value="CAJERO DE RECAUDACIÓN">CAJERO DE RECAUDACIÓN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Estado Inicial <span className="text-blue-600">*</span>
                  </label>
                  <select 
                    value={createForm.estado}
                    onChange={(e) => setCreateForm({...createForm, estado: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ACTIVO">Activo (Habilitar acceso)</option>
                    <option value="INACTIVO">Inactivo (Sin acceso)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
