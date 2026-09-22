import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData, invalidateCache } from '../config/api'
import { ResolucionPermisoPrint } from '../components/documentos/TarjetaOperatividadPrint'
import { exportToExcel } from '../utils/exportToExcel'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FloatingInput, FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'

const FILTER_TIPO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'CARGA_DESCARGA', label: 'Carga y Descarga' },
  { value: 'USO_VIAS', label: 'Uso de Vías' },
]

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'VIGENTE', label: 'Vigentes' },
  { value: 'VENCIDO', label: 'Vencidos' },
]

export function Permisos() {
  const cachedPermisos = getCachedData('/permisos')
  const cachedProcs = getCachedData('/procedimientos-admin')

  const [permisos, setPermisos] = useState(cachedPermisos || [])
  const [procedimientos, setProcedimientos] = useState(cachedProcs || [])
  const [tramitesDisponibles, setTramitesDisponibles] = useState([])
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
    tramiteId: '',
    personaId: null,
    asociacionId: null,
    vehiculoId: null,
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
      apiFetch('/permisos').then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      apiFetch('/procedimientos-admin').then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      apiFetch('/permisos/tramites-disponibles').then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
    ])
      .then(([permRes, procRes, tramRes]) => {
        const pData = Array.isArray(permRes?.data) ? permRes.data : []
        const prData = Array.isArray(procRes?.data) ? procRes.data : []
        const trData = Array.isArray(tramRes?.data) ? tramRes.data : []
        setPermisos(pData)
        setProcedimientos(prData)
        setTramitesDisponibles(trData)
        if (pData.length > 0) setCachedData('/permisos', pData)
        if (prData.length > 0) setCachedData('/procedimientos-admin', prData)
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
  const totalCarga = permisos.filter((p) => p.tipoPermiso === 'CARGA_DESCARGA').length
  const totalVias = permisos.filter((p) => p.tipoPermiso === 'USO_VIAS').length
  const vigentes = permisos.filter((p) => p.estado === 'VIGENTE').length
  const vencidos = permisos.filter((p) => p.estado !== 'VIGENTE').length

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
      tramiteId: p.tramiteId ? String(p.tramiteId) : '',
      personaId: p.personaId || null,
      asociacionId: p.asociacionId || null,
      vehiculoId: p.vehiculoId || null,
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

  const handleTramiteChange = (tramiteIdVal) => {
    if (!tramiteIdVal) {
      setFormData((prev) => ({
        ...prev,
        tramiteId: '',
      }))
      return
    }

    const t = tramitesDisponibles.find((x) => String(x.id) === String(tramiteIdVal))
    if (!t) return

    setFormData((prev) => ({
      ...prev,
      tramiteId: t.id,
      personaId: t.personaId || null,
      asociacionId: t.asociacionId || null,
      vehiculoId: t.vehiculoId || null,
      expediente: t.numeroExpediente || prev.expediente,
      referenciaSisgedo: t.numeroExpediente || prev.referenciaSisgedo,
      solicitanteNombre: t.solicitanteNombre || prev.solicitanteNombre,
      solicitanteDocumento: t.solicitanteDocumento || prev.solicitanteDocumento,
      representanteLegal: t.representanteLegalNombre || (t.asociacionNombre && t.personaNombre ? t.personaNombre : prev.representanteLegal),
      vehiculoPlaca: t.vehiculoPlaca || prev.vehiculoPlaca,
      reciboIngresoNumero: t.reciboIngresoNumero || prev.reciboIngresoNumero,
      reciboIngresoMonto: t.reciboIngresoMonto ? String(t.reciboIngresoMonto) : prev.reciboIngresoMonto,
      reciboIngresoFecha: t.reciboIngresoFecha || prev.reciboIngresoFecha,
    }))
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

      const payload = {
        ...formData,
        tramiteId: formData.tramiteId ? Number(formData.tramiteId) : null,
      }

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Error al procesar la autorización municipal.')
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

  const handleDeletePermiso = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta autorización municipal?')) {
      try {
        const res = await apiFetch(`/permisos/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Error al eliminar la autorización.')
        setPermisos((prev) => prev.filter((p) => p.id !== id))
        invalidateCache('/permisos')
      } catch (err) {
        alert(err.message || 'No se pudo eliminar la autorización.')
      }
    }
  }

  const escapeXml = (str) => {
    if (str === null || str === undefined) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }


  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      {/* Cabecera Principal - Estilo Personas.jsx */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
            <Icon name="routePermit" className="size-5.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Permisos y Autorizaciones
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Directorio oficial de autorizaciones de Carga y Descarga, y Uso Provisional de Vías.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas separadas compactas - Exacto a Personas.jsx */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Total Registros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-blue-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-blue-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Registros</span>
            <span className="grid size-6 place-items-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Icon name="routePermit" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(totalPermisos)}
            </p>
          </div>
        </div>

        {/* 2. Carga y Descarga */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-amber-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Carga y Descarga</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="motoTaxi" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(totalCarga)}
            </p>
          </div>
        </div>

        {/* 3. Uso de Vías */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-cyan-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Uso de Vías</span>
            <span className="grid size-6 place-items-center rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="permit" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(totalVias)}
            </p>
          </div>
        </div>

        {/* 4. Vigentes */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-emerald-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Vigentes</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(vigentes)}
            </p>
          </div>
        </div>

        {/* 5. Vencidos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-rose-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Vencidos</span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(vencidos)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('permisos')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'permisos'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="permit" className="size-4" />
          <span>Padrón de Autorizaciones ({permisos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tupa')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'tupa'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="document" className="size-4" />
          <span>Catálogo Normativo TUPA ({procedimientos.length})</span>
        </button>
      </div>

      {activeTab === 'permisos' && (
        <div className="space-y-4">
          {/* Contenedor de la Tabla - Exacto a Personas.jsx */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
            
            {/* Barra de Filtros y Acciones */}
            <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por placa, solicitante, autorización o expediente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-400"
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
                  value={filterTipo}
                  onChange={setFilterTipo}
                  options={FILTER_TIPO_OPTIONS}
                />
                <RoundedSelect
                  value={filterEstado}
                  onChange={setFilterEstado}
                  options={FILTER_ESTADO_OPTIONS}
                />

                {(filterEstado !== 'TODOS' || filterTipo !== 'TODOS' || searchTerm !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterEstado('TODOS')
                      setFilterTipo('TODOS')
                      setSearchTerm('')
                    }}
                    title="Limpiar filtros"
                    className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <Icon name="filterX" className="size-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportExcel}
                  title="Descargar padrón en Excel (.xls)"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  <Icon name="fileSpreadsheet" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  title="Descargar o imprimir padrón en PDF"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  <Icon name="filePdf" className="size-3.5 text-rose-600 dark:text-rose-400" />
                  <span>PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <span className="text-base leading-none font-black">+</span>
                  <span>Nueva autorización</span>
                </button>
              </div>
            </div>

            {/* Tabla de Autorizaciones */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Solicitante</th>
                    <th className="px-4 py-3 whitespace-nowrap">N° Autorización</th>
                    <th className="px-4 py-3 whitespace-nowrap">Vehículo</th>
                    <th className="px-4 py-3 whitespace-nowrap">Zona / Horario</th>
                    <th className="px-4 py-3 whitespace-nowrap">Vigencia</th>
                    <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                    <th className="sticky right-0 z-20 px-4 py-3 text-center whitespace-nowrap bg-slate-50/75 dark:bg-slate-800/40">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Cargando autorizaciones municipales...
                      </td>
                    </tr>
                  ) : paginatedPermisos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No se encontraron autorizaciones con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedPermisos.map((p) => {
                      const isCarga = p.tipoPermiso === 'CARGA_DESCARGA'
                      const isVias = p.tipoPermiso === 'USO_VIAS'
                      const solicitanteText = p.solicitanteNombre || p.solicitante || '—'
                      const initials = solicitanteText.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'AU'

                      return (
                          <tr key={p.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            {/* Solicitante / Titular con Avatar */}
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 font-bold text-slate-700 text-xs shadow-2xs dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {initials}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white max-w-[200px]">
                                    {solicitanteText}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {p.solicitanteDocumento || p.solicitanteDoc ? `DOC: ${p.solicitanteDocumento || p.solicitanteDoc}` : 'Sin documento'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Nº Autorización & Tipo Badge */}
                            <td className="px-4 py-3 align-top">
                              <span
                                className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase mb-0.5 tracking-widest ${
                                  isCarga
                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                    : isVias
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                                }`}
                              >
                                {isCarga ? 'Carga y Descarga' : isVias ? 'Uso de Vías' : 'Operación TUPA'}
                              </span>
                              <div className="text-[13px] font-bold text-slate-700 dark:text-slate-200 font-mono">
                                {p.numeroAutorizacion}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Exp. {p.expediente || p.expedienteNumero || 'S/N'}
                              </div>
                            </td>

                            {/* Vehículo / Flota */}
                            <td className="px-4 py-3 align-top">
                              {p.vehiculoPlaca && p.vehiculoPlaca !== '—' ? (
                                <span className="inline-flex items-center rounded-lg border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-black text-slate-950 shadow-xs">
                                  {p.vehiculoPlaca}
                                </span>
                              ) : p.flotaPlacas ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Flota General
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic text-xs">No especificado</span>
                              )}
                            </td>

                            {/* Zona / Horario */}
                            <td className="px-4 py-3 text-xs align-top">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                                {p.zonaCirculacion || p.zonaPermitida || '—'}
                              </div>
                              <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                {p.horarioPermitido || (p.horarioInicio && p.horarioFin ? `${p.horarioInicio.slice(0, 5)} - ${p.horarioFin.slice(0, 5)}` : '—')}
                              </div>
                            </td>

                            {/* Vigencia */}
                            <td className="px-4 py-3 text-xs align-top">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {p.fechaInicioVigencia || p.fechaInicio || '—'}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                Al: {p.fechaFinVigencia || p.fechaFin || '—'}
                              </div>
                            </td>

                            {/* Estado */}
                            <td className="px-4 py-3 align-top">
                              <StatusBadge status={p.estado} />
                            </td>

                            {/* Acciones - Estilo Personas.jsx */}
                            <td className="sticky right-0 z-20 px-4 py-3 align-top bg-white/95 dark:bg-[#0f172a]/95">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPermiso(p)
                                    setIsDetailModalOpen(true)
                                  }}
                                  title="Imprimir Formato Oficial"
                                  className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                                  style={{
                                    backgroundColor: 'var(--action-print-bg)',
                                    borderColor: 'var(--action-print-border)',
                                    color: 'var(--action-print-text)',
                                    borderWidth: '1.5px',
                                    borderStyle: 'solid',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--action-print-hover)'
                                    e.currentTarget.style.borderColor = 'var(--action-print-hover)'
                                    e.currentTarget.style.color = '#ffffff'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--action-print-bg)'
                                    e.currentTarget.style.borderColor = 'var(--action-print-border)'
                                    e.currentTarget.style.color = 'var(--action-print-text)'
                                  }}
                                >
                                  <Icon name="print" className="size-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Editar Autorización"
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

                                <button
                                  type="button"
                                  onClick={() => handleDeletePermiso(p.id)}
                                  title="Eliminar Autorización"
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

      {/* MODAL CREAR / EDITAR - EXACTO A PERSONAS.JSX */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            {/* Header: Limpio, exactamente como Personas.jsx */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon name="routePermit" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {formData.id ? 'Editar autorización' : 'Nueva autorización'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                title="Cerrar"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} autoComplete="off" className="flex flex-col overflow-hidden flex-1">
              <div className="p-4 sm:p-4.5 space-y-2.5 overflow-y-auto">
                {/* Selector de Tipo de Autorización */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('CARGA_DESCARGA')}
                    className={`rounded-2xl border p-2.5 text-left transition cursor-pointer flex flex-col justify-between ${
                      formData.tipoPermiso === 'CARGA_DESCARGA'
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 text-sky-950 dark:text-sky-200 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-sky-500" />
                      Carga y Descarga
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Anillo vial nocturno y tonelaje.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTipoChange('USO_VIAS')}
                    className={`rounded-2xl border p-2.5 text-left transition cursor-pointer flex flex-col justify-between ${
                      formData.tipoPermiso === 'USO_VIAS'
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Uso Provisional Vías
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Recorridos y flota vehicular.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTipoChange('RENOVACION_OPERACION')}
                    className={`rounded-2xl border p-2.5 text-left transition cursor-pointer flex flex-col justify-between ${
                      formData.tipoPermiso === 'RENOVACION_OPERACION'
                        ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 text-violet-950 dark:text-violet-200 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-violet-500" />
                      Operación / TUPA
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Resolución subgerencial.
                    </span>
                  </button>
                </div>

                {/* VINCULACIÓN CON EXPEDIENTE / TRÁMITE SISGEDO */}
                <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 to-sky-50/50 p-3 space-y-2 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-slate-900/50 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-indigo-600" />
                      Vincular Trámite / Expediente SISGEDO
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Carga automáticamente solicitante, vehículo y recibo de pago
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      id="tramiteId"
                      value={formData.tramiteId || ''}
                      onChange={(e) => handleTramiteChange(e.target.value)}
                      className="peer block h-[42px] w-full appearance-none rounded-xl border border-indigo-300/80 bg-white px-3 pt-3.5 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-indigo-800 dark:bg-slate-800 dark:text-white cursor-pointer"
                    >
                      <option value="">— Ninguno (Registro manual sin trámite previo) —</option>
                      {tramitesDisponibles.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.numeroExpediente ? `[${t.numeroExpediente}] ` : ''}{t.solicitanteNombre} ({t.solicitanteDocumento || 'S/D'}){t.vehiculoPlaca ? ` · Placa: ${t.vehiculoPlaca}` : ''}{t.reciboIngresoNumero ? ` · Recibo: ${t.reciboIngresoNumero} (S/ ${Number(t.reciboIngresoMonto || 0).toFixed(2)})` : ''}
                        </option>
                      ))}
                    </select>
                    <label
                      htmlFor="tramiteId"
                      className="pointer-events-none absolute left-3 top-1 select-none text-[9.5px] font-bold text-indigo-700 dark:text-indigo-400"
                    >
                      Expediente o Trámite Documentario
                    </label>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-indigo-600 dark:text-indigo-400">
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {formData.tramiteId && (
                    <div className="rounded-xl bg-white/90 dark:bg-slate-900/90 p-2.5 border border-indigo-200/80 dark:border-indigo-900/60 text-xs flex items-center justify-between gap-3 text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="grid size-5 place-items-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <Icon name="check" className="size-3" />
                        </span>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          Expediente vinculado: <strong>{formData.expediente || 'EXP-SISGEDO'}</strong>. Los datos están sincronizados sin duplicidad.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTramiteChange('')}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 underline cursor-pointer shrink-0"
                      >
                        Desvincular
                      </button>
                    </div>
                  )}
                </div>

                {/* BLOQUE 1: Administrado */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-blue-600" />
                      Datos del Administrado
                    </h4>
                    {formData.tramiteId && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        Autocompletado desde Trámite
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-6">
                      <FloatingInput
                        id="solicitanteNombre"
                        label="Razón Social o Administrado"
                        value={formData.solicitanteNombre}
                        onChange={(e) => setFormData({ ...formData, solicitanteNombre: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="solicitanteDocumento"
                        label="RUC / DNI"
                        value={formData.solicitanteDocumento}
                        onChange={(e) => setFormData({ ...formData, solicitanteDocumento: e.target.value })}
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="numeroSeguridad"
                        label="Nº Seguridad SGTTV"
                        value={formData.numeroSeguridad}
                        onChange={(e) => setFormData({ ...formData, numeroSeguridad: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <FloatingInput
                      id="representanteLegal"
                      label="Representante Legal / Gerente General"
                      value={formData.representanteLegal}
                      onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value.toUpperCase() })}
                      optional
                    />
                  </div>
                </div>

                {/* BLOQUE 2: Vehículo y Operativa */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-600" />
                    Vehículo y Parámetros
                  </h4>

                  {formData.tipoPermiso === 'CARGA_DESCARGA' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <FloatingInput
                          id="vehiculoPlaca"
                          label="Placa del Vehículo"
                          value={formData.vehiculoPlaca}
                          onChange={(e) => setFormData({ ...formData, vehiculoPlaca: e.target.value.toUpperCase() })}
                          required
                          inputClassName="border-sky-400 focus:border-sky-600 dark:border-sky-700 font-mono font-black"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <FloatingInput
                          id="tonelaje"
                          label="Capacidad / Tonelaje"
                          value={formData.tonelaje}
                          onChange={(e) => setFormData({ ...formData, tonelaje: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <FloatingInput
                          id="horarioVial"
                          label="Horario Anillo Vial"
                          value="4:00 PM - 5:00 AM"
                          readOnly
                          onChange={() => {}}
                          inputClassName="bg-slate-100 text-slate-500 font-bold dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <FloatingInput
                          id="recorridoIngreso"
                          label="Recorrido de Ingreso"
                          value={formData.recorridoIngreso}
                          onChange={(e) => setFormData({ ...formData, recorridoIngreso: e.target.value })}
                        />
                        <FloatingInput
                          id="recorridoSalida"
                          label="Recorrido de Salida"
                          value={formData.recorridoSalida}
                          onChange={(e) => setFormData({ ...formData, recorridoSalida: e.target.value })}
                        />
                      </div>
                      <div className="relative">
                        <textarea
                          id="flotaPlacas"
                          rows="2"
                          placeholder="Ej. M4-5678, M4-9012, 1234-5B..."
                          value={formData.flotaPlacas}
                          onChange={(e) => setFormData({ ...formData, flotaPlacas: e.target.value.toUpperCase() })}
                          className="peer block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
                        />
                        <label htmlFor="flotaPlacas" className="absolute -top-2 left-3 bg-white dark:bg-slate-800 px-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400">
                          Flota Vehicular (Placas separadas por comas)
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* BLOQUE 3: Expediente, Pago y Fechas */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-600" />
                      Trámite, Pago y Vigencia
                    </h4>
                    {formData.tramiteId && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        Vinculado a Pagos y Trámites
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="expediente"
                        label="Nº Expediente UTD"
                        value={formData.expediente}
                        onChange={(e) => setFormData({ ...formData, expediente: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="registroNumero"
                        label="Nº Registro"
                        value={formData.registroNumero}
                        onChange={(e) => setFormData({ ...formData, registroNumero: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="reciboIngresoNumero"
                        label="Recibo de Ingreso Nº"
                        value={formData.reciboIngresoNumero}
                        onChange={(e) => setFormData({ ...formData, reciboIngresoNumero: e.target.value })}
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="reciboIngresoMonto"
                        label="Monto Pagado (S/)"
                        type="number"
                        step="0.01"
                        value={formData.reciboIngresoMonto}
                        onChange={(e) => setFormData({ ...formData, reciboIngresoMonto: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <FloatingInput
                      id="fechaInicioVigencia"
                      label="Inicio de Vigencia"
                      type="date"
                      value={formData.fechaInicioVigencia}
                      onChange={(e) => setFormData({ ...formData, fechaInicioVigencia: e.target.value })}
                    />
                    <FloatingInput
                      id="fechaFinVigencia"
                      label="Fin de Vigencia (1 Año)"
                      type="date"
                      value={formData.fechaFinVigencia}
                      onChange={(e) => setFormData({ ...formData, fechaFinVigencia: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer - Idéntico a Personas.jsx */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 px-5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : formData.id ? 'Actualizar autorización' : 'Guardar autorización'}
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
