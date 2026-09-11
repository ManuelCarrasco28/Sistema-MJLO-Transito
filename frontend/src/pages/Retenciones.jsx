import { Icon } from '../components/ui/Icon'

export function Retenciones() {
  return (
    <div className="space-y-6">
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-orange-600 text-white shadow-lg shadow-rose-500/30">
            <Icon name="retention" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Internamientos Vehiculares
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Control de boletas de internamiento al DOV, inventario y órdenes de libertad.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            Módulo Operativo 2026
          </span>
        </div>
      </div>

      
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <Icon name="retention" className="size-8" />
        </div>
        <h2 className="mt-4 text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Registro de Internamientos en Implementación
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Este módulo queda preparado para registrar la boleta de internamiento, su inventario y la posterior orden de libertad.
        </p>
      </div>
    </div>
  )
}
