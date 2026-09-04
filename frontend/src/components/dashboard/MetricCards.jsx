import { Icon } from '../ui/Icon'
import { summaryCards } from '../../../public/js/dashboardData'

export function MetricCards() {
  const themeStyles = {
    blue: {
      iconBox: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300',
      card: 'border-t-blue-600 dark:border-t-blue-500 bg-gradient-to-br from-white via-white to-blue-50/70 dark:from-[#101a33] dark:via-[#0f172a] dark:to-blue-900/45',
      badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60',
    },
    cyan: {
      iconBox: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
      card: 'border-t-cyan-500 dark:border-t-cyan-400 bg-gradient-to-br from-white via-white to-cyan-50/80 dark:from-[#0d1e30] dark:via-[#0f172a] dark:to-cyan-900/40',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700',
    },
    amber: {
      iconBox: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300',
      card: 'border-t-amber-500 dark:border-t-amber-400 bg-gradient-to-br from-white via-white to-amber-50/80 dark:from-[#1e1a12] dark:via-[#0f172a] dark:to-amber-900/35',
      badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60',
    },
    slate: {
      iconBox: 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300',
      card: 'border-t-rose-500 dark:border-t-rose-400 bg-gradient-to-br from-white via-white to-rose-50/70 dark:from-[#211528] dark:via-[#0f172a] dark:to-rose-900/35',
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
            className={`animate-enter rounded-2xl border border-t-4 border-slate-200/80 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 ${currentTheme.card}`}
          >
            <div className="flex items-center justify-between">
              <span className={`grid size-12 place-items-center rounded-xl ${currentTheme.iconBox}`}>
                <Icon name={card.icon} className="size-5.5" />
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm transition-colors ${currentTheme.badge}`}>
                <Icon name={trendIcon} className="size-3 animate-pulse" />
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
