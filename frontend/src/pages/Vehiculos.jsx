import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { RegistryHeader } from '../components/ui/RegistryHeader'

export function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [organizaciones, setOrganizaciones] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedVehiculo, setSelectedVehiculo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    placa: '',
    tipo: 'Mototaxi (Trimovil)',
    marca: '',
    modelo: '',
    color: '',
    anio: new Date().getFullYear(),
    numeroSerie: '',
    serieMotor: '',
    partidaRegistral: '',
    organizacion: '',
    propietario: '',
    propietarioDni: '',
    estado: 'FORMALIZADO',
    soatEstado: 'VIGENTE',
    tucNumero: 'TUC-2026-000',
  })

  useEffect(() => {
    fetch('http://localhost:8080/api/vehiculos', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((payload) => setVehiculos(payload.data ?? []))
      .catch(() => setVehiculos([]))

    fetch('http://localhost:8080/api/organizaciones', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((payload) => setOrganizaciones(payload.data ?? []))
      .catch(() => setOrganizaciones([]))
  }, [])

  // Métricas estadísticas
  const totalVehiculos = vehiculos.length
  const formalizados = vehiculos.filter((v) => v.estado === 'FORMALIZADO').length
  const pendientes = vehiculos.filter((v) => v.estado === 'PENDIENTE').length
  const suspendidos = vehiculos.filter((v) => v.estado === 'SUSPENDIDO' || v.estado === 'BAJA').length

  const porcentajeFormalizados = totalVehiculos > 0 ? Math.round((formalizados / totalVehiculos) * 100) : 0

  // Filtrado dinámico
  const filteredVehiculos = vehiculos.filter((v) => {
    const matchesSearch =
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.propietario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.organizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.propietarioDni && v.propietarioDni.includes(searchTerm))

    const matchesTipo = filterTipo === 'TODOS' || v.tipo === filterTipo
    const matchesEstado = filterEstado === 'TODOS' || v.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  const handleOpenCreateModal = () => {
    setFormData({
      placa: '',
      tipo: 'Mototaxi (Trimovil)',
      marca: '',
      modelo: '',
      color: '',
      anio: new Date().getFullYear(),
      numeroSerie: '',
      serieMotor: '',
      partidaRegistral: '',
      organizacion: organizaciones[0]?.razonSocial || '',
      propietario: '',
      propietarioDni: '',
      estado: 'FORMALIZADO',
      soatEstado: 'VIGENTE',
      tucNumero: `TUC-2026-${Math.floor(100 + Math.random() * 900)}`,
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setFormData({ ...vehiculo })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setIsDetailModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de eliminar este vehículo del registro municipal?')) {
      setVehiculos(vehiculos.filter((v) => v.id !== id))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!formData.placa.trim() || !formData.propietario.trim()) {
      alert('Por favor completa los campos requeridos.')
      return
    }

    if (isEditing) {
      setVehiculos(vehiculos.map((v) => (v.id === selectedVehiculo.id ? { ...formData, id: v.id } : v)))
    } else {
      const newVehiculo = {
        ...formData,
        id: Date.now(),
        codigoQr: `QR-VEH-2026-${Math.floor(100 + Math.random() * 900)}`,
      }
      setVehiculos([newVehiculo, ...vehiculos])
    }
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <RegistryHeader
        title="Vehículos"
        description="Padrón vehicular municipal. Unidades registradas, titulares y situación administrativa."
        icon="vehicle"
        action="Registrar vehículo"
        onCreate={handleOpenCreateModal}
        area="Tránsito Municipal"
        badgeText="Padrón Oficial 2026"
      />

      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-800 dark:text-white">
          Indicadores del padrón vehicular
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Resumen operativo de unidades autorizadas y en fiscalización vial.
        </p>
      </div>

      {/* Tarjetas de Métricas Estadísticas Compactas */}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total */}
        <article className="animate-enter rounded-xl border border-t-3 border-slate-200/80 p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 border-t-blue-600 dark:border-t-blue-500 bg-linear-to-br from-white via-white to-blue-50/70 dark:from-[#101a33] dark:via-[#0f172a] dark:to-blue-900/45">
          <div className="flex items-center justify-between">
            <span className="grid size-8.5 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <Icon name="vehicle" className="size-4.5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-blue-200/60 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 shadow-2xs dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300">
              Padrón 2026
            </span>
          </div>
          <div className="mt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Unidades</p>
            <h3 className="mt-0.5 text-xl font-black tracking-tight text-slate-800 dark:text-white sm:text-2xl">
              {new Intl.NumberFormat('es-PE').format(totalVehiculos)}
            </h3>
          </div>
          <p className="mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            Vehículos en la base municipal
          </p>
        </article>

        {/* Card 2: Formalizados */}
        <article className="animate-enter rounded-xl border border-t-3 border-slate-200/80 p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 border-t-emerald-600 dark:border-t-emerald-500 bg-linear-to-br from-white via-white to-emerald-50/70 dark:from-[#0d2218] dark:via-[#0f172a] dark:to-emerald-900/35">
          <div className="flex items-center justify-between">
            <span className="grid size-8.5 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Icon name="check" className="size-4.5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-400">
              {porcentajeFormalizados}% del total
            </span>
          </div>
          <div className="mt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Formalizados</p>
            <h3 className="mt-0.5 text-xl font-black tracking-tight text-slate-800 dark:text-white sm:text-2xl">
              {new Intl.NumberFormat('es-PE').format(formalizados)}
            </h3>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${porcentajeFormalizados}%` }}
            />
          </div>
          <p className="mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            Unidades autorizadas y al día
          </p>
        </article>

        {/* Card 3: En Trámite */}
        <article className="animate-enter rounded-xl border border-t-3 border-slate-200/80 p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 border-t-amber-500 dark:border-t-amber-400 bg-linear-to-br from-white via-white to-amber-50/80 dark:from-[#1e1a12] dark:via-[#0f172a] dark:to-amber-900/35">
          <div className="flex items-center justify-between">
            <span className="grid size-8.5 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              <Icon name="clock" className="size-4.5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 shadow-2xs dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-400">
              Pendientes
            </span>
          </div>
          <div className="mt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">En Trámite</p>
            <h3 className="mt-0.5 text-xl font-black tracking-tight text-slate-800 dark:text-white sm:text-2xl">
              {new Intl.NumberFormat('es-PE').format(pendientes)}
            </h3>
          </div>
          <p className="mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            En proceso de revisión documental
          </p>
        </article>

        {/* Card 4: Observados / Baja */}
        <article className="animate-enter rounded-xl border border-t-3 border-slate-200/80 p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 border-t-rose-500 dark:border-t-rose-400 bg-linear-to-br from-white via-white to-rose-50/70 dark:from-[#211528] dark:via-[#0f172a] dark:to-rose-900/35">
          <div className="flex items-center justify-between">
            <span className="grid size-8.5 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <Icon name="alert" className="size-4.5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-200/60 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 shadow-2xs dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-400">
              Restringidos
            </span>
          </div>
          <div className="mt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Observados / Baja</p>
            <h3 className="mt-0.5 text-xl font-black tracking-tight text-slate-800 dark:text-white sm:text-2xl">
              {new Intl.NumberFormat('es-PE').format(suspendidos)}
            </h3>
          </div>
          <p className="mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            Inhabilitados para prestar servicio
          </p>
        </article>
      </div>

      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-800 dark:text-white">
          Listado y gestión de unidades
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Padrón oficial con filtros por placa, titular, empresa y estado administrativo.
        </p>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
          {/* Buscador */}
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, marca, modelo, DNI o propietario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-400"
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

          {/* Filtros Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="Mototaxi (Trimovil)">Mototaxi (Trimovil)</option>
              <option value="Colectivo (Auto)">Colectivo (Auto)</option>
              <option value="Combi / Minivan">Combi / Minivan</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="FORMALIZADO">Formalizados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="SUSPENDIDO">Suspendidos</option>
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
            Mostrando <strong className="text-slate-800 dark:text-white">{filteredVehiculos.length}</strong> de{' '}
            <strong className="text-slate-800 dark:text-white">{vehiculos.length}</strong> vehículos registrados
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            JLO Tránsito Digital · {new Date().getFullYear()}
          </span>
        </div>

        {/* Tabla de Vehículos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Placa</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Vehículo & Modelo</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Organización / Empresa</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Propietario & Titular</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Serie Chasis / SUNARP</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Estado</th>
                <th className="px-3.5 py-3.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVehiculos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <Icon name="vehicle" className="size-10" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No se encontraron vehículos
                      </p>
                      <p className="text-xs text-slate-400">
                        Intenta cambiando los términos de búsqueda o los filtros seleccionados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVehiculos.map((v) => (
                  <tr
                    key={v.id}
                    className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-slate-800/40"
                  >
                    {/* Placa de Rodaje Horizontal */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 shadow-xs dark:border-slate-800 dark:bg-amber-400 dark:text-slate-950">
                        {v.placa}
                      </span>
                    </td>

                    {/* Detalle del Vehículo */}
                    <td className="px-3.5 py-3.5">
                      <p className="font-extrabold text-slate-800 dark:text-white whitespace-nowrap">
                        {v.marca} {v.modelo}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 whitespace-nowrap">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {v.tipo}
                        </span>
                        <span>·</span>
                        <span>{v.color}</span>
                        <span>({v.anio})</span>
                      </div>
                    </td>

                    {/* Organización */}
                    <td className="px-3.5 py-3.5 max-w-[180px]">
                      <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200" title={v.organizacion}>
                        {v.organizacion}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">MDJLO-AUTORIZADO</span>
                    </td>

                    {/* Propietario */}
                    <td className="px-3.5 py-3.5 max-w-[170px]">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate" title={v.propietario}>{v.propietario}</p>
                      <p className="text-xs font-mono text-slate-400">
                        DNI/RUC: {v.propietarioDni || v.propietarioRuc || 'N/A'}
                      </p>
                    </td>

                    {/* Serie Chasis & Partida SUNARP */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {v.numeroSerie || 'SN-2026-9912'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {v.partidaRegistral || 'PR-11029841'}
                      </p>
                    </td>

                    {/* Estado */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          v.estado === 'FORMALIZADO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : v.estado === 'PENDIENTE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                        }`}
                      >
                        <span className="size-2 rounded-full bg-current animate-pulse" />
                        {v.estado}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(v)}
                          title="Ver Ficha Técnica"
                          className="rounded-xl p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white dark:bg-sky-950/60 dark:text-sky-400 dark:hover:bg-sky-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          title="Editar Vehículo"
                          className="rounded-xl p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          title="Eliminar Vehículo"
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

      {/* Modal de Registro / Edición (Estilo Facebook con etiquetas flotantes sin *) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-blue-900/20 bg-[#123b6d] px-6 py-4.5 text-white dark:border-slate-800 dark:bg-[#102a4d]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-cyan-300">
                  <Icon name="vehicle" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {isEditing ? 'Editar Registro de Vehículo' : 'Registrar Nuevo Vehículo'}
                  </h3>
                  <p className="text-xs text-blue-100/80">Gestión de datos técnicos y propietario</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-xs transition hover:bg-white/20 cursor-pointer"
              >
                <Icon name="close" className="size-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Sección 1: Identificación Principal */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-600" />
                  Identificación de la Unidad
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_placa"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.placa}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-black uppercase text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_placa"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Placa de Rodaje
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <select
                      id="veh_tipo"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="Mototaxi (Trimovil)">Mototaxi (Trimovil)</option>
                      <option value="Colectivo (Auto)">Colectivo (Auto)</option>
                      <option value="Combi / Minivan">Combi / Minivan</option>
                    </select>
                    <label
                      htmlFor="veh_tipo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Tipo de Vehículo
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_marca"
                      type="text"
                      placeholder=" "
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_marca"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Marca
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_modelo"
                      type="text"
                      placeholder=" "
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_modelo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Modelo
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_color"
                      type="text"
                      placeholder=" "
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_color"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Color
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_anio"
                      type="number"
                      placeholder=" "
                      value={formData.anio}
                      onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_anio"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Año de Fabricación
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección 2: Especificaciones Técnicas y Registrales */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-cyan-500" />
                  Datos Técnicos & SUNARP
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_serie"
                      type="text"
                      placeholder=" "
                      value={formData.numeroSerie}
                      onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_serie"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Número de Serie (VIN)
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_motor"
                      type="text"
                      placeholder=" "
                      value={formData.serieMotor}
                      onChange={(e) => setFormData({ ...formData, serieMotor: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_motor"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Serie del Motor
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_partida"
                      type="text"
                      placeholder=" "
                      value={formData.partidaRegistral}
                      onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_partida"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Partida Registral SUNARP
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección 3: Titularidad y Autorizaciones */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Titular & Empresa Autorizada
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_propietario"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.propietario}
                      onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_propietario"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Nombre Completo del Propietario
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_dni"
                      type="text"
                      placeholder=" "
                      value={formData.propietarioDni}
                      onChange={(e) => setFormData({ ...formData, propietarioDni: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_dni"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      DNI / RUC del Propietario
                    </label>
                  </div>

                  <div className="relative sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <select
                      id="veh_org"
                      value={formData.organizacion}
                      onChange={(e) => setFormData({ ...formData, organizacion: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    >
                      {organizaciones.map((org) => (
                        <option key={org.id} value={org.razonSocial}>
                          {org.razonSocial} ({org.siglas})
                        </option>
                      ))}
                      <option value="Independiente / Particular">Independiente / Particular</option>
                    </select>
                    <label
                      htmlFor="veh_org"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Empresa u Organización de Transportes
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección 4: Estado Operativo */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Estado de Operatividad Municipal
                </h4>
                <div className="grid gap-4 sm:grid-cols-1">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <select
                      id="veh_estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="FORMALIZADO">FORMALIZADO</option>
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="SUSPENDIDO">SUSPENDIDO</option>
                      <option value="BAJA">BAJA</option>
                    </select>
                    <label
                      htmlFor="veh_estado"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Estado Municipal del Vehículo
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
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-xs font-black text-white hover:from-blue-700 hover:to-cyan-700 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Técnica Digital del Vehículo */}
      {isDetailModalOpen && selectedVehiculo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            {/* Banner Header Ficha */}
            <div className="relative border-b border-slate-800 bg-[#071a2f] p-6 text-white overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 size-44 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <span className="inline-block rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300 border border-cyan-500/30">
                    Ficha Técnica Vehicular Municipal · MDJLO
                  </span>
                  <div className="flex items-center gap-3 mt-2">
                    <h3 className="text-2xl font-black tracking-tight">{selectedVehiculo.placa}</h3>
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-black ${
                        selectedVehiculo.estado === 'FORMALIZADO'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {selectedVehiculo.estado}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido Ficha */}
            <div className="p-6 space-y-6">
              {/* Tarjeta de Código QR y Resumen */}
              <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-sm border border-slate-200/80 dark:bg-slate-950 dark:border-slate-800">
                  <div className="size-24 border-2 border-slate-900 bg-slate-900 p-2 text-white flex flex-col justify-center items-center rounded-xl shadow-inner">
                    <span className="text-xs font-black text-cyan-400">QR VERIFIED</span>
                    <span className="text-[8px] text-slate-300 font-mono mt-0.5">MDJLO-TRANSITO</span>
                    <div className="mt-1 h-1 w-12 bg-cyan-400 rounded-full" />
                  </div>
                  <span className="mt-2 font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {selectedVehiculo.codigoQr}
                  </span>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <span className="inline-block rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {selectedVehiculo.tipo}
                  </span>
                  <h4 className="text-xl font-black text-slate-800 dark:text-white">
                    {selectedVehiculo.marca} {selectedVehiculo.modelo}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Color: <strong className="text-slate-700 dark:text-slate-200">{selectedVehiculo.color}</strong> · Año de Fab.:{' '}
                    <strong className="text-slate-700 dark:text-slate-200">{selectedVehiculo.anio}</strong>
                  </p>
                  <div className="rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Empresa Autorizada</p>
                    <p className="font-bold text-slate-800 dark:text-cyan-300 truncate">{selectedVehiculo.organizacion}</p>
                  </div>
                </div>
              </div>

              {/* Grilla de Especificaciones */}
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Propietario Registrado</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-white">{selectedVehiculo.propietario}</p>
                  <p className="text-slate-500 font-mono">DNI/RUC: {selectedVehiculo.propietarioDni || selectedVehiculo.propietarioRuc || 'N/A'}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Tarjeta Única de Circulación (TUC)</p>
                  <p className="mt-1 font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400">{selectedVehiculo.tucNumero}</p>
                  <p className="text-slate-500 font-semibold">SOAT: {selectedVehiculo.soatEstado}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Número de Serie (Chasis)</p>
                  <p className="mt-1 font-mono font-bold text-slate-700 dark:text-slate-200">{selectedVehiculo.numeroSerie}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Partida Registral SUNARP</p>
                  <p className="mt-1 font-mono font-bold text-slate-700 dark:text-slate-200">{selectedVehiculo.partidaRegistral}</p>
                </div>
              </div>

              {/* Botón de cierre */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
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
