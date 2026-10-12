import { useState, useEffect, useRef } from 'react'
import { fechaLocalActual } from '../utils/calendarioCurso'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'
import { formatNumeroTarjeta } from '../utils/formatters'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { puedeEliminarRegistros } from '../config/roles'

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'PAGADO', label: 'Pagados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
]

const FILTER_METODO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los métodos' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
]

const FILTER_TIPO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'PAPELETA', label: 'Papeletas' },
  { value: 'TRAMITE', label: 'Trámites' },
  { value: 'CURSO', label: 'Cursos' },
  { value: 'INTERNAMIENTO', label: 'Internamientos' },
]

export function Pagos() {
  const cached = getCachedData('/pagos')
  const [pagos, setPagos] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 160)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const [filterTipoPago, setFilterTipoPago] = useState('TODOS')
  const [filterMetodo, setFilterMetodo] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pagoToConfirm, setPagoToConfirm] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedPago, setSelectedPago] = useState(null)
  const [loadError, setLoadError] = useState('')

  // Estado para Arqueo de Caja Diario
  const [isArqueoModalOpen, setIsArqueoModalOpen] = useState(false)
  const [arqueoFecha, setArqueoFecha] = useState(fechaLocalActual())
  const [arqueoData, setArqueoData] = useState(null)
  const [isLoadingArqueo, setIsLoadingArqueo] = useState(false)

  const [formData, setFormData] = useState({
    numeroRecibo: '', tipoPago: 'TRAMITE', metodo: 'EFECTIVO', montoTotal: 0,
    numeroVoucher: '', referenciaPago: '', origenId: '', fechaPago: ''
  })

  // Búsqueda de deudas por persona (DNI) para el formulario "Registrar Pago".
  const [deudaDni, setDeudaDni] = useState('')
  const [deudaPersona, setDeudaPersona] = useState(null)
  const [deudaLista, setDeudaLista] = useState([])
  const [buscandoDeuda, setBuscandoDeuda] = useState(false)
  const [deudaError, setDeudaError] = useState('')
  const [origenPreseleccionado, setOrigenPreseleccionado] = useState(null)

  const handleOpenCreateModal = () => {
    setPagoToConfirm(null)
    setFormData({ numeroRecibo: '', tipoPago: 'TRAMITE', metodo: 'EFECTIVO', numeroVoucher: '', referenciaPago: '', origenId: '', fechaPago: fechaLocalActual() })
    setDeudaDni('')
    setDeudaPersona(null)
    setDeudaLista([])
    setDeudaError('')
    setOrigenPreseleccionado(null)
    setIsModalOpen(true)
  }

  const handleBuscarDeudas = async (e) => {
    e.preventDefault()
    if (!deudaDni.trim()) return
    setBuscandoDeuda(true)
    setDeudaError('')
    setDeudaPersona(null)
    setDeudaLista([])
    setFormData({ ...formData, tipoPago: '', origenId: '' })
    setOrigenPreseleccionado(null)
    try {
      const res = await apiFetch(`/pagos/deudas?dni=${encodeURIComponent(deudaDni.trim())}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || 'No se encontró a esa persona.')
      setDeudaPersona(data.data.persona)
      setDeudaLista(data.data.deudas || [])
    } catch (error) {
      setDeudaError(sanitizarMensaje(error.message, 'No se encontró a esa persona.'))
    } finally {
      setBuscandoDeuda(false)
    }
  }

  const handleSeleccionarDeuda = (deuda) => {
    setFormData({ ...formData, tipoPago: deuda.tipoPago, origenId: String(deuda.id) })
  }

  const handleConfirm = (pago) => {
    setPagoToConfirm(pago)
    setFormData({ numeroRecibo: '', tipoPago: pago.tipoPago, metodo: 'EFECTIVO', numeroVoucher: '', referenciaPago: '', fechaPago: fechaLocalActual() })
    setIsModalOpen(true)
  }

  // Para papeletas/cursos pendientes que aún no tienen un recibo generado:
  // abre el mismo formulario de "Registrar Pago" con el origen ya elegido,
  // sin necesidad de volver a buscarlo por DNI.
  const handleGenerarRecibo = (pago) => {
    setPagoToConfirm(null)
    setFormData({ numeroRecibo: '', tipoPago: pago.tipoPago, metodo: 'EFECTIVO', numeroVoucher: '', referenciaPago: '', origenId: String(pago.origenId), fechaPago: fechaLocalActual() })
    setDeudaDni('')
    setDeudaPersona(null)
    setDeudaLista([])
    setDeudaError('')
    setOrigenPreseleccionado({ nombre: pago.referenciaPago, monto: pago.montoTotal })
    setIsModalOpen(true)
  }

  useQuickCreate(handleOpenCreateModal, !isLoading)

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Anular recibo?',
      '¿Está seguro que desea anular este recibo de pago? Esta acción no se puede revertir.',
      'Sí, anular',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (result.isConfirmed) {
      try {
        const response = await apiFetch(`/pagos/${id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('No se pudo anular el pago')
        loadPagos()
        loadStats()
        showToast('Pago anulado exitosamente')
      } catch (err) {
        showError('Error', 'Error al anular el pago')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (isSaving) return

    // Validaciones
    if (!pagoToConfirm && !formData.origenId) {
      showError('Validación Fallida', 'Por favor busca y selecciona la deuda que vas a cobrar.')
      return
    }
    if (!formData.fechaPago) {
      showError('Validación Fallida', 'Por favor ingresa la fecha de pago.')
      return
    }
    if (new Date(formData.fechaPago) > new Date()) {
      showError('Validación Fallida', 'La fecha de pago no puede ser futura.')
      return
    }
    if (formData.metodo !== 'EFECTIVO' && !formData.numeroVoucher.trim()) {
      showError('Validación Fallida', 'Ingresa el N° de operación del pago.')
      return
    }

    setIsSaving(true)
    try {
      const key = { PAPELETA: 'papeletaId', TRAMITE: 'tramiteId', CURSO: 'inscripcionId' }[formData.tipoPago]
      const response = await apiFetch(pagoToConfirm ? `/pagos/${pagoToConfirm.id}/confirmar` : '/pagos', {
        method: 'POST',
        body: pagoToConfirm
          ? { ...formData, metodoPago: formData.metodo }
          : { tipoPago: formData.tipoPago, [key]: Number(formData.origenId), ...formData, metodoPago: formData.metodo }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(Object.values(result.messages || {}).join(' ') || result.message || 'No se pudo guardar el pago.')
      loadPagos()
      loadStats()
      setIsModalOpen(false)
      showToast(result.data?.operacionRepetida > 0
        ? 'Pago registrado. Atención: ese N° de operación ya figura en otro pago.'
        : 'Pago registrado exitosamente')
    } catch (err) { showError('Error', sanitizarMensaje(err.message, 'No se pudo anular el pago.')) }
    finally { setIsSaving(false) }
  }

  const fetchArqueo = async (fecha = arqueoFecha) => {
    setIsLoadingArqueo(true)
    try {
      const res = await apiFetch(`/pagos/arqueo-diario?fecha=${fecha}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Error al obtener el arqueo diario')
      setArqueoData(json.data)
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'Error al cargar arqueo de caja.'))
    } finally {
      setIsLoadingArqueo(false)
    }
  }

  const handleOpenArqueo = () => {
    setIsArqueoModalOpen(true)
    fetchArqueo(arqueoFecha)
  }

  const fetchTodoElFiltroPagos = async () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('buscar', searchTerm)
    if (filterTipoPago !== 'TODOS') params.set('tipoPago', filterTipoPago)
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    if (filterMetodo !== 'TODOS') params.set('metodo', filterMetodo)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }
    return fetchTodasLasFilas('/pagos', Object.fromEntries(params))
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const data = await fetchTodoElFiltroPagos()
      await exportToPdf({
        filename: `Pagos_${fechaLocalActual()}.pdf`,
        title: 'REGISTRO GENERAL DE PAGOS Y RECAUDACIÓN',
        subtitle: 'Municipalidad Distrital José Leonardo Ortiz - Caja de Tránsito',
        metadata: [
          { label: 'Estado', value: filterEstado },
          { label: 'Tipo', value: filterTipoPago },
          { label: 'Método', value: filterMetodo },
          { label: 'Búsqueda', value: debouncedSearch || '—' },
          // Suma de lo exportado (pagos confirmados), no la recaudación total del sistema
          { label: 'Recaudado en este listado', value: `S/ ${data.filter((p) => p.estado === 'PAGADO').reduce((s, p) => s + Number(p.montoTotal || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
        ],
        columns: [
          { header: 'N° RECIBO', key: 'numeroRecibo' },
          { header: 'FECHA PAGO', render: (_, r) => r.fecha ? new Date(r.fecha + 'T00:00:00').toLocaleDateString() : 'Pendiente' },
          { header: 'TIPO PAGO', key: 'tipoPago' },
          { header: 'PAGADO POR', render: (_, r) => r.pagadoPor || '—' },
          { header: 'MÉTODO DE PAGO', key: 'metodo' },
          { header: 'MONTO', render: (_, r) => `S/ ${(r.montoTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` },
          { header: 'ESTADO', key: 'estado' }
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
      const data = {
        endpoint: '/pagos', params: {
          buscar: debouncedSearch, tipoPago: filterTipoPago === 'TODOS' ? '' : filterTipoPago,
          estado: filterEstado === 'TODOS' ? '' : filterEstado, metodo: filterMetodo === 'TODOS' ? '' : filterMetodo, sortBy, sortDir,
        }
      }
      await exportToExcel({
        filename: `Pagos_${fechaLocalActual()}.xls`,
        sheetName: 'Pagos',
        title: 'REGISTRO GENERAL DE PAGOS Y RECAUDACIÓN',
        subtitle: 'Municipalidad Distrital José Leonardo Ortiz - Caja de Tránsito',
        metadata: [
          { label: 'Estado', value: filterEstado },
          { label: 'Tipo', value: filterTipoPago },
          { label: 'Método', value: filterMetodo },
          { label: 'Búsqueda', value: debouncedSearch || '—' }
        ],
        columns: [
          { header: 'N° RECIBO', key: 'numeroRecibo', isText: true, width: 140 },
          { header: 'FECHA PAGO', render: (_, r) => r.fecha ? new Date(r.fecha + 'T00:00:00').toLocaleDateString() : 'Pendiente', width: 110 },
          { header: 'TIPO PAGO', key: 'tipoPago', width: 130 },
          { header: 'PAGADO POR', render: (_, r) => r.pagadoPor || '—', width: 180 },
          { header: 'N° OPERACIÓN', key: 'numeroVoucher', isText: true, width: 140 },
          { header: 'REFERENCIA', key: 'referenciaPago', width: 160 },
          { header: 'MÉTODO DE PAGO', key: 'metodo', width: 120 },
          { header: 'MONTO (S/)', render: (_, r) => `S/ ${(r.montoTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 120 },
          { header: 'ESTADO', key: 'estado', align: 'center', width: 110 }
        ],
        data
      })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportArqueoExcel = async () => {
    if (!arqueoData || !arqueoData.pagos || arqueoData.pagos.length === 0) {
      showError('Atención', 'No hay movimientos registrados en la fecha seleccionada para exportar.')
      return
    }
    await exportToExcel({
      filename: `Arqueo_Caja_${arqueoData.fecha}.xls`,
      sheetName: 'Arqueo',
      title: `ARQUEO Y CIERRE DE CAJA DIARIA - ${arqueoData.fecha}`,
      subtitle: 'Municipalidad Distrital José Leonardo Ortiz - Subgerencia de Tránsito',
      metadata: [
        { label: 'Fecha Cierre', value: arqueoData.fecha },
        { label: 'Total Recaudado', value: `S/ ${arqueoData.totalRecaudado.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` },
        { label: 'Efectivo', value: `S/ ${(arqueoData.porMetodo?.efectivo || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` },
        { label: 'Tarjeta', value: `S/ ${(arqueoData.porMetodo?.tarjeta || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` },
        { label: 'Transferencia', value: `S/ ${(arqueoData.porMetodo?.transferencia || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` },
        { label: 'Total Operaciones', value: String(arqueoData.totalOperaciones || 0) }
      ],
      columns: [
        { header: 'N° RECIBO', key: 'numeroRecibo', isText: true, width: 140 },
        { header: 'HORA / FECHA', key: 'fecha', width: 150 },
        { header: 'CONCEPTO / TIPO', key: 'tipoPago', width: 140 },
        { header: 'N° OPERACIÓN', key: 'numeroVoucher', isText: true, width: 130 },
        { header: 'MÉTODO DE PAGO', key: 'metodo', width: 120 },
        { header: 'CAJERO / OPERADOR', key: 'cajero', width: 180 },
        { header: 'IMPORTE (S/)', render: (_, r) => `S/ ${(r.montoTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 120 }
      ],
      data: arqueoData.pagos
    })
  }

  const [stats, setStats] = useState({ totalPagos: 0, totalMonto: 0, pagosHoy: 0 })
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const totalPagos = stats.totalPagos ?? 0
  const totalMonto = stats.totalMonto ?? 0
  const pagosHoy = stats.pagosHoy ?? 0

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.removeAttribute('data-print-orientation')
      document.body.classList.remove('is-printing-ticket', 'is-printing-landscape', 'is-printing-portrait')
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
      document.body.removeAttribute('data-print-orientation')
      document.body.classList.remove('is-printing-ticket', 'is-printing-landscape', 'is-printing-portrait')
    }
  }, [])

  const handlePrintTicket = () => {
    document.body.setAttribute('data-print-orientation', 'ticket')
    document.body.classList.add('is-printing-ticket')
    window.print()
  }

  const handlePrintArqueo = () => {
    document.body.setAttribute('data-print-orientation', 'landscape')
    document.body.classList.add('is-printing-landscape')
    window.print()
  }

  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [totalFiltrado, setTotalFiltrado] = useState(0)

  const cargaPagos = useRef(null)
  const loadPagos = () => {
    cargaPagos.current?.abort()
    const controller = new AbortController()
    cargaPagos.current = controller
    setIsLoading(true)
    setLoadError('')
    const params = new URLSearchParams({
      page: String(currentPage),
      porPagina: String(itemsPerPage),
    })
    if (debouncedSearch) params.set('buscar', debouncedSearch)
    if (filterTipoPago !== 'TODOS') params.set('tipoPago', filterTipoPago)
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    if (filterMetodo !== 'TODOS') params.set('metodo', filterMetodo)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

    apiFetch(`/pagos?${params.toString()}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        if (controller.signal.aborted) return
        const pData = data.data || []
        setPagos(pData)
        setTotalFiltrado(data.meta?.total ?? pData.length)
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError('No se pudo cargar el registro de pagos.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
  }

  useEffect(() => {
    loadPagos()
    return () => cargaPagos.current?.abort()
  }, [currentPage, itemsPerPage, debouncedSearch, filterTipoPago, filterEstado, filterMetodo, sortBy, sortDir])

  const loadStats = () => {
    apiFetch('/pagos/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => setStats(payload.data ?? {}))
      .catch(() => { })
  }

  useEffect(() => {
    loadStats()
  }, [])

  const filteredPagos = pagos

  useEffect(() => {
    setCurrentPage(1)
  }, [filterTipoPago, filterEstado, filterMetodo])

  const paginatedPagos = pagos

  return (
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7"
            >
              <rect width="20" height="12" x="2" y="6" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Pagos de Tránsito
            </h1>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3 print:hidden">
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Recaudado</span>
            <span className="grid size-6 place-items-center rounded-md text-emerald-600 dark:text-emerald-400 text-xs">
              <Icon name="payment" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">
              S/ {Number(totalMonto || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md shrink-0">
              Caja Total
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-sky-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Operaciones</span>
            <span className="grid size-6 place-items-center rounded-md text-sky-600 dark:text-sky-400 text-xs">
              <Icon name="receiptCheck" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">
              {formatNumeroTarjeta(totalPagos)}
            </p>
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-md shrink-0">
              Emitidos
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-purple-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Pagos de Hoy</span>
            <span className="grid size-6 place-items-center rounded-md text-purple-600 dark:text-purple-400 text-xs">
              <Icon name="calendar" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">
              {formatNumeroTarjeta(pagosHoy)}
            </p>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded-md shrink-0">
              Jornada
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] flex flex-col print:hidden">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3 dark:border-[var(--border)]">
          <div className="relative min-w-[340px] flex-1">
            <Icon
              name={isLoading ? "refresh" : "search"}
              className={`absolute left-3 top-1/2 size-3.5 -translate-y-1/2 transition-colors ${isLoading ? 'animate-spin text-emerald-500' : 'text-slate-400'}`}
            />
            <input
              type="text"
              placeholder="Buscar por N° recibo u operación"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-emerald-500/20 dark:border-[var(--border)] dark:bg-slate-900/50 dark:text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenArqueo}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200/80 bg-purple-50/70 px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-purple-300 dark:hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Reporte de Arqueo y Cierre Diario de Caja"
            >
              <Icon name="chart" className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>Arqueo Diario</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-emerald-300 dark:hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Descargar reporte de pagos en Excel"
              disabled={isExportingExcel}>
              <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} />
              <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-rose-300 dark:hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Imprimir o exportar PDF"
              disabled={isExportingPdf}>
              <Icon name={isExportingPdf ? "refresh" : "filePdf"} className={`size-3.5 text-rose-600 dark:text-rose-400 ${isExportingPdf ? 'animate-spin' : ''}`} />
              <span>{isExportingPdf ? 'Generando...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white active:scale-95 transition-all cursor-pointer whitespace-nowrap hover:opacity-90"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
              title="Registrar nuevo pago"
            >
              <Icon name="plus" className="size-3.5" />
              <span>Registrar Pago</span>
            </button>
          </div>

          <div className="order-last flex w-full flex-wrap items-center gap-1.5 sm:gap-2">
            <RoundedSelect
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val)
                setCurrentPage(1)
              }}
              options={FILTER_ESTADO_OPTIONS}
            />
            <RoundedSelect
              value={filterTipoPago}
              onChange={(val) => {
                setFilterTipoPago(val)
                setCurrentPage(1)
              }}
              options={FILTER_TIPO_OPTIONS}
            />
            <RoundedSelect
              value={filterMetodo}
              onChange={(val) => {
                setFilterMetodo(val)
                setCurrentPage(1)
              }}
              options={FILTER_METODO_OPTIONS}
            />

            {(filterEstado !== 'TODOS' || filterTipoPago !== 'TODOS' || filterMetodo !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterEstado('TODOS')
                  setFilterTipoPago('TODOS')
                  setFilterMetodo('TODOS')
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                title="Limpiar filtros"
                className="grid size-[32px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[140px]" />
              <col className="w-[125px]" />
              <col className="w-[130px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[210px]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap"><SortableHeader column="numeroRecibo" label="N° RECIBO" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3.5 whitespace-nowrap"><SortableHeader column="fecha" label="FECHA / HORA" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3.5 whitespace-nowrap">TIPO / OPERACIÓN</th>
                <th className="px-4 py-3.5">PAGADO POR</th>
                <th className="px-4 py-3.5 whitespace-nowrap"><SortableHeader column="metodoPago" label="MÉTODO" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center"><SortableHeader column="montoTotal" label="MONTO TOTAL" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-[#1C2438] px-4 py-3.5 text-center border-l border-slate-100 dark:border-[var(--border)] shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] whitespace-nowrap">ACCIONES</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 bg-white dark:divide-slate-800/50 dark:bg-[#1C2438] transition-opacity ${isLoading && pagos.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && pagos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-40 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#1C2438] px-4 py-4 text-right border-l border-slate-100 dark:border-[var(--border)]"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                  </tr>
                ))
              ) : filteredPagos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Icon name="payment" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron pagos registrados</p>
                  </td>
                </tr>
              ) : (
                paginatedPagos.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-emerald-50/30 dark:hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{p.numeroRecibo || 'Pendiente de recibo'}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        CAJA MUNICIPAL
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{p.fecha ? new Date(String(p.fecha).slice(0, 10) + 'T00:00:00').toLocaleDateString() : 'Sin fecha de pago'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {p.tipoPago} #{p.papeletaId || p.tramiteId || p.inscripcionId}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{p.tipoPago || 'TRAMITE'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.numeroVoucher ? `Operación ${p.numeroVoucher}` : '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{p.pagadoPor || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${p.metodo === 'EFECTIVO'
                          ? 'bg-slate-100 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300'
                          : p.metodo && p.metodo !== 'SIN CONFIRMAR'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            : 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}>
                        {p.metodo || 'Sin confirmar'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <p className="font-black text-xs text-slate-900 dark:text-white">
                        S/ {Number(p.montoTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${p.estado === 'PAGADO'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : p.estado === 'PENDIENTE'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                        {p.estado}
                      </p>
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-emerald-50/40 dark:bg-[#1C2438] dark:group-hover:bg-slate-800/60 px-4 py-3.5 text-center border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] whitespace-nowrap min-w-[210px]">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.estado === 'PENDIENTE' && p.tipoPago !== 'INTERNAMIENTO' && (
                          typeof p.id === 'string' && (p.id.startsWith('pap_pend_') || p.id.startsWith('cur_pend_'))
                            ? (
                              <button
                                type="button"
                                onClick={() => handleGenerarRecibo(p)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300/90 bg-amber-50 px-2.5 text-xs font-bold text-amber-700 shadow-2xs transition-all hover:bg-amber-500 hover:border-amber-500 hover:text-white dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-600 dark:hover:text-white active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
                                title="Generar recibo oficial de pago"
                              >
                                <Icon name="payment" className="size-3.5" />
                                <span>Generar recibo</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConfirm(p)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300/90 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 shadow-2xs transition-all hover:bg-emerald-600 hover:border-emerald-600 hover:text-white dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
                                title="Confirmar recibo de pago"
                              >
                                <Icon name="receiptCheck" className="size-3.5" />
                                <span>Confirmar recibo</span>
                              </button>
                            )
                        )}
                        <button onClick={() => { setSelectedPago(p); setIsDetailModalOpen(true); }} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white" title="Ver Detalle">
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button disabled={p.estado !== 'PAGADO'} onClick={() => { setSelectedPago(p); setIsPreviewModalOpen(true); }} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-print-bg)] border-[var(--action-print-border)] text-[var(--action-print-text)] hover:bg-[var(--action-print-hover)] hover:border-[var(--action-print-hover)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" title="Imprimir Ticket">
                          <Icon name="print" className="size-4" />
                        </button>
                        {p.tipoPago !== 'INTERNAMIENTO' && typeof p.id === 'number' && (
                          <button style={puedeEliminarRegistros() ? undefined : { display: 'none' }} disabled={p.estado === 'ANULADO'} onClick={() => handleDelete(p.id)} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" title="Anular Pago">
                            <Icon name="trash" className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") setIsModalOpen(false); e.currentTarget.dataset.downOnOverlay = "" }}>
          <div className="flex w-full max-w-2xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438] rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="payment" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{pagoToConfirm ? 'Confirmar recibo de pago' : 'Registrar Pago'}</h3>
              </div>
              <BotonCerrarModal onClick={() => setIsModalOpen(false)} title="Cerrar" />
            </div>
            <form onSubmit={handleFormSubmit} className="flex flex-col rounded-b-3xl">
              <div className="space-y-6 p-8 min-h-[400px]">
                {pagoToConfirm ? (
                  <fieldset className="rounded-xl border border-slate-200 p-5 dark:border-[var(--border-strong)]">
                    <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">DETALLES DEL RECIBO</legend>
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                      <p className="font-black text-emerald-700 dark:text-emerald-300 text-lg">Monto: S/ {pagoToConfirm.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{pagoToConfirm.referenciaPago}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <FloatingInput id="pago_recibo" label="Número de recibo" optional maxLength={50} value={formData.numeroRecibo} onChange={e => setFormData({ ...formData, numeroRecibo: e.target.value })} />
                        <p className="mt-1 text-[10.5px] text-slate-400">Si lo dejas vacío, el sistema le asigna uno automáticamente. Solo llénalo si usas un talonario físico propio.</p>
                      </div>
                      <FloatingInput id="pago_fecha" label="Fecha que figura en el recibo" required type="date" value={formData.fechaPago} onChange={e => setFormData({ ...formData, fechaPago: e.target.value })} />
                      <FloatingSelect
                        id="pago_metodo"
                        label="Método de pago"
                        value={formData.metodo}
                        onChange={e => setFormData({ ...formData, metodo: e.target.value })}
                        options={[
                          { value: 'EFECTIVO', label: 'Efectivo' },
                          { value: 'TARJETA', label: 'Tarjeta' }
                        ]}
                      />
                      {formData.metodo !== 'EFECTIVO' && (
                        <FloatingInput id="pago_operacion" label="N° de operación" required maxLength={50} value={formData.numeroVoucher} onChange={e => setFormData({ ...formData, numeroVoucher: e.target.value })} />
                      )}
                    </div>
                  </fieldset>
                ) : (
                  <>
                    <fieldset className="rounded-xl border border-slate-200 p-5 dark:border-[var(--border-strong)]">
                      <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Buscar deudas de una persona</legend>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Busca por DNI para ver todas sus papeletas, trámites y cursos pendientes de pago, y elige cuál cobrar.</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={11}
                          placeholder="DNI de la persona"
                          value={deudaDni}
                          onChange={(e) => setDeudaDni(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleBuscarDeudas(e) }}
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold font-mono outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
                        />
                        <button type="button" disabled={buscandoDeuda} onClick={handleBuscarDeudas} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-60">
                          <Icon name="search" className="size-3.5" />
                          {buscandoDeuda ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>

                      {deudaError && <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-400">{deudaError}</p>}

                      {deudaPersona && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                          <p className="text-sm font-black text-slate-800 dark:text-white">{deudaPersona.nombre}</p>
                          <p className="text-xs font-mono text-slate-400">DNI: {deudaPersona.dni}</p>
                        </div>
                      )}

                      {deudaPersona && deudaLista.length === 0 && (
                        <div className="mt-3 flex flex-col items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-6 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                          <Icon name="shieldCheck" className="size-6 text-emerald-500" />
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">No tiene pagos pendientes</p>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Esta persona no registra papeletas, trámites ni cursos por cobrar.</p>
                        </div>
                      )}

                      {deudaLista.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {deudaLista.map((d) => {
                            const seleccionada = formData.tipoPago === d.tipoPago && String(formData.origenId) === String(d.id)
                            return (
                              <button
                                key={`${d.tipoPago}-${d.id}`}
                                type="button"
                                onClick={() => handleSeleccionarDeuda(d)}
                                className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition cursor-pointer ${seleccionada
                                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40'
                                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:hover:bg-emerald-950/20'
                                  }`}
                              >
                                <div className="min-w-0">
                                  <div>
                                    <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:bg-[var(--bg-subtle)] dark:text-slate-400 mr-1.5">
                                      {d.tipoPago}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{d.nombre}</span>
                                  </div>
                                  <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                    <span className="size-1.5 rounded-full bg-amber-500" /> Pendiente de pago
                                  </span>
                                </div>
                                <span className="shrink-0 text-xs font-black text-emerald-700 dark:text-emerald-400">
                                  {d.monto != null ? `S/ ${Number(d.monto).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '—'}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {origenPreseleccionado && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Registro a cobrar</p>
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{origenPreseleccionado.nombre}</p>
                          <p className="font-black text-emerald-700 dark:text-emerald-300 text-lg">S/ {Number(origenPreseleccionado.monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                        </div>
                      )}
                    </fieldset>

                    {formData.origenId && (
                      <fieldset className="rounded-xl border border-slate-200 p-5 dark:border-[var(--border-strong)]">
                        <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Datos del pago recibido</legend>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">El número de recibo lo asigna el sistema automáticamente.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FloatingInput id="pago_fecha_directo" label="Fecha de pago" required type="date" value={formData.fechaPago} onChange={e => setFormData({ ...formData, fechaPago: e.target.value })} />
                          <FloatingSelect
                            id="pago_metodo_directo"
                            label="Método de pago"
                            value={formData.metodo}
                            onChange={e => setFormData({ ...formData, metodo: e.target.value })}
                            options={[
                              { value: 'EFECTIVO', label: 'Efectivo' },
                              { value: 'TARJETA', label: 'Tarjeta' }
                            ]}
                          />
                          {formData.metodo !== 'EFECTIVO' && (
                            <FloatingInput id="pago_operacion_directo" label="N° de operación" required maxLength={50} value={formData.numeroVoucher} onChange={e => setFormData({ ...formData, numeroVoucher: e.target.value })} />
                          )}
                        </div>
                      </fieldset>
                    )}
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-7 py-4 dark:border-[var(--border)]">
                <BotonCancelar onClick={() => setIsModalOpen(false)} />
                <BotonGuardar disabled={isSaving}>
                  {isSaving ? 'Guardando…' : pagoToConfirm ? 'Confirmar recibo' : 'Generar pago'}
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438] p-6">
            <h3 className="text-xl font-black mb-2 text-slate-800 dark:text-white">Detalle del Recibo</h3>
            <p className="text-xs text-slate-500 mb-6">{selectedPago.numeroRecibo}</p>
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p><strong>Fecha:</strong> {selectedPago.fecha ? new Date(selectedPago.fecha + 'T00:00:00').toLocaleDateString() : 'Pendiente'}</p>
              <p><strong>Tipo de pago:</strong> {selectedPago.tipoPago || 'TRAMITE'}</p>
              <p><strong>Pagado por:</strong> {selectedPago.pagadoPor || 'No identificado'}</p>
              <p><strong>Método de Pago:</strong> {selectedPago.metodo}</p>
              <p><strong>N° de operación:</strong> {selectedPago.numeroVoucher || '—'}</p>
              <p><strong>Referencia:</strong> {selectedPago.referenciaPago || 'Sin referencia'}</p>
              <p className="text-emerald-600 font-bold dark:text-emerald-400"><strong>Monto ({selectedPago.estado}):</strong> S/ {selectedPago.montoTotal?.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="mt-8 flex justify-end gap-2">
              <button disabled={selectedPago.estado !== 'PAGADO'} onClick={() => { setIsDetailModalOpen(false); setIsPreviewModalOpen(true); }} className="rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-sky-700 cursor-pointer inline-flex items-center gap-1.5"><Icon name="print" className="size-4" /> Imprimir</button>
              <BotonCancelar onClick={() => setIsDetailModalOpen(false)}>Cerrar</BotonCancelar>
            </div>
          </div>
        </div>
      )}

      {isPreviewModalOpen && selectedPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter print:static print:block print:p-0 print:bg-transparent">
          <div id="seccion-impresion-ticket" className="w-full max-w-[330px] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-100 p-5 text-center text-slate-900 font-mono text-xs print:rounded-none print:shadow-none print:p-1.5 print:max-w-full">
            <h4 className="font-bold text-sm mb-1">MUNICIPALIDAD DISTRITAL JLO</h4>
            <p className="mb-4">CONSTANCIA INTERNA DE PAGO</p>
            <p className="text-left"><strong>N° REGISTRADO:</strong> {selectedPago.numeroRecibo || '—'}</p>
            <p className="text-left"><strong>FECHA REGISTRADA:</strong> {selectedPago.fecha ? String(selectedPago.fecha).slice(0, 10) : '—'}</p>
            <div className="my-4 border-y border-dashed border-slate-400 py-2 text-left">
              <p className="font-bold mb-1">TIPO: {selectedPago.tipoPago || 'TRAMITE'}</p>
              <p className="break-words">CONCEPTO: {selectedPago.referenciaPago || '—'}</p>
              <p>PAGADO POR: {selectedPago.pagadoPor || 'No identificado'}</p>
              <p>N° OPERACIÓN: {selectedPago.numeroVoucher || '---'}</p>
              {selectedPago.tipoPago === 'INTERNAMIENTO'
                ? <><p>CONCEPTOS: {selectedPago.metodo || '—'}</p><p>MÉTODO: No registrado por separado</p></>
                : <p>MÉTODO: {selectedPago.metodo || '—'}</p>}
            </div>
            <div className="text-right text-sm">
              <p><strong>TOTAL: S/ {selectedPago.montoTotal?.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong></p>
            </div>
            <p className="mt-4 text-left text-[10px] leading-tight">Esta constancia muestra lo registrado en el sistema. No sustituye un comprobante oficial emitido por el SAT.</p>
            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between print:hidden">
              <button onClick={handlePrintTicket} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-sans font-bold hover:bg-emerald-700 cursor-pointer">Imprimir Ticket</button>
              <BotonCancelar onClick={() => setIsPreviewModalOpen(false)}>Cerrar</BotonCancelar>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ARQUEO Y CIERRE DE CAJA DIARIO */}
      {isArqueoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-enter print:static print:block print:p-8 print:bg-transparent print:overflow-visible">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438] print:max-h-none print:border-none print:shadow-none print:rounded-none">
            {/* Cabecera del modal */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 rounded-t-3xl dark:border-[var(--border)] dark:bg-slate-900/80 print:bg-transparent print:border-black print:pb-2 print:mb-4 print:px-0">
              <div className="flex items-center gap-3 print:w-full print:justify-center print:flex-col print:gap-1">
                <span className="grid size-10 place-items-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 print:hidden">
                  <Icon name="chart" className="size-5" />
                </span>
                <div className="print:text-center">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-xl print:uppercase print:tracking-widest print:text-black">
                    Arqueo y Cierre Diario de Caja
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black">
                    Conciliación de recaudación municipal, métodos de pago y rendición por cajero.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <input
                  type="date"
                  value={arqueoFecha}
                  onChange={(e) => {
                    setArqueoFecha(e.target.value)
                    fetchArqueo(e.target.value)
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition hover:border-purple-300 focus:border-purple-500 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => fetchArqueo(arqueoFecha)}
                  disabled={isLoadingArqueo}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-purple-600 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                  title="Actualizar arqueo"
                >
                  <Icon name="refresh" className={`size-4 ${isLoadingArqueo ? 'animate-spin' : ''}`} />
                </button>
                <BotonCerrarModal onClick={() => setIsArqueoModalOpen(false)} title="Cerrar" />
              </div>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6 print:overflow-visible print:p-0">
              {isLoadingArqueo ? (
                <div className="py-16 text-center">
                  <div className="inline-block size-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
                  <p className="mt-3 text-xs font-bold text-slate-500">Calculando balance de caja...</p>
                </div>
              ) : !arqueoData ? (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm">No se pudieron cargar los datos del arqueo.</p>
                </div>
              ) : (
                <>
                  {/* Tarjetas de Balance */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-2 print:gap-4">
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/60 dark:bg-purple-950/30 print:bg-transparent print:border-slate-400 print:rounded-none print:p-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 print:text-black">
                        <span>Total Recaudado</span>
                        <Icon name="payment" className="size-3.5 print:hidden" />
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-black print:text-lg">
                        S/ {Number(arqueoData.totalRecaudado || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                      <span className="mt-1 inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-300 print:bg-transparent print:p-0 print:text-black font-mono">
                        {arqueoData.totalOperaciones} operaciones
                      </span>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 print:bg-transparent print:border-slate-400 print:rounded-none print:p-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 print:text-black">
                        <span>Efectivo en Caja</span>
                        <Icon name="payment" className="size-3.5 print:hidden" />
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-black print:text-lg">
                        S/ {Number(arqueoData.porMetodo?.efectivo || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 print:text-black font-mono">
                        Caja física para custodia
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30 print:bg-transparent print:border-slate-400 print:rounded-none print:p-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 print:text-black">
                        <span>Tarjetas (POS)</span>
                        <Icon name="creditCard" className="size-3.5 print:hidden" />
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-black print:text-lg">
                        S/ {Number(arqueoData.porMetodo?.tarjeta || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 print:text-black font-mono">
                        Liquidación electrónica
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 print:bg-transparent print:border-slate-400 print:rounded-none print:p-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 print:text-black">
                        <span>Transferencias</span>
                        <Icon name="building" className="size-3.5 print:hidden" />
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-black print:text-lg">
                        S/ {Number(arqueoData.porMetodo?.transferencia || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 print:text-black font-mono">
                        Banco de la Nación / Cta Cte
                      </p>
                    </div>
                  </div>

                  {/* Tablas de Desglose */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-1 print:gap-6">
                    {/* Desglose por concepto */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-[var(--border)] dark:bg-slate-900/40 print:bg-transparent print:border-none print:p-0">
                      <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black print:border-b print:border-black print:pb-1">
                        <Icon name="chartBar" className="inline size-3.5 mr-1 -mt-0.5 print:hidden" />Recaudación por Concepto
                      </h4>
                      <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-left text-xs print:table-fixed">
                          <thead className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 dark:border-[var(--border)] print:text-black print:border-black">
                            <tr>
                              <th className="pb-2">Concepto</th>
                              <th className="pb-2 text-center">Cant.</th>
                              <th className="pb-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                            {arqueoData.porConcepto?.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="py-4 text-center text-slate-400">Sin ingresos en la fecha</td>
                              </tr>
                            ) : (
                              arqueoData.porConcepto?.map((c, i) => (
                                <tr key={i} className="hover:bg-white/60 dark:hover:bg-slate-800/30">
                                  <td className="py-2 font-bold text-slate-800 dark:text-slate-200 print:text-black">{c.tipoPago}</td>
                                  <td className="py-2 text-center text-slate-600 dark:text-slate-400 print:text-black">{c.cantidad}</td>
                                  <td className="py-2 text-right font-black text-slate-900 dark:text-white print:text-black">
                                    S/ {Number(c.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Desglose por cajero */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-[var(--border)] dark:bg-slate-900/40 print:bg-transparent print:border-none print:p-0">
                      <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black print:border-b print:border-black print:pb-1">
                        <Icon name="user" className="inline size-3.5 mr-1 -mt-0.5 print:hidden" />Rendición por Cajero / Operador
                      </h4>
                      <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-left text-xs print:table-fixed">
                          <thead className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 dark:border-[var(--border)] print:text-black print:border-black">
                            <tr>
                              <th className="pb-2">Cajero</th>
                              <th className="pb-2 text-center">Operaciones</th>
                              <th className="pb-2 text-right">Total Cobrado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                            {arqueoData.porCajero?.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="py-4 text-center text-slate-400">Sin operaciones de cajero</td>
                              </tr>
                            ) : (
                              arqueoData.porCajero?.map((c, i) => (
                                <tr key={i} className="hover:bg-white/60 dark:hover:bg-slate-800/30">
                                  <td className="py-2 font-bold text-slate-800 dark:text-slate-200 print:text-black">{c.usuario}</td>
                                  <td className="py-2 text-center text-slate-600 dark:text-slate-400 print:text-black">{c.cantidad}</td>
                                  <td className="py-2 text-right font-black text-emerald-600 dark:text-emerald-400 print:text-black">
                                    S/ {Number(c.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Detalle de Movimientos del Día */}
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-[var(--border)] print:bg-transparent print:border-none print:p-0 print:mt-6">
                    <div className="mb-3 flex items-center justify-between print:border-b print:border-black print:pb-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black print:text-sm">
                        <Icon name="receiptCheck" className="inline size-3.5 mr-1 -mt-0.5 print:hidden" />Movimientos y Recibos Emitidos ({arqueoData.pagos?.length || 0})
                      </h4>
                      <span className="text-[11px] font-medium text-slate-400 print:text-black font-mono">
                        Fecha: {arqueoData.fecha}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto print:max-h-none print:overflow-visible">
                      <table className="w-full text-left text-xs print:table-fixed">
                        <thead className="sticky top-0 bg-white border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 dark:bg-[#1C2438] dark:border-[var(--border)] print:static print:bg-transparent print:text-black print:border-black">
                          <tr>
                            <th className="py-2 print:py-1">N° Recibo</th>
                            <th className="py-2 print:py-1">Hora</th>
                            <th className="py-2 print:py-1">Concepto</th>
                            <th className="py-2 print:py-1">Método</th>
                            <th className="py-2 print:py-1">Cajero</th>
                            <th className="py-2 print:py-1 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)] print:divide-slate-300">
                          {arqueoData.pagos?.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="py-6 text-center text-slate-400 print:text-black">
                                No se registraron cobros en esta jornada.
                              </td>
                            </tr>
                          ) : (
                            arqueoData.pagos?.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[var(--bg-subtle)]">
                                <td className="py-2 font-mono font-bold text-slate-900 dark:text-white print:text-black print:py-1">
                                  {p.numeroRecibo || `#${p.id}`}
                                </td>
                                <td className="py-2 text-slate-500 print:text-black print:py-1 font-mono">
                                  {p.fecha ? p.fecha.split(' ')[1] || p.fecha : '---'}
                                </td>
                                <td className="py-2 print:py-1">
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300 print:bg-transparent print:p-0 print:text-black">
                                    {p.tipoPago}
                                  </span>
                                </td>
                                <td className="py-2 text-slate-600 dark:text-slate-300 print:text-black print:py-1">
                                  {p.metodo}
                                </td>
                                <td className="py-2 text-slate-600 dark:text-slate-400 print:text-black print:py-1">
                                  {p.cajero}
                                </td>
                                <td className="py-2 text-right font-black text-slate-900 dark:text-white print:text-black print:py-1">
                                  S/ {Number(p.montoTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer de Acciones del Arqueo */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-[var(--border)] dark:bg-[#1C2438] print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportArqueoExcel}
                  disabled={!arqueoData?.pagos?.length}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-700 shadow-2xs hover:bg-emerald-50 dark:border-emerald-800 dark:bg-[var(--bg-subtle)] dark:text-emerald-300 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Icon name="table" className="size-4" />
                  <span>Exportar Arqueo Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintArqueo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-extrabold text-purple-700 shadow-2xs hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300 transition-all cursor-pointer"
                >
                  <Icon name="print" className="size-4" />
                  <span>Imprimir Acta Cierre</span>
                </button>
              </div>

              <BotonCancelar onClick={() => setIsArqueoModalOpen(false)}>Cerrar</BotonCancelar>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default Pagos
