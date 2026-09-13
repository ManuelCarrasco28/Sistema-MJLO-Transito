import { Icon } from '../ui/Icon'

export function MetricCards({ cards = [], loading = false }) {
  const horizonStyles = [
    { bg: 'bg-[#F4F7FE] dark:bg-[#4318FF]/20', text: 'text-[#4318FF] dark:text-[#E0E7FF]', icon: 'vehicle' },
    { bg: 'bg-[#E6F9F0] dark:bg-[#01B574]/20', text: 'text-[#01B574] dark:text-[#E6F9F0]', icon: 'document' },
    { bg: 'bg-[#EBF7FF] dark:bg-[#39B8FF]/20', text: 'text-[#39B8FF] dark:text-[#EBF7FF]', icon: 'inspection' },
    { bg: 'bg-[#FFF5E6] dark:bg-[#FFB547]/20', text: 'text-[#FFB547] dark:text-[#FFF5E6]', icon: 'ticket' },
    { bg: 'bg-[#FEEFEE] dark:bg-[#EE5D50]/20', text: 'text-[#EE5D50] dark:text-[#FEEFEE]', icon: 'payment' },
  ]

  const displayCards = loading
    ? [
        { label: 'Vehículos Registrados', value: '...', detail: 'Cargando', change: '' },
        { label: 'Recaudación Hoy', value: '...', detail: 'Cargando', change: '' },
        { label: 'Documentos Activos', value: '...', detail: 'Cargando', change: '' },
        { label: 'Inspecciones Hoy', value: '...', detail: 'Cargando', change: '' },
        { label: 'Papeletas Pendientes', value: '...', detail: 'Cargando', change: '' },
      ]
    : cards

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8" data-purpose="kpi-metric-cards">
      {displayCards.map((card, index) => {
        const style = horizonStyles[index % horizonStyles.length]
        
        return (
          <div key={index} className="bg-white dark:bg-[#111C44] rounded-[20px] p-5 shadow-horizon dark:shadow-none border border-transparent dark:border-white/10 hover:shadow-horizon-hover transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full ${style.bg} flex items-center justify-center ${style.text} flex-shrink-0`}>
              <Icon name={card.icon || style.icon} className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#A3AED0] dark:text-white/60">{card.label}</p>
              <h3 className="text-2xl font-extrabold text-[#2B3674] dark:text-white tracking-tight">
                {typeof card.value === 'number' ? new Intl.NumberFormat('es-PE').format(card.value) : card.value}
              </h3>
              {card.change && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[11px] font-bold flex items-center ${card.positive ? 'text-[#01B574] dark:text-emerald-400' : 'text-[#EE5D50] dark:text-rose-400'}`}>
                    {card.change}
                  </span>
                  <span className="text-[10px] text-[#A3AED0] dark:text-white/50 truncate">{card.detail}</span>
                </div>
              )}
              {!card.change && card.detail && (
                <p className={`text-[10px] font-bold mt-0.5 ${style.text}`}>{card.detail}</p>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
