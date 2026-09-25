import { useState, useEffect, useRef } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { PageLoadError } from '../components/ui/PageLoadError'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'
import { showError, showToast } from '../utils/SwalUtil'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PagoPapeletaModal } from '../components/papeletas/PagoPapeletaModal'
import { NuevaPapeletaModal } from '../components/papeletas/NuevaPapeletaModal'
import { PapeletaDetalleModal } from '../components/papeletas/PapeletaDetalleModal'
import { ConvertirReporteModal } from '../components/papeletas/ConvertirReporteModal'
import { PreviewTicketModal } from '../components/papeletas/PreviewTicketModal'
import { InfraccionDetalleModal } from '../components/papeletas/InfraccionDetalleModal'

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

export function Papeletas({ user }) {
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
  const [activeView, setActiveView] = useState('PAPELETAS')
  const [reportes, setReportes] = useState([])
  const [tiposInfraccion, setTiposInfraccion] = useState(cachedTipos || [])
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [asociaciones, setAsociaciones] = useState(cachedOrgs || [])
  const [isLoading, setIsLoading] = useState(!cachedPapeletas)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterOrigen, setFilterOrigen] = useState('TODOS')
  const [filterFormalidad, setFilterFormalidad] = useState('TODOS')
  const [filterTipoInfraccion, setFilterTipoInfraccion] = useState('TODOS')
  const [filterFecha, setFilterFecha] = useState('TODAS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPapeletaFotos, setSelectedPapeletaFotos] = useState([])
  const [loadingPapeletaFotos, setLoadingPapeletaFotos] = useState(false)

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isPagarModalOpen, setIsPagarModalOpen] = useState(false)
  const [selectedInfraccion, setSelectedInfraccion] = useState(null)
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

  const totales = papeletas.length
  const reportesPendientes = reportes.filter((r) => r.estado === 'PENDIENTE').length
  const pendientes = papeletas.filter((p) => p.estado === 'PENDIENTE_PAGO').length
  const pagadas = papeletas.filter((p) => p.estado === 'PAGADA').length
  const anuladas = papeletas.filter((p) => p.estado === 'ANULADA').length
  const montoRecaudado = pagadas > 0 ? papeletas.filter(p => p.estado === 'PAGADA').reduce((acc, curr) => acc + curr.montoTotal, 0) : 0

  const filteredPapeletas = papeletas.filter((p) => {
    const fullSearch = `${p.numeroPapeleta || ''} ${p.vehiculoPlaca || ''} ${p.vehiculoCaracteristicas || ''} ${p.conductorNombre || p.infractor || ''} ${p.conductorDni || ''} ${p.propietarioNombre || ''} ${p.propietarioDni || ''} ${p.lugar || ''} ${p.tipoInfractor || ''} ${p.tipoInfraccionCodigo || ''} ${p.inspector || ''}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === 'TODOS' || p.estado === filterEstado

    // Filtro por Origen (Operativo vs Rutina)
    const isOp = p.origen === 'OPERATIVO' || Boolean(p.operativoId)
    const matchesOrigen = filterOrigen === 'TODOS'
      || (filterOrigen === 'OPERATIVO' && isOp)
      || (filterOrigen === 'RUTINA' && !isOp)

    // Filtro por Formalidad (Formal vs Informal)
    const matchesFormalidad = filterFormalidad === 'TODOS' || p.tipoInfractor === filterFormalidad

    // Filtro por Tipo de Infracción
    const matchesTipo = filterTipoInfraccion === 'TODOS'
      || String(p.tipoInfraccionCodigo) === String(filterTipoInfraccion)
      || String(p.detalles?.[0]?.tipoInfraccionId) === String(filterTipoInfraccion)

    // Filtro por Fecha
    let matchesFecha = true
    if (filterFecha !== 'TODAS' && p.fechaHora) {
      const pDate = new Date(p.fechaHora)
      const now = new Date()
      if (filterFecha === 'HOY') {
        matchesFecha = pDate.toDateString() === now.toDateString()
      } else if (filterFecha === 'SEMANA') {
        const diffMs = now.getTime() - pDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        matchesFecha = diffDays >= 0 && diffDays <= 7
      } else if (filterFecha === 'MES') {
        matchesFecha = pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()
      }
    }

    return matchesSearch && matchesEstado && matchesOrigen && matchesFormalidad && matchesTipo && matchesFecha
  })

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

  const paginatedPapeletas = filteredPapeletas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const tipoInfraccionOptions = [
    { value: 'TODOS', label: 'Todas las infracciones' },
    ...tiposInfraccion.map((t) => ({ value: t.codigo || t.id, label: `${t.codigo} - ${t.descripcion}` }))
  ];

  const handleExportPdf = () => {
    exportToPdf({
      filename: `Papeletas_Infraccion_${new Date().toISOString().slice(0, 10)}.pdf`,
      title: 'REGISTRO DE PAPELETAS DE INFRACCIÓN AL TRÁNSITO Y TRANSPORTE',
      subtitle: 'Subgerencia de Tránsito y Transporte - Fiscalización Municipal',
      metadata: [
        { label: 'Estado', value: filterEstado },
        { label: 'Formalidad', value: filterFormalidad },
        { label: 'Total Papeletas', value: String(filteredPapeletas.length) }
      ],
      columns: [
        { header: 'N° PAPELETA', key: 'numeroPapeleta', isText: true, width: 80, align: 'center' },
        { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 60, align: 'center' },
        { header: 'CÓDIGO', key: 'infraccionCodigo', isText: true, width: 60, align: 'center' },
        { header: 'MONTO (S/)', render: (_, p) => `S/ ${Number(p.montoTotal || p.monto || 0).toFixed(2)}`, align: 'right', width: 80 },
        { header: 'CONDUCTOR', key: 'conductorNombre', width: 120 },
        { header: 'INSPECTOR', render: (_, p) => p.inspectorNombre || p.inspector || '—', width: 120 },
        { header: 'FECHA', key: 'fechaHora', render: (_, p) => new Date(p.fechaHora).toLocaleDateString(), width: 80, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 80, align: 'center' }
      ],
      data: filteredPapeletas
    })
  }

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Papeletas_Infraccion_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Papeletas',
      title: 'REGISTRO DE PAPELETAS DE INFRACCIÓN AL TRÁNSITO Y TRANSPORTE',
      subtitle: 'Subgerencia de Tránsito y Transporte - Fiscalización Municipal',
      metadata: [
        { label: 'Estado', value: filterEstado },
        { label: 'Formalidad', value: filterFormalidad },
        { label: 'Total Papeletas', value: String(filteredPapeletas.length) }
      ],
      columns: [
        { header: 'N° PAPELETA', key: 'numeroPapeleta', isText: true, width: 140, align: 'center' },
        { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
        { header: 'CÓDIGO INFRACCIÓN', key: 'infraccionCodigo', isText: true, width: 140, align: 'center' },
        { header: 'DESCRIPCIÓN INFRACCIÓN', key: 'infraccionDescripcion', width: 260 },
        { header: 'GRAVEDAD', key: 'gravedad', width: 110, align: 'center' },
        { header: 'MONTO (S/)', render: (_, p) => `S/ ${Number(p.montoTotal || p.monto || 0).toFixed(2)}`, align: 'right', width: 120 },
        { header: 'CONDUCTOR', key: 'conductorNombre', width: 180 },
        { header: 'DNI CONDUCTOR', key: 'conductorDni', isText: true, width: 120, align: 'center' },
        { header: 'INSPECTOR', render: (_, p) => p.inspectorNombre || p.inspector || '—', width: 170 },
        { header: 'FECHA INFRACCIÓN', key: 'fechaInfraccion', width: 130, align: 'center' },
        { header: 'LUGAR', key: 'lugarInfraccion', width: 200 },
        { header: 'ESTADO', key: 'estado', width: 120, align: 'center' }
      ],
      data: filteredPapeletas
    })
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

  const loadData = () => {
    setIsLoading(true)
    setLoadError('')
    Promise.all([
      apiFetch('/papeletas').then(res => res.ok ? res.json() : Promise.reject(res)),
      apiFetch('/tipos-infraccion').then(res => res.ok ? res.json() : Promise.reject(res)),
      apiFetch('/vehiculos').then(res => res.ok ? res.json() : Promise.reject(res)),
      apiFetch('/asociaciones').then(res => res.ok ? res.json() : Promise.reject(res)),
      apiFetch('/reportes-intervencion').then(res => res.ok ? res.json() : Promise.reject(res))
    ]).then(([papeletasRes, tiposRes, vehiculosRes, orgsRes, reportesRes]) => {
      const pData = (papeletasRes.data || []).map(normalizePapeleta)
      const tData = tiposRes.data || []
      const vData = vehiculosRes.data || []
      const oData = orgsRes.data || []
      const rData = reportesRes.data || []
      setPapeletas(pData)
      setTiposInfraccion(tData)
      setVehiculos(vData)
      setAsociaciones(oData)
      setReportes(rData)
      setCachedData('/papeletas', pData)
      setCachedData('/tipos-infraccion', tData)
      setCachedData('/vehiculos', vData)
      setCachedData('/asociaciones', oData)
      setIsLoading(false)
    }).catch(() => {
      setLoadError('No se pudo cargar el módulo de papeletas.')
      setIsLoading(false)
    })
  }

  useEffect(() => {
    loadData()
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
    } catch (error) {
      console.error('Error cargando fotos:', error)
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
      alert('Esta papeleta está anulada y no puede ser cancelada ni pagada.')
      return
    }
    if (papeleta.estado === 'PAGADA') {
      alert('Esta papeleta ya se encuentra pagada.')
      return
    }
    setPapeletaToAction(papeleta)
    setNumeroRecibo('')
    setFechaPago('')
    setMetodoPago('EFECTIVO')
    setIsPagarModalOpen(true)
  }

  const handleConfirmPagar = async () => {
    if (!papeletaToAction) return

    // Validaciones
    if (!numeroRecibo.trim() || !fechaPago) {
      alert('Por favor ingresa el número de recibo y la fecha de pago.')
      return
    }
    if (new Date(fechaPago) > new Date()) {
      alert('La fecha de pago no puede ser futura.')
      return
    }

    setIsProcessingAction(true)
    try {
      const res = await apiFetch(`/papeletas/${papeletaToAction.id}/pagar`, {
        method: 'POST',
        body: { metodoPago, numeroRecibo, fechaPago }
      })
      if (res.ok) {
        setPapeletas(prev => prev.map(p => p.id === papeletaToAction.id ? {
          ...p,
          estado: 'PAGADA'
        } : p))
        setIsPagarModalOpen(false)
        setPapeletaToAction(null)
      } else {
        const error = await res.json()
        showError('Error', sanitizarMensaje(Object.values(error.messages || {}).join(' '), 'Error al procesar el pago.'))
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión al procesar el pago')
    } finally {
      setIsProcessingAction(false)
    }
  }

  const openConvertReporte = async (reporte) => {
    const matchVehiculo = vehiculos.find((v) => String(v.placa || '').toUpperCase() === String(reporte.placa || reporte.placa_visual || '').toUpperCase())
    setReporteToConvert({ ...reporte, loadingFotos: true })
    setConvertForm({
      infraccionesIds: reporte.infraccionesIds?.length ? reporte.infraccionesIds.map(String) : [''],
      vehiculoId: String(reporte.id_vehiculo || matchVehiculo?.id || ''),
      conductorDni: reporte.conductorDni && reporte.conductorDni !== 'S/D' ? reporte.conductorDni : '',
      observacionesAutoridad: reporte.observaciones || ''
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
      alert('Selecciona al menos una infracción.')
      return
    }
    if (!convertForm.vehiculoId) {
      alert('Para generar papeleta primero debes identificar o registrar el vehículo.')
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
      alert(`Reporte convertido a papeleta ${data.data?.numeroPapeleta || ''}`.trim())
    } catch (error) {
      showError('Error', sanitizarMensaje(error.message, 'Error al convertir reporte.'))
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
      alert('Ingresa el motivo de rechazo.')
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
      loadData()
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
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-rose-600 text-white shadow-md">
            <Icon name="ticket" className="size-5.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Control de Papeletas e Infracciones
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500">
              Registro, notificación y gestión de cobro de actas de infracción al tránsito municipal.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 print:hidden">
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-slate-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Impuestas</span>
            <span className="grid size-6 place-items-center rounded-md bg-slate-50 text-slate-600 dark:bg-slate-950/60">
              <Icon name="ticket" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{totales}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendientes</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 font-bold text-xs">
              ⏳
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{pendientes}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pagadas</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{pagadas}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-slate-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Anuladas</span>
            <span className="grid size-6 place-items-center rounded-md bg-slate-50 text-slate-600 dark:bg-slate-950/60 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{anuladas}</p>
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
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${
            activeView === 'REPORTES'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}>{reportesPendientes}</span>
        </button>
      </div>

      {activeView === 'REPORTES' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-5 py-4 dark:border-[var(--border)]">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Reportes Evidencias</h2>
              <p className="text-xs font-semibold text-slate-500">No son papeletas. Administración decide si procede o no.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar reporte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-rose-500 focus:bg-white dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                )}
              </div>
              <button onClick={loadData} className="w-full sm:w-auto rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white shrink-0">Actualizar</button>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-[var(--border)]">
            {reportes.filter(r => !searchTerm || [r.placa, r.placa_visual, r.lugar, r.observaciones, r.inspector_nombre, r.conductorDni].some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()))).length ? reportes.filter(r => !searchTerm || [r.placa, r.placa_visual, r.lugar, r.observaciones, r.inspector_nombre, r.conductorDni].some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()))).map((reporte) => (
              <div key={reporte.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_220px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <StatusBadge status={reporte.estado === 'CONVERTIDO_PAPELETA' ? 'FINALIZADO' : reporte.estado} />
                    <span className="font-mono text-xs font-black text-slate-500">#{reporte.id}</span>
                    {reporte.numero_papeleta && <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-black text-rose-700">{reporte.numero_papeleta}</span>}
                  </div>
                  <h3 className="mt-2 text-base font-black text-slate-900 dark:text-white">
                    {reporte.placa_visual || 'SIN PLACA'} · {reporte.lugar}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{reporte.observaciones}</p>
                  {reporte.infraccion_visual && (
                    <p className="mt-1 text-xs font-black text-rose-600">INFRACCIÓN SUGERIDA: {reporte.infraccion_visual}</p>
                  )}
                  <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                    <span>Inspector: {reporte.inspector_nombre}</span>
                    <span>Fecha: {new Date(reporte.fecha_hora).toLocaleString()}</span>
                    <span>GPS: {reporte.coordenadas || 'S/D'}</span>
                  </div>
                  {!!reporte.fotos?.length && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {reporte.fotos.map((foto) => (
                        <img key={foto.id} src={foto.foto} alt="Evidencia" className="h-20 w-28 rounded-xl border border-slate-200 object-cover" />
                      ))}
                    </div>
                  )}
                  {reporte.motivo_rechazo && <p className="mt-2 text-xs font-bold text-rose-600">Motivo: {reporte.motivo_rechazo}</p>}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={reporte.estado !== 'PENDIENTE'}
                    onClick={() => openConvertReporte(reporte)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    Generar papeleta
                  </button>
                  <button
                    type="button"
                    disabled={reporte.estado !== 'PENDIENTE'}
                    onClick={() => { setReporteToReject(reporte); setMotivoRechazo('') }}
                    className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            )) : (
              <div className="px-5 py-12 text-center text-slate-400">
                <Icon name="camera" className="size-8 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-slate-600 dark:text-slate-300">Aún no hay Reportes Evidencias</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'PAPELETAS' && <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)] flex flex-col print:hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 dark:border-[var(--border)]">
          {/* Top row: Search and Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código PAP, placa, infractor, DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-rose-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-rose-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
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
              >
                <Icon name="fileSpreadsheet" className="size-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
              
              <button 
                type="button"
                onClick={handleExportPdf} 
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-all cursor-pointer whitespace-nowrap"
                title="Exportar a PDF"
              >
                <Icon name="filePdf" className="size-3.5 text-rose-600" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNuevaPapeleta}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md transition-all hover:from-rose-500 hover:to-rose-600 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span className="text-base leading-none font-black">+</span><span>Nuevo</span>
              </button>
            </div>
          </div>

          {/* Bottom row: Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterOrigen}
              onChange={setFilterOrigen}
              options={FILTER_ORIGEN_OPTIONS}
            />

            <RoundedSelect
              value={filterEstado}
              onChange={setFilterEstado}
              options={FILTER_ESTADO_OPTIONS}
            />

            <RoundedSelect
              value={filterFormalidad}
              onChange={setFilterFormalidad}
              options={FILTER_FORMALIDAD_OPTIONS}
            />

            {tiposInfraccion.length > 0 && (
              <RoundedSelect
                value={filterTipoInfraccion}
                onChange={setFilterTipoInfraccion}
                options={tipoInfraccionOptions}
              />
            )}

            <RoundedSelect
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
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 text-center">N° Papeleta</th>
                <th className="px-3.5 py-3.5">Propietario</th>
                <th className="px-3.5 py-3.5">Infractor</th>
                <th className="px-3.5 py-3.5">Vehículo</th>
                <th className="px-3.5 py-3.5 text-center">Tipo Infractor</th>
                <th className="px-3.5 py-3.5 text-center">Infracción</th>
                <th className="px-3.5 py-3.5 text-center">Fecha & Hora</th>
                <th className="px-3.5 py-3.5 text-center">Monto</th>
                <th className="px-3.5 py-3.5 text-center">Estado Pago</th>
                <th className="px-3.5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
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
                      <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        <span className="font-mono font-extrabold text-rose-700 dark:text-rose-400">{p.numeroPapeleta}</span>
                        <div className="mt-0.5">{renderOrigen(p)}</div>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{p.propietarioNombre || 'No Registrado'}</p>
                        <p className="font-mono text-xs text-slate-400">DNI: {p.propietarioDni || 'S/D'}</p>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{p.conductorNombre || p.infractor || 'No Identificado'}</p>
                        <p className="font-mono text-xs text-slate-400">DNI: {p.conductorDni || 'S/D'}</p>
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        {p.vehiculoPlaca && p.vehiculoPlaca !== 'SIN PLACA' ? (
                          <span className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border-2 border-slate-900 bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black tracking-widest text-slate-950 dark:border-[var(--border)] dark:bg-amber-400 dark:text-slate-950">
                            {p.vehiculoPlaca}
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 font-mono text-[11px] font-black text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                              <Icon name="alert" className="size-3" /> SIN PLACA
                            </span>
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
                      <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        <span className="font-mono font-black text-slate-800 dark:text-white text-sm">S/ {p.montoTotal.toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <StatusBadge status={p.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : p.estado} />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {p.estado === 'ANULADA' ? (
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
          totalItems={filteredPapeletas.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
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
        />
      )}

      {reporteToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleRejectReporte} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-rose-50 px-6 py-4 dark:border-[var(--border)] dark:bg-rose-950/30">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Rechazar reporte #{reporteToReject.id}</h3>
              <button type="button" onClick={() => setReporteToReject(null)} className="rounded-full p-1 text-slate-400 hover:bg-white dark:hover:bg-[var(--bg-subtle)] dark:hover:text-white">✕</button>
            </div>
            <div className="space-y-3 p-6">
              <label className="block space-y-1">
                <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">Motivo</span>
                <textarea required value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white" placeholder="Ej. Foto insuficiente, placa ilegible, no procede..." />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
              <button type="button" onClick={() => setReporteToReject(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 dark:border-[var(--border-strong)] dark:text-slate-300">Cancelar</button>
              <button disabled={isProcessingAction} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Rechazar</button>
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
          setMetodoPago={setMetodoPago}
          isProcessingAction={isProcessingAction}
          onConfirmar={handleConfirmPagar}
        />
      )}


      {isPreviewModalOpen && (
        <PreviewTicketModal selectedPapeleta={selectedPapeleta} onClose={() => setIsPreviewModalOpen(false)} />
      )}

      {selectedInfraccion && (
        <InfraccionDetalleModal selectedInfraccion={selectedInfraccion} onClose={() => setSelectedInfraccion(null)} />
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
