export function StatusBadge({ status }) {
  const styles = {
    Completado: 'border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
    'En revisión': 'border-blue-200/70 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
    Pendiente: 'border-amber-200/70 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      <span className="size-1.5 rounded-full bg-current opacity-75" />
      {status}
    </span>
  )
}
