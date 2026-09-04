import { Icon } from '../ui/Icon'
import { quickActions } from '../../../public/js/dashboardData'

export function QuickActions() {
  const actionStyles = {
    blue: {
      icon: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white',
      border: 'hover:border-blue-300 dark:hover:border-blue-500',
    },
    cyan: {
      icon: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white',
      border: 'hover:border-cyan-300 dark:hover:border-cyan-500',
    },
    amber: {
      icon: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white',
      border: 'hover:border-amber-300 dark:hover:border-amber-500',
    },
    emerald: {
      icon: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white',
      border: 'hover:border-emerald-300 dark:hover:border-emerald-500',
    },
  }

  return (
    <section aria-label="Accesos rápidos">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Accesos rápidos operativos</h2>
          <p className="text-xs text-slate-400">Atajos para el registro de operaciones de fiscalización y trámites.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const currentStyle = actionStyles[action.tone]
          return (
            <button
              key={action.label}
              type="button"
              className={`group flex items-center gap-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${currentStyle.border}`}
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-200 ${currentStyle.icon}`}>
                <Icon name={action.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{action.label}</p>
                <p className="text-xs text-slate-400">{action.description}</p>
              </div>
              <Icon
                name="arrow"
                className="size-4 shrink-0 text-slate-300 dark:text-slate-600 transition-all duration-200 group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-400"
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}
