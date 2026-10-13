import { formatRangoHoras12, formatTextoHorario12 } from '../../utils/formatters'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { PlacaBadge } from '../ui/PlacaBadge'
import { CalendarioEventos, CalendarioEventosModal } from './CalendarioEventos'
import { esRolOficina } from '../../config/roles'

const CONCEPTOS_DINERO = [
  { key: 'papeletas', label: 'Papeletas', color: '#E57373' },
  { key: 'cursos', label: 'Cursos', color: '#5B6EE1' },
  { key: 'tramites', label: 'Trámites', color: '#F2B35E' },
]

// Número que sube de 0 al valor (se omite si el usuario pidió reducir movimiento)
function Contador({ value, duracion = 900 }) {
  const destino = Number(value) || 0
  const [mostrado, setMostrado] = useState(0)
  const previo = useRef(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      previo.current = destino
      setMostrado(destino)
      return undefined
    }
    const inicio = previo.current
    const t0 = performance.now()
    let id
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / duracion)
      const ease = 1 - Math.pow(1 - p, 3)
      const v = Math.round(inicio + (destino - inicio) * ease)
      previo.current = v
      setMostrado(v)
      if (p < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [destino, duracion])
  return <>{new Intl.NumberFormat('es-PE').format(mostrado)}</>
}

// Selector de año propio: lista con scroll, cierra al hacer clic fuera o con Esc
// Vistas que abarcan varios años (con décadas de datos se puede acotar a los más recientes)
const VISTAS_RANGO = { todos: Infinity, ult5: 5, ult10: 10 }
const esVistaRango = (v) => v in VISTAS_RANGO
const aniosDeVista = (vista, claves) => {
  const asc = [...claves].sort((a, b) => Number(a) - Number(b))
  const n = VISTAS_RANGO[vista]
  return Number.isFinite(n) ? asc.slice(-n) : asc
}

