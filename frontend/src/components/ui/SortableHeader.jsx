// Encabezado de columna con orden A-Z / Z-A. El orden se resuelve en el
// servidor (no solo en la página visible), así que cada click dispara una
// nueva carga con sortBy/sortDir en vez de reordenar el array en memoria.
export function SortableHeader({ column, label, sortBy, sortDir, onSort, className = '', align = 'left' }) {
  const isActive = sortBy === column
  const nextDir = isActive && sortDir === 'ASC' ? 'DESC' : 'ASC'

  return (
    <button
      type="button"
      onClick={() => onSort(column, nextDir)}
      className={`inline-flex items-center gap-1 cursor-pointer select-none font-bold uppercase tracking-wider hover:text-slate-800 dark:hover:text-white transition-colors ${
        align === 'center' ? 'justify-center w-full' : align === 'right' ? 'justify-end w-full' : ''
      } ${className}`}
      title={`Ordenar por ${label}`}
    >
      <span>{label}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`size-3 shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`}
      >
        {isActive && sortDir === 'ASC' ? (
          <polyline points="18 15 12 9 6 15" />
        ) : isActive && sortDir === 'DESC' ? (
          <polyline points="6 9 12 15 18 9" />
        ) : (
          <>
            <polyline points="7 10 12 5 17 10" />
            <polyline points="7 14 12 19 17 14" />
          </>
        )}
      </svg>
    </button>
  )
}
