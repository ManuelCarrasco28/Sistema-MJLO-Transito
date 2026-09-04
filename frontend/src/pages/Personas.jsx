import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { initialPersonas } from '../data/mockData'

export function Personas() {
  const [personas, setPersonas] = useState(initialPersonas)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRol, setFilterRol] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    direccion: '',
    telefono: '',
    celular: '',
    email: '',
    numeroLicencia: '',
    categoriaLicencia: 'B-IIc (Mototaxi)',
    vigenciaLicencia: '2028-12-31',
    rol: 'Conductor',
    estado: 'ACTIVO',
  })

  const totalPersonas = personas.length
  const conductores = personas.filter((p) => p.rol.includes('Conductor')).length
  const propietarios = personas.filter((p) => p.rol.includes('Propietario')).length
  const activos = personas.filter((p) => p.estado === 'ACTIVO').length

  const filteredPersonas = personas.filter((p) => {
    const fullSearch = `${p.nombres} ${p.apellidoPaterno} ${p.apellidoMaterno} ${p.numeroDocumento} ${p.numeroLicencia}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesRol = filterRol === 'TODOS' || p.rol.includes(filterRol)
    const matchesEstado = filterEstado === 'TODOS' || p.estado === filterEstado

    return matchesSearch && matchesRol && matchesEstado
  })

  const handleOpenCreateModal = () => {
    setFormData({
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      direccion: '',
      telefono: '',
      celular: '',
      email: '',
      numeroLicencia: '',
      categoriaLicencia: 'B-IIc (Mototaxi)',
      vigenciaLicencia: '2028-12-31',
      rol: 'Conductor',
      estado: 'ACTIVO',
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (persona) => {
    setSelectedPersona(persona)
    setFormData({ ...persona })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (persona) => {
    setSelectedPersona(persona)
    setIsDetailModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de eliminar a esta persona del padrón?')) {
      setPersonas(personas.filter((p) => p.id !== id))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!formData.numeroDocumento.trim() || !formData.nombres.trim() || !formData.apellidoPaterno.trim()) {
      alert('Por favor completa los campos obligatorios (DNI, Nombres y Apellido Paterno).')
      return
    }

    if (isEditing) {
      setPersonas(personas.map((p) => (p.id === selectedPersona.id ? { ...formData, id: p.id } : p)))
    } else {
      const newPersona = {
        ...formData,
        id: Date.now(),
        fotoUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      }
      setPersonas([newPersona, ...personas])
    }
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-cyan-600/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
              <Icon name="people" className="size-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
              Padrón de Personas y Conductores
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Registro de administrados, conductores habilitados y propietarios de vehículos en JLO.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-cyan-600/25 transition-all hover:-translate-y-0.5 hover:bg-cyan-700 active:translate-y-0"
        >
          <span className="text-lg leading-none">+</span>
          <span>Registrar Persona</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registrados</span>
            <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400">
              <Icon name="people" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{totalPersonas}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ciudadanos en base de datos</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Conductores</span>
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              🪪
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{conductores}</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">Con licencia autorizada</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Propietarios</span>
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              🚘
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{propietarios}</p>
          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Titulares de unidades</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Estado Activo</span>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              ✓
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{activos}</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Sin sanciones vigentes</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por DNI, nombres, apellidos o licencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los roles</option>
              <option value="Conductor">Conductor</option>
              <option value="Propietario">Propietario</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Persona</th>
                <th className="px-5 py-3.5">Documento</th>
                <th className="px-5 py-3.5">Licencia de Conducir</th>
                <th className="px-5 py-3.5">Contacto</th>
                <th className="px-5 py-3.5">Rol</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPersonas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-400">
                    No se encontraron personas con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredPersonas.map((p) => (
                  <tr key={p.id} className="transition hover:bg-cyan-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.fotoUrl}
                          alt={p.nombres}
                          className="size-10 rounded-full object-cover border border-slate-200 shadow-xs dark:border-slate-700"
                        />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">
                            {p.nombres} {p.apellidoPaterno} {p.apellidoMaterno}
                          </p>
                          <p className="text-xs text-slate-400 truncate max-w-xs">{p.direccion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                        {p.tipoDocumento}: {p.numeroDocumento}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {p.numeroLicencia ? (
                        <div>
                          <p className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{p.numeroLicencia}</p>
                          <p className="text-xs text-slate-400">{p.categoriaLicencia}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin Licencia</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{p.celular}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                        {p.rol}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        p.estado === 'ACTIVO'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p)}
                          title="Ver Ficha Digital"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-cyan-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-400"
                        >
                          👁
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar Persona"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-amber-400"
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          title="Eliminar Persona"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          🗑
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                {isEditing ? 'Editar Datos de la Persona' : 'Registrar Nueva Persona'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tipo Doc.</label>
                  <select
                    value={formData.tipoDocumento}
                    onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">Carné Extranjería</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Número de Documento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Número de DNI / CE"
                    value={formData.numeroDocumento}
                    onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nombres *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombres completos"
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Apellido Paterno *</label>
                  <input
                    type="text"
                    required
                    placeholder="Apellido paterno"
                    value={formData.apellidoPaterno}
                    onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Apellido Materno</label>
                  <input
                    type="text"
                    placeholder="Apellido materno"
                    value={formData.apellidoMaterno}
                    onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Celular</label>
                  <input
                    type="text"
                    placeholder="9xx xxx xxx"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Licencia de Conducir y Rol</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">N° Licencia de Conducir</label>
                    <input
                      type="text"
                      placeholder="Ej: B45892104"
                      value={formData.numeroLicencia}
                      onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value.toUpperCase() })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Categoría Licencia</label>
                    <select
                      value={formData.categoriaLicencia}
                      onChange={(e) => setFormData({ ...formData, categoriaLicencia: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="B-IIc (Mototaxi)">B-IIc (Mototaxi)</option>
                      <option value="A-IIa (Colectivo / Taxi)">A-IIa (Colectivo / Taxi)</option>
                      <option value="A-I (Particular)">A-I (Particular)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Rol Principal</label>
                    <select
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Conductor">Conductor</option>
                      <option value="Propietario">Propietario</option>
                      <option value="Conductor / Propietario">Conductor / Propietario</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Estado del Registro</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="INACTIVO">INACTIVO</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-cyan-700 shadow-md shadow-cyan-600/20"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-100 bg-[#071a2f] p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
              <img
                src={selectedPersona.fotoUrl}
                alt={selectedPersona.nombres}
                className="size-20 rounded-full mx-auto object-cover border-4 border-white shadow-md dark:border-slate-800"
              />
              <h3 className="mt-3 text-xl font-black">{selectedPersona.nombres} {selectedPersona.apellidoPaterno} {selectedPersona.apellidoMaterno}</h3>
              <p className="text-xs text-cyan-300 font-mono font-bold">{selectedPersona.tipoDocumento}: {selectedPersona.numeroDocumento}</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Licencia Conducir</span>
                  <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{selectedPersona.numeroLicencia || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Categoría</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPersona.categoriaLicencia || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Vigencia Licencia</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedPersona.vigenciaLicencia || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Teléfono / Celular</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPersona.celular || selectedPersona.telefono}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="font-bold text-slate-400 uppercase">Domicilio Registrado</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-white">{selectedPersona.direccion}</p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-5 py-2 font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
