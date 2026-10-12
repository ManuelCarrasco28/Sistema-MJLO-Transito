import { useLocation } from 'react-router-dom'
import { useDebounce } from '../hooks/useDebounce'
import { suscribirConfigMovil } from '../utils/configMovil'
import { useState, useEffect, useRef } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { PageLoadError } from '../components/ui/PageLoadError'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'
import { showError, showToast } from '../utils/SwalUtil'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { formatNumeroTarjeta } from '../utils/formatters'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaBadge } from '../components/ui/PlacaBadge'
import { PlacaVehiculo } from '../components/vehiculos/PlacaVehiculo'
import { PagoPapeletaModal } from '../components/papeletas/PagoPapeletaModal'
import { NuevaPapeletaModal } from '../components/papeletas/NuevaPapeletaModal'
import { PapeletaDetalleModal } from '../components/papeletas/PapeletaDetalleModal'
import { ConvertirReporteModal } from '../components/papeletas/ConvertirReporteModal'
import { PapeletaOficialPrint } from '../components/papeletas/PapeletaOficialPrint'
import { InfraccionDetalleModal } from '../components/papeletas/InfraccionDetalleModal'
import { CatalogoInfraccionesModal } from '../components/papeletas/CatalogoInfraccionesModal'
import { BotonCancelar, BotonCerrarModal } from '../components/ui/ModalControls'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'
import { esRolOficina } from '../config/roles'

const FILTER_ORIGEN_OPTIONS = [
  { value: 'TODOS', label: 'Todos los orígenes' },
  { value: 'OPERATIVO', label: 'Solo Operativos' },
  { value: 'RUTINA', label: 'Solo Rutina' }
];

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'PENDIENTE_PAGO', label: 'Pendientes de Pago' },
  { value: 'PAGADA', label: 'Pagadas' },
  { value: 'ANULADA', label: 'Anuladas' }
];

const FILTER_FORMALIDAD_OPTIONS = [
  { value: 'TODOS', label: 'Formal / Informal' },
  { value: 'FORMAL', label: 'Formales' },
  { value: 'INFORMAL', label: 'Informales' }
];

const FILTER_FECHA_OPTIONS = [
  { value: 'TODAS', label: 'Todas las fechas' },
  { value: 'HOY', label: 'Hoy' },
  { value: 'SEMANA', label: 'Últimos 7 días' },
  { value: 'MES', label: 'Este mes' }
];

const FILTER_REPORTES_ESTADOS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'CONVERTIDO_PAPELETA', label: 'Convertidos a papeleta' },
  { value: 'RECHAZADO', label: 'Rechazados' },
];

