import { Icon } from './Icon'

export function RegistryHeader({
  title,
  description,
  icon = 'vehicle',
  action,
  onCreate,
  area = 'Tránsito Municipal',
  badgeText = 'Padrón Oficial 2026',
}) {
  return (
    <div className="rounded-xl border border-blue-900/10 bg-[#123b6d] px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-[0_8px_20px_rgba(15,42,82,0.16)] dark:border-blue-900/40 dark:bg-[#102a4d] animate-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="border-l-3 border-cyan-300 pl-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200/90">
            <span className="grid size-4 place-items-center text-cyan-300">
              <Icon name={icon} className="size-3.5" />
            </span>
            <span>MDJLO · Tránsito</span>
          </div>
          <h1 className="mt-0.5 text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
            {title}
          </h1>
          <p className="mt-0.5 text-xs text-blue-100/80 max-w-xl line-clamp-1 sm:line-clamp-none">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <div className="rounded-lg border border-white/15 bg-white/8 px-2.5 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-200/70">Área</p>
              <p className="font-bold text-xs text-white whitespace-nowrap leading-none mt-0.5">{area}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/8 px-2.5 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-200/70">Periodo</p>
              <p className="font-bold text-xs text-cyan-200 whitespace-nowrap leading-none mt-0.5">{badgeText}</p>
            </div>
          </div>

          {onCreate && action && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Icon name="plus" className="size-3.5" />
              <span>{action}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
