import { chartMonths } from '../../../public/js/dashboardData'

export function ChartsSection() {
  const expedientesBreakdown = [
    { label: 'Vigentes', value: '956', percent: '68%', color: 'bg-blue-600', bar: 'w-[68%]' },
    { label: 'Observados', value: '281', percent: '20%', color: 'bg-cyan-400', bar: 'w-[20%]' },
    { label: 'Por vencer', value: '169', percent: '12%', color: 'bg-amber-500', bar: 'w-[12%]' },
  ]

  return (
    <section aria-label="Gráficos de gestión" className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
      <article
        className="animate-enter rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-5 shadow-xs sm:p-6"
        style={{ animationDelay: '460ms' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Operaciones mensuales</h2>
            <p className="mt-0.5 text-xs text-slate-400">Registros e inspecciones durante los últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-600" />
                Registros
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-cyan-400" />
                Inspecciones
              </span>
            </div>
            <span className="rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              2026
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="relative h-52 w-full">
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
              </defs>
              <path d="M0 111 L120 91 L240 102 L360 64 L480 52 L600 24 L600 170 L0 170 Z" fill="url(#tailAreaBlue)" />
              <polyline
                className="chart-line"
                points="0,111 120,91 240,102 360,64 480,52 600,24"
                fill="none"
                stroke="#1a73e8"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                className="chart-line chart-line-delayed"
                points="0,134 120,124 240,108 360,116 480,81 600,58"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 6"
              />
              {[['0', '111'], ['120', '91'], ['240', '102'], ['360', '64'], ['480', '52'], ['600', '24']].map(
                ([cx, cy]) => (
                  <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" fill="white" stroke="#1a73e8" strokeWidth="2.5" />
                )
              )}
            </svg>
          </div>
          <div className="ml-8 grid grid-cols-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
            {chartMonths.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </div>
      </article>

      <article
        className="animate-enter flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-5 shadow-xs sm:p-6"
        style={{ animationDelay: '540ms' }}
      >
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Estado de expedientes</h2>
          <p className="mt-0.5 text-xs text-slate-400">Distribución de documentos vigentes y observados</p>
        </div>

        <div className="my-auto flex flex-col items-center gap-6 pt-6 sm:flex-row xl:flex-col 2xl:flex-row">
          <div
            className="donut-pop relative grid size-36 shrink-0 place-items-center rounded-full shadow-[0_8px_20px_rgba(26,115,232,0.15)]"
            style={{ background: 'conic-gradient(#1a73e8 0 68%, #22d3ee 68% 88%, #f59e0b 88% 100%)' }}
          >
            <div className="grid size-25 place-items-center rounded-full bg-white dark:bg-[#0f172a] text-center shadow-inner">
              <span>
                <strong className="block text-2xl font-extrabold text-slate-800 dark:text-white">1,406</strong>
                <span className="text-[11px] font-medium text-slate-400">expedientes</span>
              </span>
            </div>
          </div>

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
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color} ${item.bar}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  )
}