// Fila de columnas con ancho mínimo: si no caben (muchos años) se desliza de lado y abre en lo más reciente
function ColumnasDesplazables({ n, minCol = 56, flechas = true, children, className = '' }) {
  const ref = useRef(null)
  const [puedeIzq, setPuedeIzq] = useState(false)
  const [puedeDer, setPuedeDer] = useState(false)
  const medir = () => {
    const el = ref.current
    if (!el) return
    setPuedeIzq(el.scrollLeft > 4)
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [n])
  const mover = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  const flecha = 'absolute top-[40%] z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white dark:bg-[#1C2438] text-[#2B3674] dark:text-white shadow-md border border-slate-200/80 dark:border-white/10 transition enabled:hover:scale-105 enabled:cursor-pointer disabled:opacity-30'
  return (
    <div className={`relative ${className}`}>
      {flechas && (
        <button type="button" onClick={() => mover(-1)} disabled={!puedeIzq} aria-label="Anteriores" className={`${flecha} -left-3`}>
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <div ref={ref} onScroll={medir} className="sin-scrollbar h-full overflow-x-auto">
        <div className="flex h-full gap-2" style={{ minWidth: n * (minCol + 8) }}>{children}</div>
      </div>
      {flechas && (
        <button type="button" onClick={() => mover(1)} disabled={!puedeDer} aria-label="Siguientes" className={`${flecha} -right-3`}>
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  )
}

function SelectorAnio({ value, years, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])
  const rangos = [
    ...(years.length > 5 ? [{ value: 'ult5', label: 'Últimos 5 años' }] : []),
    ...(years.length > 10 ? [{ value: 'ult10', label: 'Últimos 10 años' }] : []),
  ]
  const opciones = [{ value: 'todos', label: 'Todos' }, ...rangos, ...years.map((y) => ({ value: String(y), label: String(y) }))]
  const actual = opciones.find((o) => o.value === value)?.label || value
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex items-center gap-2 rounded-full bg-[#F4F7FE] dark:bg-white/5 px-3.5 py-1.5 text-xs font-bold text-[#707EAE] transition hover:bg-[#E9EDF7] dark:hover:bg-white/10 cursor-pointer"
        style={{ fontSize: 12 }}
      >
        <span className="uppercase tracking-wider">Año</span>
        <span className="font-extrabold text-[#2B3674] dark:text-white">{actual}</span>
        <svg className={`size-3 text-[#707EAE] transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {abierto && (
        <ul role="listbox" className="sin-scrollbar absolute right-0 z-30 mt-2 max-h-56 min-w-[120px] overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1C2438] p-1.5 shadow-[0_12px_32px_rgba(43,54,116,0.18)]">
          {opciones.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => { onChange(o.value); setAbierto(false) }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold transition cursor-pointer ${o.value === value ? 'bg-[#5B6EE1] text-white' : 'text-[#2B3674] dark:text-white hover:bg-[#F4F7FE] dark:hover:bg-white/10'}`}
                style={{ fontSize: 12 }}
              >
                {o.label}
                {o.value === value && <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Fila de tarjetas con desplazamiento lateral (flechas, rueda y arrastre táctil)
function CarruselAnios({ children, total }) {
  const ref = useRef(null)
  const [puedeIzq, setPuedeIzq] = useState(false)
  const [puedeDer, setPuedeDer] = useState(false)
  const medir = () => {
    const el = ref.current
    if (!el) return
    setPuedeIzq(el.scrollLeft > 4)
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = el.scrollWidth // abre mostrando los años más recientes
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [total])
  const mover = (dir) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: 'smooth' })
  const flecha = 'absolute top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white dark:bg-[#1C2438] text-[#2B3674] dark:text-white shadow-[0_6px_18px_rgba(43,54,116,0.2)] border border-slate-200/80 dark:border-white/10 transition hover:scale-105 cursor-pointer'
  return (
    <div className="relative">
      {puedeIzq && (
        <button type="button" onClick={() => mover(-1)} aria-label="Años anteriores" className={`${flecha} -left-3`}>
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <div ref={ref} onScroll={medir} className="sin-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2">
        {children}
      </div>
      {puedeDer && (
        <button type="button" onClick={() => mover(1)} aria-label="Años siguientes" className={`${flecha} -right-3`}>
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  )
}


export function ChartsSection({ data, loading = false, user }) {
  const rolNormalizado = (user?.rol || '').toUpperCase()
  const isOffice = esRolOficina(rolNormalizado)
  const navigate = useNavigate()
  const [expandedChart, setExpandedChart] = useState(null)
  const [expandedMultasPagos, setExpandedMultasPagos] = useState(null)
  const [anioDinero, setAnioDinero] = useState(String(new Date().getFullYear()))
  const [barraSel, setBarraSel] = useState(null)
  const [calendarioGrande, setCalendarioGrande] = useState(false)
  useEffect(() => { setBarraSel(null) }, [anioDinero])
  // Se cierra con clic en cualquier otro lugar (fuera de las barras y del panel) o con Esc
  useEffect(() => {
    if (barraSel === null) return undefined
    const fuera = (e) => {
      if (e.target.closest?.('[data-barra-dinero], [data-panel-dinero]')) return
      setBarraSel(null)
    }
    const tecla = (e) => { if (e.key === 'Escape') setBarraSel(null) }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [barraSel])
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [operationsZoom, setOperationsZoom] = useState(0)
  const [hoverOp, setHoverOp] = useState(0)
  const [hoverOn, setHoverOn] = useState(false)
  const [hoverVehOp, setHoverVehOp] = useState(0)
  const [hoverVehOn, setHoverVehOn] = useState(false)
  const [vehZoom, setVehZoom] = useState(0)

  useEffect(() => {
    if (!hoverOn) return undefined
    const fuera = (e) => { if (operationsChartRef.current && !operationsChartRef.current.contains(e.target)) setHoverOn(false) }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [hoverOn])

  const operationsChartRef = useRef(null)
  const vehChartRef = useRef(null)

  useEffect(() => {
    if (!hoverVehOn) return undefined
    const fuera = (e) => { if (vehChartRef.current && !vehChartRef.current.contains(e.target)) setHoverVehOn(false) }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [hoverVehOn])

  const zoomWindows = [12, 6, 4, 3]

  const movimientosRecientes = data?.movimientosRecientes ?? []
  const formatFechaHora = (value) => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) + ' · ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  }
  const estadoBadgeClass = (estado) => {
    const e = (estado || '').toUpperCase()
    if (['PAGADO', 'APROBADO', 'APROBADA', 'CONCLUIDO'].includes(e)) return 'bg-[#E6F9F0] dark:bg-emerald-500/20 text-[#01B574]'
    if (['ANULADO', 'ANULADA', 'RECHAZADO', 'RECHAZADA'].includes(e)) return 'bg-[#FEEFEE] dark:bg-rose-500/20 text-[#EE5D50]'
    return 'bg-[#FFF5E6] dark:bg-amber-500/20 text-[#FFB547]'
  }
  const getIniciales = (nombre) => {
    if (!nombre || nombre === '—') return '—'
    const partes = nombre.trim().split(/\s+/)
    return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase()
  }

  const emptyMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'].map((month) => ({ month, multas: 0, pagos: 0 }))
  const expedientesBreakdown = data?.expedientes ?? [
    { label: 'Vigentes', value: 0, percent: '0%', color: 'bg-[#5B6EE1]', progress: '0%' },
    { label: 'Vencidos', value: 0, percent: '0%', color: 'bg-[#F43F5E]', progress: '0%' },
    { label: 'Por vencer', value: 0, percent: '0%', color: 'bg-[#FFB547]', progress: '0%' },
  ]
  const multasPagosPorAnio = data?.multasPagosPorAnio ?? {
    [new Date().getFullYear()]: { totals: { multas: 0, pagos: 0, pendiente: 0 }, months: emptyMonths },
  }
  const availableYears = Object.keys(multasPagosPorAnio).sort((a, b) => Number(b) - Number(a))
  const parseNumber = (value) => Number(String(value).replaceAll(',', '').replace('S/', '').replace('%', '').trim())
  const formatNumber = (value) => new Intl.NumberFormat('es-PE').format(value)
  const selectedDataYear = multasPagosPorAnio[selectedYear] ? selectedYear : availableYears[0]
  const isAllYearsSelected = esVistaRango(selectedYear)
  const aniosVistaMulta = aniosDeVista(selectedYear, Object.keys(multasPagosPorAnio))
  const multasPagos = multasPagosPorAnio[isAllYearsSelected ? selectedDataYear : selectedDataYear] || { totals: { multas: 0, pagos: 0, pendiente: 0 }, months: emptyMonths }
  const totalMultasHistorico = aniosVistaMulta.map((y) => multasPagosPorAnio[y]).reduce((sum, data) => sum + parseNumber(data.totals?.multas || 0), 0)
  const totalPagosHistorico = aniosVistaMulta.map((y) => multasPagosPorAnio[y]).reduce((sum, data) => sum + parseNumber(data.totals?.pagos || 0), 0)
  const totalPendienteHistorico = aniosVistaMulta.map((y) => multasPagosPorAnio[y]).reduce((sum, data) => sum + parseNumber(data.totals?.pendiente || 0), 0)
  const multasPagosResumen = isAllYearsSelected
    ? { multas: formatNumber(totalMultasHistorico), pagos: formatNumber(totalPagosHistorico), pendiente: totalPendienteHistorico }
    : (multasPagos.totals || { multas: 0, pagos: 0, pendiente: 0 })
  const getMonthlyValues = (year, data) => {
    const totalMultas = parseNumber(data.totals?.multas || 0)
    const totalPagos = parseNumber(data.totals?.pagos || 0)
    const rawItems = (data.months || []).map((monthItem) => ({
      type: 'month',
      title: `${monthItem.month} ${year}`,
      period: year === String(new Date().getFullYear()) ? 'Año actual' : 'Periodo anual',
      month: monthItem.month,
      year,
      multas: parseNumber(monthItem.multas),
      pagos: parseNumber(monthItem.pagos),
      pendiente: parseNumber(monthItem.pendiente || 0),
    }))
    const maxValue = Math.max(1, ...rawItems.flatMap((item) => [item.multas, item.pagos, item.pendiente]))
    return rawItems.map((item) => ({
      ...item,
      pendiente: item.pendiente,
      multasHeight: `${Math.max(4, Math.round((item.multas / maxValue) * 100))}%`,
      pagosHeight: `${Math.max(4, Math.round((item.pagos / maxValue) * 100))}%`,
      pendienteHeight: `${Math.max(4, Math.round((item.pendiente / maxValue) * 100))}%`,
    }))
  }
  const yearlyMax = Math.max(1, ...aniosVistaMulta.map((y) => multasPagosPorAnio[y]).flatMap((data) => [parseNumber(data.totals?.multas || 0), parseNumber(data.totals?.pagos || 0), parseNumber(data.totals?.pendiente || 0)]))
  const yearlyMultasPagos = Object.entries(multasPagosPorAnio)
    .filter(([y]) => aniosVistaMulta.includes(y))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, data]) => ({
      type: 'year',
      title: year,
      year,
      label: year === String(new Date().getFullYear()) ? `Ene - ${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][new Date().getMonth()]}` : 'Ene - Dic',
      multas: parseNumber(data.totals?.multas || 0),
      pagos: parseNumber(data.totals?.pagos || 0),
      pendiente: parseNumber(data.totals?.pendiente || 0),
      multasHeight: `${Math.max(8, Math.round((parseNumber(data.totals?.multas || 0) / yearlyMax) * 100))}%`,
      pagosHeight: `${Math.max(8, Math.round((parseNumber(data.totals?.pagos || 0) / yearlyMax) * 100))}%`,
      pendienteHeight: `${Math.max(8, Math.round((parseNumber(data.totals?.pendiente || 0) / yearlyMax) * 100))}%`,
    }))
  const monthlyMultasPagos = getMonthlyValues(selectedDataYear, multasPagos)
  const dineroAnios = data?.recaudacionConcepto?.anios ?? {}
  const aniosDinero = Object.keys(dineroAnios).sort((a, b) => Number(b) - Number(a))
  const dineroTodos = esVistaRango(anioDinero)
  const anioDineroEf = dineroAnios[anioDinero] ? anioDinero : aniosDinero[0]
  const sumaConceptos = (o) => CONCEPTOS_DINERO.reduce((sum, c) => sum + (o?.[c.key] || 0), 0)
  const sumarTotales = (lista) => Object.fromEntries(CONCEPTOS_DINERO.map((c) => [c.key, lista.reduce((sum, t) => sum + (t?.[c.key] || 0), 0)]))
  const recaudacion = dineroTodos
    ? {
      anio: 'varios años',
      titulo: anioDinero === 'todos' ? 'Todos' : anioDinero === 'ult5' ? 'últimos 5 años' : 'últimos 10 años',
      totales: sumarTotales(aniosDeVista(anioDinero, Object.keys(dineroAnios)).map((y) => dineroAnios[y].totales)),
      meses: aniosDeVista(anioDinero, Object.keys(dineroAnios)).map((y) => ({ month: y, ...dineroAnios[y].totales })),
    }
    : {
      anio: anioDineroEf,
      titulo: anioDineroEf,
      totales: dineroAnios[anioDineroEf]?.totales ?? {},
      meses: dineroAnios[anioDineroEf]?.meses ?? [],
    }
  const maxMesDinero = Math.max(1, ...recaudacion.meses.map((m) => sumaConceptos(m)))
  const vehiculosDeposito = data?.vehiculosDeposito ?? [
    { label: 'En depósito', value: 62, percent: '78%', color: 'bg-orange-500', progress: '78%' },
    { label: 'Liberados', value: 18, percent: '22%', color: 'bg-[#01B574]', progress: '22%' },
  ]
  const asociaciones = data?.asociaciones ?? []
  const inspeccionesResultado = data?.inspeccionesResultado ?? []
  const operatividad = data?.operatividad ?? []
  const totalOperatividad = operatividad.reduce((sum, item) => sum + item.value, 0)
  const operationsData = data?.operacionesMensuales ?? emptyMonths.map(({ month }) => ({ month, operativos: 0, rutina: 0 }))
  const totalExpedientes = expedientesBreakdown.reduce((sum, item) => sum + parseNumber(item.value), 0)
  const totalVehiculosDeposito = vehiculosDeposito.reduce((sum, item) => sum + parseNumber(item.value), 0)
  const enDepositoValue = vehiculosDeposito.find(v => v.label === 'En depósito')?.value || 0
  const liberadosValue = vehiculosDeposito.find(v => v.label === 'Liberados')?.value || 0
  const depositoPercent = vehiculosDeposito.find(v => v.label === 'En depósito')?.percent?.replace('%', '') || 0
  const visibleOperations = operationsData.slice(-zoomWindows[operationsZoom])
  const chartWidth = 600
  const chartHeight = 180
  const chartMax = Math.max(1, Math.ceil(Math.max(...operationsData.flatMap((item) => [item.operativos, item.rutina])) / 10) * 10)
  const xStep = visibleOperations.length > 1 ? chartWidth / (visibleOperations.length - 1) : chartWidth
  const toPoint = (item, index, key) => {
    const x = index * xStep
    const y = chartHeight - (item[key] / chartMax) * 150 - 10
    return `${x},${y}`
  }
  const operativosPoints = visibleOperations.map((item, index) => toPoint(item, index, 'operativos')).join(' ')
  const rutinaPoints = visibleOperations.map((item, index) => toPoint(item, index, 'rutina')).join(' ')
  const areaPoints = `0,170 ${operativosPoints} ${chartWidth},170`

  // Vehicle Chart calculations
  const allVehiclesData = data?.vehiculosMensuales ?? []
  const vehiclesData = allVehiclesData.slice(-zoomWindows[vehZoom])
  const vehChartMax = Math.max(1, Math.ceil(Math.max(...vehiclesData.flatMap((item) => [item.formal, item.informal])) / 5) * 5 + 5)
  const vehXStep = vehiclesData.length > 1 ? chartWidth / (vehiclesData.length - 1) : chartWidth
  const toVehPoint = (item, index, key) => {
    const x = index * vehXStep
    const y = chartHeight - (item[key] / vehChartMax) * 150 - 10
    return `${x},${y}`
  }
  const formalPoints = vehiclesData.map((item, index) => toVehPoint(item, index, 'formal')).join(' ')
  const informalPoints = vehiclesData.map((item, index) => toVehPoint(item, index, 'informal')).join(' ')
  const formalAreaPoints = `0,170 ${formalPoints} ${chartWidth},170`
  const informalAreaPoints = `0,170 ${informalPoints} ${chartWidth},170`

  // Dona con porciones reales (antes eran porcentajes fijos)
  const COLOR_PORCION = { Vigentes: '#2563eb', 'Por vencer': '#f59e0b', Vencidos: '#f43f5e', 'Empresas particulares': '#5B6EE1', Asociaciones: '#6CB8E8', 'En depósito': '#f97316', Liberados: '#10b981' }
  const conicDesdeItems = (items) => {
    const total = items.reduce((sum, item) => sum + parseNumber(item.value), 0)
    if (total <= 0) return 'conic-gradient(#E9EDF7 0 100%)'
    let acum = 0
    const tramos = items.map((item) => {
      const ini = acum
      acum += (parseNumber(item.value) / total) * 100
      return `${COLOR_PORCION[item.label] || '#94a3b8'} ${ini}% ${acum}%`
    })
    return `conic-gradient(${tramos.join(', ')})`
  }
  const fondoExpedientes = conicDesdeItems(expedientesBreakdown)

  const circularCharts = {
    expedientes: {
      title: 'Estado de expedientes',
      subtitle: 'Tarjeta de Operatividad, SOAT, Tarjeta de Propiedad, CERTICAV y Cursos de Seguridad Vial',
      total: formatNumber(totalExpedientes),
      unit: 'expedientes',
      background: fondoExpedientes,
      ring: 'border-[#5B6EE1]/20',
      items: expedientesBreakdown,
      detalle: data?.expedientesDetalle ?? [],
    },
    asociaciones: {
      title: 'Asociaciones',
      subtitle: 'Empresas particulares y asociaciones registradas',
      total: formatNumber(asociaciones.reduce((sum, item) => sum + parseNumber(item.value), 0)),
      unit: 'organizaciones',
      background: conicDesdeItems(asociaciones),
      ring: 'border-[#5B6EE1]/30',
      items: asociaciones,
    },
    deposito: {
      title: 'Vehículos en depósito',
      subtitle: 'Detalle ampliado de unidades retenidas y liberadas',
      total: formatNumber(totalVehiculosDeposito),
      unit: 'unidades',
      background: conicDesdeItems(vehiculosDeposito),
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

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-start">
        {/* LEFT COLUMN (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-7">

          {/* 1. Operaciones mensuales (Restaurado interactivo svg) */}
          {isOffice && (
            <article className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '60ms' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-[#2B3674] dark:text-white tracking-tight">Operativos y Rutina</h3>
                  <p className="mt-0.5 text-xs text-[#A3AED0]">Papeletas registradas por mes: de operativo y de rutina</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 bg-[#F4F7FE] dark:bg-white/5 p-1 rounded-full">
                    <button type="button" onClick={() => setOperationsZoom(v => Math.max(0, v - 1))} disabled={operationsZoom === 0} className="w-7 h-7 rounded-full hover:bg-white dark:hover:bg-white/10 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none text-[#2B3674] dark:text-white flex items-center justify-center transition-all cursor-pointer" title="Alejar vista">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                      </svg>
                    </button>
                    <button type="button" onClick={() => setOperationsZoom(v => Math.min(zoomWindows.length - 1, v + 1))} disabled={operationsZoom === zoomWindows.length - 1} className="w-7 h-7 rounded-full hover:bg-white dark:hover:bg-white/10 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none text-[#2B3674] dark:text-white flex items-center justify-center transition-all cursor-pointer" title="Acercar vista">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#A3AED0]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-[#5B6EE1]" />
                      Operativos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-[#6CB8E8]" />
                      Rutina
                    </span>
                  </div>
                  <span className="rounded-lg bg-[#F4F7FE] dark:bg-white/5 px-2.5 py-1 text-xs font-bold text-[#707EAE]">
                    {visibleOperations.length} meses
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <div
                  ref={operationsChartRef}
                  className="relative h-52 w-full cursor-pointer overscroll-contain"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    const x0 = r.left + 32
                    const w = r.width - 48
                    const n = visibleOperations.length
                    if (n === 0 || w <= 0) return
                    const idx = n > 1 ? Math.round(((e.clientX - x0) / w) * (n - 1)) : 0
                    const nuevo = Math.max(0, Math.min(n - 1, idx))
                    // mismo mes: cierra; otro mes: lo muestra
                    setHoverOn(hoverOn && hoverOp === nuevo ? false : true)
                    setHoverOp(nuevo)
                  }}
                >
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
                        <stop offset="0" stopColor="#5B6EE1" stopOpacity="0.22" />
                        <stop offset="1" stopColor="#5B6EE1" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <path key={`area-${operationsZoom}`} className="chart-area" d={`M${areaPoints} Z`} fill="url(#tailAreaBlue)" />
                    <polyline
                      pathLength="1"
                      key={`operativos-${operationsZoom}`}
                      className="chart-line"
                      points={operativosPoints}
                      fill="none"
                      stroke="#5B6EE1"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"

                    />
                    <polyline
                      pathLength="1"
                      key={`rutina-${operationsZoom}`}
                      className="chart-line"
                      points={rutinaPoints}
                      fill="none"
                      stroke="#6CB8E8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"

                    />
                    {visibleOperations.map((item, index) => {
                      const [cx, cy] = toPoint(item, index, 'operativos').split(',')
                      const [rx, ry] = toPoint(item, index, 'rutina').split(',')
                      const activo = hoverOn && hoverOp === index
                      return (
                        <g key={`${operationsZoom}-${item.month}`}>
                          <circle className="chart-point" style={{ animationDelay: `${500 + index * 55}ms` }} cx={cx} cy={cy} r={activo ? 6.5 : 4.5} fill="white" stroke="#5B6EE1" strokeWidth="2.5" />
                          <circle className="chart-point" style={{ animationDelay: `${500 + index * 55}ms` }} cx={rx} cy={ry} r={activo ? 6.5 : 4.5} fill="white" stroke="#6CB8E8" strokeWidth="2.5" />
                        </g>
                      )
                    })}
                  </svg>
                  {visibleOperations[hoverOp] && (() => {
                    const idx = Math.min(hoverOp, visibleOperations.length - 1)
                    const it = visibleOperations[idx]
                    const frac = visibleOperations.length > 1 ? idx / (visibleOperations.length - 1) : 0.5
                    const left = `calc(2rem + (100% - 3rem) * ${frac})`
                    const ancla = frac > 0.8 ? '-translate-x-[85%]' : frac < 0.2 ? '-translate-x-[15%]' : '-translate-x-1/2'
                    return (
                      <>
                        <div
                          className="pointer-events-none absolute top-2 bottom-3 w-px bg-gradient-to-b from-[#5B6EE1]/40 to-transparent transition-all duration-300 ease-out"
                          style={{ left, opacity: hoverOn ? 1 : 0 }}
                        />
                        <div
                          className={`pointer-events-none absolute top-0 z-20 ${ancla} transition-all duration-300 ease-out`}
                          style={{ left, opacity: hoverOn ? 1 : 0 }}
                        >
                          <div className={`min-w-[150px] rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1C2438]/95 px-4 py-3 shadow-[0_12px_32px_rgba(43,54,116,0.18)] backdrop-blur transition-transform duration-300 ${hoverOn ? 'translate-y-0' : 'translate-y-1'}`}>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#A3AED0]">{it.month} {new Date().getFullYear()}</p>
                            <div className="flex items-center justify-between gap-6 text-[13px] text-[#2B3674] dark:text-white">
                              <span className="flex items-center gap-2 font-semibold"><span className="size-2.5 rounded-full bg-[#5B6EE1]" />Operativos</span>
                              <span className="font-extrabold">{it.operativos}</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-6 text-[13px] text-[#2B3674] dark:text-white">
                              <span className="flex items-center gap-2 font-semibold"><span className="size-2.5 rounded-full bg-[#6CB8E8]" />Rutina</span>
                              <span className="font-extrabold">{it.rutina}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-2 text-[12px] font-bold text-[#707EAE]">
                              <span>Total</span>
                              <span className="text-[#2B3674] dark:text-white">{it.operativos + it.rutina}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()}
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

          {/* Vehiculos Formales vs Informales */}
          <article className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '560ms' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-extrabold text-[#2B3674] dark:text-white tracking-tight">Registro Vehicular (Formal / Informal)</h3>
                <p className="mt-0.5 text-xs text-[#A3AED0]">Evolución del registro de unidades por mes</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-[#F4F7FE] dark:bg-white/5 p-1 rounded-full">
                  <button type="button" onClick={() => setVehZoom(v => Math.max(0, v - 1))} disabled={vehZoom === 0} className="w-7 h-7 rounded-full hover:bg-white dark:hover:bg-white/10 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none text-[#2B3674] dark:text-white flex items-center justify-center transition-all cursor-pointer" title="Alejar vista">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => setVehZoom(v => Math.min(zoomWindows.length - 1, v + 1))} disabled={vehZoom === zoomWindows.length - 1} className="w-7 h-7 rounded-full hover:bg-white dark:hover:bg-white/10 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none text-[#2B3674] dark:text-white flex items-center justify-center transition-all cursor-pointer" title="Acercar vista">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-[#A3AED0]">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#EAB308]" />
                    Informales
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#3b82f6]" />
                    Formales
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div
                ref={vehChartRef}
                className="relative h-52 w-full cursor-pointer overscroll-contain"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  const x0 = r.left + 32
                  const w = r.width - 48
                  const n = vehiclesData.length
                  if (n === 0 || w <= 0) return
                  const idx = n > 1 ? Math.round(((e.clientX - x0) / w) * (n - 1)) : 0
                  const nuevo = Math.max(0, Math.min(n - 1, idx))
                  setHoverVehOn(hoverVehOn && hoverVehOp === nuevo ? false : true)
                  setHoverVehOp(nuevo)
                }}
              >
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-[#A3AED0]" aria-hidden="true">
                  {[80, 60, 40, 20, 0].map((value) => (
                    <div key={value} className="flex items-center gap-3">
                      <span className="w-5 text-right font-medium">{Math.round((vehChartMax * value) / 80)}</span>
                      <span className="h-px flex-1 bg-[#F4F7FE] dark:bg-white/5" />
                    </div>
                  ))}
                </div>
                <svg
                  role="img"
                  aria-label="Gráfico de vehículos"
                  viewBox="0 0 600 180"
                  preserveAspectRatio="none"
                  className="absolute inset-x-8 bottom-3 top-2 h-[calc(100%-1.25rem)] w-[calc(100%-3rem)] overflow-visible"
                >
                  <defs>
                    <linearGradient id="tailAreaYellow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#EAB308" stopOpacity="0.22" />
                      <stop offset="1" stopColor="#EAB308" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="tailAreaBlue2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#3b82f6" stopOpacity="0.22" />
                      <stop offset="1" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Informal (Yellow, dashed) */}
                  <path className="chart-area" d={`M${informalAreaPoints} Z`} fill="url(#tailAreaYellow)" />
                  <polyline
                    className="chart-line"
                    points={informalPoints}
                    fill="none"
                    stroke="#EAB308"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"

                  />

                  {/* Formal (Blue, solid) */}
                  <path className="chart-area" d={`M${formalAreaPoints} Z`} fill="url(#tailAreaBlue2)" />
                  <polyline
                    className="chart-line"
                    points={formalPoints}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"

                  />

                  {vehiclesData.map((item, index) => {
                    const x = index * vehXStep
                    const y1 = 170 - (item.informal / vehChartMax) * 150
                    const y2 = 170 - (item.formal / vehChartMax) * 150
                    const activo = hoverVehOn && hoverVehOp === index
                    return (
                      <g key={`veh-point-${item.name}-${index}`}>
                        <circle className="chart-point" style={{ animationDelay: `${500 + index * 55}ms` }} cx={x} cy={y1} r={activo ? 6.5 : 4.5} fill="white" stroke="#EAB308" strokeWidth="2.5" />
                        <circle className="chart-point" style={{ animationDelay: `${500 + index * 55}ms` }} cx={x} cy={y2} r={activo ? 6.5 : 4.5} fill="white" stroke="#3b82f6" strokeWidth="2.5" />
                      </g>
                    )
                  })}
                </svg>

                {vehiclesData[hoverVehOp] && (() => {
                  const idx = Math.min(hoverVehOp, vehiclesData.length - 1)
                  const it = vehiclesData[idx]
                  const frac = vehiclesData.length > 1 ? idx / (vehiclesData.length - 1) : 0.5
                  const left = `calc(2rem + (100% - 3rem) * ${frac})`
                  const ancla = frac > 0.8 ? '-translate-x-[85%]' : frac < 0.2 ? '-translate-x-[15%]' : '-translate-x-1/2'
                  return (
                    <>
                      <div
                        className="pointer-events-none absolute top-2 bottom-3 w-px bg-gradient-to-b from-[#3b82f6]/40 to-transparent transition-all duration-300 ease-out"
                        style={{ left, opacity: hoverVehOn ? 1 : 0 }}
                      />
                      <div
                        className={`pointer-events-none absolute top-0 z-20 ${ancla} transition-all duration-300 ease-out`}
                        style={{ left, opacity: hoverVehOn ? 1 : 0 }}
                      >
                        <div className={`min-w-[150px] rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1C2438]/95 px-4 py-3 shadow-[0_12px_32px_rgba(43,54,116,0.18)] backdrop-blur transition-transform duration-300 ${hoverVehOn ? 'translate-y-0' : 'translate-y-1'}`}>
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#A3AED0]">{it.name} {selectedYear}</p>
                          <div className="flex items-center justify-between gap-6 text-[13px] text-[#2B3674] dark:text-white">
                            <span className="flex items-center gap-2 font-semibold"><span className="size-2.5 rounded-full bg-[#EAB308]" />Informales</span>
                            <span className="font-extrabold">{it.informal}</span>
                          </div>
                          <div className="flex items-center justify-between gap-6 text-[13px] text-[#2B3674] dark:text-white mt-1.5">
                            <span className="flex items-center gap-2 font-semibold"><span className="size-2.5 rounded-full bg-[#3b82f6]" />Formales</span>
                            <span className="font-extrabold">{it.formal}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="ml-8 flex justify-between text-center text-xs font-semibold text-[#A3AED0]">
                {vehiclesData.map((item) => (
                  <span key={item.name}>{item.name}</span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-end rounded-xl bg-[#F4F7FE] dark:bg-white/5 px-3 py-2 text-xs font-bold text-[#707EAE]">
                <span>
                  {vehiclesData[0]?.name} - {vehiclesData[vehiclesData.length - 1]?.name} {selectedYear}
                </span>
              </div>
            </div>
          </article>

          {/* Dinero recaudado por concepto */}
          {isOffice && (
            <article className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '200ms' }}>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#2B3674] dark:text-white tracking-tight">Dinero recaudado por concepto</h2>
                  <p className="mt-0.5 text-xs text-[#A3AED0]">
                    {dineroTodos ? 'Papeletas, cursos y trámites cobrados, año por año' : `Papeletas, cursos y trámites cobrados en ${recaudacion.anio}, mes a mes`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const i = aniosDinero.indexOf(anioDineroEf)
                    const base = 'grid size-8 place-items-center rounded-full bg-[#F4F7FE] dark:bg-white/5 text-[#707EAE] transition hover:bg-[#E9EDF7] dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-[#F4F7FE] cursor-pointer disabled:cursor-default'
                    const sinNav = dineroTodos
                    return (
                      <>
                        <button type="button" className={base} disabled={sinNav || i >= aniosDinero.length - 1} onClick={() => setAnioDinero(aniosDinero[i + 1])} aria-label="Año anterior" title="Año anterior">
                          <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <SelectorAnio value={anioDinero} years={aniosDinero} onChange={setAnioDinero} />
                        <button type="button" className={base} disabled={sinNav || i <= 0} onClick={() => setAnioDinero(aniosDinero[i - 1])} aria-label="Año siguiente" title="Año siguiente">
                          <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4 mb-6">
                {CONCEPTOS_DINERO.map((c) => (
                  <div key={c.key} className="rounded-xl border border-slate-100 dark:border-white/5 bg-[#F4F7FE] dark:bg-white/5 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#707EAE]"><span className="size-2 rounded-full" style={{ background: c.color }} />{c.label}</p>
                    <p className="text-lg font-extrabold text-[#2B3674] dark:text-white">S/ <Contador value={recaudacion.totales[c.key] || 0} /></p>
                  </div>
                ))}
                <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-[#F4F7FE] dark:bg-white/5 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#707EAE]">Total {recaudacion.titulo}</p>
                  <p className="text-lg font-extrabold text-[#2B3674] dark:text-white">S/ <Contador value={CONCEPTOS_DINERO.reduce((sum, c) => sum + (recaudacion.totales[c.key] || 0), 0)} /></p>
                </div>
              </div>
              {(() => {
                const sel = recaudacion.meses.find((m) => m.month === barraSel)
                if (!sel) return <p className="mb-3 text-xs font-semibold text-[#A3AED0]">Haz clic en una barra para ver su detalle{dineroTodos ? ' y entrar a sus meses' : ''}.</p>
                const totalSel = sumaConceptos(sel)
                return (
                  <div data-panel-dinero className="relative mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-[#F4F7FE] dark:bg-white/5 py-3 pl-4 pr-12 animate-enter">
                    <button type="button" onClick={() => setBarraSel(null)} aria-label="Cerrar detalle" title="Cerrar" className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer">
                      <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                    <div>
                      <p className="text-sm font-extrabold text-[#2B3674] dark:text-white">{dineroTodos ? sel.month : `${sel.month} ${recaudacion.anio}`}</p>
                      <p className="text-xs font-semibold text-[#A3AED0]">Total S/ {formatNumber(Math.round(totalSel))}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-bold text-[#2B3674] dark:text-white">
                      {CONCEPTOS_DINERO.map((c) => (
                        <span key={c.key} className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                          {c.label}: S/ {formatNumber(Math.round(sel[c.key] || 0))}
                        </span>
                      ))}
                    </div>
                    {dineroTodos && (
                      <button type="button" onClick={() => { setAnioDinero(sel.month); setBarraSel(null) }} className="rounded-full bg-[#5B6EE1] px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 cursor-pointer" style={{ fontSize: 12 }}>
                        Ver meses de {sel.month} →
                      </button>
                    )}
                  </div>
                )
              })()}
              <ColumnasDesplazables key={`dinero-${anioDinero}`} n={recaudacion.meses.length} minCol={dineroTodos ? 56 : 40} flechas={dineroTodos} className="h-52">
                {recaudacion.meses.map((m, idx) => {
                  const total = CONCEPTOS_DINERO.reduce((sum, c) => sum + (m[c.key] || 0), 0)
                  return (
                    <button
                      type="button"
                      key={m.month}
                      data-barra-dinero
                      onClick={() => setBarraSel((v) => (v === m.month ? null : m.month))}
                      aria-pressed={barraSel === m.month}
                      aria-label={`${m.month}: S/ ${formatNumber(Math.round(total))}`}
                      className="relative flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end text-inherit transition-opacity duration-200"
                      style={{ opacity: barraSel === null || barraSel === m.month ? 1 : 0.45, font: 'inherit' }}
                    >
                      <div className="flex flex-1 flex-col justify-end border-b border-[#F4F7FE] dark:border-white/5">
                        <div className={`barra-sube flex w-full flex-col-reverse overflow-hidden rounded-t-lg transition-shadow ${barraSel === m.month ? 'ring-2 ring-[#5B6EE1]/60' : ''}`} style={{ height: `${Math.max(total > 0 ? 3 : 0, (total / maxMesDinero) * 100)}%`, animationDelay: `${Math.min(idx * 45, 500)}ms` }}>
                          {CONCEPTOS_DINERO.map((c) => (
                            <span key={c.key} style={{ height: total > 0 ? `${((m[c.key] || 0) / total) * 100}%` : 0, background: c.color }} />
                          ))}
                        </div>
                      </div>
                      <span className={`mt-2 text-center text-[11px] font-semibold ${barraSel === m.month ? 'text-[#2B3674] dark:text-white' : 'text-[#A3AED0]'}`}>{m.month}</span>
                    </button>
                  )
                })}
              </ColumnasDesplazables>
            </article>
          )}

          {/* Multas y pagos registrados (Restaurado interactivo) */}
          {isOffice && (
            <article className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '240ms' }}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-[#2B3674] dark:text-white tracking-tight">Multas y pagos registrados</h2>
                  <p className="mt-0.5 text-xs text-[#A3AED0]">Comparativo anual por meses de papeletas emitidas y pagos atendidos</p>
                </div>
                <SelectorAnio value={selectedYear} years={availableYears} onChange={setSelectedYear} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3 mb-6">
                <div className="rounded-xl border border-[#EE5D50]/10 bg-[#FEEFEE] dark:bg-rose-500/20 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#EE5D50]">Multas</p>
                  <p className="text-lg font-extrabold text-[#2B3674] dark:text-white"><Contador value={parseNumber(multasPagosResumen.multas)} /></p>
                </div>
                <div className="rounded-xl border border-[#01B574]/10 bg-[#E6F9F0] dark:bg-emerald-500/20 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#01B574]">Pagos</p>
                  <p className="text-lg font-extrabold text-[#2B3674] dark:text-white"><Contador value={parseNumber(multasPagosResumen.pagos)} /></p>
                </div>
                <div className="rounded-xl border border-[#FFB547]/10 bg-[#FFF5E6] dark:bg-amber-500/20 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFB547]">Pendiente</p>
                  <p className="text-lg font-extrabold text-[#2B3674] dark:text-white"><Contador value={parseNumber(multasPagosResumen.pendiente)} /></p>
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

                  <CarruselAnios total={yearlyMultasPagos.length}>
                    {yearlyMultasPagos.map((item, index) => (
                      <button
                        type="button"
                        key={item.year}
                        onClick={() => setExpandedMultasPagos(item)}
                        className="group min-w-[210px] flex-1 shrink-0 snap-start rounded-2xl border border-[#F4F7FE] bg-white dark:bg-[#1C2438] hover:border-[#5B6EE1]/30 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-horizon dark:shadow-none text-left cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xl font-black text-[#2B3674] dark:text-white">{item.year}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AED0]">{item.label}</p>
                          </div>
                          <Icon name="arrow" className="size-4 text-[#A3AED0] transition group-hover:translate-x-1 group-hover:text-[#5B6EE1]" />
                        </div>

                        <div className="flex h-24 items-end justify-center gap-4 border-b border-[#F4F7FE] pb-2 mb-3">
                          <div className="flex h-full w-8 items-end rounded-t-xl bg-[#FEEFEE] dark:bg-rose-500/20">
                            <span
                              className="barra-sube block w-full rounded-t-xl bg-[#EE5D50]"
                              style={{ height: item.multasHeight, animationDelay: `${index * 45 + 0}ms` }}
                            />
                          </div>
                          <div className="flex h-full w-8 items-end rounded-t-xl bg-[#E6F9F0] dark:bg-emerald-500/20">
                            <span
                              className="barra-sube block w-full rounded-t-xl bg-[#01B574]"
                              style={{ height: item.pagosHeight, animationDelay: `${index * 45 + 120}ms` }}
                            />
                          </div>
                          <div className="flex h-full w-8 items-end rounded-t-xl bg-[#FFF5E6] dark:bg-amber-500/20">
                            <span
                              className="barra-sube block w-full rounded-t-xl bg-[#FFB547]"
                              style={{ height: item.pendienteHeight, animationDelay: `${index * 45 + 240}ms` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          <div className="min-w-0 rounded-xl bg-[#F4F7FE] dark:bg-white/5 px-2 py-1.5">
                            <p className="font-bold text-[#EE5D50] text-[10px]">Multas</p>
                            <p className="truncate text-[13px] font-black text-[#2B3674] dark:text-white"><Contador value={item.multas} /></p>
                          </div>
                          <div className="min-w-0 rounded-xl bg-[#F4F7FE] dark:bg-white/5 px-2 py-1.5">
                            <p className="font-bold text-[#01B574] text-[10px]">Pagos</p>
                            <p className="truncate text-[13px] font-black text-[#2B3674] dark:text-white"><Contador value={item.pagos} /></p>
                          </div>
                          <div className="min-w-0 rounded-xl bg-[#F4F7FE] dark:bg-white/5 px-2 py-1.5">
                            <p className="font-bold text-[#FFB547] text-[10px]">Pend.</p>
                            <p className="truncate text-[13px] font-black text-[#2B3674] dark:text-white"><Contador value={item.pendiente} /></p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </CarruselAnios>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 mt-4">
                  {monthlyMultasPagos.map((item, index) => (
                    <button
                      type="button"
                      key={`${selectedDataYear}-${item.month}`}
                      onClick={() => setExpandedMultasPagos(item)}
                      className="rounded-xl border border-[#F4F7FE] bg-white dark:bg-[#1C2438] p-3 text-left transition hover:-translate-y-1 hover:border-[#5B6EE1]/30 hover:shadow-horizon dark:shadow-none cursor-pointer"
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
                            className="barra-sube block w-full rounded-t-lg bg-[#EE5D50]"
                            style={{ height: item.multasHeight, animationDelay: `${index * 45 + 0}ms` }}
                          />
                        </div>
                        <div className="flex h-full w-6 items-end rounded-t-lg bg-[#E6F9F0] dark:bg-emerald-500/20">
                          <span
                            className="barra-sube block w-full rounded-t-lg bg-[#01B574]"
                            style={{ height: item.pagosHeight, animationDelay: `${index * 45 + 120}ms` }}
                          />
                        </div>
                        <div className="flex h-full w-6 items-end rounded-t-lg bg-[#FFF5E6] dark:bg-amber-500/20">
                          <span
                            className="barra-sube block w-full rounded-t-lg bg-[#FFB547]"
                            style={{ height: item.pendienteHeight, animationDelay: `${index * 45 + 240}ms` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center gap-3 text-[10px] font-bold text-[#707EAE]">
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-[#EE5D50]" />
                          <Contador value={item.multas} />
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-[#01B574]" />
                          <Contador value={item.pagos} />
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-[#FFB547]" />
                          <Contador value={item.pendiente} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </article>
          )}


        </div>

        {/* RIGHT COLUMN (1/3 width on large screens) */}
        <div className="space-y-7">
          {/* Mini Calendar Widget con Operativos y Cursos de Seguridad Vial */}
          <div className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)]">
            <CalendarioEventos onAmpliar={() => setCalendarioGrande(true)} />
          </div>

          {/* Estado de expedientes (Restaurado interactivo) */}
          {isOffice && (
            <article className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '180ms' }}>
              <div className="border-b border-[#F4F7FE] pb-4 mb-5">
                <h2 className="text-lg font-extrabold text-[#2B3674] dark:text-white">Estado de expedientes</h2>
                <p className="mt-0.5 text-xs text-[#A3AED0]">Tarjeta de Operatividad, SOAT, Tarjeta de Propiedad, CERTICAV y Cursos</p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <button
                  type="button"
                  onClick={() => setExpandedChart('expedientes')}
                  aria-label="Ampliar gráfico de estado de expedientes"
                  className="donut-pop relative grid size-36 shrink-0 place-items-center rounded-full shadow-sm transition-transform duration-300 hover:scale-105 cursor-pointer"
                  style={{ background: fondoExpedientes }}
                >
                  <span className="donut-ring-pulse absolute inset-0 rounded-full border border-[#5B6EE1]/30" aria-hidden="true" />
                  <div className="grid size-28 place-items-center rounded-full bg-white dark:bg-[#1C2438] text-center shadow-inner">
                    <span>
                      <strong className="block text-2xl font-black text-[#2B3674] dark:text-white"><Contador value={totalExpedientes} /></strong>
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
                          className={`chart-progress h-full rounded-full ${item.color}`}
                          style={{ '--progress-width': item.progress, animationDelay: '300ms' }}
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
            <article className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '360ms' }}>
              <div className="border-b border-[#F4F7FE] pb-4 mb-5">
                <h2 className="text-lg font-extrabold text-[#2B3674] dark:text-white">Asociaciones</h2>
                <p className="mt-0.5 text-xs text-[#A3AED0]">Empresas particulares y asociaciones registradas</p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <button
                  type="button"
                  onClick={() => setExpandedChart('asociaciones')}
                  aria-label="Ampliar gráfico de asociaciones"
                  title="Ver detalle"
                  className="donut-pop relative grid size-36 shrink-0 cursor-pointer place-items-center rounded-full shadow-sm transition-transform duration-300 hover:scale-105"
                  style={{ background: conicDesdeItems(asociaciones) }}
                >
                  <span className="donut-ring-pulse absolute inset-0 rounded-full border border-[#5B6EE1]/30" aria-hidden="true" />
                  <div className="grid size-28 place-items-center rounded-full bg-white dark:bg-[#1C2438] text-center shadow-inner">
                    <span>
                      <strong className="block text-2xl font-black text-[#2B3674] dark:text-white"><Contador value={asociaciones.reduce((sum, item) => sum + parseNumber(item.value), 0)} /></strong>
                    </span>
                  </div>
                </button>
                <div className="w-full space-y-3">
                  {asociaciones.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl bg-[#F4F7FE] dark:bg-white/10 px-3 py-2.5 text-xs">
                      <span className="flex items-center gap-2 font-bold text-[#707EAE]">
                        <span className="size-2.5 rounded-full" style={{ background: COLOR_PORCION[item.label] || '#94a3b8' }} />
                        {item.label}
                      </span>
                      <span className="font-extrabold text-[#2B3674] dark:text-white">
                        {item.value} <span className="font-semibold text-[#A3AED0]">({item.percent})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )}

          {/* Vehículos en depósito (Restaurado interactivo) */}
          <article className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '300ms' }}>
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
                  <path className="anillo-draw text-[#FFB547]" style={{ '--anillo-len': depositoPercent }} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${depositoPercent}, 100`} strokeLinecap="round" strokeWidth="3.5"></path>
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
          </article>

          {/* Fiscalización: resultado de inspecciones y estado de papeletas */}
          {isOffice && (
            <article className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 shadow-horizon dark:shadow-none border border-slate-200/80 dark:border-[var(--border)] animate-enter" style={{ animationDelay: '420ms' }}>
              {[
                { titulo: 'Inspecciones CERTICAV', sub: 'Resultado de las inspecciones realizadas', items: inspeccionesResultado },
              ].map((bloque, b) => (
                <div key={bloque.titulo}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-extrabold text-[#2B3674] dark:text-white">{bloque.titulo}</h4>
                      <p className="mt-0.5 text-xs text-[#A3AED0]">{bloque.sub}</p>
                    </div>
                    <span className="rounded-full bg-[#F4F7FE] dark:bg-white/10 px-2.5 py-1 text-[11px] font-extrabold text-[#2B3674] dark:text-white">
                      <Contador value={bloque.items.reduce((sum, i) => sum + parseNumber(i.value), 0)} />
                    </span>
                  </div>
                  <div className="space-y-3">
                    {bloque.items.map((item, index) => (
                      <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-bold text-[#707EAE]">
                            <span className={`size-2.5 rounded-full ${item.color}`} />
                            {item.label}
                          </span>
                          <span className="font-extrabold text-[#2B3674] dark:text-white">
                            <Contador value={item.value} /> <span className="font-semibold text-[#A3AED0]">({item.percent})</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F4F7FE] dark:bg-white/5">
                          <div
                            className={`chart-progress h-full rounded-full ${item.color}`}
                            style={{ '--progress-width': item.progress, animationDelay: `${300 + (b * 3 + index) * 90}ms` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </article>
          )}
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
            className={`modal-enter sin-scrollbar w-full max-h-[92vh] overflow-y-auto rounded-[30px] bg-white dark:bg-[#1C2438] shadow-horizon dark:shadow-none ${currentExpanded.detalle?.length ? 'max-w-5xl' : 'max-w-3xl'}`}
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
                className="grid size-10 shrink-0 place-items-center rounded-full border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <div className={currentExpanded.detalle?.length ? 'grid md:grid-cols-2' : ''}>
              <div className={currentExpanded.detalle?.length ? 'grid content-start gap-5 p-6' : 'grid gap-8 p-6 md:grid-cols-[18rem_minmax(0,1fr)] md:items-center'}>
                <div
                  className={`donut-modal-spin relative mx-auto grid place-items-center rounded-full shadow-horizon dark:shadow-none ${currentExpanded.detalle?.length ? 'size-52' : 'size-64'}`}
                  style={{ background: currentExpanded.background }}
                >
                  <span className={`donut-ring-pulse absolute inset-0 rounded-full border ${currentExpanded.ring}`} aria-hidden="true" />
                  <div className={`grid place-items-center rounded-full bg-white dark:bg-[#1C2438] text-center shadow-inner ${currentExpanded.detalle?.length ? 'size-32' : 'size-40'}`}>
                    <span>
                      <strong className={`block font-black tracking-tight text-[#2B3674] dark:text-white ${currentExpanded.detalle?.length ? 'text-3xl' : 'text-5xl'}`}>
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
                      <div className="h-3 overflow-hidden rounded-full bg-white dark:bg-[#1C2438]">
                        <div
                          className={`chart-progress h-full rounded-full ${item.color}`}
                          style={{ '--progress-width': item.progress, animationDelay: `${250 + index * 90}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {currentExpanded.detalle?.length > 0 && (
                <div className="border-t border-[#F4F7FE] dark:border-white/10 px-6 pb-6 pt-5 md:border-l md:border-t-0">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#A3AED0]">Detalle por documento</p>
                  <div className="space-y-2.5">
                    {currentExpanded.detalle.map((d, index) => (
                      <div key={d.label} className="rounded-2xl bg-[#F4F7FE] dark:bg-white/5 px-4 py-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-[#2B3674] dark:text-white">{d.label}</span>
                          <span className="flex items-center gap-3 text-xs font-bold">
                            <span className="flex items-center gap-1 text-[#2563eb]"><span className="size-2 rounded-full bg-[#2563eb]" />{formatNumber(d.vigentes)}</span>
                            <span className="flex items-center gap-1 text-[#f59e0b]"><span className="size-2 rounded-full bg-[#f59e0b]" />{formatNumber(d.por_vencer)}</span>
                            <span className="flex items-center gap-1 text-[#f43f5e]"><span className="size-2 rounded-full bg-[#f43f5e]" />{formatNumber(d.vencidos)}</span>
                            <span className="text-[#A3AED0]">de {formatNumber(d.total)}</span>
                          </span>
                        </div>
                        <div className="flex h-2.5 overflow-hidden rounded-full bg-white dark:bg-[#1C2438]">
                          {d.total > 0 && [['vigentes', '#2563eb'], ['por_vencer', '#f59e0b'], ['vencidos', '#f43f5e']].map(([k, col]) => (
                            <span key={k} className="chart-progress h-full" style={{ '--progress-width': `${(d[k] / d.total) * 100}%`, background: col, animationDelay: `${300 + index * 90}ms` }} />
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="pt-1 text-[11px] font-semibold text-[#A3AED0]">Azul: vigentes · Ámbar: por vencer (30 días) · Rojo: vencidos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {calendarioGrande && <CalendarioEventosModal onClose={() => setCalendarioGrande(false)} />}

      {expandedMultasPagos && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expanded-multas-pagos-title"
          onMouseDown={() => setExpandedMultasPagos(null)}
        >
          <div
            className="modal-enter w-full max-w-2xl overflow-hidden rounded-[30px] bg-white dark:bg-[#1C2438] shadow-horizon dark:shadow-none"
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
                className="grid size-10 shrink-0 place-items-center rounded-full border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#EE5D50]/10 bg-[#FEEFEE] dark:bg-rose-500/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#EE5D50]">Multas</p>
                  <p className="mt-1 text-3xl font-black text-[#2B3674] dark:text-white">
                    <Contador value={expandedMultasPagos.multas} />
                  </p>
                </div>
                <div className="rounded-2xl border border-[#01B574]/10 bg-[#E6F9F0] dark:bg-emerald-500/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#01B574]">Pagos</p>
                  <p className="mt-1 text-3xl font-black text-[#2B3674] dark:text-white">
                    <Contador value={expandedMultasPagos.pagos} />
                  </p>
                </div>
                <div className="rounded-2xl border border-[#FFB547]/10 bg-[#FFF5E6] dark:bg-amber-500/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#FFB547]">Pendiente</p>
                  <p className="mt-1 text-3xl font-black text-[#2B3674] dark:text-white">
                    <Contador value={expandedMultasPagos.pendiente} />
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#F4F7FE] bg-[#F4F7FE] dark:bg-white/10 p-5">
                <div className="flex h-64 items-end justify-center gap-8 border-b border-[#F4F7FE] pb-4">
                  <div className="flex h-full w-20 items-end rounded-t-2xl bg-[#FEEFEE] dark:bg-rose-500/20">
                    <span
                      key={`modal-multas-${expandedMultasPagos.title}`}
                      className="barra-sube block w-full rounded-t-2xl bg-[#EE5D50]"
                      style={{ height: expandedMultasPagos.multasHeight, animationDelay: '150ms' }}
                    />
                  </div>
                  <div className="flex h-full w-20 items-end rounded-t-2xl bg-[#E6F9F0] dark:bg-emerald-500/20">
                    <span
                      key={`modal-pagos-${expandedMultasPagos.title}`}
                      className="barra-sube block w-full rounded-t-2xl bg-[#01B574]"
                      style={{ height: expandedMultasPagos.pagosHeight, animationDelay: '280ms' }}
                    />
                  </div>
                  <div className="flex h-full w-20 items-end rounded-t-2xl bg-[#FFF5E6] dark:bg-amber-500/20">
                    <span
                      key={`modal-pend-${expandedMultasPagos.title}`}
                      className="barra-sube block w-full rounded-t-2xl bg-[#FFB547]"
                      style={{ height: expandedMultasPagos.pendienteHeight, animationDelay: '410ms' }}
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <p className="font-extrabold text-[#EE5D50]">Total Multas</p>
                  <p className="font-extrabold text-[#01B574]">Total Pagos</p>
                  <p className="font-extrabold text-[#FFB547]">Pendientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  )
}








