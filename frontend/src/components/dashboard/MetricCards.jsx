import { Icon } from '../ui/Icon'
import { summaryCards } from '../../../public/js/dashboardData'

export function MetricCards() {
  const themeStyles = {
    blue: {
      iconBox: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60',
    },
    cyan: {
      iconBox: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700',
    },
    amber: {
      iconBox: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60',
    },
    slate: {
      iconBox: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60',
    },
  }

  return (
    <section aria-label="Resumen de indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card, index) => {
        const currentTheme = themeStyles[card.tone]
        const trendIcon = card.positive === true ? 'trendUp' : card.positive === false ? 'trendDown' : 'trendFlat'

        return (
          <article
            key={card.label}
            style={{ animationDelay: `${index * 80 + 80}ms` }}
            className="animate-enter rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className={`grid size-12 place-items-center rounded-xl ${currentTheme.iconBox}`}>
                <Icon name={card.icon} className="size-5.5" />
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${currentTheme.badge}`}>
                <Icon name={trendIcon} className="size-3" />
                {card.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">{card.label}</p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 dark:text-white lg:text-3xl">{card.value}</h3>
            </div>
            <p className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs text-slate-500 dark:text-slate-400">{card.detail}</p>
          </article>
        )
      })}
    </section>
  )
}
