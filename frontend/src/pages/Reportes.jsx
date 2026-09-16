import { useState, useEffect, useRef } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Reportes() {
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
  const [activeView, setActiveView] = useState('REPORTES')
  const [reportes, setReportes] = useState([])
  const [tiposInfraccion, setTiposInfraccion] = useState(cachedTipos || [])
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [asociaciones, setAsociaciones] = useState(cachedOrgs || [])
  const [isLoading, setIsLoading] = useState(!cachedPapeletas)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterOrigen, setFilterOrigen] = useState('TODOS')
  const [filterFormalidad, setFilterFormalidad] = useState('TODOS')
  const [filterTipoInfraccion, setFilterTipoInfraccion] = useState('TODOS')
  const [filterFecha, setFilterFecha] = useState('TODAS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isPagarModalOpen, setIsPagarModalOpen] = useState(false)
  const [selectedInfraccion, setSelectedInfraccion] = useState(null)
  const [papeletaToAction, setPapeletaToAction] = useState(null)
  const [reporteToConvert, setReporteToConvert] = useState(null)
  const [reporteToReject, setReporteToReject] = useState(null)
  const [convertForm, setConvertForm] = useState({ infraccionesIds: [''], vehiculoId: '', conductorDni: '', observacionesAutoridad: '' })
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

  const renderOrigen = (p) => {
    const isOperativo = p.origen === 'OPERATIVO' || p.operativoId
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase leading-none ${isOperativo
          ? 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/70 dark:text-fuchsia-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}>
        <span className="size-1 rounded-full bg-current" />
        {isOperativo ? 'OPERATIVO' : 'RUTINA'}
      </span>
    )
  }

  const loadData = () => {
    setIsLoading(true)
    Promise.all([
      apiFetch('/papeletas').then(res => res.json()).catch(() => ({ data: [] })),
      apiFetch('/tipos-infraccion').then(res => res.json()).catch(() => ({ data: [] })),
      apiFetch('/vehiculos').then(res => res.json()).catch(() => ({ data: [] })),
      apiFetch('/asociaciones').then(res => res.json()).catch(() => ({ data: [] })),
      apiFetch('/reportes-intervencion').then(res => res.json()).catch(() => ({ data: [] }))
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
    }).catch(err => {
      console.error('Error fetching data for papeletas:', err)
      setIsLoading(false)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenDetail = (papeleta) => {
    setSelectedPapeleta(papeleta)
    setIsDetailModalOpen(true)
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
        alert(Object.values(error.messages || {}).join(' ') || 'Error al procesar el pago')
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión al procesar el pago')
    } finally {
      setIsProcessingAction(false)
    }
  }

  const openConvertReporte = (reporte) => {
    const matchVehiculo = vehiculos.find((v) => String(v.placa || '').toUpperCase() === String(reporte.placa || reporte.placa_visual || '').toUpperCase())
    setReporteToConvert(reporte)
    setConvertForm({
      tipoInfraccionId: '',
      vehiculoId: String(reporte.id_vehiculo || matchVehiculo?.id || ''),
      conductorDni: '',
      observacionesAutoridad: reporte.observaciones || ''
    })
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
      alert(error.message || 'Error al convertir reporte.')
    } finally {
      setIsProcessingAction(false)
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
      alert(error.message || 'Error al rechazar reporte.')
    } finally {
      setIsProcessingAction(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md shadow-rose-500/20">
              <Icon name="ticket" className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
                  Control de Papeletas e Infracciones
                </h1>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Registro, notificación y gestión de cobro de actas de infracción al tránsito municipal.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Impuestas</span>
            <span className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <Icon name="ticket" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{totales}</p>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Histórico</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendientes</span>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold">⏳</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{pendientes}</p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">Por Cobrar</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pagadas</span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">✓</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{pagadas}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">S/ {montoRecaudado.toFixed(2)}</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Anuladas</span>
            <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">✕</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{anuladas}</p>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Prescritas</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <button
          type="button"
          onClick={() => setActiveView('PAPELETAS')}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeView === 'PAPELETAS' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
        >
          Papeletas registradas
        </button>
        <button
          type="button"
          onClick={() => setActiveView('REPORTES')}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeView === 'REPORTES' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
        >
          Reportes móviles
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{reportesPendientes}</span>
        </button>
      </div>

      {activeView === 'REPORTES' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Reportes móviles / evidencias</h2>
              <p className="text-xs font-semibold text-slate-500">No son papeletas. Administración decide si procede o no.</p>
            </div>
            <button onClick={loadData} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white">Actualizar</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reportes.length ? reportes.map((reporte) => (
              <div key={reporte.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_220px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${reporte.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-800' : reporte.estado === 'CONVERTIDO_PAPELETA' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {reporte.estado}
                    </span>
                    <span className="font-mono text-xs font-black text-slate-500">#{reporte.id}</span>
                    {reporte.numero_papeleta && <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-black text-rose-700">{reporte.numero_papeleta}</span>}
                  </div>
                  <h3 className="mt-2 text-base font-black text-slate-900 dark:text-white">
                    {reporte.placa_visual || 'SIN PLACA'} · {reporte.lugar}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{reporte.observaciones}</p>
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
                <p className="text-3xl">📷</p>
                <p className="font-bold text-slate-600 dark:text-slate-300">Aún no hay reportes móviles.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'PAPELETAS' && <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 min-w-[220px]">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código PAP, placa, infractor, DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-rose-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterOrigen}
              onChange={(e) => setFilterOrigen(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Todos los orígenes</option>
              <option value="OPERATIVO">🚨 Solo Operativos</option>
              <option value="RUTINA">📋 Solo Rutina</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE_PAGO">Pendientes de Pago</option>
              <option value="PAGADA">Pagadas</option>
              <option value="ANULADA">Anuladas</option>
            </select>

            <select
              value={filterFormalidad}
              onChange={(e) => setFilterFormalidad(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Formal / Informal</option>
              <option value="FORMAL">Formales</option>
              <option value="INFORMAL">Informales</option>
            </select>

            {tiposInfraccion.length > 0 && (
              <select
                value={filterTipoInfraccion}
                onChange={(e) => setFilterTipoInfraccion(e.target.value)}
                className="max-w-[170px] truncate rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="TODOS">Todas las infracciones</option>
                {tiposInfraccion.map((t) => (
                  <option key={t.id} value={t.codigo || t.id}>
                    {t.codigo} - {t.descripcion}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterFecha}
              onChange={(e) => setFilterFecha(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODAS">Todas las fechas</option>
              <option value="HOY">Hoy</option>
              <option value="SEMANA">Últimos 7 días</option>
              <option value="MES">Este mes</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer transition-colors"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
          <span>
            Mostrando <strong className="text-slate-800 dark:text-white">{filteredPapeletas.length}</strong> de{' '}
            <strong className="text-slate-800 dark:text-white">{papeletas.length}</strong> papeletas
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none">
              <span className="text-xs">✋</span> Arrastra para ver más columnas
            </span>
            {hasActiveFilters && (
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Filtros activos
              </span>
            )}
          </div>
        </div>

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
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">N° Papeleta</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Propietario</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Infractor</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Vehículo</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap text-center">Tipo Infractor</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap text-center">Infracción</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Fecha & Hora</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap text-right">Monto</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap text-center">Estado Pago</th>
                <th className="px-3.5 py-3.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && papeletas.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4 text-center"><div className="h-5 w-16 mx-auto rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4 text-right"><div className="h-4 w-16 ml-auto rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4 text-center"><div className="h-5 w-16 mx-auto rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4 text-right"><div className="h-7 w-28 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredPapeletas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-slate-400">
                    <p className="text-3xl">🎫</p>
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron papeletas</p>
                  </td>
                </tr>
              ) : (
                paginatedPapeletas.map((p) => {
                  const tipoInf = tiposInfraccion.find((t) => t.id === p.detalles?.[0]?.tipoInfraccionId)
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-rose-50/30 dark:hover:bg-slate-800/40">
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-extrabold text-rose-700 dark:text-rose-400">{p.numeroPapeleta}</span>
                        <div className="mt-0.5">{renderOrigen(p)}</div>
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{p.propietarioNombre || 'No Registrado'}</p>
                        <p className="font-mono text-xs text-slate-400">DNI: {p.propietarioDni || 'S/D'}</p>
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{p.conductorNombre || p.infractor || 'No Identificado'}</p>
                        <p className="font-mono text-xs text-slate-400">DNI: {p.conductorDni || 'S/D'}</p>
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        {p.vehiculoPlaca && p.vehiculoPlaca !== 'SIN PLACA' ? (
                          <div>
                            <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black tracking-widest text-slate-950 dark:border-slate-800 dark:bg-amber-400 dark:text-slate-950">
                              {p.vehiculoPlaca}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                              {p.vehiculoCaracteristicas}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 font-mono text-[11px] font-black text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                              ⚠️ SIN PLACA
                            </span>
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                              {p.vehiculoCaracteristicas || 'Características Obligatorias'}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap text-center">
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
                      <td className="px-3.5 py-3.5 whitespace-nowrap text-center">
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
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <p className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">{new Date(p.fechaHora).toLocaleDateString()}</p>
                        <p className="text-[11px] text-slate-400">{new Date(p.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap text-right">
                        <span className="font-mono font-black text-slate-800 dark:text-white text-sm">S/ {p.montoTotal.toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap text-center">
                        <span className={`mx-auto inline-flex min-w-[92px] items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${p.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : p.estado === 'PENDIENTE_PAGO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          <span className="size-2 rounded-full bg-current" />
                          {p.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : p.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {p.estado === 'ANULADA' ? (
                            <button
                              type="button"
                              disabled
                              className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-400 shadow-xs cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                              title="Papeleta anulada - No se puede pagar"
                            >
                              <Icon name="payment" className="size-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPagar(p)}
                              disabled={p.estado === 'PAGADA'}
                              className={`grid size-9 place-items-center rounded-full shadow-xs transition-all ${p.estado === 'PAGADA'
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 cursor-pointer'
                                }`}
                              title={p.estado === 'PAGADA' ? 'Papeleta ya pagada' : 'Pagar papeleta'}
                            >
                              <Icon name="payment" className="size-4" />
                            </button>
                          )}
                          <button onClick={() => handleOpenDetail(p)} className="grid size-9 place-items-center rounded-full bg-rose-50 text-rose-600 transition-all hover:bg-rose-500 hover:text-white hover:shadow-md dark:bg-rose-950/60 dark:text-rose-400 cursor-pointer" title="Ver Detalle">
                            <Icon name="eye" className="size-4" />
                          </button>
                          <button onClick={() => handleOpenPreview(p)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-800 hover:text-white hover:shadow-md dark:bg-slate-800 dark:text-slate-300 cursor-pointer" title="Imprimir Boleta">
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

      {isDetailModalOpen && selectedPapeleta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-rose-600/20 bg-rose-50 p-5 dark:bg-rose-950/30">
              <div>
                <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">{selectedPapeleta.numeroPapeleta}</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-white cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[80vh]">

              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Identificación de la Falta</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Código</p>
                      <p className="font-extrabold text-slate-800 dark:text-white text-sm">{selectedPapeleta.tipoInfraccionCodigo || selectedPapeleta.detalles?.[0]?.codigo || 'G01'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Calificación</p>
                      <p className="font-extrabold text-slate-800 dark:text-white">{selectedPapeleta.tipoInfraccionGravedad || selectedPapeleta.detalles?.[0]?.gravedad || 'LEVE'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400">Descripción</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{selectedPapeleta.tipoInfraccionDescripcion || selectedPapeleta.detalles?.[0]?.descripcion || 'Infracción al Reglamento'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Lugar y Fecha</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Fecha y Hora</p>
                      <p className="font-bold text-slate-800 dark:text-white">{new Date(selectedPapeleta.fechaHora).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Ubicación</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.lugar}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400">Origen</p>
                      <div className="mt-1">{renderOrigen(selectedPapeleta)}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Intervinientes y Vehículo</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Propietario</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.propietarioNombre || 'No Registrado'}</p>
                      <p className="font-mono text-[11px] text-slate-400">DNI/RUC: {selectedPapeleta.propietarioDni || 'S/D'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Infractor</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.conductorNombre || selectedPapeleta.infractor}</p>
                      <p className="font-mono text-[11px] text-slate-400">DNI: {selectedPapeleta.conductorDni || 'S/D'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Vehículo</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.vehiculoPlaca}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{selectedPapeleta.vehiculoCaracteristicas}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Tipo Infractor</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${selectedPapeleta.tipoInfractor === 'FORMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'}`}>
                        {selectedPapeleta.tipoInfractor || 'INFORMAL'}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400">Inspector</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.inspector} {selectedPapeleta.inspectorCIP ? `(CIP: ${selectedPapeleta.inspectorCIP})` : ''}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Estado Económico</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                    <div>
                      <p className="text-slate-400">Monto Base</p>
                      <p className="font-bold text-slate-800 dark:text-white">S/ {parseFloat(selectedPapeleta.detalles?.[0]?.monto || selectedPapeleta.montoTotal).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Descuento</p>
                      <p className="font-bold text-emerald-600">S/ {parseFloat(selectedPapeleta.detalles?.[0]?.descuento || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Estado de Pago</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${selectedPapeleta.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : selectedPapeleta.estado}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400">Total</p>
                      <p className="font-mono font-black text-base text-rose-600 dark:text-rose-400">S/ {selectedPapeleta.montoTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Firma del conductor</h4>
                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <p className="text-slate-400">Estado</p>
                      <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${selectedPapeleta.firmaConductorEstado === 'FIRMADO'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : selectedPapeleta.firmaConductorEstado === 'SE_NEGO_A_FIRMAR'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                            : selectedPapeleta.firmaConductorEstado === 'NO_PRESENTE'
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                        }`}>
                        <span className="size-2 rounded-full bg-current" />
                        {selectedPapeleta.firmaConductorEstado || 'PENDIENTE'}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400">Fecha y hora de firma</p>
                      <p className="font-bold text-slate-800 dark:text-white">
                        {selectedPapeleta.firmaConductorFecha
                          ? new Date(selectedPapeleta.firmaConductorFecha).toLocaleString()
                          : 'Sin fecha registrada'}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-400">Observación</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {selectedPapeleta.firmaConductorObservacion || 'Sin observación'}
                      </p>
                    </div>
                    {selectedPapeleta.firmaConductorImg && (
                      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                        <p className="mb-2 text-slate-400">Firma registrada</p>
                        <img
                          src={selectedPapeleta.firmaConductorImg}
                          alt="Firma del conductor"
                          className="max-h-24 rounded-lg object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => { setIsDetailModalOpen(false); handleOpenPreview(selectedPapeleta); }} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-slate-800 transition">Imprimir Boleta</button>
                <button onClick={() => setIsDetailModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reporteToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleConvertReporte} className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50 px-6 py-4 dark:border-slate-800 dark:bg-emerald-950/30">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Generar papeleta desde reporte</h3>
                <p className="text-xs font-bold text-slate-500">Si no ingresas DNI, quedará como CONDUCTOR NO PRESENTE.</p>
              </div>
              <button type="button" onClick={() => setReporteToConvert(null)} className="rounded-full p-1 text-slate-400 hover:bg-white">✕</button>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                <p><strong>Reporte:</strong> #{reporteToConvert.id} · {reporteToConvert.placa_visual || 'SIN PLACA'}</p>
                <p><strong>Lugar:</strong> {reporteToConvert.lugar}</p>
                <p><strong>Observación:</strong> {reporteToConvert.observaciones}</p>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-black uppercase text-slate-400">Vehículo identificado</span>
                <select required value={convertForm.vehiculoId} onChange={(e) => setConvertForm({ ...convertForm, vehiculoId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
                  <option value="">Selecciona vehículo</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.marca || ''} {v.modelo || ''}</option>
                  ))}
                </select>
              </label>
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-400">Infracciones a Aplicar</span>
                {convertForm.infraccionesIds.map((infId, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select required value={infId} onChange={(e) => {
                      const newIds = [...convertForm.infraccionesIds]
                      newIds[idx] = e.target.value
                      setConvertForm({ ...convertForm, infraccionesIds: newIds })
                    }} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
                      <option value="">Selecciona infracción</option>
                      {tiposInfraccion.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>{tipo.codigo} — {tipo.descripcion} · S/ {Number(tipo.montoBase || 0).toFixed(2)}</option>
                      ))}
                    </select>
                    {convertForm.infraccionesIds.length > 1 && (
                      <button type="button" onClick={() => {
                        const newIds = [...convertForm.infraccionesIds]
                        newIds.splice(idx, 1)
                        setConvertForm({ ...convertForm, infraccionesIds: newIds })
                      }} className="flex items-center justify-center rounded-xl bg-rose-100 px-3 py-2 text-rose-600 hover:bg-rose-200">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setConvertForm({ ...convertForm, infraccionesIds: [...convertForm.infraccionesIds, ''] })} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
                  + Añadir otra infracción
                </button>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-black uppercase text-slate-400">DNI del infractor/intervenido opcional</span>
                <input value={convertForm.conductorDni} onChange={(e) => setConvertForm({ ...convertForm, conductorDni: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="Vacío = CONDUCTOR NO PRESENTE" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-black uppercase text-slate-400">Observación de autoridad</span>
                <textarea value={convertForm.observacionesAutoridad} onChange={(e) => setConvertForm({ ...convertForm, observacionesAutoridad: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => setReporteToConvert(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancelar</button>
              <button disabled={isProcessingAction} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Generar papeleta</button>
            </div>
          </form>
        </div>
      )}

      {reporteToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleRejectReporte} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-rose-50 px-6 py-4 dark:border-slate-800 dark:bg-rose-950/30">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Rechazar reporte #{reporteToReject.id}</h3>
              <button type="button" onClick={() => setReporteToReject(null)} className="rounded-full p-1 text-slate-400 hover:bg-white">✕</button>
            </div>
            <div className="space-y-3 p-6">
              <label className="block space-y-1">
                <span className="text-xs font-black uppercase text-slate-400">Motivo</span>
                <textarea required value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" placeholder="Ej. Foto insuficiente, placa ilegible, no procede..." />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => setReporteToReject(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancelar</button>
              <button disabled={isProcessingAction} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Rechazar</button>
            </div>
          </form>
        </div>
      )}

      {isPagarModalOpen && papeletaToAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-emerald-500/30 dark:border-emerald-500/20">
            <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-6 py-4 dark:border-emerald-900/30 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white font-black text-sm">
                  💳
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Registro de Pago de Papeleta</h3>
                  <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">Papeleta: {papeletaToAction.numeroPapeleta}</p>
                </div>
              </div>
              <button onClick={() => setIsPagarModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Infractor:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{papeletaToAction.conductorNombre || papeletaToAction.infractor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Placa / Vehículo:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{papeletaToAction.vehiculoPlaca}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Infracción:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{papeletaToAction.tipoInfraccionCodigo || 'G01'}</span>
                </div>
                <div className="border-t border-emerald-200 dark:border-emerald-800/60 pt-2 flex justify-between items-center">
                  <span className="font-black text-slate-700 dark:text-slate-300 uppercase">Monto a Cancelar:</span>
                  <span className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">S/ {papeletaToAction.montoTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">Recibo real
                  <input maxLength={50} value={numeroRecibo} onChange={e => setNumeroRecibo(e.target.value)} className="mt-1 w-full rounded-xl border p-3 dark:bg-slate-800" />
                </label>
                <label className="text-xs font-bold">Fecha de pago
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} className="mt-1 w-full rounded-xl border p-3 dark:bg-slate-800" />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Método de Pago:
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="EFECTIVO">Efectivo en Caja Municipal</option>
                  <option value="TRANSFERENCIA">Transferencia / Depósito Bancario</option>
                  <option value="TARJETA">Tarjeta de Débito / Crédito</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPagarModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPagar}
                  disabled={isProcessingAction || !numeroRecibo.trim() || !fechaPago}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-black text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Icon name="payment" className="size-4" />
                  <span>{isProcessingAction ? 'Procesando...' : 'Confirmar recibo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {isPreviewModalOpen && selectedPapeleta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-enter print:bg-white print:p-0">
          <div className="absolute top-4 right-4 flex gap-3 print:hidden">
            <button onClick={() => window.print()} className="rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-rose-600 shadow-lg hover:bg-rose-50 cursor-pointer flex items-center gap-2">
              <Icon name="print" className="size-4" /> Imprimir Ticket
            </button>
            <button onClick={() => setIsPreviewModalOpen(false)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg hover:bg-slate-800 cursor-pointer">
              Cerrar
            </button>
          </div>

          <div className="w-full max-w-[320px] bg-white text-black font-mono text-[11px] leading-tight shadow-2xl print:shadow-none print:max-w-full">
            <div className="p-4 border border-slate-200 print:border-none print:p-0">
              <div className="text-center mb-3">
                <h2 className="text-sm font-black uppercase mb-1">MUNICIPALIDAD DISTRITAL</h2>
                <h3 className="text-xs font-bold uppercase mb-1">José Leonardo Ortiz</h3>
                <p className="text-[10px]">Subgerencia de Tránsito</p>
                <p className="text-[10px]">RUC: 20141234567</p>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              <div className="text-center mb-2">
                <h3 className="font-black text-sm uppercase">BOLETA DE INFRACCIÓN</h3>
                <p className="font-bold text-sm mt-0.5">{selectedPapeleta.numeroPapeleta}</p>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span className="font-bold">FECHA/HORA:</span>
                  <span>{new Date(selectedPapeleta.fechaHora).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-bold">LUGAR:</span>
                  <p className="break-words">{selectedPapeleta.lugar}</p>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              <div className="space-y-1 mb-2">
                <span className="font-bold">INFRACCIONES:</span>
                {selectedPapeleta.detalles?.length > 0 ? (
                  selectedPapeleta.detalles.map((d, i) => (
                    <div key={i} className="flex justify-between pl-2">
                      <span>{d.codigo} ({d.gravedad || 'LEVE'})</span>
                      <span>S/ {parseFloat(d.monto || selectedPapeleta.montoTotal).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between pl-2">
                    <span>{selectedPapeleta.tipoInfraccionCodigo || 'N/A'}</span>
                    <span>S/ {selectedPapeleta.montoTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span className="font-bold">PLACA:</span>
                  <span>{selectedPapeleta.vehiculoPlaca}</span>
                </div>
                <div>
                  <span className="font-bold">INFRACTOR:</span>
                  <p className="break-words uppercase">{selectedPapeleta.infractor}</p>
                </div>
                <div>
                  <span className="font-bold">INSPECTOR:</span>
                  <p className="break-words uppercase">
                    {selectedPapeleta.inspector} {selectedPapeleta.inspectorCIP ? `(CIP: ${selectedPapeleta.inspectorCIP})` : ''}
                  </p>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span>Monto Base:</span>
                  <span>S/ {parseFloat(selectedPapeleta.detalles?.[0]?.monto || selectedPapeleta.montoTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Descuento:</span>
                  <span>- S/ {parseFloat(selectedPapeleta.detalles?.[0]?.descuento || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos/Int:</span>
                  <span>+ S/ 0.00</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              <div className="flex justify-between items-center my-2">
                <span className="font-black text-sm uppercase">Total a Pagar:</span>
                <span className="font-black text-sm">S/ {selectedPapeleta.montoTotal.toFixed(2)}</span>
              </div>

              <div className="text-center mt-1">
                <span className="text-[10px] uppercase block">Estado: {selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : selectedPapeleta.estado}</span>
              </div>

              {selectedPapeleta.firmaConductorImg && (
                <>
                  <div className="border-t-2 border-dashed border-black my-2"></div>
                  <div className="text-center mt-2 flex flex-col items-center">
                    <img src={selectedPapeleta.firmaConductorImg} alt="Firma Conductor" className="max-h-16 object-contain" />
                    <span className="text-[10px] uppercase font-bold mt-1">Firma del Infractor</span>
                  </div>
                </>
              )}

              <div className="border-t-2 border-dashed border-black my-2"></div>

              <div className="text-center mt-3 text-[9px] text-slate-800">
                <p>Tiene 5 días hábiles para acceder</p>
                <p>al descuento por pronto pago.</p>
                <p className="mt-2 font-bold">Conserve este ticket</p>
                <p>www.munijlo.gob.pe/transito</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedInfraccion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter"
          onClick={() => setSelectedInfraccion(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/80 px-5 py-4 dark:border-rose-950/60 dark:bg-rose-950/40">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-rose-600 text-white font-black text-sm shadow-sm shadow-rose-500/30">
                  ⚖️
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Detalle de Infracción
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Reglamento de Tránsito Municipal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInfraccion(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Código</span>
                  <p className="text-2xl font-black font-mono text-rose-700 dark:text-rose-400">
                    {selectedInfraccion.codigo}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gravedad</span>
                  <div className="mt-0.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ${selectedInfraccion.gravedad === 'MUY GRAVE'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        : selectedInfraccion.gravedad === 'GRAVE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                      }`}>
                      {selectedInfraccion.gravedad}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Descripción
                </h4>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs font-medium leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                  {selectedInfraccion.descripcion}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {selectedInfraccion.monto > 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Monto Multa</span>
                    <p className="text-base font-black font-mono text-slate-900 dark:text-white">
                      S/ {Number(selectedInfraccion.monto).toFixed(2)}
                    </p>
                  </div>
                )}
                {selectedInfraccion.porcentajeUit && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sanción UIT</span>
                    <p className="text-base font-black font-mono text-slate-900 dark:text-white">
                      {selectedInfraccion.porcentajeUit}% UIT
                    </p>
                  </div>
                )}
                {selectedInfraccion.numeroPapeleta && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Papeleta Asociada</span>
                    <p className="text-xs font-bold font-mono text-rose-700 dark:text-rose-400">
                      {selectedInfraccion.numeroPapeleta}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setSelectedInfraccion(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition cursor-pointer"
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
