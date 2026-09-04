import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { activity } from '../../../public/js/dashboardData'

export function ActivityTable() {
  const avatarColors = ['bg-blue-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600']

  return (
    <section
      aria-label="Actividad reciente"
      className="animate-enter overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs"
      style={{ animationDelay: '620ms' }}
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Actividad reciente y registro diario</h2>
          <p className="mt-0.5 text-xs text-slate-400">Últimos movimientos registrados en tiempo real.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition"
        >
          <span>Ver historial completo</span>
          <Icon name="arrow" className="size-3.5" />
        </button>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-3xl text-left">
          <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3.5">Actividad</th>
              <th className="px-5 py-3.5">Detalle / Expediente</th>
              <th className="px-5 py-3.5">Responsable</th>
              <th className="px-5 py-3.5">Hora</th>
              <th className="px-5 py-3.5">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {activity.map((item) => {
              const initials = item.user
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
              const colorIdx = item.user.charCodeAt(0) % avatarColors.length
              return (
                <tr key={item.detail} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{item.action}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-lg border border-slate-200/70 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {item.detail}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`grid size-7.5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-xs ${avatarColors[colorIdx]}`}
                      >
                        {initials}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.user}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-400 dark:text-slate-500">{item.time}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
        {activity.map((item) => (
          <article key={item.detail} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-slate-800 dark:text-white">{item.action}</p>
              <StatusBadge status={item.status} />
            </div>
            <span className="inline-block rounded-lg border border-slate-200/70 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {item.detail}
            </span>
            <div className="flex items-center justify-between pt-1 text-xs text-slate-400 dark:text-slate-500">
              <span className="font-semibold text-slate-600 dark:text-slate-300">{item.user}</span>
              <span>{item.time}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
