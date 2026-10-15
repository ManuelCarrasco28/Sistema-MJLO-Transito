import { useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData, invalidateCache } from '../config/api'
import { showError, showConfirm, showToast } from '../utils/SwalUtil'
import { ResolucionPermisoPrint } from '../components/documentos/TarjetaOperatividadPrint'
import { exportToExcel } from '../utils/exportToExcel'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'
import { TramiteFormularioModal } from '../components/permisos/TramiteFormularioModal'
import { leerBorradorPermiso, limpiarBorradorPermiso } from '../utils/borradorPermiso'
import { useListaServidor } from '../hooks/useListaServidor'
import { formatNumeroTarjeta, formatRangoHoras12, formatTextoHorario12 } from '../utils/formatters'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaVehiculo } from '../components/vehiculos/PlacaVehiculo'
import { FloatingInput, FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'
import { BotonCancelar, BotonCerrarModal } from '../components/ui/ModalControls'
import { puedeEliminarRegistros } from '../config/roles'

const FILTER_TIPO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'CONTROL_VEHICULAR', label: 'Control Vehicular' },
  { value: 'CARGA_DESCARGA', label: 'Carga y Descarga' },
  { value: 'USO_VIAS', label: 'Uso de Vías' },
  { value: 'ZONAS_RESERVADAS', label: 'Zonas Reservadas' },
]

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'VIGENTE', label: 'Vigentes' },
  { value: 'VENCIDO', label: 'Vencidos' },
]

