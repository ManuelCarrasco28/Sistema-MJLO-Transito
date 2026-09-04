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

  // Métricas estadísticas
  const totalPersonas = personas.length
  const conductores = personas.filter((p) => p.rol.includes('Conductor')).length
  const propietarios = personas.filter((p) => p.rol.includes('Propietario')).length
  const activos = personas.filter((p) => p.estado === 'ACTIVO').length
  const porcentajeActivos = totalPersonas > 0 ? Math.round((activos / totalPersonas) * 100) : 0

  // Filtrado dinámico
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
    if (window.confirm('¿Está seguro de eliminar a esta persona del padrón municipal?')) {
      setPersonas(personas.filter((p) => p.id !== id))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!formData.numeroDocumento.trim() || !formData.nombres.trim() || !formData.apellidoPaterno.trim()) {
      alert('Por favor completa los campos requeridos.')
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
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-700 text-white shadow-md shadow-cyan-500/20">
              <Icon name="people" className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
                  Padrón de Personas
                </h1>
                <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300">
                  {totalPersonas} Registrados
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registro municipal de administrados, conductores autorizados y propietarios en JLO.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-cyan-600/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-600/30 active:scale-95 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>Registrar Persona</span>
        </button>
      </div>

      {/* Tarjetas de Métricas Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ciudadanos</span>
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="people" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{totalPersonas}</p>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full">
              Padrón 2026
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registrados en la plataforma</p>
        </div>

        {/* Card 2: Conductores */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Conductores
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold">
              🪪
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{conductores}</p>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
              Con Licencia
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Habilitados para transporte</p>
        </div>

        {/* Card 3: Propietarios */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Propietarios
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              🚘
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{propietarios}</p>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
              Titulares
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dueños de unidades móviles</p>
        </div>

        {/* Card 4: Activos */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Estado Activo
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              ✓
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{activos}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              {porcentajeActivos}% del total
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${porcentajeActivos}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabla y Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por DNI, nombres, apellidos o número de licencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-cyan-400"
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

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los roles</option>
              <option value="Conductor">Conductor</option>
              <option value="Propietario">Propietario</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>

            {(filterRol !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterRol('TODOS')
                  setFilterEstado('TODOS')
                  setSearchTerm('')
                }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Indicador de resultados */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
          <span>
            Mostrando <strong className="text-slate-800 dark:text-white">{filteredPersonas.length}</strong> de{' '}
            <strong className="text-slate-800 dark:text-white">{personas.length}</strong> personas registradas
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            Padrón Único MDJLO · {new Date().getFullYear()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Persona</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Documento</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Licencia de Conducir</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Contacto</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Rol Municipal</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Estado</th>
                <th className="px-3.5 py-3.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPersonas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <p className="text-3xl">👤</p>
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No se encontraron personas
                      </p>
                      <p className="text-xs text-slate-400">
                        Intenta con otro término de búsqueda o modifica los filtros.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPersonas.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-cyan-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-3.5 max-w-[220px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.fotoUrl}
                          alt={p.nombres}
                          className="size-10 shrink-0 rounded-full object-cover border-2 border-slate-200 shadow-xs dark:border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-800 dark:text-white truncate" title={`${p.nombres} ${p.apellidoPaterno} ${p.apellidoMaterno}`}>
                            {p.nombres} {p.apellidoPaterno} {p.apellidoMaterno}
                          </p>
                          <p className="text-xs text-slate-400 truncate" title={p.direccion}>{p.direccion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        <span>{p.tipoDocumento}:</span>
                        <span>{p.numeroDocumento}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      {p.numeroLicencia ? (
                        <div>
                          <p className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{p.numeroLicencia}</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{p.categoriaLicencia}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin Licencia</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-slate-700 dark:text-slate-300">{p.celular}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[150px]" title={p.email}>{p.email}</p>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className="inline-block rounded-lg bg-cyan-50 px-2.5 py-1 text-xs font-extrabold text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                        {p.rol}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          p.estado === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p)}
                          title="Ver Ficha Digital"
                          className="rounded-xl p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white dark:bg-sky-950/60 dark:text-sky-400 dark:hover:bg-sky-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar Persona"
                          className="rounded-xl p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          title="Eliminar Persona"
                          className="rounded-xl p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="trash" className="size-4" />
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

      {/* Modal Formulario Estilo Facebook sin asteriscos */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Icon name="people" className="size-4.5" />
                </span>
                <h3 className="text-lg font-extrabold">
                  {isEditing ? 'Editar Registro de Persona' : 'Registrar Nueva Persona'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Sección 1: Datos Personales */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-cyan-600" />
                  Datos Personales & Documentos
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <select
                      id="per_tipo_doc"
                      value={formData.tipoDocumento}
                      onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="DNI">DNI (Documento Nacional)</option>
                      <option value="CE">Carnet de Extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                    <label
                      htmlFor="per_tipo_doc"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Tipo de Documento
                    </label>
                  </div>

                  <div className="relative sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <input
                      id="per_num_doc"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.numeroDocumento}
                      onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="per_num_doc"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                    >
                      Número de Documento
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <input
                      id="per_nombres"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="per_nombres"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                    >
                      Nombres Completo
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <input
                      id="per_paterno"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.apellidoPaterno}
                      onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="per_paterno"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                    >
                      Apellido Paterno
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <input
                      id="per_materno"
                      type="text"
                      placeholder=" "
                      value={formData.apellidoMaterno}
                      onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="per_materno"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                    >
                      Apellido Materno
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección 2: Licencia de Conducir */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500" />
                  Licencia de Conducir
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <input
                      id="per_licencia"
                      type="text"
                      placeholder=" "
                      value={formData.numeroLicencia}
                      onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="per_licencia"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                    >
                      Número de Licencia
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <select
                      id="per_cat_licencia"
                      value={formData.categoriaLicencia}
                      onChange={(e) => setFormData({ ...formData, categoriaLicencia: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="B-IIc (Mototaxi)">B-IIc (Mototaxi)</option>
                      <option value="A-I (Auto)">A-I (Auto Particular)</option>
                      <option value="A-IIa (Colectivo)">A-IIa (Colectivo)</option>
                      <option value="A-IIb (Minivan)">A-IIb (Minivan / Combi)</option>
                    </select>
                    <label
                      htmlFor="per_cat_licencia"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Categoría Licencia
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <input
                      id="per_vig_licencia"
                      type="date"
                      value={formData.vigenciaLicencia}
                      onChange={(e) => setFormData({ ...formData, vigenciaLicencia: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="per_vig_licencia"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Vigencia Licencia
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección 3: Contacto y Rol */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Contacto & Rol
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <input
                      id="per_celular"
                      type="text"
                      placeholder=" "
                      value={formData.celular}
                      onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="per_celular"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                    >
                      Celular de Contacto
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <select
                      id="per_rol"
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="Conductor">Conductor Autorizado</option>
                      <option value="Propietario">Propietario de Vehículo</option>
                      <option value="Conductor / Propietario">Conductor y Propietario</option>
                    </select>
                    <label
                      htmlFor="per_rol"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Rol Municipal
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                    <select
                      id="per_estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="INACTIVO">INACTIVO</option>
                    </select>
                    <label
                      htmlFor="per_estado"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Estado del Registro
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones del Formulario */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-2.5 text-xs font-black text-white hover:from-cyan-700 hover:to-teal-700 shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Digital del Ciudadano */}
      {isDetailModalOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-100 bg-[#071a2f] p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              <img
                src={selectedPersona.fotoUrl}
                alt={selectedPersona.nombres}
                className="size-24 rounded-full mx-auto object-cover border-4 border-cyan-400 shadow-lg"
              />
              <h3 className="mt-3 text-xl font-black">{selectedPersona.nombres} {selectedPersona.apellidoPaterno} {selectedPersona.apellidoMaterno}</h3>
              <span className="mt-1 inline-block rounded-full bg-cyan-500/20 px-3 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                {selectedPersona.tipoDocumento}: {selectedPersona.numeroDocumento}
              </span>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Licencia de Conducir</span>
                  <span className="font-mono font-extrabold text-cyan-600 dark:text-cyan-400">{selectedPersona.numeroLicencia || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Categoría</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPersona.categoriaLicencia || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Vigencia Licencia</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedPersona.vigenciaLicencia || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Celular / Teléfono</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPersona.celular || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Rol Municipal</span>
                  <span className="font-extrabold text-cyan-600 dark:text-cyan-400">{selectedPersona.rol}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
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
