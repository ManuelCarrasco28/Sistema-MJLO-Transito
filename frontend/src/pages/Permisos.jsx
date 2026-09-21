import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData, invalidateCache } from '../config/api'
import { ResolucionPermisoPrint } from '../components/documentos/TarjetaOperatividadPrint'
import { exportToExcel } from '../utils/exportToExcel'

export function Permisos() {
  const cachedPermisos = getCachedData('/permisos')
  const cachedProcs = getCachedData('/procedimientos-admin')

  const [permisos, setPermisos] = useState(cachedPermisos || [])
  const [procedimientos, setProcedimientos] = useState(cachedProcs || [])
  const [isLoading, setIsLoading] = useState(!cachedPermisos)
  const [activeTab, setActiveTab] = useState('permisos')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [selectedPermiso, setSelectedPermiso] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const initialForm = {
    id: null,
    tipoPermiso: 'CARGA_DESCARGA',
    numeroAutorizacion: '',
    vehiculoPlaca: '',
    solicitanteNombre: '',
    solicitanteDocumento: '',
    representanteLegal: '',
    expediente: '',
    registroNumero: '',
    referenciaSisgedo: '',
    asunto: 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA',
    zonaCirculacion: 'Anillo Vial - José Leonardo Ortiz',
    ubicacion: 'Paradero Central y Anexos',
    horarioInicio: '16:00:00',
    horarioFin: '05:00:00',
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaInicioVigencia: new Date().toISOString().slice(0, 10),
    fechaFinVigencia: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    reciboIngresoNumero: '',
    reciboIngresoMonto: '1030.00',
    reciboIngresoFecha: new Date().toISOString().slice(0, 10),
    tonelaje: '03 A 07-TM',
    numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000)),
    recorridoIngreso: 'Av. Balta, Av. Chiclayo, Calle Kennedy',
    recorridoSalida: 'Calle Leguía, Av. México, Av. Sáenz Peña',
    flotaPlacas: '',
    observaciones: '',
    contenido: 'Se autoriza la circulación y operación vehicular en estricto cumplimiento de las Ordenanzas Municipales vigentes.',
    estado: 'VIGENTE'
  }

  const [formData, setFormData] = useState(initialForm)

  const loadData = () => {
    setIsLoading(true)
    Promise.all([
      apiFetch('/permisos').then((r) => r.json()).catch(() => ({ data: [] })),
      apiFetch('/procedimientos-admin').then((r) => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([permRes, procRes]) => {
        const pData = permRes.data || []
        const prData = procRes.data || []
        setPermisos(pData)
        setProcedimientos(prData)
        setCachedData('/permisos', pData)
        setCachedData('/procedimientos-admin', prData)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const totalPermisos = permisos.length
  const vigentes = permisos.filter((p) => p.estado === 'VIGENTE').length
  const totalCarga = permisos.filter((p) => p.tipoPermiso === 'CARGA_DESCARGA').length
  const totalVias = permisos.filter((p) => p.tipoPermiso === 'USO_VIAS').length

  const filteredPermisos = permisos.filter((p) => {
    const s = searchTerm.toLowerCase()
    const matchSearch =
      p.numeroAutorizacion?.toLowerCase().includes(s) ||
      p.solicitante?.toLowerCase().includes(s) ||
      p.solicitanteNombre?.toLowerCase().includes(s) ||
      p.vehiculoPlaca?.toLowerCase().includes(s) ||
      p.expediente?.toLowerCase().includes(s) ||
      p.expedienteNumero?.toLowerCase().includes(s) ||
      p.zonaCirculacion?.toLowerCase().includes(s) ||
      p.reciboIngresoNumero?.toLowerCase().includes(s)

    const matchEstado = filterEstado === 'TODOS' || p.estado === filterEstado
    const matchTipo = filterTipo === 'TODOS' || p.tipoPermiso === filterTipo

    return matchSearch && matchEstado && matchTipo
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado, filterTipo, activeTab])

  const paginatedPermisos = filteredPermisos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Autorizaciones_Permisos_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Autorizaciones',
      title: 'PADRÓN OFICIAL DE AUTORIZACIONES DE CARGA, DESCARGA Y USO DE VÍAS',
      subtitle: 'Subgerencia de Tránsito y Transporte - Resoluciones y Permisos Especiales',
      metadata: [
        { label: 'Tipo Trámite', value: filterTipo },
        { label: 'Estado', value: filterEstado },
        { label: 'Total Registros', value: String(filteredPermisos.length) }
      ],
      columns: [
        { header: 'N° AUTORIZACIÓN', key: 'numeroAutorizacion', isText: true, width: 150, align: 'center' },
        { header: 'TIPO PERMISO', key: 'tipoPermiso', width: 140 },
        { header: 'PLACA / FLOTA', render: (_, p) => p.vehiculoPlaca || p.flotaPlacas || '—', isText: true, width: 130, align: 'center' },
        { header: 'SOLICITANTE / EMPRESA', key: 'solicitanteNombre', width: 220 },
        { header: 'DNI / RUC', key: 'solicitanteDocumento', isText: true, width: 120, align: 'center' },
        { header: 'EXPEDIENTE', key: 'expediente', isText: true, width: 130, align: 'center' },
        { header: 'ZONA', key: 'zonaCirculacion', width: 180 },
        { header: 'HORARIO', render: (_, p) => `${p.horarioInicio || ''} - ${p.horarioFin || ''}`, width: 130, align: 'center' },
        { header: 'INICIO VIGENCIA', key: 'fechaInicioVigencia', width: 120, align: 'center' },
        { header: 'FIN VIGENCIA', key: 'fechaFinVigencia', width: 120, align: 'center' },
        { header: 'RECIBO INGRESO', key: 'reciboIngresoNumero', isText: true, width: 130, align: 'center' },
        { header: 'MONTO (S/)', render: (_, p) => `S/ ${Number(p.reciboIngresoMonto || 0).toFixed(2)}`, align: 'right', width: 110 },
        { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
      ],
      data: filteredPermisos
    })
  }

  const handleOpenDetail = (p) => {
    setSelectedPermiso(p)
    setIsDetailModalOpen(true)
  }

  const handleOpenCreate = () => {
    setFormData({
      ...initialForm,
      numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000))
    })
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (p) => {
    setFormData({
      id: p.id,
      tipoPermiso: p.tipoPermiso || 'CARGA_DESCARGA',
      numeroAutorizacion: p.numeroAutorizacion || '',
      vehiculoPlaca: p.vehiculoPlaca || '',
      solicitanteNombre: p.solicitanteNombre || p.solicitante || '',
      solicitanteDocumento: p.solicitanteDocumento || p.solicitanteDoc || p.solicitanteRuc || p.solicitanteDni || '',
      representanteLegal: p.representanteLegal || '',
      expediente: p.expediente || p.expedienteNumero || '',
      registroNumero: p.registroNumero || '',
      referenciaSisgedo: p.referenciaSisgedo || '',
      asunto: p.asunto || '',
      zonaCirculacion: p.zonaCirculacion || 'Anillo Vial - José Leonardo Ortiz',
      ubicacion: p.ubicacion || '',
      horarioInicio: p.horarioInicio || '16:00:00',
      horarioFin: p.horarioFin || '05:00:00',
      fechaEmision: p.fechaEmision || new Date().toISOString().slice(0, 10),
      fechaInicioVigencia: p.fechaInicioVigencia || new Date().toISOString().slice(0, 10),
      fechaFinVigencia: p.fechaFinVigencia || '',
      reciboIngresoNumero: p.reciboIngresoNumero || '',
      reciboIngresoMonto: p.reciboIngresoMonto ? String(p.reciboIngresoMonto) : '',
      reciboIngresoFecha: p.reciboIngresoFecha || '',
      tonelaje: p.tonelaje || '03 A 07-TM',
      numeroSeguridad: p.numeroSeguridad || String(Math.floor(10000 + Math.random() * 90000)),
      recorridoIngreso: p.recorridoIngreso || '',
      recorridoSalida: p.recorridoSalida || '',
      flotaPlacas: p.flotaPlacas || '',
      observaciones: p.observaciones || '',
      contenido: p.contenido || '',
      estado: p.estado || 'VIGENTE'
    })
    setIsCreateModalOpen(true)
  }

  const handleTipoChange = (newTipo) => {
    setFormData((prev) => ({
      ...prev,
      tipoPermiso: newTipo,
      asunto: newTipo === 'CARGA_DESCARGA'
        ? 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA'
        : newTipo === 'USO_VIAS'
          ? 'AUTORIZACION PROVISIONAL DE USO DE VIAS'
          : 'AUTORIZACIÓN DE OPERACIÓN TUPA',
      reciboIngresoMonto: newTipo === 'CARGA_DESCARGA' ? '1030.00' : newTipo === 'USO_VIAS' ? '850.00' : '450.00',
      zonaCirculacion: newTipo === 'CARGA_DESCARGA' ? 'Anillo Vial - José Leonardo Ortiz' : 'Jurisdicción del Distrito de José Leonardo Ortiz'
    }))
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const isEdit = Boolean(formData.id)
      const url = isEdit ? `/permisos/${formData.id}` : '/permisos'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error('Error al procesar la autorización municipal.')
      }

      setIsCreateModalOpen(false)
      invalidateCache('/permisos')
      loadData()
    } catch (err) {
      alert(err.message || 'Ocurrió un error al guardar la autorización.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30">
            <Icon name="routePermit" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Permisos y Autorizaciones
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Módulo oficial de emisión: Carga y Descarga, Uso Provisional de Vías y Trámites Subgerenciales.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-violet-600/25 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <Icon name="plus" className="size-4" />
            <span>Nueva Autorización Oficial</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 cursor-pointer"
            title="Exportar padrón de autorizaciones en Excel"
          >
            <Icon name="table" className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-horizon dark:shadow-none transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111C44] dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Icon name="print" className="size-4 text-slate-500" />
            <span>Imprimir Padrón</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Autorizaciones
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <Icon name="permit" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {totalPermisos}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Resoluciones y autorizaciones emitidas
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Carga y Descarga
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <Icon name="motoTaxi" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-sky-600 dark:text-sky-400">
            {totalCarga}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            En Anillo Vial (4PM - 5AM)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Uso de Vías
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="routePermit" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
            {totalVias}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Autorizaciones de recorrido de flota
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vigentes
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Icon name="check" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {vigentes}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Con circulación autorizada
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('permisos')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'permisos'
              ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="permit" className="size-4" />
          <span>Padrón de Autorizaciones ({permisos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tupa')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'tupa'
              ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="document" className="size-4" />
          <span>Catálogo Normativo TUPA ({procedimientos.length})</span>
        </button>
      </div>

      {activeTab === 'permisos' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-horizon dark:shadow-none dark:border-slate-800 dark:bg-[#111C44] lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por placa, solicitante, expediente o recibo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-violet-400"
              />
            </div>

            {/* Filtros por Tipo de Trámite y Estado */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterTipo('TODOS')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${filterTipo === 'TODOS' ? 'bg-white dark:bg-[#111C44] text-violet-700 dark:text-violet-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTipo('CARGA_DESCARGA')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${filterTipo === 'CARGA_DESCARGA' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Carga y Descarga
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTipo('USO_VIAS')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${filterTipo === 'USO_VIAS' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Uso de Vías
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                {['TODOS', 'VIGENTE', 'VENCIDO'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterEstado(st)}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                      filterEstado === st
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {st === 'TODOS' ? 'Todos Estados' : st === 'VIGENTE' ? 'Vigentes' : 'Vencidos'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de Autorizaciones */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-horizon dark:shadow-none dark:border-slate-800 dark:bg-[#111C44]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">N° Autorización / Tipo</th>
                    <th className="px-4 py-3.5">Solicitante / Empresa</th>
                    <th className="px-4 py-3.5">Vehículo / Flota</th>
                    <th className="px-4 py-3.5">Zona y Horario</th>
                    <th className="px-4 py-3.5">Vigencia</th>
                    <th className="px-4 py-3.5">Derecho de Trámite</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Cargando autorizaciones municipales...
                      </td>
                    </tr>
                  ) : paginatedPermisos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No se encontraron autorizaciones con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedPermisos.map((p) => {
                      const isCarga = p.tipoPermiso === 'CARGA_DESCARGA'
                      const isVias = p.tipoPermiso === 'USO_VIAS'

                      return (
                        <tr key={p.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          {/* N° Autorización & Tipo Badge */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase mb-1 ${
                                isCarga
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : isVias
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                              }`}
                            >
                              {isCarga ? 'Carga y Descarga' : isVias ? 'Uso Provisional Vías' : 'Operación TUPA'}
                            </span>
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {p.numeroAutorizacion}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Exp. {p.expediente || p.expedienteNumero || 'S/N'} {p.registroNumero ? `· Reg. ${p.registroNumero}` : ''}
                            </div>
                          </td>

                          {/* Solicitante / Titular */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {p.solicitanteNombre || p.solicitante || '—'}
                            </div>
                            {p.representanteLegal && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Rep: {p.representanteLegal}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.solicitanteDocumento || p.solicitanteDoc ? `DOC: ${p.solicitanteDocumento || p.solicitanteDoc}` : ''}
                            </div>
                          </td>

                          {/* Vehículo / Flota */}
                          <td className="px-4 py-3.5">
                            {p.vehiculoPlaca && p.vehiculoPlaca !== '—' ? (
                              <span className="inline-flex items-center rounded-lg border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-black text-slate-950 shadow-xs">
                                {p.vehiculoPlaca}
                              </span>
                            ) : p.flotaPlacas ? (
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                  Flota ({p.flotaPlacas.split(',').length} Vehículos)
                                </span>
                                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={p.flotaPlacas}>
                                  {p.flotaPlacas}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Flota Autorizada</span>
                            )}
                          </td>

                          {/* Zona y Horario */}
                          <td className="px-4 py-3.5 max-w-[180px]">
                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={p.zonaCirculacion || p.ubicacion}>
                              {p.zonaCirculacion || p.ubicacion || 'Anillo Vial JLO'}
                            </div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                              {p.horarioInicio && p.horarioFin ? `${p.horarioInicio.slice(0, 5)} - ${p.horarioFin.slice(0, 5)} hrs` : 'Horario Ordinario'}
                            </div>
                          </td>

                          {/* Vigencia */}
                          <td className="px-4 py-3.5">
                            <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs">
                              {p.fechaInicioVigencia ? new Date(p.fechaInicioVigencia).toLocaleDateString('es-PE') : '—'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Hasta: {p.fechaFinVigencia ? new Date(p.fechaFinVigencia).toLocaleDateString('es-PE') : 'Indefinido'}
                            </div>
                          </td>

                          {/* Derecho de Trámite / Recibo */}
                          <td className="px-4 py-3.5">
                            {p.reciboIngresoNumero ? (
                              <div>
                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                  Recibo: {p.reciboIngresoNumero}
                                </div>
                                <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                  S/ {Number(p.reciboIngresoMonto || 0).toFixed(2)} {p.tonelaje ? `· ${p.tonelaje}` : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Estado */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black border ${
                                p.estado === 'VIGENTE'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}
                            >
                              <span className={`size-1.5 rounded-full ${p.estado === 'VIGENTE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {p.estado}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(p)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-horizon dark:shadow-none transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-300 dark:hover:bg-violet-950/40 dark:hover:text-violet-300 cursor-pointer"
                                title="Ver / Imprimir Formato Oficial A4"
                              >
                                <Icon name="print" className="size-3.5 text-slate-500" />
                                <span>Imprimir A4</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                className="grid size-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#111C44] dark:text-slate-300 cursor-pointer"
                                title="Editar Autorización"
                              >
                                <Icon name="edit" className="size-3.5" />
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

            <Pagination
              currentPage={currentPage}
              totalItems={filteredPermisos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>
      )}

      {/* Catálogo TUPA */}
      {activeTab === 'tupa' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {procedimientos.map((proc) => (
            <div
              key={proc.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-horizon dark:shadow-none dark:border-slate-800 dark:bg-[#111C44]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-violet-50 px-2.5 py-1 font-mono text-xs font-black text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                    {proc.codigo}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {proc.estado}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white leading-snug">
                  {proc.nombre}
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                  {proc.descripcion || 'Procedimiento administrativo oficial de tránsito y vialidad distrital.'}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">Derecho de trámite</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  S/ {Number(proc.costo || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE EMISIÓN / EDICIÓN DE AUTORIZACIÓN OFICIAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-enter">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] my-auto overflow-hidden">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-violet-700 to-indigo-700 p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-white">
                  <Icon name="routePermit" className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-black">
                    {formData.id ? 'Editar Autorización Oficial' : 'Emitir Nueva Autorización Municipal'}
                  </h3>
                  <p className="text-xs text-violet-200">
                    Subgerencia de Tránsito, Transporte y Vialidad · MDJLO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="grid size-8 place-items-center rounded-xl text-violet-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* Selector de Tipo de Autorización */}
              <div>
                <label className="mb-2 block font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
                  Tipo de Autorización / Trámite Oficial *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('CARGA_DESCARGA')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                      formData.tipoPermiso === 'CARGA_DESCARGA'
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 text-sky-950 dark:text-sky-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <div>
                      <span className="font-black block text-xs">🚛 Carga y Descarga</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                        Anillo vial nocturno (4PM-5AM), tonelaje y recibo.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTipoChange('USO_VIAS')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                      formData.tipoPermiso === 'USO_VIAS'
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <div>
                      <span className="font-black block text-xs">🛣️ Uso Provisional Vías</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                        Recorridos de ingreso/salida y flota vehicular.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTipoChange('RENOVACION_OPERACION')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                      formData.tipoPermiso === 'RENOVACION_OPERACION'
                        ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 text-violet-950 dark:text-violet-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <div>
                      <span className="font-black block text-xs">📋 Operación / TUPA</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                        Resolución subgerencial de operación y servicio.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* BLOQUE 1: Datos del Titular y Empresa */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="grid size-5 place-items-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 text-[10px]">1</span>
                  Datos del Administrado / Empresa de Transporte
                </span>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Razón Social o Administrado *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. TRANSPORTES ADMIRAL SAC o Persona Natural"
                      value={formData.solicitanteNombre}
                      onChange={(e) => setFormData({ ...formData, solicitanteNombre: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      RUC / DNI *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="20601234567"
                      value={formData.solicitanteDocumento}
                      onChange={(e) => setFormData({ ...formData, solicitanteDocumento: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Representante Legal / Gerente General
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. DENISS CARMELITA ALTAMIRANO REQUEJO"
                      value={formData.representanteLegal}
                      onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      N° Seguridad SGTTV
                    </label>
                    <input
                      type="text"
                      value={formData.numeroSeguridad}
                      onChange={(e) => setFormData({ ...formData, numeroSeguridad: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: Vehículo o Flota Autorizada */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="grid size-5 place-items-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 text-[10px]">2</span>
                  Vehículo y Parámetros Operativos
                </span>

                {formData.tipoPermiso === 'CARGA_DESCARGA' ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                        Placa del Vehículo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. AHC-810"
                        value={formData.vehiculoPlaca}
                        onChange={(e) => setFormData({ ...formData, vehiculoPlaca: e.target.value.toUpperCase() })}
                        className="w-full rounded-xl border-2 border-sky-400 bg-white px-3 py-2 font-mono font-black text-sm outline-none focus:border-sky-600 dark:border-sky-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                        Capacidad / Tonelaje
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. 03 A 07-TM"
                        value={formData.tonelaje}
                        onChange={(e) => setFormData({ ...formData, tonelaje: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                        Horario en Anillo Vial
                      </label>
                      <input
                        type="text"
                        value="4.00 PM - 05.00 AM (del día siguiente)"
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                          Recorrido de Ingreso
                        </label>
                        <input
                          type="text"
                          placeholder="Av. Balta, Av. Chiclayo, Calle Kennedy..."
                          value={formData.recorridoIngreso}
                          onChange={(e) => setFormData({ ...formData, recorridoIngreso: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                          Recorrido de Salida
                        </label>
                        <input
                          type="text"
                          placeholder="Calle Leguía, Av. México, Av. Sáenz Peña..."
                          value={formData.recorridoSalida}
                          onChange={(e) => setFormData({ ...formData, recorridoSalida: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                        Flota Vehicular (Placas autorizadas separadas por comas)
                      </label>
                      <textarea
                        rows="2"
                        placeholder="Ej. M4-5678, M4-9012, 1234-5B, 6789-9A, 5432-1C..."
                        value={formData.flotaPlacas}
                        onChange={(e) => setFormData({ ...formData, flotaPlacas: e.target.value.toUpperCase() })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 3: Expediente, Pago y Fechas */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="grid size-5 place-items-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 text-[10px]">3</span>
                  Expediente SISGEDO, Derecho de Trámite y Vigencia
                </span>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      N° Expediente UTD
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. UTD- 5294-24-"
                      value={formData.expediente}
                      onChange={(e) => setFormData({ ...formData, expediente: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      N° Registro
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 610"
                      value={formData.registroNumero}
                      onChange={(e) => setFormData({ ...formData, registroNumero: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Recibo de Ingreso N° *
                    </label>
                    <input
                      type="text"
                      placeholder="202400028830"
                      value={formData.reciboIngresoNumero}
                      onChange={(e) => setFormData({ ...formData, reciboIngresoNumero: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Monto Cancelado (S/)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="1030.00"
                      value={formData.reciboIngresoMonto}
                      onChange={(e) => setFormData({ ...formData, reciboIngresoMonto: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Inicio de Vigencia
                    </label>
                    <input
                      type="date"
                      value={formData.fechaInicioVigencia}
                      onChange={(e) => setFormData({ ...formData, fechaInicioVigencia: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Fin de Vigencia (1 Año)
                    </label>
                    <input
                      type="date"
                      value={formData.fechaFinVigencia}
                      onChange={(e) => setFormData({ ...formData, fechaFinVigencia: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 font-black text-white shadow-md shadow-violet-600/20 hover:scale-[1.01] active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : formData.id ? 'Actualizar Autorización' : 'Emitir Autorización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN E IMPRESIÓN OFICIAL HOJA A4 */}
      {isDetailModalOpen && selectedPermiso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-enter overflow-y-auto">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0B1437] my-auto">
            
            {/* Header del visualizador */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-violet-500/20 text-violet-400">
                  <Icon name="print" className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Formato Oficial A4 — Subgerencia de Tránsito y Transporte
                    <span className="rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-mono px-2 py-0.5 font-bold">
                      {selectedPermiso.tipoPermiso === 'CARGA_DESCARGA' ? 'Carga y Descarga' : selectedPermiso.tipoPermiso === 'USO_VIAS' ? 'Uso Provisional de Vías' : 'Resolución'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedPermiso.numeroAutorizacion || selectedPermiso.numeroResolucion}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="grid size-8 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Vista Previa del Documento Oficial */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-slate-900/60">
              <div className="text-center max-w-lg">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Documento Oficial de Autorización Municipal — Hoja Formato A4
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Al pulsar "Imprimir Documento Oficial A4", el sistema aísla exclusivamente el contenedor oficial <code className="font-mono text-violet-600 dark:text-violet-400">#seccion-impresion</code> emitiendo 1 página limpia idéntica al documento físico.
                </p>
              </div>

              <ResolucionPermisoPrint data={selectedPermiso} />
            </div>

            {/* Footer de Acciones */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1437]">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-violet-600/25 hover:from-violet-500 hover:to-indigo-500 transition cursor-pointer active:scale-95"
              >
                <Icon name="print" className="size-4" />
                <span>Imprimir Documento Oficial A4</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
