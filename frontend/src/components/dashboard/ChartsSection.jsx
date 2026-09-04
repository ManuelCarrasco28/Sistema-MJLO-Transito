import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'

export function ChartsSection() {
  const [expandedChart, setExpandedChart] = useState(null)
  const [expandedMultasPagos, setExpandedMultasPagos] = useState(null)
  const [selectedYear, setSelectedYear] = useState('2026')
  const [operationsZoom, setOperationsZoom] = useState(0)
  const operationsChartRef = useRef(null)
  const expedientesBreakdown = [
    { label: 'Vigentes', value: '956', percent: '68%', color: 'bg-blue-600', progress: '68%' },
    { label: 'Observados', value: '281', percent: '20%', color: 'bg-cyan-400', progress: '20%' },
    { label: 'Por vencer', value: '169', percent: '12%', color: 'bg-amber-500', progress: '12%' },
  ]
  const multasPagosPorAnio = {
    2023: {
      totals: { multas: '684', pagos: '438', pendiente: 'S/ 48,930', recuperacion: '64%' },
      months: [
        ['Ene', '42%', '26%'], ['Feb', '48%', '30%'], ['Mar', '45%', '28%'], ['Abr', '54%', '35%'],
        ['May', '51%', '33%'], ['Jun', '59%', '39%'], ['Jul', '57%', '37%'], ['Ago', '63%', '43%'],
        ['Sep', '60%', '41%'], ['Oct', '55%', '38%'], ['Nov', '49%', '34%'], ['Dic', '46%', '32%'],
      ],
    },
    2024: {
      totals: { multas: '742', pagos: '516', pendiente: 'S/ 54,880', recuperacion: '69%' },
      months: [
        ['Ene', '46%', '32%'], ['Feb', '52%', '38%'], ['Mar', '48%', '35%'], ['Abr', '61%', '44%'],
        ['May', '57%', '42%'], ['Jun', '66%', '49%'], ['Jul', '63%', '47%'], ['Ago', '70%', '52%'],
        ['Sep', '68%', '51%'], ['Oct', '59%', '45%'], ['Nov', '54%', '41%'], ['Dic', '50%', '39%'],
      ],
    },
    2025: {
      totals: { multas: '895', pagos: '642', pendiente: 'S/ 63,210', recuperacion: '72%' },
      months: [
        ['Ene', '58%', '40%'], ['Feb', '64%', '47%'], ['Mar', '60%', '45%'], ['Abr', '71%', '51%'],
        ['May', '69%', '50%'], ['Jun', '76%', '56%'], ['Jul', '72%', '54%'], ['Ago', '84%', '61%'],
        ['Sep', '78%', '59%'], ['Oct', '74%', '57%'], ['Nov', '67%', '52%'], ['Dic', '62%', '49%'],
      ],
    },
    2026: {
      totals: { multas: '781', pagos: '548', pendiente: 'S/ 51,940', recuperacion: '70%' },
      months: [
        ['Ene', '68%', '42%'], ['Feb', '74%', '51%'], ['Mar', '61%', '49%'], ['Abr', '89%', '63%'],
        ['May', '77%', '55%'], ['Jun', '94%', '71%'], ['Jul', '82%', '69%'], ['Ago', '100%', '76%'],
        ['Sep', '91%', '72%'],
      ],
    },
  }
  const availableYears = Object.keys(multasPagosPorAnio).sort((a, b) => Number(b) - Number(a))
  const isAllYearsSelected = selectedYear === 'todos'
  const multasPagos = multasPagosPorAnio[isAllYearsSelected ? '2026' : selectedYear]
  const parseNumber = (value) => Number(String(value).replaceAll(',', '').replace('S/', '').replace('%', '').trim())
  const formatNumber = (value) => new Intl.NumberFormat('es-PE').format(value)
  const totalMultasHistorico = Object.values(multasPagosPorAnio).reduce((sum, data) => sum + parseNumber(data.totals.multas), 0)
  const totalPagosHistorico = Object.values(multasPagosPorAnio).reduce((sum, data) => sum + parseNumber(data.totals.pagos), 0)
  const totalPendienteHistorico = Object.values(multasPagosPorAnio).reduce((sum, data) => sum + parseNumber(data.totals.pendiente), 0)
  const multasPagosResumen = isAllYearsSelected
    ? { multas: formatNumber(totalMultasHistorico), pagos: formatNumber(totalPagosHistorico), pendiente: `S/ ${formatNumber(totalPendienteHistorico)}` }
    : multasPagos.totals
  const getMonthlyValues = (year, data) => {
    const totalMultas = parseNumber(data.totals.multas)
    const totalPagos = parseNumber(data.totals.pagos)
    const multasWeights = data.months.map(([, multas]) => parseNumber(multas))
    const pagosWeights = data.months.map(([, , pagos]) => parseNumber(pagos))
    const multasWeightTotal = multasWeights.reduce((sum, value) => sum + value, 0)
    const pagosWeightTotal = pagosWeights.reduce((sum, value) => sum + value, 0)
    const rawItems = data.months.map(([month], index) => ({
      type: 'month',
      title: `${month} ${year}`,
      period: year === '2026' ? 'Año actual' : 'Periodo anual',
      month,
      year,
      multas: Math.round((totalMultas * multasWeights[index]) / multasWeightTotal),
      pagos: Math.round((totalPagos * pagosWeights[index]) / pagosWeightTotal),
    }))
    const maxValue = Math.max(...rawItems.flatMap((item) => [item.multas, item.pagos]))
    return rawItems.map((item) => ({
      ...item,
      pendiente: Math.max(item.multas - item.pagos, 0),
      multasHeight: `${Math.max(12, Math.round((item.multas / maxValue) * 100))}%`,
      pagosHeight: `${Math.max(12, Math.round((item.pagos / maxValue) * 100))}%`,
    }))
  }
  const yearlyMultasPagos = Object.entries(multasPagosPorAnio)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, data]) => ({
      type: 'year',
      title: year,
      year,
      label: year === '2026' ? 'Ene - Sep' : 'Ene - Dic',
      multas: parseNumber(data.totals.multas),
      pagos: parseNumber(data.totals.pagos),
      pendiente: parseNumber(data.totals.pendiente),
      multasHeight: `${Math.round((parseNumber(data.totals.multas) / 895) * 100)}%`,
      pagosHeight: `${Math.round((parseNumber(data.totals.pagos) / 895) * 100)}%`,
    }))
  const monthlyMultasPagos = getMonthlyValues(selectedYear, multasPagos)
  const vehiculosDeposito = [
    { label: 'En depósito', value: '84', percent: '58%', color: 'bg-orange-500', progress: '58%' },
    { label: 'Liberados', value: '61', percent: '42%', color: 'bg-emerald-500', progress: '42%' },
  ]
  const organizaciones = [
    { label: 'Empresas transporte', value: '46', progress: '76%', color: 'from-blue-600 to-cyan-400' },
    { label: 'Asociaciones', value: '28', progress: '52%', color: 'from-indigo-600 to-blue-400' },
    { label: 'Comités urbanos', value: '19', progress: '38%', color: 'from-amber-500 to-orange-400' },
    { label: 'Observadas', value: '11', progress: '24%', color: 'from-rose-600 to-orange-400' },
  ]
  const operatividad = [
    {
      label: 'Activas',
      value: 128,
      detail: 'Habilitadas para operar',
      progress: '64%',
      color: 'from-emerald-600 to-cyan-400',
      chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      label: 'En trámite',
      value: 46,
      detail: 'Pendientes de evaluación',
      progress: '23%',
      color: 'from-blue-600 to-indigo-400',
      chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    },
    {
      label: 'Vencidas',
      value: 26,
      detail: 'Requieren regularización',
      progress: '13%',
      color: 'from-rose-600 to-orange-400',
      chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    },
  ]
  const totalOperatividad = operatividad.reduce((sum, item) => sum + item.value, 0)
  const operationsData = [
    { month: 'Ene', registros: 32, inspecciones: 18 },
    { month: 'Feb', registros: 40, inspecciones: 24 },
    { month: 'Mar', registros: 36, inspecciones: 28 },
    { month: 'Abr', registros: 48, inspecciones: 34 },
    { month: 'May', registros: 44, inspecciones: 31 },
    { month: 'Jun', registros: 52, inspecciones: 38 },
    { month: 'Jul', registros: 58, inspecciones: 45 },
    { month: 'Ago', registros: 64, inspecciones: 50 },
    { month: 'Sep', registros: 70, inspecciones: 55 },
  ]
  const zoomWindows = [9, 6, 4, 3]
  const visibleOperations = operationsData.slice(-zoomWindows[operationsZoom])
  const chartWidth = 600
  const chartHeight = 180
  const chartMax = 80
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
      total: '1,406',
      unit: 'expedientes',
      background: 'conic-gradient(#1a73e8 0 68%, #22d3ee 68% 88%, #f59e0b 88% 100%)',
      ring: 'border-blue-300/50',
      items: expedientesBreakdown,
    },
    deposito: {
      title: 'Vehículos en depósito',
      subtitle: 'Detalle ampliado de unidades retenidas y liberadas',
      total: '145',
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

  return (
    <>
    <section aria-label="Gráficos de gestión" className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
      <article
        className="chart-panel animate-enter rounded-2xl border border-blue-100 dark:border-slate-800 bg-gradient-to-br from-white via-white to-blue-50/60 dark:from-[#0f172a] dark:via-[#0f172a] dark:to-blue-950/20 p-5 shadow-xs sm:p-6"
        style={{ animationDelay: '460ms' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Operaciones mensuales</h2>
            <p className="mt-0.5 text-xs text-slate-400">Registros e inspecciones acumuladas durante 2026</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="chart-legend-item flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-600" />
                Registros
              </span>
              <span className="chart-legend-item flex items-center gap-1.5 [animation-delay:180ms]">
                <span className="size-2 rounded-full bg-cyan-400" />
                Inspecciones
              </span>
            </div>
            <span className="rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {visibleOperations.length} meses
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div ref={operationsChartRef} className="relative h-52 w-full overscroll-contain">
            <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-300 dark:text-slate-700" aria-hidden="true">
              {[80, 60, 40, 20, 0].map((value) => (
                <div key={value} className="flex items-center gap-3">
                  <span className="w-5 text-right font-medium text-slate-400 dark:text-slate-500">{value}</span>
                  <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
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
                  <stop offset="0" stopColor="#1a73e8" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#1a73e8" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path key={`area-${operationsZoom}`} className="chart-area" d={`M${areaPoints} Z`} fill="url(#tailAreaBlue)" />
              <polyline
                key={`registros-${operationsZoom}`}
                className="chart-line"
                points={registrosPoints}
                fill="none"
                stroke="#1a73e8"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />
              <polyline
                key={`inspecciones-${operationsZoom}`}
                className="chart-line chart-line-delayed"
                points={inspeccionesPoints}
                fill="none"
                stroke="#22d3ee"
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
                    className="chart-point"
                    style={{ animationDelay: `${900 + index * 90}ms` }}
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill="white"
                    stroke="#1a73e8"
                    strokeWidth="2.5"
                  />
                )
              })}
            </svg>
          </div>
          <div className="ml-8 flex justify-between text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
            {visibleOperations.map((item) => (
              <span key={item.month}>{item.month}</span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end rounded-xl border border-blue-100 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            <span>
              {visibleOperations[0].month} - {visibleOperations[visibleOperations.length - 1].month} 2026
            </span>
          </div>
        </div>
      </article>

      <article
        className="chart-panel animate-enter flex flex-col rounded-2xl border border-cyan-100 dark:border-slate-800 bg-gradient-to-br from-white via-white to-cyan-50/70 dark:from-[#0f172a] dark:via-[#0f172a] dark:to-cyan-950/20 p-5 shadow-xs sm:p-6"
        style={{ animationDelay: '540ms' }}
      >
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Estado de expedientes</h2>
          <p className="mt-0.5 text-xs text-slate-400">Distribución de documentos vigentes y observados</p>
        </div>

        <div className="my-auto flex flex-col items-center gap-6 pt-6 sm:flex-row xl:flex-col 2xl:flex-row">
          <button
            type="button"
            onClick={() => setExpandedChart('expedientes')}
            aria-label="Ampliar gráfico de estado de expedientes"
            className="donut-pop relative grid size-36 shrink-0 place-items-center rounded-full shadow-[0_8px_20px_rgba(26,115,232,0.15)] transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            style={{ background: 'conic-gradient(#1a73e8 0 68%, #22d3ee 68% 88%, #f59e0b 88% 100%)' }}
          >
            <span className="donut-ring-pulse absolute inset-0 rounded-full border border-blue-300/50" aria-hidden="true" />
            <div className="grid size-25 place-items-center rounded-full bg-white dark:bg-[#0f172a] text-center shadow-inner">
              <span>
                <strong className="block text-2xl font-extrabold text-slate-800 dark:text-white">1,406</strong>
                <span className="text-[11px] font-medium text-slate-400">expedientes</span>
              </span>
            </div>
          </button>

          <div className="w-full space-y-3">
            {expedientesBreakdown.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                    <span className={`size-2 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {item.value} <span className="font-normal text-slate-400">({item.percent})</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`chart-progress h-full rounded-full ${item.color}`}
                    style={{ '--progress-width': item.progress }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article
        className="chart-panel animate-enter rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/70 p-5 shadow-xs dark:border-slate-800 dark:from-[#0f172a] dark:via-[#0f172a] dark:to-amber-950/20 sm:p-6 xl:col-span-2"
        style={{ animationDelay: '610ms' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Multas y pagos registrados</h2>
            <p className="mt-0.5 text-xs text-slate-400">Comparativo anual por meses de papeletas emitidas y pagos atendidos</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 shadow-xs dark:border-slate-700 dark:bg-slate-800">
            <label htmlFor="filtro-anio-multas" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              Año
            </label>
            <select
              id="filtro-anio-multas"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-extrabold text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="todos">Todos los años</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 dark:border-rose-900/50 dark:bg-rose-950/30">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Multas</p>
            <p className="text-lg font-extrabold text-rose-700 dark:text-rose-300">{multasPagosResumen.multas}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Pagos</p>
            <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{multasPagosResumen.pagos}</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 dark:border-orange-900/50 dark:bg-orange-950/30">
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Pendiente</p>
            <p className="text-lg font-extrabold text-orange-700 dark:text-orange-300">{multasPagosResumen.pendiente}</p>
          </div>
        </div>

        {isAllYearsSelected ? (
        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Comparativo por años</h3>
              <p className="mt-0.5 text-xs text-slate-400">Vista general de multas emitidas y pagos registrados</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/50">
              2026 acumulado hasta septiembre
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {yearlyMultasPagos.map((item, index) => (
              <button
                type="button"
                key={item.year}
                onClick={() => setExpandedMultasPagos(item)}
                aria-label={`Ver detalle de multas y pagos del año ${item.year}`}
                className={`group rounded-2xl border p-4 transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  item.year === '2026'
                    ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 text-left dark:border-blue-900/60 dark:from-blue-950/30 dark:to-cyan-950/20'
                    : 'border-slate-200/80 bg-slate-50/70 text-left dark:border-slate-800 dark:bg-slate-950/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{item.year}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                  </div>
                  <Icon name="arrow" className="size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600 dark:text-slate-600" />
                </div>

                <div className="mt-4 flex h-32 items-end justify-center gap-4 border-b border-slate-200/70 pb-3 dark:border-slate-800">
                  <div className="flex h-full w-10 items-end rounded-t-xl bg-rose-100 dark:bg-rose-950/50">
                    <span
                      className="chart-bar block w-full rounded-t-xl bg-gradient-to-t from-rose-600 via-red-500 to-orange-400 shadow-[0_10px_22px_rgba(225,29,72,0.22)]"
                      style={{ '--bar-height': item.multasHeight, animationDelay: `${260 + index * 90}ms` }}
                    />
                  </div>
                  <div className="flex h-full w-10 items-end rounded-t-xl bg-emerald-100 dark:bg-emerald-950/50">
                    <span
                      className="chart-bar block w-full rounded-t-xl bg-gradient-to-t from-emerald-700 via-teal-500 to-cyan-400 shadow-[0_10px_22px_rgba(5,150,105,0.2)]"
                      style={{ '--bar-height': item.pagosHeight, animationDelay: `${340 + index * 90}ms` }}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-800">
                    <p className="font-bold text-rose-500">Multas</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">{formatNumber(item.multas)}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-800">
                    <p className="font-bold text-emerald-600">Pagos</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">{formatNumber(item.pagos)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {monthlyMultasPagos.map((item, index) => (
            <button
              type="button"
              key={`${selectedYear}-${item.month}`}
              onClick={() => setExpandedMultasPagos(item)}
              aria-label={`Ver detalle de multas y pagos de ${item.month} ${selectedYear}`}
              className="rounded-xl border border-slate-200/80 bg-white/80 p-3 text-left shadow-xs transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-amber-800"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.month}</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {selectedYear}
                </span>
              </div>
              <div className="flex h-32 items-end justify-center gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                <div className="flex h-full w-7 items-end rounded-t-lg bg-rose-100 dark:bg-rose-950/50">
                  <span
                    className="chart-bar block w-full rounded-t-lg bg-gradient-to-t from-rose-600 to-orange-400 shadow-[0_8px_18px_rgba(225,29,72,0.22)]"
                    style={{ '--bar-height': item.multasHeight, animationDelay: `${260 + index * 55}ms` }}
                  />
                </div>
                <div className="flex h-full w-7 items-end rounded-t-lg bg-emerald-100 dark:bg-emerald-950/50">
                  <span
                    className="chart-bar block w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-cyan-400 shadow-[0_8px_18px_rgba(5,150,105,0.2)]"
                    style={{ '--bar-height': item.pagosHeight, animationDelay: `${340 + index * 55}ms` }}
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-rose-500" />
                  {formatNumber(item.multas)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  {formatNumber(item.pagos)}
                </span>
              </div>
            </button>
          ))}
        </div>
        )}

      </article>

      <article
        className="chart-panel animate-enter flex h-full flex-col rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/70 p-5 shadow-xs dark:border-slate-800 dark:from-[#0f172a] dark:via-[#0f172a] dark:to-orange-950/20 sm:p-6"
        style={{ animationDelay: '690ms' }}
      >
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Vehículos en depósito</h2>
          <p className="mt-0.5 text-xs text-slate-400">Comparativo de unidades retenidas y liberadas</p>
        </div>

        <div className="mt-5 grid flex-1 gap-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <button
            type="button"
            onClick={() => setExpandedChart('deposito')}
            aria-label="Ampliar gráfico de vehículos en depósito"
            className="donut-pop relative mx-auto grid size-36 place-items-center rounded-full shadow-[0_10px_24px_rgba(249,115,22,0.16)] transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500"
            style={{ background: 'conic-gradient(#f97316 0 58%, #10b981 58% 100%)' }}
          >
            <span className="donut-ring-pulse absolute inset-0 rounded-full border border-orange-300/50" aria-hidden="true" />
            <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-inner dark:bg-[#0f172a]">
              <span>
                <strong className="block text-2xl font-extrabold text-slate-800 dark:text-white">145</strong>
                <span className="text-[11px] font-medium text-slate-400">unidades</span>
              </span>
            </div>
          </button>

          <div className="space-y-3">
            {vehiculosDeposito.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <span className={`size-2.5 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {item.value} <span className="text-xs font-semibold text-slate-400">({item.percent})</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`chart-progress h-full rounded-full ${item.color}`} style={{ '--progress-width': item.progress }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-center dark:border-slate-800 sm:grid-cols-3">
          <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70 dark:bg-slate-900/50 dark:ring-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Promedio retiro</p>
            <p className="mt-1 text-lg font-extrabold text-slate-800 dark:text-white">2.4 días</p>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70 dark:bg-slate-900/50 dark:ring-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Actas activas</p>
            <p className="mt-1 text-lg font-extrabold text-orange-600 dark:text-orange-300">37</p>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70 dark:bg-slate-900/50 dark:ring-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Liberación</p>
            <p className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-300">42%</p>
          </div>
        </div>
      </article>

      <article
        className="chart-panel animate-enter flex h-full flex-col rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/70 p-5 shadow-xs dark:border-slate-800 dark:from-[#0f172a] dark:via-[#0f172a] dark:to-indigo-950/20 sm:p-6"
        style={{ animationDelay: '760ms' }}
      >
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Organizaciones registradas</h2>
          <p className="mt-0.5 text-xs text-slate-400">Estado visual de empresas, asociaciones y comités</p>
        </div>

        <div className="mt-6 flex flex-1 flex-col justify-between gap-4">
          {organizaciones.map((item, index) => (
            <div key={item.label} className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {item.value}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`chart-progress h-full rounded-full bg-gradient-to-r ${item.color}`}
                  style={{ '--progress-width': item.progress, animationDelay: `${820 + index * 100}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>

      <article
        className="chart-panel animate-enter rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/60 p-5 shadow-xs dark:border-slate-800 dark:from-[#0f172a] dark:via-[#0f172a] dark:to-emerald-950/20 sm:p-6 xl:col-span-2"
        style={{ animationDelay: '830ms' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Operatividad de permisos</h2>
            <p className="mt-0.5 text-xs text-slate-400">Estado general de autorizaciones activas, en trámite y vencidas</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2 text-right shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total evaluado</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{totalOperatividad}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_1.4fr] lg:items-center">
          <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex h-56 items-end justify-center gap-8 border-b border-slate-100 pb-4 dark:border-slate-800">
              {operatividad.map((item, index) => (
                <div key={item.label} className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="flex h-40 w-12 items-end rounded-t-2xl bg-slate-100 dark:bg-slate-800">
                    <span
                      className={`chart-bar block w-full rounded-t-2xl bg-gradient-to-t ${item.color} shadow-[0_10px_24px_rgba(15,23,42,0.14)]`}
                      style={{ '--bar-height': item.progress, animationDelay: `${260 + index * 120}ms` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {operatividad.map((item) => (
                <div key={item.label} className={`rounded-xl px-2 py-2 ${item.chip}`}>
                  <p className="text-lg font-black">{item.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider">{item.progress}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {operatividad.map((item, index) => (
              <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-white">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${item.chip}`}>
                    {item.value}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`chart-progress h-full rounded-full bg-gradient-to-r ${item.color}`}
                    style={{ '--progress-width': item.progress, animationDelay: `${560 + index * 120}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>

    {currentExpanded && (
      <div
        className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expanded-chart-title"
        onMouseDown={() => setExpandedChart(null)}
      >
        <div
          className="modal-enter w-full max-w-3xl overflow-hidden rounded-3xl border border-white/40 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-[#0f172a]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-5 dark:border-slate-800 dark:from-slate-900 dark:to-cyan-950/30">
            <div>
              <h2 id="expanded-chart-title" className="text-xl font-extrabold text-slate-900 dark:text-white">
                {currentExpanded.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{currentExpanded.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setExpandedChart(null)}
              aria-label="Cerrar gráfico ampliado"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>

          <div className="grid gap-8 p-6 md:grid-cols-[18rem_minmax(0,1fr)] md:items-center">
            <div
              className="donut-modal-spin relative mx-auto grid size-64 place-items-center rounded-full shadow-[0_18px_40px_rgba(30,64,175,0.18)]"
              style={{ background: currentExpanded.background }}
            >
              <span className={`donut-ring-pulse absolute inset-0 rounded-full border ${currentExpanded.ring}`} aria-hidden="true" />
              <div className="grid size-40 place-items-center rounded-full bg-white text-center shadow-inner dark:bg-[#0f172a]">
                <span>
                  <strong className="block text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    {currentExpanded.total}
                  </strong>
                  <span className="text-sm font-semibold text-slate-400">{currentExpanded.unit}</span>
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {currentExpanded.items.map((item, index) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base font-bold text-slate-700 dark:text-slate-200">
                      <span className={`size-3 rounded-full ${item.color}`} />
                      {item.label}
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">
                      {item.value} <span className="text-sm font-semibold text-slate-400">({item.percent})</span>
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white dark:bg-slate-800">
                    <div
                      className={`chart-progress h-full rounded-full ${item.color}`}
                      style={{ '--progress-width': item.progress, animationDelay: `${280 + index * 120}ms` }}
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
        className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expanded-multas-pagos-title"
        onMouseDown={() => setExpandedMultasPagos(null)}
      >
        <div
          className="modal-enter w-full max-w-2xl overflow-hidden rounded-3xl border border-white/40 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-[#0f172a]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 via-white to-emerald-50 px-6 py-5 dark:border-slate-800 dark:from-rose-950/25 dark:via-slate-900 dark:to-emerald-950/25">
            <div>
              <h2 id="expanded-multas-pagos-title" className="text-xl font-extrabold text-slate-900 dark:text-white">
                Multas y pagos registrados
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {expandedMultasPagos.type === 'year'
                  ? `Detalle acumulado del año ${expandedMultasPagos.year}`
                  : `Detalle del mes de ${expandedMultasPagos.month} ${expandedMultasPagos.year}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpandedMultasPagos(null)}
              aria-label="Cerrar detalle de multas y pagos"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Multas</p>
                <p className="mt-1 text-3xl font-black text-rose-700 dark:text-rose-300">
                  {formatNumber(expandedMultasPagos.multas)}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Pagos</p>
                <p className="mt-1 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  {formatNumber(expandedMultasPagos.pagos)}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Pendiente</p>
                <p className="mt-1 text-3xl font-black text-orange-700 dark:text-orange-300">
                  {expandedMultasPagos.type === 'year'
                    ? `S/ ${formatNumber(expandedMultasPagos.pendiente)}`
                    : formatNumber(expandedMultasPagos.pendiente)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex h-64 items-end justify-center gap-12 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div className="flex h-full w-20 items-end rounded-t-2xl bg-rose-100 dark:bg-rose-950/50">
                  <span
                    key={`modal-multas-${expandedMultasPagos.title}`}
                    className="chart-bar block w-full rounded-t-2xl bg-gradient-to-t from-rose-700 via-red-500 to-orange-400 shadow-[0_16px_34px_rgba(225,29,72,0.25)]"
                    style={{ '--bar-height': expandedMultasPagos.multasHeight, animationDelay: '120ms' }}
                  />
                </div>
                <div className="flex h-full w-20 items-end rounded-t-2xl bg-emerald-100 dark:bg-emerald-950/50">
                  <span
                    key={`modal-pagos-${expandedMultasPagos.title}`}
                    className="chart-bar block w-full rounded-t-2xl bg-gradient-to-t from-emerald-700 via-teal-500 to-cyan-400 shadow-[0_16px_34px_rgba(5,150,105,0.22)]"
                    style={{ '--bar-height': expandedMultasPagos.pagosHeight, animationDelay: '260ms' }}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Multas</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{formatNumber(expandedMultasPagos.multas)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Pagos</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{formatNumber(expandedMultasPagos.pagos)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