export function Papeletas({ user }) {
  // Los inspectores emiten papeletas pero no cobran: el pago es solo del personal de oficina (también se exige en el servidor).
  const puedeCobrar = esRolOficina(String(user?.rol || '').toUpperCase())
  const cachedPapeletas = getCachedData('/papeletas')
  const cachedTipos = getCachedData('/tipos-infraccion')
  const cachedVeh = getCachedData('/vehiculos')
  const cachedOrgs = getCachedData('/asociaciones')
  const normalizePapeleta = (p) => {
    const operativoId = p.operativoId ?? p.id_operativo ?? null
    return {
      ...p,
      operativoId,
      origen: operativoId ? 'OPERATIVO' : 'RUTINA',
    }
  }

  const [papeletas, setPapeletas] = useState((cachedPapeletas || []).map(normalizePapeleta))
  // Desde las notificaciones se puede abrir directamente la pestaña de reportes (?vista=reportes)
  const vistaInicial = new URLSearchParams(window.location.search).get('vista') === 'reportes' ? 'REPORTES' : 'PAPELETAS'
  const [activeView, setActiveView] = useState(vistaInicial)
  // "Permiso móvil": activo = el inspector emite la papeleta directo (no hay reportes de evidencia); null = aún no se sabe
  const [movilAplicaPapeleta, setMovilAplicaPapeleta] = useState(null)
  const [reportes, setReportes] = useState([])
  const [reportesPendientesTotal, setReportesPendientesTotal] = useState(null)
  const [reportesTotal, setReportesTotal] = useState(0)
  const [tiposInfraccion, setTiposInfraccion] = useState(cachedTipos || [])
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [asociaciones, setAsociaciones] = useState(cachedOrgs || [])
  const [isLoading, setIsLoading] = useState(!cachedPapeletas)
  const cargaPapeletas = useRef(null)
  const reportesCargados = useRef(false)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 160)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('search')
    setSearchTerm(s || '')
    // Una notificación puede llevar a la pestaña de reportes estando ya en Papeletas
    if (params.get('vista') === 'reportes') setActiveView('REPORTES')
  }, [location.search])

  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterOrigen, setFilterOrigen] = useState('TODOS')
  const [filterFormalidad, setFilterFormalidad] = useState('TODOS')
  const [filterTipoInfraccion, setFilterTipoInfraccion] = useState('TODOS')
  const [filterFecha, setFilterFecha] = useState('TODAS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }
  const [stats, setStats] = useState({ total: 0, pendientes: 0, pagadas: 0, anuladas: 0 })
  const [reportesSearch, setReportesSearch] = useState(() => (vistaInicial === 'REPORTES' ? new URLSearchParams(window.location.search).get('search') || '' : ''))
  const [reportesFilterEstado, setReportesFilterEstado] = useState('TODOS')
  const [reportesPage, setReportesPage] = useState(1)
  const reportesBusqueda = useDebounce(reportesSearch.trim(), 300)
  const [reportesPerPage, setReportesPerPage] = useState(8)
  const [loadingReportes, setLoadingReportes] = useState(false)
  const [fotosModalReporte, setFotosModalReporte] = useState(null)

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPapeletaFotos, setSelectedPapeletaFotos] = useState([])
  const [loadingPapeletaFotos, setLoadingPapeletaFotos] = useState(false)

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isPagarModalOpen, setIsPagarModalOpen] = useState(false)
  const [selectedInfraccion, setSelectedInfraccion] = useState(null)
  // Catálogo de infracciones (alta/edición/baja): { codigo } abre directamente la edición de esa infracción
  const [catalogoInfracciones, setCatalogoInfracciones] = useState(null)
  const recargarTiposInfraccion = () => {
    apiFetch('/tipos-infraccion')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => { setTiposInfraccion(payload.data || []); setCachedData('/tipos-infraccion', payload.data || []) })
      .catch(() => {})
  }
  const puedeAdministrarInfracciones = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE'].includes(String(user?.rol || '').toUpperCase())
  const [papeletaToAction, setPapeletaToAction] = useState(null)
  const [reporteToConvert, setReporteToConvert] = useState(null)
  const [reporteToReject, setReporteToReject] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [convertForm, setConvertForm] = useState({ infraccionesIds: [''], vehiculoId: '', conductorDni: '', observacionesAutoridad: '' })
  const [isNuevaModalOpen, setIsNuevaModalOpen] = useState(false)
  const [nuevaForm, setNuevaForm] = useState({
    vehiculoPlaca: '', claseVehiculo: '', marcaVehiculo: '', colorVehiculo: '', motorVehiculo: '',
    conductorDni: '', conductorNombres: '', conductorApellidos: '', lugar: '',
    infraccionesIds: [''], observacionesAutoridad: ''
  })
  const [creandoPapeleta, setCreandoPapeleta] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [numeroRecibo, setNumeroRecibo] = useState('')
  const [fechaPago, setFechaPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [numeroOperacion, setNumeroOperacion] = useState('')
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [selectedPapeleta, setSelectedPapeleta] = useState(null)

  const tableContainerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (e) => {
    // Si hace click en botones, enlaces o controles, no iniciar arrastre
    if (e.target.closest('button, a, input, select, textarea, [role="button"]')) {
      return
    }
    const container = tableContainerRef.current
    if (!container) return
    if (e.button !== 0) return // Solo clic izquierdo

    const startX = e.pageX - container.offsetLeft
    const scrollLeft = container.scrollLeft
    setIsDragging(true)

    const onMouseMove = (moveEvent) => {
      moveEvent.preventDefault()
      const x = moveEvent.pageX - container.offsetLeft
      const walk = (x - startX) * 1.5
      container.scrollLeft = scrollLeft - walk
    }

    const onMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const totales = stats.total ?? 0
  const reportesPendientes = reportesPendientesTotal ?? reportes.filter((r) => r.estado === 'PENDIENTE').length
  const pendientes = stats.pendientes ?? 0
  const pagadas = stats.pagadas ?? 0
  const anuladas = stats.anuladas ?? 0

  const filteredPapeletas = papeletas

  const hasActiveFilters = searchTerm !== '' || filterEstado !== 'TODOS' || filterOrigen !== 'TODOS' || filterFormalidad !== 'TODOS' || filterTipoInfraccion !== 'TODOS' || filterFecha !== 'TODAS'

  const handleClearFilters = () => {
    setSearchTerm('')
    setFilterEstado('TODOS')
    setFilterOrigen('TODOS')
    setFilterFormalidad('TODOS')
    setFilterTipoInfraccion('TODOS')
    setFilterFecha('TODAS')
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado, filterOrigen, filterFormalidad, filterTipoInfraccion, filterFecha])

  useEffect(() => {
    setReportesPage(1)
  }, [reportesSearch, reportesFilterEstado])

  // Los reportes ya llegan filtrados y paginados desde el servidor
  const filteredReportes = reportes
  const paginatedReportes = reportes

  const paginatedPapeletas = papeletas

  const tipoInfraccionOptions = [
    { value: 'TODOS', label: 'Todas las infracciones' },
    ...tiposInfraccion.map((t) => ({ value: t.codigo || t.id, label: `${t.codigo} - ${t.descripcion}` }))
  ];

  const fetchTodoElFiltro = async () => {
    const filas = await fetchTodasLasFilas('/papeletas', {
      buscar: searchTerm,
      estado: filterEstado === 'TODOS' ? '' : filterEstado,
      origen: filterOrigen === 'TODOS' ? '' : filterOrigen,
      formalidad: filterFormalidad === 'TODOS' ? '' : filterFormalidad,
      tipoInfraccion: filterTipoInfraccion === 'TODOS' ? '' : filterTipoInfraccion,
      fecha: filterFecha === 'TODAS' ? '' : filterFecha,
      sortBy,
      sortDir: sortBy ? sortDir : '',
    }, { mensaje: 'Preparando la descarga de papeletas...' })
    return filas.map(normalizePapeleta)
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const data = await fetchTodoElFiltro()
          await exportToPdf({
            filename: `Papeletas_Infraccion_${new Date().toISOString().slice(0, 10)}.pdf`,
            title: 'REGISTRO DE PAPELETAS DE INFRACCIÓN AL TRÁNSITO Y TRANSPORTE',
            subtitle: 'Subgerencia de Tránsito y Transporte - Fiscalización Municipal',
            metadata: [
              { label: 'Estado', value: filterEstado },
              { label: 'Formalidad', value: filterFormalidad },
              { label: 'Total Papeletas', value: String(data.length) }
            ],
            columns: [
              { header: 'N° PAPELETA', key: 'numeroPapeleta', isText: true, width: 80, align: 'center' },
              { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 60, align: 'center' },
              { header: 'INFRACCIÓN', key: 'tipoInfraccionCodigo', isText: true, width: 70, align: 'center' },
              { header: 'MONTO (S/)', render: (_, p) => `S/ ${Number(p.montoTotal || p.monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 80 },
              { header: 'CONDUCTOR', key: 'conductorNombre', width: 120 },
              { header: 'INSPECTOR', render: (_, p) => p.inspectorNombre || p.inspector || '—', width: 120 },
              { header: 'FECHA', key: 'fechaHora', render: (_, p) => (p.fechaHora ? new Date(String(p.fechaHora).replace(' ', 'T')).toLocaleDateString('es-PE') : '—'), width: 80, align: 'center' },
              { header: 'ESTADO', key: 'estado', width: 80, align: 'center' }
            ],
            data
          })
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const data = await fetchTodoElFiltro()
          await exportToExcel({
            filename: `Papeletas_Infraccion_${new Date().toISOString().slice(0, 10)}.xls`,
            sheetName: 'Papeletas',
            title: 'REGISTRO DE PAPELETAS DE INFRACCIÓN AL TRÁNSITO Y TRANSPORTE',
            subtitle: 'Subgerencia de Tránsito y Transporte - Fiscalización Municipal',
            metadata: [
              { label: 'Estado', value: filterEstado },
              { label: 'Formalidad', value: filterFormalidad },
              { label: 'Total Papeletas', value: String(data.length) }
            ],
            columns: [
              { header: 'N° PAPELETA', key: 'numeroPapeleta', isText: true, width: 140, align: 'center' },
              { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
              { header: 'MARCA', key: 'vehiculoMarca', width: 110 },
              { header: 'MODELO', key: 'vehiculoModelo', width: 110 },
              { header: 'COLOR', key: 'vehiculoColor', width: 100 },
              { header: 'AÑO', key: 'vehiculoAnio', width: 70, align: 'center' },
              { header: 'FORMALIDAD VEHÍCULO', key: 'vehiculoEstadoFormalizacion', width: 130, align: 'center' },
              { header: 'ASOCIACIÓN', render: (_, p) => p.vehiculoAsociacion || 'PARTICULAR / SIN ASOC.', width: 200 },
              { header: 'CÓDIGO INFRACCIÓN', key: 'tipoInfraccionCodigo', isText: true, width: 140, align: 'center' },
              { header: 'DESCRIPCIÓN INFRACCIÓN', key: 'tipoInfraccionDescripcion', width: 260 },
              { header: 'GRAVEDAD', key: 'tipoInfraccionGravedad', width: 110, align: 'center' },
              { header: 'MONTO (S/)', render: (_, p) => `S/ ${Number(p.montoTotal || p.monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 120 },
              { header: 'TIPO DE INFRACTOR', key: 'tipoInfractor', width: 120, align: 'center' },
              { header: 'CONDUCTOR / INFRACTOR', render: (_, p) => p.conductorNombre || p.infractor || '—', width: 180 },
              { header: 'DNI CONDUCTOR', key: 'conductorDni', isText: true, width: 120, align: 'center' },
              { header: 'PROPIETARIO', key: 'propietarioNombre', width: 180 },
              { header: 'DNI PROPIETARIO', key: 'propietarioDni', isText: true, width: 120, align: 'center' },
              { header: 'INSPECTOR', render: (_, p) => p.inspectorNombre || p.inspector || '—', width: 170 },
              { header: 'DOC. INSPECTOR', key: 'inspectorDocumento', isText: true, width: 100, align: 'center' },
              { header: 'FECHA Y HORA', render: (_, p) => (p.fechaHora ? new Date(String(p.fechaHora).replace(' ', 'T')).toLocaleString('es-PE') : '—'), key: 'fechaHora', width: 150, align: 'center' },
              { header: 'LUGAR', key: 'lugar', width: 200 },
              { header: 'ORIGEN', key: 'origen', width: 100, align: 'center' },
              { header: 'OPERATIVO', key: 'operativoNombre', width: 180 },
              { header: 'OBSERVACIONES AUTORIDAD', key: 'observacionesAutoridad', width: 240 },
              { header: 'OBSERVACIONES CONDUCTOR', key: 'observacionesConductor', width: 240 },
              { header: 'FIRMA DEL CONDUCTOR', key: 'firmaConductorEstado', width: 120, align: 'center' },
              { header: 'VEHÍCULO RETENIDO', render: (_, p) => (p.vehiculoRetenido ? 'SÍ' : 'NO'), width: 110, align: 'center' },
              { header: 'ESTADO DE RETENCIÓN', render: (_, p) => p.retencionEstado || '—', width: 130, align: 'center' },
              { header: 'ESTADO', key: 'estado', width: 120, align: 'center' }
            ],
            data
          })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const renderOrigen = (p) => {
    const isOperativo = p.origen === 'OPERATIVO' || p.operativoId
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase leading-none ${isOperativo
          ? 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/70 dark:text-fuchsia-300'
          : 'bg-slate-100 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300'
        }`}>
        <span className="size-1 rounded-full bg-current" />
        {isOperativo ? 'OPERATIVO' : 'RUTINA'}
      </span>
    )
  }

  const [totalFiltrado, setTotalFiltrado] = useState(0)

  const loadStats = () => {
    apiFetch('/papeletas/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => setStats(payload.data ?? {}))
      .catch(() => {})
  }

  const loadCatalogs = () => {
    Promise.all([
      apiFetch('/tipos-infraccion').then((res) => (res.ok ? res.json() : { data: [] })),
      apiFetch('/vehiculos?page=1&porPagina=50&ligero=1').then((res) => (res.ok ? res.json() : { data: [] })),
      apiFetch('/asociaciones?porPagina=50').then((res) => (res.ok ? res.json() : { data: [] })),
    ])
      .then(([tiposRes, vehiculosRes, orgsRes]) => {
        setTiposInfraccion(tiposRes.data || [])
        setVehiculos(vehiculosRes.data || [])
        setAsociaciones(orgsRes.data || [])
      })
      .catch(() => {})
  }

  const solicitudReportes = useRef(0)
  const loadReportes = () => {
    const solicitud = ++solicitudReportes.current
    setLoadingReportes(true)
    const params = new URLSearchParams({ page: String(reportesPage), porPagina: String(reportesPerPage) })
    if (reportesFilterEstado !== 'TODOS') params.set('estado', reportesFilterEstado)
    if (reportesBusqueda) params.set('buscar', reportesBusqueda)
    apiFetch(`/reportes-intervencion?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((reportesRes) => {
        // Si mientras tanto se pidió otra página o filtro, esta respuesta ya es vieja y no se muestra
        if (solicitud !== solicitudReportes.current) return
        setReportes(reportesRes.data || [])
        setReportesTotal(reportesRes.meta?.total ?? (reportesRes.data || []).length)
        setReportesPendientesTotal(reportesRes.meta?.pendientes ?? null)
        reportesCargados.current = true
      })
      .catch(() => {
        if (solicitud === solicitudReportes.current) showError('Error', 'No se pudieron cargar los reportes de intervención. Intenta nuevamente.')
      })
      .finally(() => { if (solicitud === solicitudReportes.current) setLoadingReportes(false) })
  }

  // Busca un vehículo por placa en el servidor y lo suma a la lista (ya no se descarga todo el padrón de vehículos)
  const cargarVehiculoPorPlaca = async (placa) => {
    const p = String(placa || '').trim()
    if (!p || p === 'SIN PLACA') return []
    try {
      const res = await apiFetch(`/vehiculos?page=1&porPagina=10&ligero=1&buscar=${encodeURIComponent(p)}`)
      const lista = res.ok ? ((await res.json()).data || []) : []
      setVehiculos((prev) => [...prev.filter((v) => !lista.some((n) => n.id === v.id)), ...lista])
      return lista
    } catch {
      return []
    }
  }

  const loadVehiculos = () => {
    const placa = reporteToConvert?.placa || reporteToConvert?.placa_visual
    if (placa) cargarVehiculoPorPlaca(placa)
  }

  const handleVerFotosReporte = async (reporte) => {
    setFotosModalReporte({ id: reporte.id, placa: reporte.placa_visual, lugar: reporte.lugar, fotos: [], loading: true })
    try {
      const res = await apiFetch(`/reportes-intervencion/${reporte.id}/fotos`)
      const data = await res.json()
      setFotosModalReporte({
        id: reporte.id,
        placa: reporte.placa_visual,
        lugar: reporte.lugar,
        fotos: data.data || [],
        loading: false
      })
    } catch {
      setFotosModalReporte(prev => prev ? { ...prev, loading: false } : null)
    }
  }

  const loadData = () => {
    cargaPapeletas.current?.abort()
    const controller = new AbortController()
    cargaPapeletas.current = controller
    setIsLoading(true)
    setLoadError('')
    const params = new URLSearchParams({
      page: String(currentPage),
      porPagina: String(itemsPerPage),
    })
    if (debouncedSearch) params.set('buscar', debouncedSearch)
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    if (filterOrigen !== 'TODOS') params.set('origen', filterOrigen)
    if (filterFormalidad !== 'TODOS') params.set('formalidad', filterFormalidad)
    if (filterTipoInfraccion !== 'TODOS') params.set('tipoInfraccion', filterTipoInfraccion)
    if (filterFecha !== 'TODAS') params.set('fecha', filterFecha)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

    apiFetch(`/papeletas?${params.toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((papeletasRes) => {
        if (controller.signal.aborted) return
        const pData = (papeletasRes.data || []).map(normalizePapeleta)
        setPapeletas(pData)
        setTotalFiltrado(papeletasRes.meta?.total ?? pData.length)
        setIsLoading(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError('No se pudo cargar el módulo de papeletas.')
          setIsLoading(false)
        }
      })
  }

  useEffect(() => {
    loadData()
    return () => cargaPapeletas.current?.abort()
  }, [currentPage, itemsPerPage, debouncedSearch, filterEstado, filterOrigen, filterFormalidad, filterTipoInfraccion, filterFecha, sortBy, sortDir])

  // El "Permiso móvil" se revisa al entrar, cada 10 s, al volver a esta ventana y cuando se cambia en otra pestaña:
  // así la pestaña de reportes aparece o desaparece sola, sin recargar.
  useEffect(() => {
    // La primera consulta se hace siempre; las siguientes solo si la pestaña está a la vista
    const revisar = (primera = false) => {
      if (primera !== true && document.visibilityState === 'hidden') return
      apiFetch('/municipalidad/config-mobile')
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => { if (payload) setMovilAplicaPapeleta(payload.data?.permite_aplicar_papeleta === true) })
        .catch(() => {})
    }
    revisar(true)
    const intervalo = setInterval(() => revisar(), 10000)
    const alVolver = () => revisar()
    window.addEventListener('focus', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    const dejarDeEscuchar = suscribirConfigMovil(alVolver)
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('focus', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
      dejarDeEscuchar()
    }
  }, [])

  // Los reportes solo existen si el móvil NO emite papeletas directo. Se cargan al entrar para mostrar cuántos hay pendientes.
  useEffect(() => {
    if (movilAplicaPapeleta === true && activeView === 'REPORTES') setActiveView('PAPELETAS')
  }, [movilAplicaPapeleta])

  // Reportes: se piden al servidor ya filtrados y paginados (solo la página visible)
  useEffect(() => {
    if (movilAplicaPapeleta === false) loadReportes()
  }, [movilAplicaPapeleta, reportesPage, reportesPerPage, reportesFilterEstado, reportesBusqueda])

  useEffect(() => {
    loadStats()
    loadCatalogs()
  }, [])

  const handleOpenDetail = async (papeleta) => {
    setSelectedPapeleta(papeleta)
    setIsDetailModalOpen(true)
    setLoadingPapeletaFotos(true)
    setSelectedPapeletaFotos([])
    try {
      const res = await apiFetch(`/papeletas/${papeleta.id}/fotos?t=${Date.now()}`)
      const data = await res.json()
      let fotosList = []
      if (Array.isArray(data)) {
        fotosList = data
      } else if (data && Array.isArray(data.data)) {
        fotosList = data.data
      } else if (data && data.data && Array.isArray(data.data.data)) {
        fotosList = data.data.data
      } else if (data && data.fotos && Array.isArray(data.fotos)) {
        fotosList = data.fotos
      }
      setSelectedPapeletaFotos(fotosList)
    } catch (_) {
      // Fallo al obtener fotos secundarias
    } finally {
      setLoadingPapeletaFotos(false)
    }
  }

  const handleOpenPreview = (papeleta) => {
    setSelectedPapeleta(papeleta)
    setIsPreviewModalOpen(true)
  }

  const handleOpenPagar = (papeleta) => {
    if (papeleta.estado === 'ANULADA') {
      showError('Atención', 'Esta papeleta está anulada y no puede ser cancelada ni pagada.')
      return
    }
    if (papeleta.estado === 'PAGADA') {
      showError('Atención', 'Esta papeleta ya se encuentra pagada.')
      return
    }
    setPapeletaToAction(papeleta)
    setNumeroRecibo('')
    setFechaPago('')
    setMetodoPago('EFECTIVO'); setNumeroOperacion('')
    setIsPagarModalOpen(true)
  }

  const handleConfirmPagar = async () => {
    if (!papeletaToAction) return

    // Validaciones
    if (!numeroRecibo.trim() || !fechaPago) {
      showError('Atención', 'Por favor ingresa el número de recibo y la fecha de pago.')
      return
    }
    if (new Date(fechaPago) > new Date()) {
      showError('Atención', 'La fecha de pago no puede ser futura.')
      return
    }

    setIsProcessingAction(true)
    try {
      const res = await apiFetch(`/papeletas/${papeletaToAction.id}/pagar`, {
        method: 'POST',
        body: { metodoPago, numeroRecibo, fechaPago, numeroVoucher: metodoPago === 'EFECTIVO' ? '' : numeroOperacion }
      })
      if (res.ok) {
        setPapeletas(prev => prev.map(p => p.id === papeletaToAction.id ? {
          ...p,
          estado: 'PAGADA'
        } : p))
        loadStats()
        setIsPagarModalOpen(false)
        setPapeletaToAction(null)
      } else {
        const error = await res.json()
        showError('Error', sanitizarMensaje(Object.values(error.messages || {}).join(' '), 'Error al procesar el pago.'))
      }
    } catch (err) {
      showError('Error de conexión', sanitizarMensaje(err?.message, 'Error de conexión al procesar el pago.'))
    } finally {
      setIsProcessingAction(false)
    }
  }

  const openConvertReporte = async (reporte) => {
    const placaReporte = String(reporte.placa || reporte.placa_visual || '').toUpperCase()
    const matchVehiculo = vehiculos.find((v) => String(v.placa || '').toUpperCase() === placaReporte)
      || (reporte.id_vehiculo ? null : (await cargarVehiculoPorPlaca(placaReporte)).find((v) => String(v.placa || '').toUpperCase() === placaReporte))
    setReporteToConvert({ ...reporte, loadingFotos: true })
    setConvertForm({
      infraccionesIds: reporte.infraccionesIds?.length ? reporte.infraccionesIds.map(String) : [''],
      vehiculoId: String(reporte.id_vehiculo || matchVehiculo?.id || ''),
      conductorDni: reporte.conductorDni && reporte.conductorDni !== 'S/D' ? reporte.conductorDni : '',
      // Observaciones de la oficina: empiezan vacías (la del inspector ya se ve en la tarjeta del reporte)
      observacionesAutoridad: ''
    })
    try {
      const res = await apiFetch(`/reportes-intervencion/${reporte.id}/fotos`)
      const data = await res.json()
      if (res.ok) {
        setReporteToConvert(prev => prev && prev.id === reporte.id ? { ...prev, fotos: data.data || [], loadingFotos: false } : prev)
      } else {
        setReporteToConvert(prev => prev && prev.id === reporte.id ? { ...prev, loadingFotos: false } : prev)
      }
    } catch {
      setReporteToConvert(prev => prev && prev.id === reporte.id ? { ...prev, loadingFotos: false } : prev)
    }
  }

  const handleConvertReporte = async (event) => {
    event.preventDefault()
    if (!reporteToConvert) return
    const validInfracciones = convertForm.infraccionesIds.filter(id => id).map(Number)
    if (validInfracciones.length === 0) {
      showError('Atención', 'Selecciona al menos una infracción.')
      return
    }
    if (!convertForm.vehiculoId) {
      showError('Atención', 'Para generar papeleta primero debes identificar o registrar el vehículo.')
      return
    }
    setIsProcessingAction(true)
    try {
      const res = await apiFetch(`/reportes-intervencion/${reporteToConvert.id}/convertir`, {
        method: 'POST',
        body: {
          infraccionesIds: validInfracciones,
          vehiculoId: Number(convertForm.vehiculoId),
          conductorDni: convertForm.conductorDni,
          observacionesAutoridad: convertForm.observacionesAutoridad
        }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo convertir el reporte.')
      setReporteToConvert(null)
      loadData()
      loadStats()
      loadReportes()
      showToast(`Reporte convertido a papeleta ${data.data?.numeroPapeleta || ''}`.trim(), 'success')
    } catch (error) {
      showError('Error', sanitizarMensaje(error.message, 'Error al convertir reporte.'))
      // Si el reporte ya fue atendido (convertido o rechazado desde otra pantalla o un envío anterior), la ventana
      // ya no sirve: se cierra y se refrescan las listas para que se vea su estado real.
      if (/ya se convirtió|ya no está pendiente/i.test(String(error.message))) {
        setReporteToConvert(null)
        loadData()
        loadStats()
        loadReportes()
      }
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleOpenNuevaPapeleta = () => {
    setNuevaForm({
      vehiculoPlaca: '', claseVehiculo: '', marcaVehiculo: '', colorVehiculo: '', motorVehiculo: '',
      conductorDni: '', conductorNombres: '', conductorApellidos: '', lugar: '',
      infraccionesIds: [''], observacionesAutoridad: ''
    })
    setIsNuevaModalOpen(true)
  }

  const handleCrearPapeleta = async (event) => {
    event.preventDefault()
    const validInfracciones = nuevaForm.infraccionesIds.filter(id => id).map(Number)
    if (!nuevaForm.vehiculoPlaca.trim()) {
      showError('Atención', 'Ingresa la placa del vehículo.')
      return
    }
    if (!nuevaForm.lugar.trim()) {
      showError('Atención', 'Ingresa el lugar de la infracción.')
      return
    }
    if (validInfracciones.length === 0) {
      showError('Atención', 'Selecciona al menos una infracción.')
      return
    }
    if (!user?.id_persona) {
      showError('Sesión inválida', 'No se pudo identificar al inspector de la sesión actual. Vuelve a iniciar sesión.')
      return
    }
    setCreandoPapeleta(true)
    try {
      const res = await apiFetch('/papeletas', {
        method: 'POST',
        body: {
          vehiculoPlaca: nuevaForm.vehiculoPlaca.trim().toUpperCase(),
          claseVehiculo: nuevaForm.claseVehiculo,
          marcaVehiculo: nuevaForm.marcaVehiculo,
          colorVehiculo: nuevaForm.colorVehiculo,
          motorVehiculo: nuevaForm.motorVehiculo,
          conductorDni: nuevaForm.conductorDni,
          conductorNombres: nuevaForm.conductorNombres,
          conductorApellidos: nuevaForm.conductorApellidos,
          infractor: `${nuevaForm.conductorNombres} ${nuevaForm.conductorApellidos}`.trim(),
          lugar: nuevaForm.lugar.trim(),
          infraccionesIds: validInfracciones,
          observacionesAutoridad: nuevaForm.observacionesAutoridad,
          inspectorId: user.id_persona
        }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo registrar la papeleta.')
      setIsNuevaModalOpen(false)
      loadData()
      loadStats()
      showToast(`Papeleta ${data.data?.numeroPapeleta || ''} registrada correctamente`.trim())
    } catch (error) {
      showError('Error', sanitizarMensaje(error.message, 'No se pudo registrar la papeleta.'))
    } finally {
      setCreandoPapeleta(false)
    }
  }

  const handleRejectReporte = async (event) => {
    event.preventDefault()
    if (!reporteToReject) return
    if (!motivoRechazo.trim()) {
      showError('Atención', 'Ingresa el motivo de rechazo.')
      return
    }
    setIsProcessingAction(true)
    try {
      const res = await apiFetch(`/reportes-intervencion/${reporteToReject.id}/rechazar`, {
        method: 'POST',
        body: { motivo_rechazo: motivoRechazo }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo rechazar el reporte.')
      setReporteToReject(null)
      setMotivoRechazo('')
      loadReportes()
      loadData()
      loadStats()
      showToast('Reporte de intervención rechazado', 'eliminar')
    } catch (error) {
      showError('Error', sanitizarMensaje(error.message, 'Error al rechazar reporte.'))
    } finally {
      setIsProcessingAction(false)
    }
  }

  return (
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="ticket" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Control de Papeletas e Infracciones
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="kpi-grid print:hidden">
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-slate-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Impuestas</span>
            <span className="grid size-6 place-items-center rounded-md bg-slate-50 text-slate-600 dark:bg-slate-950/60">
              <Icon name="ticket" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(totales)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendientes</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 font-bold text-xs">
              ⏳
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(pendientes)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pagadas</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(pagadas)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-slate-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Anuladas</span>
            <span className="grid size-6 place-items-center rounded-md bg-slate-50 text-slate-600 dark:bg-slate-950/60 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(anuladas)}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-[var(--border)] print:hidden">
        <button
          type="button"
          onClick={() => setActiveView('PAPELETAS')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
            activeView === 'PAPELETAS'
              ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="ticket" className="size-4" />
          <span>Papeletas registradas</span>
        </button>
        {movilAplicaPapeleta === false && (
        <button
          type="button"
          onClick={() => setActiveView('REPORTES')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
            activeView === 'REPORTES'
              ? 'border-amber-500 text-amber-500 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="document" className="size-4" />
          <span>Reportes Evidencias</span>
          {reportesCargados.current && reportesPendientes > 0 ? (
            // Alerta: hay reportes pendientes de revisar
            <span className="relative ml-1 inline-flex" title={`${reportesPendientes} reportes pendientes de revisar`}>
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/60" />
              <span className="relative min-w-6 rounded-full bg-amber-400 px-2 py-0.5 text-center text-[11px] font-black text-amber-950 shadow-sm shadow-amber-500/40">
                {reportesPendientes}
              </span>
            </span>
          ) : (
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {reportesCargados.current ? reportesPendientes : '—'}
            </span>
          )}
        </button>
        )}
      </div>

      {activeView === 'REPORTES' && movilAplicaPapeleta === false && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] flex flex-col print:hidden">
          {/* Top toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 dark:border-[var(--border)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Icon
                  name={loadingReportes ? "refresh" : "search"}
                  className={`absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors ${loadingReportes ? 'animate-spin text-amber-500' : 'text-slate-400'}`}
                />
                <input
                  type="text"
                  placeholder="Buscar por placa, lugar, inspector o infracción"
                  value={reportesSearch}
                  onChange={(e) => setReportesSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-xs text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-amber-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-amber-400"
                />
                {reportesSearch && (
                  <button
                    type="button"
                    onClick={() => setReportesSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                {(reportesFilterEstado !== 'TODOS' || reportesSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportesSearch('')
                      setReportesFilterEstado('TODOS')
                    }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    Limpiar Filtros
                  </button>
                )}

                <RoundedSelect
                  value={reportesFilterEstado}
                  onChange={setReportesFilterEstado}
                  options={FILTER_REPORTES_ESTADOS}
                />

                <button
                  type="button"
                  onClick={loadReportes}
                  disabled={loadingReportes}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
                  title="Actualizar listado de reportes"
                >
                  <Icon name="refresh" className={`size-3.5 text-slate-600 dark:text-slate-300 ${loadingReportes ? 'animate-spin' : ''}`} />
                  <span>{loadingReportes ? 'Actualizando...' : 'Actualizar'}</span>
                </button>
              </div>
            </div>
          </div>

          {(reportesFilterEstado !== 'TODOS' || reportesSearch) && (
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-2 dark:border-[var(--border)] dark:bg-slate-900/30">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Filtros activos: {reportesTotal.toLocaleString('es-PE')} {reportesTotal === 1 ? 'reporte encontrado' : 'reportes encontrados'}
              </span>
              <span className="text-[11px] text-slate-400">
                Página {reportesPage} de {Math.max(1, Math.ceil(reportesTotal / reportesPerPage))}
              </span>
            </div>
          )}

          {/* Table */}
          <div
            className="overflow-x-auto overscroll-x-contain"
            role="region"
            aria-label="Listado de reportes de intervención"
          >
            <table className="w-full min-w-[1150px] table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[110px]" />
                <col className="w-[140px]" />
                <col className="w-[190px]" />
                <col className="w-[230px]" />
                <col className="w-[170px]" />
                <col className="w-[95px]" />
                <col className="w-[140px]" />
              </colgroup>
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-400">
                <tr>
                  <th className="px-3.5 py-3.5 text-center">N° / Estado</th>
                  <th className="px-3.5 py-3.5 text-center">Vehículo / Placa</th>
                  <th className="px-3.5 py-3.5">Infracción / Lugar</th>
                  <th className="px-3.5 py-3.5">Observaciones de Campo</th>
                  <th className="px-3.5 py-3.5">Inspector & Fecha</th>
                  <th className="px-3.5 py-3.5 text-center">Evidencias</th>
                  <th className="px-3.5 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${loadingReportes && reportes.length > 0 ? 'opacity-50' : ''}`}>
                {loadingReportes && reportes.length === 0 ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-3.5 py-4"><div className="h-5 w-16 mx-auto rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                      <td className="px-3.5 py-4"><div className="h-6 w-20 mx-auto rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                      <td className="px-3.5 py-4"><div className="h-4 w-32 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                      <td className="px-3.5 py-4"><div className="h-4 w-40 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                      <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                      <td className="px-3.5 py-4 text-center"><div className="h-6 w-16 mx-auto rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                      <td className="px-3.5 py-4 text-center"><div className="h-7 w-24 mx-auto rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    </tr>
                  ))
                ) : filteredReportes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      <Icon name={reportesSearch ? 'search' : 'camera'} className="size-8 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        {reportesSearch
                          ? 'No se encontraron reportes que coincidan con la búsqueda'
                          : 'Aún no hay reportes de evidencia registrados'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedReportes.map((reporte) => (
                    <tr key={reporte.id} className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-[var(--bg-subtle)]">
                      {/* N° / Estado */}
                      <td className="px-3.5 py-3.5 text-center">
                        <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-200">
                          #{reporte.id}
                        </span>
                        <div className="mt-1 flex flex-col items-center gap-1">
                          <StatusBadge status={reporte.estado === 'CONVERTIDO_PAPELETA' ? 'FINALIZADO' : reporte.estado} />
                          {reporte.numero_papeleta && (
                            <span className="inline-block rounded-md bg-rose-50 border border-rose-200/70 px-1.5 py-0.5 font-mono text-[10px] font-black text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60" title="Papeleta generada">
                              {reporte.numero_papeleta}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vehículo / Placa */}
                      <td className="px-3.5 py-3.5 text-center">
                        <PlacaBadge placa={reporte.placa_visual} />
                        {(reporte.vehiculo_marca || reporte.vehiculo_modelo || reporte.vehiculo_color) ? (
                          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[130px] mx-auto" title={[reporte.vehiculo_marca, reporte.vehiculo_modelo, reporte.vehiculo_color].filter(Boolean).join(' ')}>
                            {[reporte.vehiculo_marca, reporte.vehiculo_modelo, reporte.vehiculo_color].filter(Boolean).join(' ')}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-400">Sin datos veh.</p>
                        )}
                      </td>

                      {/* Infracción / Lugar */}
                      <td className="px-3.5 py-3.5">
                        {reporte.infraccion_visual ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-mono text-xs font-black text-rose-700 border border-rose-200/70 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60">
                            {reporte.infraccion_visual}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 italic">No especificada</span>
                        )}
                        <div className="mt-1 flex items-start gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Icon name="mapPin" className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-tight" title={reporte.lugar}>{reporte.lugar || 'Lugar no especificado'}</span>
                        </div>
                        {reporte.coordenadas && (
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400 truncate" title={`GPS: ${reporte.coordenadas}`}>
                            GPS: {reporte.coordenadas}
                          </p>
                        )}
                      </td>

                      {/* Observaciones de Campo */}
                      <td className="px-3.5 py-3.5">
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug line-clamp-2 font-medium" title={reporte.observaciones}>
                          {reporte.observaciones || <span className="text-slate-400 italic">Sin observaciones</span>}
                        </p>
                        {reporte.conductorNombre && reporte.conductorNombre !== 'No identificado' && (
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate" title={`${reporte.conductorNombre} (${reporte.conductorDni || 'S/D'})`}>
                            <span className="font-bold text-slate-600 dark:text-slate-300">Cond:</span> {reporte.conductorNombre}
                            {reporte.conductorDni && ` (${reporte.conductorDni})`}
                          </p>
                        )}
                        {reporte.motivo_rechazo && (
                          <div className="mt-1 rounded-md bg-rose-50/80 border border-rose-200/60 p-1.5 dark:bg-rose-950/40 dark:border-rose-900/50">
                            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 leading-tight">
                              <span className="font-black uppercase tracking-wider text-[10px] text-rose-500 block">Motivo Rechazo</span>
                              {reporte.motivo_rechazo}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Inspector & Fecha */}
                      <td className="px-3.5 py-3.5">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={reporte.inspector_nombre}>
                          {reporte.inspector_nombre || 'Inspector S/D'}
                        </p>
                        {reporte.operativoNombre && (
                          <span className="inline-block mt-0.5 rounded bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900/50 truncate max-w-full" title={reporte.operativoNombre}>
                            {reporte.operativoNombre}
                          </span>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {reporte.fecha_hora ? new Date(reporte.fecha_hora).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </p>
                      </td>

                      {/* Evidencias */}
                      <td className="px-3.5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleVerFotosReporte(reporte)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:border-amber-300 hover:bg-amber-50/60 hover:text-amber-800 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 transition-all cursor-pointer active:scale-95"
                          title="Ver evidencias fotográficas"
                        >
                          <Icon name="camera" className="size-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Fotos</span>
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="px-3.5 py-3.5 text-center">
                        {reporte.estado === 'PENDIENTE' ? (
                          <div className="flex flex-col gap-1.5 items-center justify-center">
                            <button
                              type="button"
                              onClick={() => openConvertReporte(reporte)}
                              className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition active:scale-95 cursor-pointer shadow-xs"
                              title="Generar papeleta a partir de este reporte"
                            >
                              <Icon name="ticket" className="size-3.5 shrink-0" />
                              <span>Generar papeleta</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReporteToReject(reporte); setMotivoRechazo('') }}
                              className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition active:scale-95 cursor-pointer dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-900/60"
                              title="Rechazar reporte"
                            >
                              <Icon name="close" className="size-3 shrink-0" />
                              <span>Rechazar</span>
                            </button>
                          </div>
                        ) : reporte.estado === 'CONVERTIDO_PAPELETA' || reporte.estado === 'FINALIZADO' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            <Icon name="check" className="size-3 text-emerald-600" /> Convertido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                            <Icon name="close" className="size-3 text-rose-600" /> Rechazado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredReportes.length > 0 && (
            <div className="border-t border-slate-100 dark:border-[var(--border)]">
              <Pagination
                currentPage={reportesPage}
                totalItems={reportesTotal}
                itemsPerPage={reportesPerPage}
                onPageChange={setReportesPage}
                onItemsPerPageChange={(size) => {
                  setReportesPerPage(size)
                  setReportesPage(1)
                }}
                disabled={loadingReportes}
              />
            </div>
          )}
        </div>
      )}

      {activeView === 'PAPELETAS' && <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] flex flex-col print:hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 dark:border-[var(--border)]">
          {/* Top row: Search and Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:flex-1">
              <Icon
                name={isLoading ? "refresh" : "search"}
                className={`absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors ${isLoading ? 'animate-spin text-rose-500' : 'text-slate-400'}`}
              />
              <input
                type="text"
                placeholder="Buscar por PAP, placa, infractor o DNI"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-[38px] w-full rounded-xl border border-slate-200 bg-slate-50/70 py-0 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-rose-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-rose-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setCurrentPage(1)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer transition-colors"
                >
                  Limpiar Filtros
                </button>
              )}
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all cursor-pointer whitespace-nowrap"
                title="Descargar padrón de papeletas en Excel"
               disabled={isExportingExcel}>
                <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 ${isExportingExcel ? 'animate-spin' : ''}`} />
                <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
              </button>
              
              <button 
                type="button"
                onClick={handleExportPdf} 
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-all cursor-pointer whitespace-nowrap"
                title="Exportar a PDF"
               disabled={isExportingPdf}>
                <Icon name={isExportingPdf ? "refresh" : "filePdf"} className={`size-3.5 text-rose-600 ${isExportingPdf ? 'animate-spin' : ''}`} />
                <span>{isExportingPdf ? 'Generando...' : 'PDF'}</span>
              </button>

              {puedeAdministrarInfracciones && (
                <button
                  type="button"
                  onClick={() => setCatalogoInfracciones({ codigo: null })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 cursor-pointer whitespace-nowrap dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-200"
                  title="Administrar el catálogo de infracciones y sus multas"
                >
                  <Icon name="scale" className="size-3.5 text-rose-600" />
                  <span>Infracciones</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenNuevaPapeleta}
                className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
                style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
              >
                <span className="text-base leading-none font-black">+</span><span>Nuevo</span>
              </button>
            </div>
          </div>

          {/* Bottom row: Filters */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <RoundedSelect
              className="w-full"
              buttonClassName="w-full"
              value={filterOrigen}
              onChange={setFilterOrigen}
              options={FILTER_ORIGEN_OPTIONS}
            />

            <RoundedSelect
              className="w-full"
              buttonClassName="w-full"
              value={filterEstado}
              onChange={setFilterEstado}
              options={FILTER_ESTADO_OPTIONS}
            />

            <RoundedSelect
              className="w-full"
              buttonClassName="w-full"
              value={filterFormalidad}
              onChange={setFilterFormalidad}
              options={FILTER_FORMALIDAD_OPTIONS}
            />

            {tiposInfraccion.length > 0 && (
              <RoundedSelect
              className="w-full"
              buttonClassName="w-full"
                value={filterTipoInfraccion}
                onChange={setFilterTipoInfraccion}
                options={tipoInfraccionOptions}
              />
            )}

            <RoundedSelect
              className="w-full"
              buttonClassName="w-full"
              value={filterFecha}
              onChange={setFilterFecha}
              options={FILTER_FECHA_OPTIONS}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-end border-b border-slate-100 bg-slate-50/50 px-5 py-2 dark:border-[var(--border)] dark:bg-slate-900/30">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              Filtros activos
            </span>
          </div>
        )}

        <div
          ref={tableContainerRef}
          onMouseDown={handleMouseDown}
          className={`overflow-x-auto overscroll-x-contain transition-colors ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
            }`}
          role="region"
          aria-label="Listado de papeletas"
          tabIndex={0}
        >
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[110px]" />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[110px]" />
              <col className="w-[100px]" />
              <col className="w-[140px]" />
              <col className="w-[110px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
            </colgroup>
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 text-center"><SortableHeader column="numeroPapeleta" label="N° Papeleta" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-3.5 py-3.5">Propietario</th>
                <th className="px-3.5 py-3.5">Infractor</th>
                <th className="px-3.5 py-3.5 text-center"><SortableHeader column="vehiculoPlaca" label="Vehículo" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-3.5 py-3.5 text-center">Condición</th>
                <th className="px-3.5 py-3.5 text-center">Infracción</th>
                <th className="px-3.5 py-3.5 text-center"><SortableHeader column="fechaHora" label="Fecha y hora" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-3.5 py-3.5 text-center"><SortableHeader column="montoTotal" label="Monto" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-3.5 py-3.5 text-center"><SortableHeader column="estado" label="Estado de pago" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-3.5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isLoading && papeletas.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && papeletas.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4"><div className="h-5 w-24 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4 text-center"><div className="h-5 w-16 mx-auto rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4 text-right"><div className="h-4 w-16 ml-auto rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4 text-center"><div className="h-5 w-16 mx-auto rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-4 text-right"><div className="h-7 w-28 ml-auto rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                  </tr>
                ))
              ) : filteredPapeletas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-slate-400">
                    <Icon name="ticket" className="size-8 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron papeletas</p>
                  </td>
                </tr>
              ) : (
                paginatedPapeletas.map((p) => {
                  const tipoInf = tiposInfraccion.find((t) => t.id === p.detalles?.[0]?.tipoInfraccionId)
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-rose-50/30 dark:hover:bg-[var(--bg-subtle)]">
                      <td className="px-3.5 py-3.5 text-center ">
                        <span className="whitespace-nowrap font-mono text-xs font-extrabold text-rose-700 dark:text-rose-400">{p.numeroPapeleta}</span>
                        <div className="mt-0.5">{renderOrigen(p)}</div>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{p.propietarioNombre || 'No Registrado'}</p>
                        {p.propietarioDni && p.propietarioDni.toUpperCase() !== 'S/D' ? (
                          <p className="font-mono text-xs text-slate-400">DNI: {p.propietarioDni}</p>
                        ) : null}
                      </td>
                      <td className="px-3.5 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{p.conductorNombre || p.infractor || 'No Identificado'}</p>
                        <p className="font-mono text-xs text-slate-400">DNI: {p.conductorDni || 'S/D'}</p>
                      </td>
                      <td className="px-3.5 py-3.5 ">
                        {p.vehiculoPlaca && p.vehiculoPlaca !== 'SIN PLACA' ? (
                          <PlacaVehiculo placa={p.vehiculoPlaca} vehiculoId={p.vehiculoId} />
                        ) : (
                          <div>
                            <PlacaBadge placa={null} />
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                              {p.vehiculoCaracteristicas || 'Características Obligatorias'}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5 text-center">
                        {p.tipoInfractor === 'FORMAL' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                            FORMAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <span className="size-1.5 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse" />
                            INFORMAL
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {p.detalles?.length > 0 ? (
                            p.detalles.map((det, dIdx) => (
                              <button
                                key={dIdx}
                                type="button"
                                onClick={() => {
                                  setSelectedInfraccion({
                                    codigo: det.codigo || 'Infracción',
                                    descripcion: det.descripcion || 'Infracción según Reglamento Nacional de Tránsito y Transporte.',
                                    gravedad: det.gravedad || 'LEVE',
                                    monto: det.monto || 0,
                                    porcentajeUit: null,
                                    numeroPapeleta: p.numeroPapeleta,
                                  })
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-mono text-xs font-black text-rose-700 border border-rose-200/70 transition-all hover:scale-105 hover:bg-rose-100 hover:border-rose-300 hover:shadow-xs active:scale-95 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60 dark:hover:bg-rose-900/60 cursor-pointer"
                                title={`Clic para ver detalle de ${det.codigo}`}
                              >
                                <span>{det.codigo}</span>
                              </button>
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const codigo = p.tipoInfraccionCodigo || tipoInf?.codigo || 'Infracción'
                                const descripcion = p.tipoInfraccionDescripcion || tipoInf?.descripcion || 'Infracción según Reglamento Nacional de Tránsito y Transporte.'
                                const gravedad = tipoInf?.gravedad || p.tipoInfraccionGravedad || (codigo.startsWith('M') ? 'MUY GRAVE' : codigo.startsWith('G') ? 'GRAVE' : 'LEVE')
                                const porcentajeUit = tipoInf?.porcentajeUit ?? null
                                setSelectedInfraccion({
                                  codigo,
                                  descripcion,
                                  gravedad,
                                  monto: p.montoTotal || tipoInf?.montoBase || 0,
                                  porcentajeUit,
                                  numeroPapeleta: p.numeroPapeleta,
                                })
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-mono text-xs font-black text-rose-700 border border-rose-200/70 transition-all hover:scale-105 hover:bg-rose-100 hover:border-rose-300 hover:shadow-xs active:scale-95 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60 dark:hover:bg-rose-900/60 cursor-pointer"
                              title="Clic para ver detalle de la infracción"
                            >
                              <span>{p.tipoInfraccionCodigo || tipoInf?.codigo || 'G01'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 text-center text-slate-600 dark:text-slate-400">
                        <p className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">{new Date(p.fechaHora).toLocaleDateString()}</p>
                        <p className="text-[11px] text-slate-400">{new Date(p.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-3.5 py-3.5 text-center ">
                        <span className="font-mono font-black text-slate-800 dark:text-white text-xs">S/ {p.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <StatusBadge status={p.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : p.estado} />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {puedeCobrar && p.estado !== 'ANULADA' && <>
                          </>}
                          {!puedeCobrar ? null : p.estado === 'ANULADA' ? (
                            <button
                              type="button"
                              disabled
                              className="size-8 rounded-lg border-[1.5px] grid place-items-center shadow-xs cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-500"
                              title="Papeleta anulada - No se puede pagar"
                            >
                              <Icon name="payment" className="size-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPagar(p)}
                              disabled={p.estado === 'PAGADA'}
                              className={`size-8 rounded-lg border-[1.5px] grid place-items-center shadow-xs transition-all active:scale-95 ${p.estado === 'PAGADA'
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-500'
                                  : 'cursor-pointer bg-[var(--action-pay-bg)] border-[var(--action-pay-border)] text-[var(--action-pay-text)] hover:bg-[var(--action-pay-hover)] hover:border-[var(--action-pay-hover)] hover:text-white'
                                }`}
                              title={p.estado === 'PAGADA' ? 'Papeleta ya pagada' : 'Pagar papeleta'}
                            >
                              <Icon name="payment" className="size-4" />
                            </button>
                          )}
                          <button onClick={() => handleOpenDetail(p)} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white" title="Ver Detalle">
                            <Icon name="eye" className="size-4" />
                          </button>
                          <button onClick={() => handleOpenPreview(p)} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-print-bg)] border-[var(--action-print-border)] text-[var(--action-print-text)] hover:bg-[var(--action-print-hover)] hover:border-[var(--action-print-hover)] hover:text-white" title="Imprimir Boleta">
                            <Icon name="print" className="size-4" />
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
      }

      {isDetailModalOpen && (
        <PapeletaDetalleModal
          selectedPapeleta={selectedPapeleta}
          onClose={() => setIsDetailModalOpen(false)}
          onImprimir={() => { setIsDetailModalOpen(false); handleOpenPreview(selectedPapeleta); }}
          renderOrigen={renderOrigen}
          loadingPapeletaFotos={loadingPapeletaFotos}
          selectedPapeletaFotos={selectedPapeletaFotos}
          onVerImagen={setSelectedImage}
        />
      )}

      {reporteToConvert && (
        <ConvertirReporteModal
          reporteToConvert={reporteToConvert}
          onClose={() => setReporteToConvert(null)}
          onSubmit={handleConvertReporte}
          vehiculos={vehiculos}
          convertForm={convertForm}
          setConvertForm={setConvertForm}
          tiposInfraccion={tiposInfraccion}
          isProcessingAction={isProcessingAction}
          onVerImagen={setSelectedImage}
          onReloadVehiculos={loadVehiculos}
        />
      )}

      {reporteToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleRejectReporte} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-rose-50 px-6 py-4 dark:border-[var(--border)] dark:bg-rose-950/30">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Rechazar reporte #{reporteToReject.id}</h3>
              <BotonCerrarModal onClick={() => setReporteToReject(null)} title="Cerrar" />
            </div>
            <div className="space-y-3 p-6">
              <label className="block space-y-1">
                <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">Motivo</span>
                <textarea required value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white" placeholder="Ej. Foto insuficiente, placa ilegible, no procede" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
              <BotonCancelar onClick={() => setReporteToReject(null)} />
              <button disabled={isProcessingAction} className="rounded-xl px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: 'oklch(58.6% 0.253 17.585)' }}>Rechazar</button>
            </div>
          </form>
        </div>
      )}

      {isNuevaModalOpen && (
        <NuevaPapeletaModal
          nuevaForm={nuevaForm}
          setNuevaForm={setNuevaForm}
          tiposInfraccion={tiposInfraccion}
          creandoPapeleta={creandoPapeleta}
          onSubmit={handleCrearPapeleta}
          onClose={() => setIsNuevaModalOpen(false)}
        />
      )}

      {isPagarModalOpen && (
        <PagoPapeletaModal
          papeletaToAction={papeletaToAction}
          onClose={() => setIsPagarModalOpen(false)}
          numeroRecibo={numeroRecibo}
          setNumeroRecibo={setNumeroRecibo}
          fechaPago={fechaPago}
          setFechaPago={setFechaPago}
          metodoPago={metodoPago}
          numeroOperacion={numeroOperacion}
          setNumeroOperacion={setNumeroOperacion}
          setMetodoPago={setMetodoPago}
          isProcessingAction={isProcessingAction}
          onConfirmar={handleConfirmPagar}
        />
      )}


      {isPreviewModalOpen && (
        <PapeletaOficialPrint papeleta={selectedPapeleta} onClose={() => setIsPreviewModalOpen(false)} />
      )}

      {catalogoInfracciones && (
        <CatalogoInfraccionesModal editarCodigo={catalogoInfracciones.codigo} onClose={() => setCatalogoInfracciones(null)} onChanged={recargarTiposInfraccion} />
      )}

      {selectedInfraccion && (
        <InfraccionDetalleModal
          selectedInfraccion={selectedInfraccion}
          onClose={() => setSelectedInfraccion(null)}
          onEditar={puedeAdministrarInfracciones ? (codigo) => { setSelectedInfraccion(null); setCatalogoInfracciones({ codigo }) } : null}
        />
      )}

      {fotosModalReporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200 dark:border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Icon name="camera" className="size-5 text-amber-500" />
                  Evidencias Fotográficas — Reporte #{fotosModalReporte.id}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <PlacaBadge placa={fotosModalReporte.placa} size="sm" />
                  {fotosModalReporte.lugar && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">· {fotosModalReporte.lugar}</span>
                  )}
                </div>
              </div>
              <BotonCerrarModal onClick={() => setFotosModalReporte(null)} />
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {fotosModalReporte.loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <Icon name="refresh" className="size-8 animate-spin text-amber-500" />
                  <p className="text-xs font-bold">Cargando evidencias fotográficas...</p>
                </div>
              ) : fotosModalReporte.fotos?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {fotosModalReporte.fotos.map((foto, idx) => (
                    <div
                      key={foto.id || idx}
                      onClick={() => setSelectedImage(foto.foto)}
                      className="group relative aspect-4/3 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 transition-all hover:scale-[1.02] hover:shadow-md"
                      title="Clic para ampliar"
                    >
                      <img
                        src={foto.foto}
                        alt={`Evidencia ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-950/0 transition-colors group-hover:bg-slate-950/30 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-white/90 p-2 text-slate-900 shadow-md">
                          <Icon name="maximize" className="size-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Icon name="camera" className="size-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No se adjuntaron fotos en este reporte</p>
                  <p className="text-xs text-slate-400">El inspector no subió imágenes de evidencia durante la intervención.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
              <BotonCancelar onClick={() => setFotosModalReporte(null)}>Cerrar</BotonCancelar>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="relative max-h-full max-w-full">
            <button type="button" onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
              <Icon name="x" className="size-5" />
            </button>
            <img src={selectedImage} alt="Evidencia ampliada" className="max-h-[85vh] max-w-[95vw] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  )
}
export default Papeletas
