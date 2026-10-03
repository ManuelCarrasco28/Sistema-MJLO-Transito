export function PlacaBadge({ placa, className = '', size = 'md' }) {
  const cleanPlaca = String(placa || '').trim()

  const upperPlaca = cleanPlaca.toUpperCase()
  if (!cleanPlaca || upperPlaca === '—' || upperPlaca === 'SIN PLACA' || upperPlaca === 'S/P' || upperPlaca === 'N/A' || upperPlaca.startsWith('SIN-PLACA-')) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-mono text-[10.5px] font-black text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 shadow-2xs ${className}`}>
        SIN PLACA
      </span>
    )
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10.5px]'
    : size === 'lg'
    ? 'px-3 py-1 text-sm'
    : 'px-2.5 py-0.5 text-xs'

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap text-center rounded-lg border-2 border-slate-900 bg-amber-300 ${sizeClasses} font-mono font-black tracking-widest text-slate-950 shadow-xs dark:border-[var(--border)] dark:bg-amber-400 dark:text-slate-950 ${className}`}
    >
      {upperPlaca}
    </span>
  )
}
