import { Icon } from '../components/ui/Icon'

export function Permisos() {
  return (
    <div className="space-y-6">
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30">
            <Icon name="permit" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Permisos Extraordinarios de Circulación
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Autorizaciones temporales, eventos especiales y permisos de tránsito excepcional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-violet-200/80 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 shadow-xs dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
            Módulo Operativo 2026
          </span>
        </div>
      </div>

      
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
          <Icon name="permit" className="size-8" />
        </div>
        <h2 className="mt-4 text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Control de Permisos en Implementación
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Este módulo está preparado para emitir autorizaciones provisionales de circulación y tránsito excepcional.
        </p>
      </div>
    </div>
  )
}
