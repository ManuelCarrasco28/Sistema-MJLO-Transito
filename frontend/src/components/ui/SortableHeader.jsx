// Encabezado de columna con orden A-Z / Z-A. El orden se resuelve en el
// servidor (no solo en la página visible), así que cada click dispara una
// nueva carga con sortBy/sortDir en vez de reordenar el array en memoria.
// Admite ordenar por varias columnas a la vez: sortBy="a,b" y sortDir="ASC,DESC".
// Cada clic recorre ASC -> DESC -> sin orden, y las demás columnas elegidas se conservan.
// La página solo guarda los dos textos que recibe en onSort, sin lógica extra.
export function SortableHeader({ column, label, sortBy, sortDir, onSort, className = '', align = 'left' }) {
  const columnas = String(sortBy || '').split(',').filter(Boolean)
  const direcciones = String(sortDir || '').split(',')
  const posicion = columnas.indexOf(column)
  const isActive = posicion >= 0
  const dirActual = isActive ? (direcciones[posicion] === 'ASC' ? 'ASC' : 'DESC') : null

  const alHacerClic = () => {
    const cols = [...columnas]
    const dirs = columnas.map((_, i) => (direcciones[i] === 'ASC' ? 'ASC' : 'DESC'))
    if (!isActive) {
      cols.push(column)
      dirs.push('ASC')
    } else if (dirActual === 'ASC') {
      dirs[posicion] = 'DESC'
    } else {
      cols.splice(posicion, 1)
      dirs.splice(posicion, 1)
    }
    onSort(cols.join(','), dirs.join(','))
  }

  return (
    <button
      type="button"
      onClick={alHacerClic}
      className={`inline-flex items-center gap-1 whitespace-nowrap cursor-pointer select-none rounded-md outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 font-bold uppercase tracking-wider hover:text-slate-800 dark:hover:text-white transition-colors ${
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
        {isActive && dirActual === 'ASC' ? (
          <polyline points="18 15 12 9 6 15" />
        ) : isActive && dirActual === 'DESC' ? (
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
