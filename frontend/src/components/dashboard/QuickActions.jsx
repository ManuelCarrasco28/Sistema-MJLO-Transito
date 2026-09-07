import { Icon } from '../ui/Icon'
import { useNavigate } from 'react-router-dom'

const quickActions = [
  { label: 'Registrar vehículo', description: 'Nueva unidad', icon: 'vehicle', tone: 'blue' },
  { label: 'Registrar inspección', description: 'Nueva evaluación', icon: 'inspection', tone: 'cyan' },
  { label: 'Registrar papeleta', description: 'Nueva infracción', icon: 'ticket', tone: 'amber' },
  { label: 'Registrar pago', description: 'Nuevo ingreso', icon: 'payment', tone: 'emerald' },
]

export function QuickActions() {
  const navigate = useNavigate()
  const routes = { vehicle: '/vehiculos', inspection: '/inspecciones', ticket: '/papeletas', payment: '/pagos' }
  const actionStyles = {
    blue: {
      icon: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white',
      accent: 'from-blue-600 to-cyan-400',
      card: 'from-blue-600 to-cyan-500',
      border: 'hover:border-blue-300 dark:hover:border-blue-500',
    },
    cyan: {
      icon: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 group-hover:bg-cyan-600 group-hover:text-white',
      accent: 'from-cyan-500 to-teal-400',
      card: 'from-cyan-500 to-teal-500',
      border: 'hover:border-cyan-300 dark:hover:border-cyan-500',
    },
    amber: {
      icon: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 group-hover:bg-amber-600 group-hover:text-white',
      accent: 'from-amber-500 to-orange-400',
      card: 'from-amber-500 to-orange-500',
      border: 'hover:border-amber-300 dark:hover:border-amber-500',
    },
    emerald: {
      icon: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white',
      accent: 'from-emerald-500 to-cyan-400',
      card: 'from-emerald-500 to-cyan-500',
      border: 'hover:border-emerald-300 dark:hover:border-emerald-500',
    },
  }

  return (
    <section
      aria-label="Accesos rápidos"
      className="relative overflow-hidden rounded-2xl border border-cyan-200/70 bg-white/80 p-4 shadow-[0_14px_36px_rgba(8,145,178,0.08)] dark:border-slate-800 dark:bg-[#0f172a] sm:p-5"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-72 rounded-bl-full bg-cyan-300/15 blur-2xl dark:bg-cyan-500/10" aria-hidden="true" />
      <div className="relative mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Accesos rápidos operativos</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Atajos principales para registrar movimientos del área de tránsito.</p>
        </div>
      </div>
      <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const currentStyle = actionStyles[action.tone]
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(`${routes[action.icon]}?accion=registrar`)}
              className={`group relative overflow-hidden rounded-2xl border border-white/70 bg-linear-to-br ${currentStyle.card} p-1 text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/70 ${currentStyle.border}`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${currentStyle.accent}`} aria-hidden="true" />
              <span className="absolute -right-10 -top-10 size-24 rounded-full bg-white/25 blur-2xl transition-opacity duration-300 group-hover:opacity-80" aria-hidden="true" />
              <div className="relative rounded-[0.85rem] bg-white/94 p-3 dark:bg-slate-950/82">
                <div className="flex items-center gap-3.5">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl transition-all duration-300 group-hover:scale-105 ${currentStyle.icon}`}>
                    <Icon name={action.icon} className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-white">{action.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                  </div>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-500">
                    <Icon name="arrow" className="size-3.5" />
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