export function Permisos() {
  const cachedProcs = getCachedData('/procedimientos-admin')

  const [procedimientos, setProcedimientos] = useState(cachedProcs || [])
  const [tramitesDisponibles, setTramitesDisponibles] = useState([])
  const [activeTab, setActiveTab] = useState('permisos')
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '')

  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('search')
    setSearchTerm(s || '')
  }, [location.key, location.search])

  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [selectedPermiso, setSelectedPermiso] = useState(null)
  const [editingPermiso, setEditingPermiso] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const previewScrollRef = useRef(null)

  useEffect(() => {
    if (isDetailModalOpen && previewScrollRef.current) {
      previewScrollRef.current.scrollTop = 0
    }
  }, [isDetailModalOpen, selectedPermiso])
  const handleDeletePermiso = async (id) => {
    const result = await showConfirm(
      '¿Eliminar autorización?',
      '¿Está seguro de eliminar esta autorización municipal? Esta acción no se puede deshacer.',
      'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (!result.isConfirmed) return
    try {
      const res = await apiFetch(`/permisos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('Error al eliminar la autorización.')
      }
      invalidateCache('/permisos')
      loadDataRef.current()
      loadStats()
      showToast('Autorización eliminada correctamente')
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo eliminar la autorización.'))
    }
  }

  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  const { filas: permisos, total: totalFiltrado, isLoading, recargar: loadData } = useListaServidor({
    endpoint: '/permisos',
    page: currentPage,
    porPagina: itemsPerPage,
    descripcion: 'el listado de permisos',
    params: {
      buscar: debouncedSearch,
      estado: filterEstado === 'TODOS' ? '' : filterEstado,
      tipoPermiso: filterTipo === 'TODOS' ? '' : filterTipo,
      sortBy,
      sortDir: sortBy ? sortDir : '',
    },
  })

  useEffect(() => {
    if (!isCreateModalOpen) return undefined
    let vigente = true
    apiFetch('/permisos/tramites-disponibles')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .catch(() => ({ data: [] }))
      .then((res) => { if (vigente) setTramitesDisponibles(Array.isArray(res?.data) ? res.data : []) })
    return () => { vigente = false }
  }, [isCreateModalOpen])

  // Los listeners de ventana (message/storage) se registran una sola vez: la ref
  // les entrega siempre la versión de loadData con los filtros actuales.
  const loadDataRef = useRef(loadData)
  loadDataRef.current = loadData

  const [stats, setStats] = useState({ totalPermisos: 0, totalControl: 0, totalCarga: 0, totalVias: 0, totalZonas: 0, vigentes: 0, vencidos: 0 })

  const loadStats = () => {
    apiFetch('/permisos/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => setStats(payload.data ?? {}))
      .catch(() => { })
  }

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    apiFetch('/procedimientos-admin')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .catch(() => ({ data: [] }))
      .then((procRes) => setProcedimientos(Array.isArray(procRes?.data) ? procRes.data : []))

    const handleMessage = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'PERMISO_GUARDADO') {
        invalidateCache('/permisos')
        loadDataRef.current()
        loadStats()
        showToast('Autorización guardada correctamente', 'crear')
      }
      if (e.data?.type === 'VOLVER_A_DATOS_MODAL') {
        let draft = e.data.draft
        if (!draft) {
          draft = leerBorradorPermiso()
        }
        if (draft) {
          setEditingPermiso(draft)
        }
        setIsCreateModalOpen(true)
      }
    }
    const handleStorage = (e) => {
      if (e.key === 'mjlo_permisos_updated') {
        invalidateCache('/permisos')
        loadDataRef.current()
        loadStats()
        showToast('Autorización guardada correctamente', 'crear')
      }
      if (e.key === 'mjlo_volver_a_datos') {
        const draft = leerBorradorPermiso()
        if (draft) {
          setEditingPermiso(draft)
          setIsCreateModalOpen(true)
        }
      }
    }

    // Si viene redirigido con reopenDraft=1
    const params = new URLSearchParams(window.location.search)
    if (params.get('reopenDraft')) {
      const draft = leerBorradorPermiso()
      if (draft) {
        setEditingPermiso(draft)
        setIsCreateModalOpen(true)
      }
      window.history.replaceState({}, '', '/permisos')
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const totalPermisos = stats.totalPermisos ?? 0
  const totalControl = stats.totalControl ?? 0
  const totalCarga = stats.totalCarga ?? 0
  const totalVias = stats.totalVias ?? 0
  const totalZonas = stats.totalZonas ?? 0
  const vigentes = stats.vigentes ?? 0
  const vencidos = stats.vencidos ?? 0

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterEstado, filterTipo, activeTab])

  const fetchTodoElFiltro = async () => {
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('buscar', debouncedSearch.trim())
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    if (filterTipo !== 'TODOS') params.set('tipoPermiso', filterTipo)
    if (sortBy) {
      params.set('sortBy', sortBy)
      params.set('sortDir', sortDir)
    }
    return fetchTodasLasFilas('/permisos', Object.fromEntries(params), { mensaje: 'Preparando la descarga de permisos...' })
  }

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const data = await fetchTodoElFiltro()
      await exportToExcel({
        filename: `Autorizaciones_Permisos_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Autorizaciones',
        title: 'PADRÓN OFICIAL DE AUTORIZACIONES DE CARGA, DESCARGA Y USO DE VÍAS',
        subtitle: 'Subgerencia de Tránsito y Transporte - Resoluciones y Permisos Especiales',
        metadata: [
          { label: 'Tipo Trámite', value: filterTipo },
          { label: 'Estado', value: filterEstado },
          { label: 'Total Registros', value: String(data.length) }
        ],
        columns: [
          { header: 'N° AUTORIZACIÓN', key: 'numeroAutorizacion', isText: true, width: 150, align: 'center' },
          { header: 'TIPO PERMISO', key: 'tipoPermiso', width: 140 },
          { header: 'PLACA / FLOTA', render: (_, p) => p.vehiculoPlaca || p.flotaPlacas || '—', isText: true, width: 130, align: 'center' },
          { header: 'SOLICITANTE / EMPRESA', key: 'solicitanteNombre', width: 220 },
          { header: 'DNI / RUC', key: 'solicitanteDocumento', isText: true, width: 120, align: 'center' },
          { header: 'REPRESENTANTE LEGAL', key: 'representanteLegal', width: 180 },
          { header: 'PROCEDIMIENTO (TUPA)', key: 'procedimientoNombre', width: 220 },
          { header: 'ASUNTO', key: 'asunto', width: 240 },
          { header: 'EXPEDIENTE', key: 'expediente', isText: true, width: 130, align: 'center' },
          { header: 'FECHA SOLICITUD', key: 'fechaSolicitud', width: 120, align: 'center' },
          { header: 'N° DE REGISTRO', key: 'registroNumero', isText: true, width: 120, align: 'center' },
          { header: 'ZONA', key: 'zonaCirculacion', width: 180 },
          { header: 'UBICACIÓN', key: 'ubicacion', width: 200 },
          { header: 'RECORRIDO DE INGRESO', key: 'recorridoIngreso', width: 200 },
          { header: 'TONELAJE', key: 'tonelaje', width: 90, align: 'center' },
          { header: 'N° DE SEGURIDAD', key: 'numeroSeguridad', isText: true, width: 120, align: 'center' },
          { header: 'HORARIO', render: (_, p) => `${p.horarioInicio || ''} - ${p.horarioFin || ''}`, width: 130, align: 'center' },
          { header: 'FECHA EMISIÓN', key: 'fechaEmision', width: 120, align: 'center' },
          { header: 'INICIO VIGENCIA', key: 'fechaInicioVigencia', width: 120, align: 'center' },
          { header: 'FIN VIGENCIA', key: 'fechaFinVigencia', width: 120, align: 'center' },
          { header: 'RECIBO INGRESO', key: 'reciboIngresoNumero', isText: true, width: 130, align: 'center' },
          { header: 'MONTO (S/)', render: (_, p) => `S/ ${Number(p.reciboIngresoMonto || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 110 },
          { header: 'FECHA DE PAGO', key: 'reciboIngresoFecha', width: 120, align: 'center' },
          { header: 'OBSERVACIONES', key: 'observaciones', width: 240 },
          { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
        ],
        data
      })
    } catch (error) {
      if (error.name !== 'AbortError') showError('Descarga no completada', error.message || 'No se pudo preparar el archivo completo.')
    } finally {
      setIsExportingExcel(false)
    }
  }


  const handleOpenDetail = (p) => {
    setSelectedPermiso(p)
    setIsDetailModalOpen(true)
  }

  const handleOpenCreate = () => {
    limpiarBorradorPermiso()
    setEditingPermiso(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (p) => {
    limpiarBorradorPermiso()
    setEditingPermiso(p)
    setIsCreateModalOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      {/* Cabecera Principal - Estilo Personas.jsx */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="routePermit" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Permisos y Autorizaciones
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 6 tarjetas separadas compactas */}
      <div className="kpi-grid">
        {/* 1. Total Registros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-blue-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total</span>
            <span className="grid size-6 place-items-center rounded-md text-blue-600 dark:text-blue-400">
              <Icon name="routePermit" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalPermisos)}
            </p>
          </div>
        </div>

        {/* 2. Control Vehicular */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Control Vehicular</span>
            <span className="grid size-6 place-items-center rounded-md text-indigo-600 dark:text-indigo-400">
              <Icon name="truck" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalControl)}
            </p>
          </div>
        </div>

        {/* 3. Carga y Descarga */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Carga y Descarga</span>
            <span className="grid size-6 place-items-center rounded-md text-amber-600 dark:text-amber-400">
              <Icon name="motoTaxi" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalCarga)}
            </p>
          </div>
        </div>

        {/* 4. Uso de Vías */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Uso de Vías</span>
            <span className="grid size-6 place-items-center rounded-md text-cyan-600 dark:text-cyan-400">
              <Icon name="permit" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalVias)}
            </p>
          </div>
        </div>

        {/* 5. Zonas Reservadas */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-purple-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Zonas Reservadas</span>
            <span className="grid size-6 place-items-center rounded-md text-purple-600 dark:text-purple-400">
              <Icon name="parking" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalZonas)}
            </p>
          </div>
        </div>

        {/* 6. Vigentes */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Vigentes</span>
            <span className="grid size-6 place-items-center rounded-md text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(vigentes)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveTab('permisos')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'permisos'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
          <Icon name="permit" className="size-4" />
          <span>Padrón de Autorizaciones</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tupa')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'tupa'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
          <Icon name="document" className="size-4" />
          <span>Catálogo Normativo TUPA</span>
        </button>
      </div>

      {activeTab === 'permisos' && (
        <div className="space-y-4">
          {/* Contenedor de la Tabla - Exacto a Personas.jsx */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">

            {/* Barra de Filtros y Acciones */}
            <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por placa, solicitante o expediente"
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
                  title="Descargar padrón en Excel (.xlsx)"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                  disabled={isExportingExcel}>
                  <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} />
                  <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
                </button>


                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
                  style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                >
                  <span className="text-base leading-none font-black">+</span>
                  <span>Nueva autorización</span>
                </button>
              </div>
            </div>

            {/* Tabla de Autorizaciones */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] table-fixed text-left text-xs">
                <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-3 w-[200px]"><SortableHeader column="numeroAutorizacion" label="N° Autorización" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                    <th className="px-3 py-3 w-[140px]"><SortableHeader column="tipoPermiso" label="Tipo" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                    <th className="px-3 py-3 w-[22%]"><SortableHeader column="solicitanteNombre" label="Solicitante" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                    <th className="px-3 py-3 w-[110px]"><SortableHeader column="vehiculoPlaca" label="Placa" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                    <th className="px-3 py-3 w-[16%]">Zona</th>
                    <th className="px-3 py-3 w-[165px]">Horario</th>
                    <th className="px-3 py-3 w-[105px]">Vigencia</th>
                    <th className="px-3 py-3 text-center w-[120px]"><SortableHeader column="estado" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                    <th className="sticky right-0 z-20 px-3 py-3 text-center bg-slate-50/75 dark:bg-[var(--bg-subtle)] w-[140px]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isLoading && permisos.length > 0 ? 'opacity-50' : ''}`}>
                  {isLoading && permisos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        Cargando autorizaciones municipales...
                      </td>
                    </tr>
                  ) : permisos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center">
                        <Icon name="permit" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron autorizaciones</p>
                      </td>
                    </tr>
                  ) : (
                    permisos.map((p) => {
                      const isCarga = p.tipoPermiso === 'CARGA_DESCARGA'
                      const isVias = p.tipoPermiso === 'USO_VIAS'
                      const isZonas = p.tipoPermiso === 'ZONAS_RESERVADAS' || p.tipoPermiso === 'ZONA_RESERVADA'
                      const solicitanteText = p.solicitanteNombre || p.solicitante || '—'

                      return (
                        <tr key={p.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-[var(--bg-subtle)]">
                          {/* N° de autorización y expediente (una sola línea cada uno) */}
                          <td className="px-3 py-3 align-middle">
                            <div className="truncate text-xs font-bold text-slate-700 dark:text-slate-200 font-mono" title={p.numeroAutorizacion}>
                              {p.numeroAutorizacion}
                            </div>
                            <div className="truncate text-[10px] text-slate-400 font-mono" title={`Exp. ${p.expediente || p.expedienteNumero || 'S/N'}`}>
                              Exp. {p.expediente || p.expedienteNumero || 'S/N'}
                            </div>
                          </td>

                          {/* Tipo */}
                          <td className="px-3 py-3 align-middle">
                            <span
                              className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${isCarga
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : isVias
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : isZonas
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                }`}
                            >
                              {isCarga ? 'Carga y Descarga' : isVias ? 'Uso de Vías' : isZonas ? 'Zonas Reservadas' : 'Control Vehicular'}
                            </span>
                          </td>

                          {/* Vehículo / Flota */}
                          <td className="px-3 py-3 align-middle">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {solicitanteText}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {p.solicitanteDocumento || p.solicitanteDoc ? `DOC: ${p.solicitanteDocumento || p.solicitanteDoc}` : 'Sin documento'}
                              </p>
                            </div>
                          </td>

                          {/* Nº Autorización & Tipo Badge */}
                          <td className="px-3 py-3 align-middle">
                            {p.vehiculoPlaca && p.vehiculoPlaca !== '—' ? (
                              <PlacaVehiculo placa={p.vehiculoPlaca} vehiculoId={p.vehiculoId} />
                            ) : p.flotaPlacas ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {p.flotaPlacas.split(/[\s,]+/).filter(Boolean).map((placa, idx) => (
                                  <PlacaVehiculo key={idx} placa={placa.trim()} size="sm" />
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic text-xs">Sin placa</span>
                            )}
                          </td>

                          {/* Zona */}
                          <td className="px-3 py-3 text-xs align-middle">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.zonaCirculacion || p.zonaPermitida || '—'}
                            </div>
                          </td>

                          {/* Horario */}
                          <td className="px-3 py-3 text-xs align-middle whitespace-nowrap">
                            <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {p.horarioInicio && p.horarioFin ? formatRangoHoras12(p.horarioInicio, p.horarioFin) : (p.horarioPermitido ? formatTextoHorario12(p.horarioPermitido) : '—')}
                            </div>
                          </td>

                          {/* Vigencia */}
                          <td className="px-3 py-3 text-xs align-middle">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {p.fechaInicioVigencia || p.fechaInicio || '—'}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              Al: {p.fechaFinVigencia || p.fechaFin || '—'}
                            </div>
                          </td>

                          {/* Estado */}
                          <td className="px-3 py-3 text-center align-middle">
                            <StatusBadge status={p.estado} />
                          </td>

                          {/* Acciones - Estilo Personas.jsx */}
                          <td className="sticky right-0 z-20 px-3 py-3 text-center align-middle bg-white/95 dark:bg-[#1C2438]/95">
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

                              <button style={puedeEliminarRegistros() ? undefined : { display: 'none' }}
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
              totalItems={totalFiltrado}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size)
                setCurrentPage(1)
              }}
              disabled={isLoading}
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
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-horizon dark:shadow-none dark:border-[var(--border)] dark:bg-[#1C2438]"
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

              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">Derecho de trámite</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  S/ {Number(proc.costo || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR - EXACTO A PERSONAS.JSX */}
      {/* MODAL DE TRÁMITE / EMISIÓN Y EDICIÓN CON EDITOR DE TEXTO */}
      <TramiteFormularioModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingPermiso(null)
        }}
        initialData={editingPermiso}
        onSave={() => {
          invalidateCache('/permisos')
          loadDataRef.current()
          loadStats()
        }}
        procedimientos={procedimientos}
        tramitesDisponibles={tramitesDisponibles}
      />

      {/* MODAL DE PREVISUALIZACIÓN E IMPRESIÓN OFICIAL HOJA A4 */}
      {isDetailModalOpen && selectedPermiso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-enter overflow-y-auto">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438] my-auto">

            {/* Header del visualizador estilo /personas */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="print" className="size-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Formato Oficial A4
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                      {selectedPermiso.tipoPermiso === 'CARGA_DESCARGA'
                        ? 'Carga y Descarga'
                        : selectedPermiso.tipoPermiso === 'USO_VIAS'
                          ? 'Uso Provisional de Vías'
                          : selectedPermiso.tipoPermiso === 'ZONAS_RESERVADAS' || selectedPermiso.tipoPermiso === 'ZONA_RESERVADA'
                            ? 'Zonas Reservadas'
                            : 'Control Vehicular'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPermiso.numeroAutorizacion || selectedPermiso.numeroResolucion} • Subgerencia de Tránsito y Transporte
                  </p>
                </div>
              </div>
              <BotonCerrarModal onClick={() => setIsDetailModalOpen(false)} title="Cerrar previsualización" />
            </div>

            {/* Vista Previa del Documento Oficial */}
            <div ref={previewScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start gap-4 bg-slate-100 dark:bg-[var(--bg-subtle)]">
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-[var(--border)] bg-white dark:bg-[#1C2438]">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:from-violet-500 hover:to-indigo-500 transition cursor-pointer active:scale-95"
              >
                <Icon name="print" className="size-4" />
                <span>Imprimir Documento Oficial A4</span>
              </button>

              <BotonCancelar onClick={() => setIsDetailModalOpen(false)}>Cerrar</BotonCancelar>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
