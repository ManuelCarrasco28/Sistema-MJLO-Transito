import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { initialOrganizaciones } from '../data/mockData'

export function Organizaciones() {
  const [organizaciones, setOrganizaciones] = useState(initialOrganizaciones)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    tipo: 'ASOCIACION',
    razonSocial: '',
    ruc: '',
    partidaRegistral: '',
    representanteLegal: '',
    direccion: '',
    telefono: '',
    email: '',
    flotaTotal: 50,
    estado: 'ACTIVO',
  })

  // Métricas estadísticas
  const totalOrgs = organizaciones.length
  const empresas = organizaciones.filter((o) => o.tipo === 'EMPRESA').length
  const asociaciones = organizaciones.filter((o) => o.tipo === 'ASOCIACION').length
  const flotaAcumulada = organizaciones.reduce((sum, o) => sum + Number(o.flotaTotal || 0), 0)

  // Filtrado dinámico
  const filteredOrgs = organizaciones.filter((o) => {
    const fullSearch = `${o.razonSocial} ${o.ruc} ${o.representanteLegal} ${o.partidaRegistral}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'TODOS' || o.tipo === filterTipo
    const matchesEstado = filterEstado === 'TODOS' || o.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  const handleOpenCreateModal = () => {
    setFormData({
      tipo: 'ASOCIACION',
      razonSocial: '',
      ruc: '',
      partidaRegistral: '',
      representanteLegal: '',
      direccion: '',
      telefono: '',
      email: '',
      flotaTotal: 50,
      estado: 'ACTIVO',
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (org) => {
    setSelectedOrg(org)
    setFormData({ ...org })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (org) => {
    setSelectedOrg(org)
    setIsDetailModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de eliminar esta organización del registro municipal?')) {
      setOrganizaciones(organizaciones.filter((o) => o.id !== id))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!formData.razonSocial.trim() || !formData.ruc.trim()) {
      alert('Por favor completa los campos requeridos.')
      return
    }

    if (isEditing) {
      setOrganizaciones(organizaciones.map((o) => (o.id === selectedOrg.id ? { ...formData, id: o.id } : o)))
    } else {
      const newOrg = {
        ...formData,
        id: Date.now(),
      }
      setOrganizaciones([newOrg, ...organizaciones])
    }
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/20">
              <Icon name="building" className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
                  Organizaciones de Transporte
                </h1>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  {totalOrgs} Entidades
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registro oficial de empresas de transporte y asociaciones de mototaxistas autorizadas en JLO.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-600/30 active:scale-95 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>Registrar Organización</span>
        </button>
      </div>

      {/* Tarjetas de Métricas Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Entidades</span>
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="building" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{totalOrgs}</p>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
              Padrón 2026
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Entidades registradas</p>
        </div>

        {/* Card 2: Asociaciones */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Asociaciones
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold">
              🛺
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{asociaciones}</p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
              Mototaxis
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Asociaciones de transporte menor</p>
        </div>

        {/* Card 3: Empresas */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Empresas S.A.C.
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              🏢
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{empresas}</p>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full">
              Transporte Mayor
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Colectivos y transporte urbano</p>
        </div>

        {/* Card 4: Flota Acumulada */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Flota Autorizada
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              ⚡
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{flotaAcumulada}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              Unidades Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Capacidad total agrupada</p>
        </div>
      </div>

      {/* Tabla y Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Razón Social, RUC, Representante Legal o Partida SUNARP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-400"
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
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="ASOCIACION">Asociaciones</option>
              <option value="EMPRESA">Empresas</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activas</option>
              <option value="SUSPENDIDO">Suspendidas</option>
            </select>

            {(filterTipo !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterTipo('TODOS')
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
            Mostrando <strong className="text-slate-800 dark:text-white">{filteredOrgs.length}</strong> de{' '}
            <strong className="text-slate-800 dark:text-white">{organizaciones.length}</strong> organizaciones registradas
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            Registro Institucional MDJLO · {new Date().getFullYear()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Organización / Empresa</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">RUC / Partida SUNARP</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Representante Legal</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Contacto</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Flota Autorizada</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Estado</th>
                <th className="px-3.5 py-3.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <p className="text-3xl">🏢</p>
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No se encontraron organizaciones
                      </p>
                      <p className="text-xs text-slate-400">
                        Modifica los términos de búsqueda o los filtros seleccionados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-indigo-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-3.5 max-w-[220px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`grid size-10 shrink-0 place-items-center rounded-2xl text-lg font-bold shadow-xs ${
                          o.tipo === 'ASOCIACION'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {o.tipo === 'ASOCIACION' ? '🛺' : '🏢'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-800 dark:text-white truncate" title={o.razonSocial}>{o.razonSocial}</p>
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {o.tipo}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">RUC: {o.ruc}</p>
                      <p className="text-xs font-mono text-slate-400">{o.partidaRegistral}</p>
                    </td>
                    <td className="px-3.5 py-3.5 max-w-[170px]">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate" title={o.representanteLegal}>{o.representanteLegal}</p>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{o.telefono}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[150px]" title={o.email}>{o.email}</p>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        ⚡ {o.flotaTotal} Unidades
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          o.estado === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {o.estado}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(o)}
                          title="Ver Detalle"
                          className="rounded-xl p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white dark:bg-sky-950/60 dark:text-sky-400 dark:hover:bg-sky-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(o)}
                          title="Editar Organización"
                          className="rounded-xl p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(o.id)}
                          title="Eliminar Organización"
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

      {/* Formulario Modal Estilo Facebook (Sin Asteriscos) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Icon name="building" className="size-4.5" />
                </span>
                <h3 className="text-lg font-extrabold">
                  {isEditing ? 'Editar Registro de Organización' : 'Registrar Nueva Organización'}
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
              {/* Sección 1: Datos Institucionales */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-indigo-600" />
                  Identificación Institucional
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <select
                      id="org_tipo"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="ASOCIACION">ASOCIACIÓN</option>
                      <option value="EMPRESA">EMPRESA (S.A. / S.A.C.)</option>
                    </select>
                    <label
                      htmlFor="org_tipo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Tipo de Entidad
                    </label>
                  </div>

                  <div className="relative sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_razon"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.razonSocial}
                      onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_razon"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Razón Social / Nombre Oficial
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_ruc"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.ruc}
                      onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_ruc"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Número de RUC
                    </label>
                  </div>

                  <div className="relative sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_partida"
                      type="text"
                      placeholder=" "
                      value={formData.partidaRegistral}
                      onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_partida"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Partida Registral SUNARP
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección 2: Representación y Dirección */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-cyan-500" />
                  Representante & Domicilio
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_rep"
                      type="text"
                      placeholder=" "
                      value={formData.representanteLegal}
                      onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_rep"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Representante Legal
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_dir"
                      type="text"
                      placeholder=" "
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_dir"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Dirección Institucional
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_tel"
                      type="text"
                      placeholder=" "
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_tel"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Teléfono de Contacto
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_flota"
                      type="number"
                      placeholder=" "
                      value={formData.flotaTotal}
                      onChange={(e) => setFormData({ ...formData, flotaTotal: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_flota"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Flota Autorizada (Unidades)
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
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-xs font-black text-white hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Organización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Técnica de la Organización */}
      {isDetailModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-100 bg-[#071a2f] p-6 text-white relative">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              <span className="inline-block rounded-full bg-indigo-500/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-300 border border-indigo-500/30">
                Empresa Autorizada MDJLO
              </span>
              <h3 className="mt-2 text-xl font-black">{selectedOrg.razonSocial}</h3>
              <p className="text-xs font-mono text-cyan-300">RUC: {selectedOrg.ruc}</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Representante Legal</span>
                  <span className="font-bold text-slate-800 dark:text-white">{selectedOrg.representanteLegal}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Partida Registral SUNARP</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedOrg.partidaRegistral}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Flota Registrada</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{selectedOrg.flotaTotal} Unidades</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Teléfono / Celular</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedOrg.telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Dirección</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-xs">{selectedOrg.direccion}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cerrar Detalle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
