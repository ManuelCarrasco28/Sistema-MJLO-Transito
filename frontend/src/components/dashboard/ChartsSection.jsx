import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { apiFetch, getCachedData, setCachedData } from '../../config/api'

export function ChartsSection({ data, loading = false, user }) {
  const rolNormalizado = (user?.rol || '').toUpperCase()
  const isOffice = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA', 'ADMINISTRATIVO'].includes(rolNormalizado)
  const navigate = useNavigate()
  const [expandedChart, setExpandedChart] = useState(null)
  const [expandedMultasPagos, setExpandedMultasPagos] = useState(null)
  const [selectedYear, setSelectedYear] = useState('2026')
  const [operationsZoom, setOperationsZoom] = useState(0)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [operativos, setOperativos] = useState(() => getCachedData('/operativos') || [])
  const [cursos, setCursos] = useState(() => getCachedData('/cursos') || [])
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const operationsChartRef = useRef(null)

  useEffect(() => {
    let active = true
    Promise.allSettled([
      apiFetch('/operativos').then((r) => (r.ok ? r.json() : { data: [] })),
      apiFetch('/cursos').then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([opRes, curRes]) => {
        if (!active) return
        const ops = opRes.status === 'fulfilled' && Array.isArray(opRes.value?.data) ? opRes.value.data : []
        const curs = curRes.status === 'fulfilled' && Array.isArray(curRes.value?.data) ? curRes.value.data : []
        setOperativos(ops)
        setCursos(curs)
        setCachedData('/operativos', ops)
        setCachedData('/cursos', curs)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  const emptyMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'].map((month) => ({ month, multas: 0, pagos: 0 }))
  const expedientesBreakdown = data?.expedientes ?? [
    { label: 'Vigentes', value: 0, percent: '0%', color: 'bg-[#4318FF]', progress: '0%' },
    { label: 'Observados', value: 0, percent: '0%', color: 'bg-[#39B8FF]', progress: '0%' },
    { label: 'Por vencer', value: 0, percent: '0%', color: 'bg-[#FFB547]', progress: '0%' },
  ]
  const multasPagosPorAnio = data?.multasPagosPorAnio ?? {
    2026: { totals: { multas: 0, pagos: 0, pendiente: 0 }, months: emptyMonths },
  }
  const availableYears = Object.keys(multasPagosPorAnio).sort((a, b) => Number(b) - Number(a))
  const parseNumber = (value) => Number(String(value).replaceAll(',', '').replace('S/', '').replace('%', '').trim())
  const formatNumber = (value) => new Intl.NumberFormat('es-PE').format(value)
  const selectedDataYear = multasPagosPorAnio[selectedYear] ? selectedYear : availableYears[0]
  const isAllYearsSelected = selectedYear === 'todos'
  const multasPagos = multasPagosPorAnio[isAllYearsSelected ? selectedDataYear : selectedDataYear] || { totals: { multas: 0, pagos: 0, pendiente: 0 }, months: emptyMonths }
  const totalMultasHistorico = Object.values(multasPagosPorAnio).reduce((sum, data) => sum + parseNumber(data.totals?.multas || 0), 0)
  const totalPagosHistorico = Object.values(multasPagosPorAnio).reduce((sum, data) => sum + parseNumber(data.totals?.pagos || 0), 0)
  const totalPendienteHistorico = Object.values(multasPagosPorAnio).reduce((sum, data) => sum + parseNumber(data.totals?.pendiente || 0), 0)
  const multasPagosResumen = isAllYearsSelected
    ? { multas: formatNumber(totalMultasHistorico), pagos: formatNumber(totalPagosHistorico), pendiente: `S/ ${formatNumber(totalPendienteHistorico)}` }
    : (multasPagos.totals || { multas: 0, pagos: 0, pendiente: 0 })
  const getMonthlyValues = (year, data) => {
    const totalMultas = parseNumber(data.totals?.multas || 0)
    const totalPagos = parseNumber(data.totals?.pagos || 0)
    const rawItems = (data.months || []).map((monthItem) => ({
      type: 'month',
      title: `${monthItem.month} ${year}`,
      period: year === '2026' ? 'Año actual' : 'Periodo anual',
      month: monthItem.month,
      year,
      multas: parseNumber(monthItem.multas),
      pagos: parseNumber(monthItem.pagos),
    }))
    const maxValue = Math.max(1, ...rawItems.flatMap((item) => [item.multas, item.pagos]), totalMultas, totalPagos)
    return rawItems.map((item) => ({
      ...item,
      pendiente: Math.max(item.multas - item.pagos, 0),
      multasHeight: `${Math.max(12, Math.round((item.multas / maxValue) * 100))}%`,
      pagosHeight: `${Math.max(12, Math.round((item.pagos / maxValue) * 100))}%`,
    }))
  }
  const yearlyMax = Math.max(1, ...Object.values(multasPagosPorAnio).flatMap((data) => [parseNumber(data.totals?.multas || 0), parseNumber(data.totals?.pagos || 0)]))
  const yearlyMultasPagos = Object.entries(multasPagosPorAnio)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, data]) => ({
      type: 'year',
      title: year,
      year,
      label: year === '2026' ? 'Ene - Sep' : 'Ene - Dic',
      multas: parseNumber(data.totals?.multas || 0),
      pagos: parseNumber(data.totals?.pagos || 0),
      pendiente: parseNumber(data.totals?.pendiente || 0),
      multasHeight: `${Math.max(8, Math.round((parseNumber(data.totals?.multas || 0) / yearlyMax) * 100))}%`,
      pagosHeight: `${Math.max(8, Math.round((parseNumber(data.totals?.pagos || 0) / yearlyMax) * 100))}%`,
    }))
  const monthlyMultasPagos = getMonthlyValues(selectedDataYear, multasPagos)
  const vehiculosDeposito = data?.vehiculosDeposito ?? [
    { label: 'En depósito', value: 62, percent: '78%', color: 'bg-orange-500', progress: '78%' },
    { label: 'Liberados', value: 18, percent: '22%', color: 'bg-[#01B574]', progress: '22%' },
  ]
  const asociaciones = data?.asociaciones ?? []
  const operatividad = data?.operatividad ?? []
  const totalOperatividad = operatividad.reduce((sum, item) => sum + item.value, 0)
  const operationsData = data?.operacionesMensuales ?? emptyMonths.map(({ month }) => ({ month, registros: 0, inspecciones: 0 }))
  const totalExpedientes = expedientesBreakdown.reduce((sum, item) => sum + parseNumber(item.value), 0)
  const totalVehiculosDeposito = vehiculosDeposito.reduce((sum, item) => sum + parseNumber(item.value), 0)
  const enDepositoValue = vehiculosDeposito.find(v => v.label === 'En depósito')?.value || 0
  const liberadosValue = vehiculosDeposito.find(v => v.label === 'Liberados')?.value || 0
  const depositoPercent = vehiculosDeposito.find(v => v.label === 'En depósito')?.percent?.replace('%', '') || 0
  const zoomWindows = [9, 6, 4, 3]
  const visibleOperations = operationsData.slice(-zoomWindows[operationsZoom])
  const chartWidth = 600
  const chartHeight = 180
  const chartMax = Math.max(1, Math.ceil(Math.max(...operationsData.flatMap((item) => [item.registros, item.inspecciones])) / 10) * 10)
  const xStep = visibleOperations.length > 1 ? chartWidth / (visibleOperations.length - 1) : chartWidth
  const toPoint = (item, index, key) => {
    const x = index * xStep
    const y = chartHeight - (item[key] / chartMax) * 150 - 10
    return `${x},${y}`
  }
  const registrosPoints = visibleOperations.map((item, index) => toPoint(item, index, 'registros')).join(' ')
  const inspeccionesPoints = visibleOperations.map((item, index) => toPoint(item, index, 'inspecciones')).join(' ')
  const areaPoints = `0,170 ${registrosPoints} ${chartWidth},170`
  const circularCharts = {
    expedientes: {
      title: 'Estado de expedientes',
      subtitle: 'Distribución ampliada de documentos vigentes y observados',
      total: formatNumber(totalExpedientes),
      unit: 'expedientes',
      background: 'conic-gradient(#4318FF 0 68%, #39B8FF 68% 88%, #FFB547 88% 100%)',
      ring: 'border-[#4318FF]/20',
      items: expedientesBreakdown,
    },
    deposito: {
      title: 'Vehículos en depósito',
      subtitle: 'Detalle ampliado de unidades retenidas y liberadas',
      total: formatNumber(totalVehiculosDeposito),
      unit: 'unidades',
      background: 'conic-gradient(#f97316 0 58%, #10b981 58% 100%)',
      ring: 'border-orange-300/50',
      items: vehiculosDeposito,
    },
  }
  const currentExpanded = expandedChart ? circularCharts[expandedChart] : null

  useEffect(() => {
    if (!expandedChart && !expandedMultasPagos) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setExpandedChart(null)
        setExpandedMultasPagos(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [expandedChart, expandedMultasPagos])

  useEffect(() => {
    const chartElement = operationsChartRef.current
    if (!chartElement) return undefined

    function handleWheel(event) {
      event.preventDefault()
      event.stopPropagation()
      setOperationsZoom((current) => {
        if (event.deltaY > 0) return Math.min(current + 1, zoomWindows.length - 1)
        return Math.max(current - 1, 0)
      })
    }

    chartElement.addEventListener('wheel', handleWheel, { passive: false })
    return () => chartElement.removeEventListener('wheel', handleWheel)
  }, [zoomWindows.length])

  // Calendar Logic
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']
  
  const currentYear = calendarDate.getFullYear()
  const currentMonth = calendarDate.getMonth()
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)
  
  const today = new Date()
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear
  
  const handlePrevMonth = () => {
    setSelectedCalendarDay(null)
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1))
  }
  const handleNextMonth = () => {
    setSelectedCalendarDay(null)
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const getEventsForDay = (year, month, day) => {
    const monthStr = String(month + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const datePrefix = `${year}-${monthStr}-${dayStr}`

    const dayOperativos = operativos.filter((op) => {
      if (!op.fecha) return false
      return String(op.fecha).slice(0, 10) === datePrefix
    })

    const dayCursos = cursos.filter((c) => {
      const fecha = c.fecha || c.fecha_inicio
      if (!fecha) return false
      return String(fecha).slice(0, 10) === datePrefix
    })

    return {
      dateStr: datePrefix,
      day,
      operativos: dayOperativos,
      cursos: dayCursos,
      hasEvents: dayOperativos.length > 0 || dayCursos.length > 0,
    }
  }

  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const monthOperativos = useMemo(() => {
    return operativos.filter((op) => op.fecha && String(op.fecha).startsWith(currentMonthPrefix))
  }, [operativos, currentMonthPrefix])

  const monthCursos = useMemo(() => {
    return cursos.filter((c) => {
      const fecha = c.fecha || c.fecha_inicio
      return fecha && String(fecha).startsWith(currentMonthPrefix)
    })
  }, [cursos, currentMonthPrefix])

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-start">
        {/* LEFT COLUMN (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-7">
          
          {/* 1. Operaciones mensuales (Restaurado interactivo svg) */}
          {isOffice && (
          <article className="bg-white dark:bg-[var(--bg-surface)] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '460ms' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-extrabold text-[#2B3674] dark:text-white tracking-tight">Operaciones mensuales</h3>
                <p className="mt-0.5 text-xs text-[#A3AED0]">Trámites e inspecciones registradas en la base de datos</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs font-semibold text-[#A3AED0]">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#4318FF]" />
                    Registros
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#39B8FF]" />
                    Inspecciones
                  </span>
                </div>
                <span className="rounded-lg bg-[#F4F7FE] dark:bg-white/5 px-2.5 py-1 text-xs font-bold text-[#707EAE]">
                  {visibleOperations.length} meses
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div ref={operationsChartRef} className="relative h-52 w-full overscroll-contain">
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-[#A3AED0]" aria-hidden="true">
                  {[80, 60, 40, 20, 0].map((value) => (
                    <div key={value} className="flex items-center gap-3">
                      <span className="w-5 text-right font-medium">{Math.round((chartMax * value) / 80)}</span>
                      <span className="h-px flex-1 bg-[#F4F7FE] dark:bg-white/5" />
                    </div>
                  ))}
                </div>
                <svg
                  role="img"
                  aria-label="Gráfico de operaciones mensuales"
                  viewBox="0 0 600 180"
                  preserveAspectRatio="none"
                  className="absolute inset-x-8 bottom-3 top-2 h-[calc(100%-1.25rem)] w-[calc(100%-3rem)] overflow-visible"
                >
                  <defs>
                    <linearGradient id="tailAreaBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#4318FF" stopOpacity="0.22" />
                      <stop offset="1" stopColor="#4318FF" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <path key={`area-${operationsZoom}`} className="chart-area transition-all duration-300" d={`M${areaPoints} Z`} fill="url(#tailAreaBlue)" />
                  <polyline
                    key={`registros-${operationsZoom}`}
                    className="chart-line transition-all duration-300"
                    points={registrosPoints}
                    fill="none"
                    stroke="#4318FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />
                  <polyline
                    key={`inspecciones-${operationsZoom}`}
                    className="chart-line transition-all duration-300"
                    points={inspeccionesPoints}
                    fill="none"
                    stroke="#39B8FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="6 6"
                    filter="url(#glow)"
                  />
                  {visibleOperations.map((item, index) => {
                    const [cx, cy] = toPoint(item, index, 'registros').split(',')
                    return (
                      <circle
                        key={`${operationsZoom}-${item.month}`}
                        className="chart-point transition-all duration-300"
                        style={{ animationDelay: `${900 + index * 90}ms` }}
                        cx={cx}
                        cy={cy}
                        r="4.5"
                        fill="white"
                        stroke="#4318FF"
                        strokeWidth="2.5"
                      />
                    )
                  })}
                </svg>
              </div>
              <div className="ml-8 flex justify-between text-center text-xs font-semibold text-[#A3AED0]">
                {visibleOperations.map((item) => (
                  <span key={item.month}>{item.month}</span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-end rounded-xl bg-[#F4F7FE] dark:bg-white/5 px-3 py-2 text-xs font-bold text-[#707EAE]">
                <span>
                  {visibleOperations[0]?.month} - {visibleOperations[visibleOperations.length - 1]?.month} {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </article>
          )}

          {/* Multas y pagos registrados (Restaurado interactivo) */}
          {isOffice && (
          <article className="bg-white dark:bg-[var(--bg-surface)] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '610ms' }}>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-[#2B3674] dark:text-white tracking-tight">Multas y pagos registrados</h2>
                <p className="mt-0.5 text-xs text-[#A3AED0]">Comparativo anual por meses de papeletas emitidas y pagos atendidos</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-[#F4F7FE] dark:bg-white/5 px-3 py-1.5 text-xs font-bold text-[#707EAE]">
                <label htmlFor="filtro-anio-multas" className="uppercase tracking-wider">Año</label>
                <select
                  id="filtro-anio-multas"
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="bg-transparent font-extrabold text-[#2B3674] dark:text-white border-none outline-none focus:ring-0 p-0 text-xs"
                >
                  <option value="todos">Todos</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 mb-6">
              <div className="rounded-xl border border-[#EE5D50]/10 bg-[#FEEFEE] dark:bg-rose-500/20 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#EE5D50]">Multas</p>
                <p className="text-lg font-extrabold text-[#2B3674] dark:text-white">{multasPagosResumen.multas}</p>
              </div>
              <div className="rounded-xl border border-[#01B574]/10 bg-[#E6F9F0] dark:bg-emerald-500/20 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#01B574]">Pagos</p>
                <p className="text-lg font-extrabold text-[#2B3674] dark:text-white">{multasPagosResumen.pagos}</p>
              </div>
              <div className="rounded-xl border border-[#FFB547]/10 bg-[#FFF5E6] dark:bg-amber-500/20 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFB547]">Pendiente</p>
                <p className="text-lg font-extrabold text-[#2B3674] dark:text-white">{multasPagosResumen.pendiente}</p>
              </div>
            </div>

            {isAllYearsSelected ? (
              <div className="mt-4 rounded-2xl border border-[#F4F7FE] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F4F7FE] pb-3 mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#2B3674] dark:text-white">Comparativo por años</h3>
                    <p className="mt-0.5 text-xs text-[#A3AED0]">Vista general de multas emitidas y pagos registrados</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {yearlyMultasPagos.map((item, index) => (
                    <button
                      type="button"
                      key={item.year}
                      onClick={() => setExpandedMultasPagos(item)}
                      className="group rounded-2xl border border-[#F4F7FE] bg-white dark:bg-[#111C44] hover:border-[#4318FF]/30 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-horizon dark:shadow-none text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xl font-black text-[#2B3674] dark:text-white">{item.year}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AED0]">{item.label}</p>
                        </div>
                        <Icon name="arrow" className="size-4 text-[#A3AED0] transition group-hover:translate-x-1 group-hover:text-[#4318FF]" />
                      </div>

                      <div className="flex h-24 items-end justify-center gap-4 border-b border-[#F4F7FE] pb-2 mb-3">
                        <div className="flex h-full w-8 items-end rounded-t-xl bg-[#FEEFEE] dark:bg-rose-500/20">
                          <span
                            className="block w-full rounded-t-xl bg-[#EE5D50]"
                            style={{ height: item.multasHeight, transition: 'height 0.5s ease-out' }}
                          />
                        </div>
                        <div className="flex h-full w-8 items-end rounded-t-xl bg-[#E6F9F0] dark:bg-emerald-500/20">
                          <span
                            className="block w-full rounded-t-xl bg-[#01B574]"
                            style={{ height: item.pagosHeight, transition: 'height 0.5s ease-out' }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-[#F4F7FE] dark:bg-white/5 px-2 py-1.5">
                          <p className="font-bold text-[#EE5D50] text-[10px]">Multas</p>
                          <p className="text-sm font-black text-[#2B3674] dark:text-white">{formatNumber(item.multas)}</p>
                        </div>
                        <div className="rounded-xl bg-[#F4F7FE] dark:bg-white/5 px-2 py-1.5">
                          <p className="font-bold text-[#01B574] text-[10px]">Pagos</p>
                          <p className="text-sm font-black text-[#2B3674] dark:text-white">{formatNumber(item.pagos)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 mt-4">
                {monthlyMultasPagos.map((item, index) => (
                  <button
                    type="button"
                    key={`${selectedDataYear}-${item.month}`}
                    onClick={() => setExpandedMultasPagos(item)}
                    className="rounded-xl border border-[#F4F7FE] bg-white dark:bg-[#111C44] p-3 text-left transition hover:-translate-y-1 hover:border-[#4318FF]/30 hover:shadow-horizon dark:shadow-none cursor-pointer"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#2B3674] dark:text-white">{item.month}</span>
                      <span className="rounded-md bg-[#F4F7FE] dark:bg-white/5 px-2 py-0.5 text-[10px] font-bold text-[#A3AED0]">
                        {selectedDataYear}
                      </span>
                    </div>
                    <div className="flex h-24 items-end justify-center gap-3 border-b border-[#F4F7FE] pb-2 mb-2">
                      <div className="flex h-full w-6 items-end rounded-t-lg bg-[#FEEFEE] dark:bg-rose-500/20">
                        <span
                          className="block w-full rounded-t-lg bg-[#EE5D50]"
                          style={{ height: item.multasHeight, transition: 'height 0.5s ease-out' }}
                        />
                      </div>
                      <div className="flex h-full w-6 items-end rounded-t-lg bg-[#E6F9F0] dark:bg-emerald-500/20">
                        <span
                          className="block w-full rounded-t-lg bg-[#01B574]"
                          style={{ height: item.pagosHeight, transition: 'height 0.5s ease-out' }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-center gap-3 text-[10px] font-bold text-[#707EAE]">
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-[#EE5D50]" />
                        {formatNumber(item.multas)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-[#01B574]" />
                        {formatNumber(item.pagos)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </article>
          )}

          {/* Modern Data Table */}
          <div className="bg-white dark:bg-[var(--bg-surface)] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)]" data-purpose="horizon-data-table">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-[#2B3674] dark:text-white tracking-tight">Últimos Movimientos e Intervenciones</h3>
                <p className="text-xs font-semibold text-[#A3AED0]">Registros procesados por el equipo de fiscalizadores en tiempo real</p>
              </div>
              <div className="flex items-center gap-2">
                {isOffice && (
                <button
                  onClick={() => {
                    const htmlContent = `
                      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                      <head>
                      <meta charset="utf-8" />
                      <style>
                        table { border-collapse: collapse; font-family: Arial, sans-serif; }
                        th { background-color: #2B3674; color: #ffffff; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #E9EDF7; font-size: 14px; }
                        td { border: 1px solid #E9EDF7; padding: 10px; font-size: 13px; vertical-align: middle; }
                        .estado-proceso { color: #FFB547; font-weight: bold; }
                        .estado-aprobado { color: #01B574; font-weight: bold; }
                        .monto { font-weight: bold; color: #2B3674; text-align: right; }
                        .subtitle { color: #A3AED0; font-size: 11px; }
                        .badge { background-color: #F4F7FE; color: #2B3674; font-weight: bold; font-size: 12px; }
                      </style>
                      </head>
                      <body>
                        <table>
                          <thead>
                            <tr>
                              <th>Conductor / Administrado</th>
                              <th>Unidad / Placa</th>
                              <th>Trámite / Infracción</th>
                              <th>Fecha & Hora</th>
                              <th>Estado</th>
                              <th>Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td><b>Manuel Gonzales R.</b><br><span class="subtitle">DNI: 45892147</span></td>
                              <td><span class="badge">NC-4821-M</span><br><span class="subtitle">Bajaj Torito · Azul</span></td>
                              <td><b>Papeleta G-40</b><br><span class="subtitle">Circular sin SOAT</span></td>
                              <td>11/09 · 11:20 AM</td>
                              <td class="estado-proceso">En Proceso</td>
                              <td class="monto">S/ 412.00</td>
                            </tr>
                            <tr>
                              <td><b>Asoc. San Lorenzo</b><br><span class="subtitle">RUC: 20601827361</span></td>
                              <td><span class="badge">M8-9921</span><br><span class="subtitle">TVS King · Rojo</span></td>
                              <td><b>Inspección Técnica</b><br><span class="subtitle">Acreditación 2026</span></td>
                              <td>11/09 · 10:45 AM</td>
                              <td class="estado-aprobado">Aprobado</td>
                              <td class="monto">S/ 35.00</td>
                            </tr>
                          </tbody>
                        </table>
                      </body>
                      </html>
                    `
                    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
                    const link = document.createElement('a')
                    link.href = URL.createObjectURL(blob)
                    link.download = 'ultimos_movimientos.xls'
                    link.click()
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#F4F7FE] dark:bg-white/5 text-[#707EAE] hover:text-[#2B3674] dark:text-white transition-colors cursor-pointer"
                >
                  Exportar Excel
                </button>
                )}
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#4318FF] text-white shadow-horizon dark:shadow-none-btn hover:bg-[#3311DB] transition-all cursor-pointer"
                >
                  Ver todos
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#707EAE]">
                <thead className="text-[11px] font-extrabold text-[#A3AED0] uppercase tracking-wider border-b border-[#F4F7FE]">
                  <tr>
                    <th className="pb-3 px-3">Conductor / Administrado</th>
                    <th className="pb-3 px-3">Unidad / Placa</th>
                    <th className="pb-3 px-3">Trámite / Infracción</th>
                    <th className="pb-3 px-3">Fecha & Hora</th>
                    <th className="pb-3 px-3 text-center">Estado</th>
                    {isOffice && <th className="pb-3 px-3 text-right">Monto</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F7FE] font-medium">
                  <tr className="hover:bg-[#F4F7FE] dark:bg-white/10 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#4318FF]/10 text-[#4318FF] font-black flex items-center justify-center text-xs">MG</div>
                        <div>
                          <div className="font-extrabold text-[#2B3674] dark:text-white">Manuel Gonzales R.</div>
                          <div className="text-[10px] text-[#A3AED0]">DNI: 45892147</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-black bg-[#F4F7FE] dark:bg-white/5 text-[#2B3674] dark:text-white border border-[#E9EDF7]">NC-4821-M</span>
                      <div className="text-[10px] text-[#A3AED0] mt-0.5">Bajaj Torito · Azul</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#2B3674] dark:text-white">Papeleta G-40</div>
                      <div className="text-[10px] text-[#A3AED0]">Circular sin SOAT</div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-[#707EAE]">11/09 · 11:20 AM</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FFF5E6] dark:bg-amber-500/20 text-[#FFB547]">En Proceso</span>
                    </td>
                    {isOffice && <td className="py-3.5 px-3 text-right font-black text-[#2B3674] dark:text-white">S/ 412.00</td>}
                  </tr>
                  <tr className="hover:bg-[#F4F7FE] dark:bg-white/10 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#01B574]/15 text-[#01B574] font-black flex items-center justify-center text-xs">SL</div>
                        <div>
                          <div className="font-extrabold text-[#2B3674] dark:text-white">Asoc. San Lorenzo</div>
                          <div className="text-[10px] text-[#A3AED0]">RUC: 20601827361</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-black bg-[#F4F7FE] dark:bg-white/5 text-[#2B3674] dark:text-white border border-[#E9EDF7]">M8-9921</span>
                      <div className="text-[10px] text-[#A3AED0] mt-0.5">TVS King · Rojo</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#2B3674] dark:text-white">Inspección Técnica</div>
                      <div className="text-[10px] text-[#A3AED0]">Acreditación 2026</div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-[#707EAE]">11/09 · 10:45 AM</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#E6F9F0] dark:bg-emerald-500/20 text-[#01B574]">Aprobado</span>
                    </td>
                    {isOffice && <td className="py-3.5 px-3 text-right font-black text-[#2B3674] dark:text-white">S/ 35.00</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Operatividad de permisos (Restaurado interactivo) */}
          {isOffice && (
          <article className="bg-white dark:bg-[var(--bg-surface)] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '830ms' }}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F4F7FE] pb-4 mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-[#2B3674] dark:text-white">Operatividad de permisos</h2>
                <p className="mt-0.5 text-xs text-[#A3AED0]">Estado general de autorizaciones activas, en trámite y vencidas</p>
              </div>
              <div className="rounded-xl border border-[#F4F7FE] bg-[#F4F7FE] dark:bg-white/10 px-4 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#707EAE]">Total evaluado</p>
                <p className="text-xl font-black text-[#2B3674] dark:text-white">{totalOperatividad}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.05fr_1.4fr] lg:items-center">
              <div className="rounded-2xl border border-[#F4F7FE] bg-[#F4F7FE] dark:bg-white/10 p-4">
                <div className="flex h-48 items-end justify-center gap-8 border-b border-[#F4F7FE] pb-4">
                  {operatividad.map((item, index) => (
                    <div key={item.label} className="flex h-full flex-col items-center justify-end gap-2">
                      <div className="flex h-36 w-10 items-end rounded-t-2xl bg-[#F4F7FE] dark:bg-white/5">
                        <span
                          className={`block w-full rounded-t-2xl bg-gradient-to-t ${item.color || ''} shadow-sm`}
                          style={{ height: item.progress, transition: 'height 0.8s ease-out' }}
                        />
                      </div>
                      <span className="text-[10px] font-extrabold text-[#707EAE]">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {operatividad.map((item) => (
                    <div key={item.label} className={`rounded-xl px-2 py-2 ${item.chip}`}>
                      <p className="text-sm font-black">{item.value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider">{item.progress}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {operatividad.map((item, index) => (
                  <div key={item.label} className="rounded-2xl border border-[#F4F7FE] bg-white dark:bg-[#111C44] p-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-[#2B3674] dark:text-white">{item.label}</p>
                        <p className="mt-0.5 text-xs text-[#A3AED0]">{item.detail}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black ${item.chip}`}>
                        {item.value}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F4F7FE] dark:bg-white/5">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.color || ''}`}
                        style={{ width: item.progress, transition: 'width 0.8s ease-out' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
          )}
        </div>

        {/* RIGHT COLUMN (1/3 width on large screens) */}
        <div className="space-y-7">
          {/* Mini Calendar Widget con Operativos y Cursos de Seguridad Vial */}
          <div className="bg-white dark:bg-[var(--bg-surface)] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-extrabold text-[#2B3674] dark:text-white">{monthNames[currentMonth]} {currentYear}</h4>
              <div className="flex items-center gap-1">
                <button type="button" onClick={handlePrevMonth} className="w-8 h-8 rounded-full bg-[#F4F7FE] dark:bg-white/5 hover:bg-[#E9EDF7] text-[#2B3674] dark:text-white flex items-center justify-center transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button type="button" onClick={handleNextMonth} className="w-8 h-8 rounded-full bg-[#F4F7FE] dark:bg-white/5 hover:bg-[#E9EDF7] text-[#2B3674] dark:text-white flex items-center justify-center transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-bold text-[#A3AED0] gap-y-2 mb-2">
              <span>Do</span><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#2B3674] dark:text-white gap-y-2.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <span key={`prev-${i}`} className="flex items-center justify-center text-[#A3AED0]/40 text-xs py-1">
                  {prevMonthDays - firstDay + i + 1}
                </span>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayEvents = getEventsForDay(currentYear, currentMonth, day)
                const isToday = isCurrentMonth && day === today.getDate()
                const isSelected = selectedCalendarDay?.day === day
                const hasOps = dayEvents.operativos.length > 0
                const hasCur = dayEvents.cursos.length > 0

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => setSelectedCalendarDay(isSelected ? null : dayEvents)}
                    className={`relative flex flex-col items-center justify-center py-1 transition-all rounded-xl cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-sm'
                        : isToday
                        ? 'bg-[#4318FF] text-white shadow-md shadow-[#4318FF]/30 font-black'
                        : (hasOps || hasCur)
                        ? 'hover:bg-slate-100 dark:hover:bg-white/10 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5 font-medium text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className={`text-xs ${isToday ? 'text-white' : ''}`}>
                      {day}
                    </span>

                    {/* Indicadores visuales de operativos y cursos */}
                    {(hasOps || hasCur) && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {hasOps && (
                          <span
                            className={`size-1.5 rounded-full ${isToday ? 'bg-amber-300' : 'bg-blue-600 dark:bg-blue-400'}`}
                            title={`${dayEvents.operativos.length} operativo(s)`}
                          />
                        )}
                        {hasCur && (
                          <span
                            className={`size-1.5 rounded-full ${isToday ? 'bg-emerald-300' : 'bg-emerald-500 dark:bg-emerald-400'}`}
                            title={`${dayEvents.cursos.length} curso(s)`}
                          />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Leyenda y contador mensual */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <span className="size-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                  Operativos ({monthOperativos.length})
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Cursos ({monthCursos.length})
                </span>
              </div>
              <span className="text-[10px] font-extrabold text-[#4318FF] dark:text-blue-300 bg-[#4318FF]/10 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                Hoy: {today.toLocaleDateString()}
              </span>
            </div>

            {/* Detalle interactivo del día seleccionado */}
            {selectedCalendarDay ? (
              <div className="mt-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/40 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/80 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100 dark:border-[var(--border)]">
                  <div className="flex items-center gap-1.5">
                    <Icon name="calendar" className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      {selectedCalendarDay.day} de {monthNames[currentMonth]} {currentYear}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDay(null)}
                    className="size-5 place-items-center rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {!selectedCalendarDay.hasEvents ? (
                  <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                    Sin operativos ni cursos programados para esta fecha.
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {/* Operativos del día */}
                    {selectedCalendarDay.operativos.map((op) => (
                      <div
                        key={`op-${op.id}`}
                        className="rounded-xl border border-blue-200/60 bg-white p-2.5 dark:border-[var(--border)] dark:bg-slate-950/80 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[9.5px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              OPERATIVO
                            </span>
                            <h5 className="mt-1 text-xs font-extrabold text-slate-800 dark:text-white line-clamp-1">
                              {op.nombre || 'Operativo Inopinado'}
                            </h5>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Icon name="mapPin" className="size-3 inline shrink-0" /> {op.lugar || 'Distrito J.L. Ortiz'}
                            </p>
                            {op.hora_inicio && (
                              <p className="text-[10px] text-slate-400">
                                Hora: {op.hora_inicio}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate('/operativos')}
                            className="shrink-0 text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer pt-0.5"
                          >
                            Ir a módulo →
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Cursos del día */}
                    {selectedCalendarDay.cursos.map((c) => (
                      <div
                        key={`cur-${c.id}`}
                        className="rounded-xl border border-emerald-200/60 bg-white p-2.5 dark:border-[var(--border)] dark:bg-slate-950/80 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              CURSO SEGURIDAD VIAL
                            </span>
                            <h5 className="mt-1 text-xs font-extrabold text-slate-800 dark:text-white line-clamp-1">
                              {c.titulo || c.nombre || 'Capacitación Vial'}
                            </h5>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Icon name="mapPin" className="size-3 inline shrink-0" /> {c.lugar || 'Auditorio Municipal'}
                            </p>
                            {c.horario && (
                              <p className="text-[10px] text-slate-400">
                                Horario: {c.horario}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate('/cursos-seguridad')}
                            className="shrink-0 text-[10px] font-bold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer pt-0.5"
                          >
                            Ir a módulo →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                Selecciona cualquier día con puntos de color para ver detalles de operativos o cursos.
              </div>
            )}
          </div>

          {/* Estado de expedientes (Restaurado interactivo) */}
          {isOffice && (
          <article className="bg-white dark:bg-[var(--bg-surface)] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '540ms' }}>
            <div className="border-b border-[#F4F7FE] pb-4 mb-5">
              <h2 className="text-lg font-extrabold text-[#2B3674] dark:text-white">Estado de expedientes</h2>
              <p className="mt-0.5 text-xs text-[#A3AED0]">Distribución de documentos vigentes y observados</p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <button
                type="button"
                onClick={() => setExpandedChart('expedientes')}
                aria-label="Ampliar gráfico de estado de expedientes"
                className="donut-pop relative grid size-36 shrink-0 place-items-center rounded-full shadow-[0_8px_20px_rgba(67,24,255,0.15)] transition-transform duration-300 hover:scale-105 cursor-pointer"
                style={{ background: 'conic-gradient(#4318FF 0 68%, #39B8FF 68% 88%, #FFB547 88% 100%)' }}
              >
                <span className="donut-ring-pulse absolute inset-0 rounded-full border border-[#4318FF]/30" aria-hidden="true" />
                <div className="grid size-28 place-items-center rounded-full bg-white dark:bg-[#111C44] text-center shadow-inner">
                  <span>
                    <strong className="block text-2xl font-black text-[#2B3674] dark:text-white">{formatNumber(totalExpedientes)}</strong>
                    <span className="text-[10px] font-bold text-[#A3AED0] uppercase">expedientes</span>
                  </span>
                </div>
              </button>

              <div className="w-full space-y-3">
                {expedientesBreakdown.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-bold text-[#707EAE]">
                        <span className={`size-2.5 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                      <span className="font-extrabold text-[#2B3674] dark:text-white">
                        {item.value} <span className="font-semibold text-[#A3AED0]">({item.percent})</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F4F7FE] dark:bg-white/5">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: item.progress, transition: 'width 0.8s ease-out' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
          )}

          {/* Asociaciones registradas (Restaurado interactivo) */}
          {isOffice && (
          <article className="bg-white dark:bg-[var(--bg-surface)] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '760ms' }}>
            <div className="border-b border-[#F4F7FE] pb-4 mb-5">
              <h2 className="text-lg font-extrabold text-[#2B3674] dark:text-white">Asociaciones</h2>
              <p className="mt-0.5 text-xs text-[#A3AED0]">Estado visual de empresas y comités</p>
            </div>

            <div className="flex flex-col justify-between gap-4">
              {asociaciones.map((item, index) => (
                <div key={item.label} className="rounded-xl border border-[#F4F7FE] bg-[#F4F7FE] dark:bg-white/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#707EAE]">{item.label}</span>
                    <span className="rounded-lg bg-white dark:bg-[#111C44] shadow-sm px-2 py-0.5 text-[10px] font-extrabold text-[#2B3674] dark:text-white">
                      {item.value}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#E9EDF7]">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${item.color || ''}`}
                      style={{ width: item.progress, transition: 'width 0.8s ease-out', animationDelay: `${820 + index * 100}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
          )}

          {/* Vehículos en depósito (Restaurado interactivo) */}
          <article className="bg-white dark:bg-[var(--bg-surface)] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '690ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-extrabold text-[#2B3674] dark:text-white">Depósito Municipal</h4>
              <span className="text-[10px] font-bold text-[#EE5D50] bg-[#FEEFEE] dark:bg-rose-500/20 px-2 py-0.5 rounded-full">
                {depositoPercent}% Ocupado
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setExpandedChart('deposito')}
                className="w-20 h-20 relative flex items-center justify-center flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
              >
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-[#F4F7FE]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"></path>
                  <path className="text-[#FFB547]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${depositoPercent}, 100`} strokeLinecap="round" strokeWidth="3.5"></path>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-sm font-extrabold text-[#2B3674] dark:text-white">{depositoPercent}%</span>
                </div>
              </button>
              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex justify-between font-bold text-[#707EAE]">
                  <span>En depósito:</span>
                  <span className="font-extrabold text-[#2B3674] dark:text-white">{enDepositoValue} und</span>
                </div>
                <div className="flex justify-between font-bold text-[#707EAE]">
                  <span>Liberados:</span>
                  <span className="font-extrabold text-[#01B574]">{liberadosValue} und</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-[#F4F7FE]">
              <a className="text-[11px] font-extrabold text-[#4318FF] hover:underline flex items-center justify-center gap-1 cursor-pointer">
                Inventario de internamiento →
              </a>
            </div>
          </article>
        </div>
      </div>

      {/* MODALS */}
      {currentExpanded && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expanded-chart-title"
          onMouseDown={() => setExpandedChart(null)}
        >
          <div
            className="modal-enter w-full max-w-3xl overflow-hidden rounded-[30px] bg-white dark:bg-[#111C44] shadow-horizon dark:shadow-none"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#F4F7FE] bg-[#F4F7FE] dark:bg-white/10 px-6 py-5">
              <div>
                <h2 id="expanded-chart-title" className="text-xl font-extrabold text-[#2B3674] dark:text-white">
                  {currentExpanded.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-[#A3AED0]">{currentExpanded.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedChart(null)}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white dark:bg-[#111C44] shadow-sm text-[#A3AED0] transition hover:bg-[#F4F7FE] dark:bg-white/5 hover:text-[#2B3674] dark:text-white cursor-pointer"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <div className="grid gap-8 p-6 md:grid-cols-[18rem_minmax(0,1fr)] md:items-center">
              <div
                className="donut-modal-spin relative mx-auto grid size-64 place-items-center rounded-full shadow-horizon dark:shadow-none-btn"
                style={{ background: currentExpanded.background }}
              >
                <span className={`donut-ring-pulse absolute inset-0 rounded-full border ${currentExpanded.ring}`} aria-hidden="true" />
                <div className="grid size-40 place-items-center rounded-full bg-white dark:bg-[#111C44] text-center shadow-inner">
                  <span>
                    <strong className="block text-5xl font-black tracking-tight text-[#2B3674] dark:text-white">
                      {currentExpanded.total}
                    </strong>
                    <span className="text-sm font-bold text-[#A3AED0] uppercase">{currentExpanded.unit}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {currentExpanded.items.map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-[#F4F7FE] bg-[#F4F7FE] dark:bg-white/10 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-base font-bold text-[#707EAE]">
                        <span className={`size-3 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                      <span className="text-xl font-black text-[#2B3674] dark:text-white">
                        {item.value} <span className="text-sm font-semibold text-[#A3AED0]">({item.percent})</span>
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white dark:bg-[#111C44]">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: item.progress, transition: 'width 0.8s ease-out', animationDelay: `${280 + index * 120}ms` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {expandedMultasPagos && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expanded-multas-pagos-title"
          onMouseDown={() => setExpandedMultasPagos(null)}
        >
          <div
            className="modal-enter w-full max-w-2xl overflow-hidden rounded-[30px] bg-white dark:bg-[#111C44] shadow-horizon dark:shadow-none"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#F4F7FE] bg-[#F4F7FE] dark:bg-white/10 px-6 py-5">
              <div>
                <h2 id="expanded-multas-pagos-title" className="text-xl font-extrabold text-[#2B3674] dark:text-white">
                  Multas y pagos registrados
                </h2>
                <p className="mt-1 text-sm font-medium text-[#A3AED0]">
                  {expandedMultasPagos.type === 'year'
                    ? `Detalle acumulado del año ${expandedMultasPagos.year}`
                    : `Detalle del mes de ${expandedMultasPagos.month} ${expandedMultasPagos.year}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedMultasPagos(null)}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white dark:bg-[#111C44] shadow-sm text-[#A3AED0] transition hover:bg-[#F4F7FE] dark:bg-white/5 hover:text-[#2B3674] dark:text-white cursor-pointer"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#EE5D50]/10 bg-[#FEEFEE] dark:bg-rose-500/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#EE5D50]">Multas</p>
                  <p className="mt-1 text-3xl font-black text-[#2B3674] dark:text-white">
                    {formatNumber(expandedMultasPagos.multas)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#01B574]/10 bg-[#E6F9F0] dark:bg-emerald-500/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#01B574]">Pagos</p>
                  <p className="mt-1 text-3xl font-black text-[#2B3674] dark:text-white">
                    {formatNumber(expandedMultasPagos.pagos)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#FFB547]/10 bg-[#FFF5E6] dark:bg-amber-500/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#FFB547]">Pendiente</p>
                  <p className="mt-1 text-3xl font-black text-[#2B3674] dark:text-white">
                    {expandedMultasPagos.type === 'year'
                      ? `S/ ${formatNumber(expandedMultasPagos.pendiente)}`
                      : formatNumber(expandedMultasPagos.pendiente)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#F4F7FE] bg-[#F4F7FE] dark:bg-white/10 p-5">
                <div className="flex h-64 items-end justify-center gap-12 border-b border-[#F4F7FE] pb-4">
                  <div className="flex h-full w-20 items-end rounded-t-2xl bg-[#FEEFEE] dark:bg-rose-500/20">
                    <span
                      key={`modal-multas-${expandedMultasPagos.title}`}
                      className="block w-full rounded-t-2xl bg-[#EE5D50]"
                      style={{ height: expandedMultasPagos.multasHeight, transition: 'height 0.5s ease-out' }}
                    />
                  </div>
                  <div className="flex h-full w-20 items-end rounded-t-2xl bg-[#E6F9F0] dark:bg-emerald-500/20">
                    <span
                      key={`modal-pagos-${expandedMultasPagos.title}`}
                      className="block w-full rounded-t-2xl bg-[#01B574]"
                      style={{ height: expandedMultasPagos.pagosHeight, transition: 'height 0.5s ease-out' }}
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                  <p className="font-extrabold text-[#EE5D50]">Total Multas</p>
                  <p className="font-extrabold text-[#01B574]">Total Pagos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowPreviewModal(false)} />
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#111C44] rounded-3xl shadow-2xl overflow-hidden animate-enter">
            <div className="flex items-center justify-between p-6 border-b border-[#F4F7FE] dark:border-white/10 bg-gradient-to-r from-[#F4F7FE] to-white dark:from-white/5 dark:to-transparent">
              <div>
                <h3 className="text-xl font-black text-[#2B3674] dark:text-white tracking-tight">Registro Completo de Movimientos</h3>
                <p className="text-sm font-semibold text-[#A3AED0] mt-1">Vista previa de todas las intervenciones recientes</p>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/10 text-[#707EAE] hover:text-[#EE5D50] hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all shadow-sm"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-[#707EAE]">
                <thead className="text-xs font-extrabold text-[#A3AED0] uppercase tracking-wider border-b border-[#F4F7FE]">
                  <tr>
                    <th className="pb-4 px-4">Conductor / Administrado</th>
                    <th className="pb-4 px-4">Unidad / Placa</th>
                    <th className="pb-4 px-4">Trámite / Infracción</th>
                    <th className="pb-4 px-4">Fecha & Hora</th>
                    <th className="pb-4 px-4 text-center">Estado</th>
                    <th className="pb-4 px-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F7FE] font-medium">
                  <tr className="hover:bg-[#F4F7FE] dark:bg-white/10 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#4318FF]/10 text-[#4318FF] font-black flex items-center justify-center text-sm">MG</div>
                        <div>
                          <div className="font-extrabold text-[#2B3674] dark:text-white">Manuel Gonzales R.</div>
                          <div className="text-xs text-[#A3AED0]">DNI: 45892147</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-[#F4F7FE] dark:bg-white/5 text-[#2B3674] dark:text-white border border-[#E9EDF7]">NC-4821-M</span>
                      <div className="text-xs text-[#A3AED0] mt-1">Bajaj Torito · Azul</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-[#2B3674] dark:text-white">Papeleta G-40</div>
                      <div className="text-xs text-[#A3AED0]">Circular sin SOAT</div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-[#707EAE]">11/09 · 11:20 AM</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFF5E6] dark:bg-amber-500/20 text-[#FFB547]">En Proceso</span>
                    </td>
                    <td className="py-4 px-4 text-right font-black text-[#2B3674] dark:text-white">S/ 412.00</td>
                  </tr>
                  <tr className="hover:bg-[#F4F7FE] dark:bg-white/10 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#01B574]/15 text-[#01B574] font-black flex items-center justify-center text-sm">SL</div>
                        <div>
                          <div className="font-extrabold text-[#2B3674] dark:text-white">Asoc. San Lorenzo</div>
                          <div className="text-xs text-[#A3AED0]">RUC: 20601827361</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-[#F4F7FE] dark:bg-white/5 text-[#2B3674] dark:text-white border border-[#E9EDF7]">M8-9921</span>
                      <div className="text-xs text-[#A3AED0] mt-1">TVS King · Rojo</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-[#2B3674] dark:text-white">Inspección Técnica</div>
                      <div className="text-xs text-[#A3AED0]">Acreditación 2026</div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-[#707EAE]">11/09 · 10:45 AM</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-[#E6F9F0] dark:bg-emerald-500/20 text-[#01B574]">Aprobado</span>
                    </td>
                    <td className="py-4 px-4 text-right font-black text-[#2B3674] dark:text-white">S/ 35.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-[#F4F7FE] dark:border-white/10 text-center">
              <p className="text-xs font-semibold text-[#A3AED0]">Mostrando los 2 últimos registros. El módulo completo de búsqueda estará disponible próximamente.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
