import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { formatNumeroTarjeta } from '../../utils/formatters'

// Abrevia cifras grandes para que la tarjeta no se desborde: 1.2 K, 4.58 M, 17.2 M, 3.1 MM
export function abreviarNumero(n) {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  const fmt = (x, suf) => `${x.toLocaleString('es-PE', { maximumFractionDigits: x >= 100 ? 0 : x >= 10 ? 1 : 2 })} ${suf}`
  if (abs >= 1e9) return fmt(v / 1e9, 'MM')
  if (abs >= 1e6) return fmt(v / 1e6, 'M')
  if (abs >= 1e4) return fmt(v / 1e3, 'K')
  return v.toLocaleString('es-PE', { maximumFractionDigits: 2 })
}

const W = 96
const H = 48

function Tip({ children, left }) {
  return (
    <div
      className="absolute z-20 bottom-full mb-1 -translate-x-1/2 bg-[#151A2D] text-white text-[10px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none"
      style={{ left }}
    >
      {children}
    </div>
  )
}

// Columnas mensuales; la de mayor valor va resaltada (estilo ancho o fino)
function GraficoBarras({ data, color, money, unit, fino }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map(d => d.value))
  const iMax = data.findIndex(d => d.value === max)
  const bw = W / data.length
  const ancho = fino ? 8 : data.length > 12 ? Math.max(1.5, bw - 1) : bw - 6
  return (
    <div className="relative" style={{ width: W, height: H }} onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / max) * (H - 2))
          const activo = hover === null ? i === iMax : hover === i
          return (
            <rect key={i} className="mc-bar" style={{ animationDelay: `${i * 35}ms` }} x={i * bw + (bw - ancho) / 2} y={H - h} width={ancho} height={h} rx={data.length > 12 ? 1 : fino ? 4 : 3}
              fill={color} opacity={activo ? 1 : 0.28} onMouseEnter={() => setHover(i)} />
          )
        })}
      </svg>
      {hover !== null && <Tip left={hover * bw + bw / 2}>{data[hover].label} · {unit}: {money ? `S/ ${formatNumeroTarjeta(data[hover].value)}` : data[hover].value}</Tip>}
    </div>
  )
}

// Onda suave mensual
function GraficoOnda({ data, color, unit }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map(d => d.value))
  const pts = data.map((d, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * W : W / 2,
    y: H - 4 - (d.value / max) * (H - 10),
    ...d,
  }))
  let linea = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2
    linea += ` C ${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`
  }
  const gid = `g-${color.replace('#', '')}`
  return (
    <div className="relative" style={{ width: W, height: H }} onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H} className="overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="mc-fade" d={`${linea} L ${W},${H} L 0,${H} Z`} fill={`url(#${gid})`} />
        <path className="mc-draw" pathLength="1" d={linea} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <rect x={p.x - W / pts.length / 2} y={0} width={W / pts.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
            {hover === i && <circle cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5" />}
          </g>
        ))}
      </svg>
      {hover !== null && <Tip left={pts[hover].x}>{pts[hover].label} · {unit}: {pts[hover].value}</Tip>}
    </div>
  )
}

// Anillo con porcentaje al centro
function GraficoAnillo({ percent, color }) {
  const r = 20
  const c = 2 * Math.PI * r
  const p = Math.min(100, Math.max(0, Number(percent) || 0))
  return (
    <div className="relative" style={{ width: H + 8, height: H + 8 }}>
      <svg width={H + 8} height={H + 8} viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" opacity="0.2" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          className="mc-ring" style={{ '--dash': (p / 100) * c, '--circ': c }} strokeDasharray={`${(p / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>{p}%</span>
    </div>
  )
}

const COLORES = { indigo: '#6366f1', blue: '#3b82f6', emerald: '#10b981', rose: '#f43f5e' }

function GraficoTarjeta({ chart, color }) {
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) {
    return <span className="text-[10px] text-slate-400 font-semibold">Sin datos</span>
  }
  if (chart.type === 'bars') return <GraficoBarras data={chart.data} color={color} money={chart.money} unit={chart.unit} fino={chart.style === 'fino'} />
  if (chart.type === 'wave') return <GraficoOnda data={chart.data} color={color} unit={chart.unit} />
  if (chart.type === 'ring') return <GraficoAnillo percent={chart.percent} color={color} />
  return null
}

export function MetricCards({ cards = [], loading = false, user }) {
  const rolNormalizado = (user?.rol || '').toUpperCase()
  const isOffice = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA', 'ADMINISTRATIVO'].includes(rolNormalizado)

  const adminaStyles = [
    { arrowColor: 'text-indigo-500 dark:text-indigo-400', arrowIcon: 'M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25', chartColor: 'indigo' },
    { arrowColor: 'text-blue-600 dark:text-blue-400', arrowIcon: 'M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25', chartColor: 'blue' },
    { arrowColor: 'text-emerald-600 dark:text-emerald-400', arrowIcon: 'M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25', chartColor: 'emerald' },
    { arrowColor: 'text-rose-600 dark:text-rose-400', arrowIcon: 'M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25', chartColor: 'rose' },
  ]

  const displayCards = loading
    ? [
        { label: 'Recaudación Anual', value: '...', detail: 'Cargando', change: '' },
        { label: 'Vehículos Registrados', value: '...', detail: 'Cargando', change: '' },
        { label: 'Documentos Activos', value: '...', detail: 'Cargando', change: '' },
        { label: 'Papeletas Pendientes', value: '...', detail: 'Cargando', change: '' },
      ]
    : cards

  const filteredCards = displayCards.filter(card => {
    if (!isOffice) {
      if (card.label === 'Documentos vigentes' || card.label === 'Trámites documentarios' || card.label === 'Recaudación Anual') {
        return false
      }
    }
    return true
  }).map(card => {
    if (!isOffice && card.label === 'Papeletas pendientes') {
      return { ...card, detail: 'Pendientes de pago o atención' }
    }
    return card
  })

  const finalCards = loading ? displayCards : filteredCards

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-5 mb-8" data-purpose="kpi-metric-cards">
      {finalCards.map((card, index) => {
        const style = adminaStyles[index % adminaStyles.length]
        const prefijo = card.prefix ? `${card.prefix} ` : ''
        const completo = typeof card.value === 'number' ? `${prefijo}${formatNumeroTarjeta(card.value)}` : card.value
        const visible = completo
        // Cifra completa (sin K/M): la letra se achica segun la cantidad de digitos
        const tam = String(visible).length <= 8 ? 28 : String(visible).length <= 11 ? 24 : String(visible).length <= 14 ? 20 : 17

        return (
          <div key={index} className="bg-white dark:bg-[#1C2438] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-300">{card.label}</p>
            </div>
            <div className="pt-5 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 title={completo} style={{ fontSize: tam }} className="font-black text-slate-800 dark:text-white tracking-tight leading-none mb-2.5 whitespace-nowrap">
                  {visible}
                </h3>
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`flex items-center truncate text-[12px] font-bold ${style.arrowColor}`}>
                    <svg className="w-3 h-3 mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={style.arrowIcon}></path></svg>
                    {card.detail}
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-end justify-end opacity-90">
                <GraficoTarjeta chart={card.chart} color={COLORES[style.chartColor] || '#3b82f6'} />
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
