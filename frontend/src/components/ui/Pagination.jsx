import { useEffect } from 'react'

export function Pagination({
  currentPage: requestedPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const currentPage = Math.max(1, Math.min(requestedPage, totalPages))
  useEffect(() => {
    if (requestedPage !== currentPage) onPageChange(currentPage)
  }, [requestedPage, currentPage, onPageChange])
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  const pages = getPageNumbers()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-400">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-live="polite" className="text-slate-500 dark:text-slate-400">
          Mostrando{' '}
          <strong className="font-extrabold text-slate-800 dark:text-slate-200">
            {startItem} - {endItem}
          </strong>{' '}
          de{' '}
          <strong className="font-extrabold text-slate-800 dark:text-slate-200">
            {totalItems}
          </strong>{' '}
          registros
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Filas:</span>
            <select
              aria-label="Registros por página"
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value))
                onPageChange(1)
              }}
              className="rounded-lg border border-slate-200 bg-slate-50/50 py-1 px-2 text-xs font-bold text-slate-700 outline-none transition focus:border-cyan-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        )}
      </div>

      <nav aria-label="Paginación de registros" className="flex max-w-full flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          title="Página Anterior"
          aria-label="Página anterior"
        >
          <span className="text-sm leading-none font-black">&lsaquo;</span>
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <span className="px-2 font-semibold sm:hidden">{currentPage} / {totalPages}</span>
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-bold select-none">
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                aria-label={`Página ${p}`}
                aria-current={p === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(p)}
                className={`flex size-8 items-center justify-center rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  p === currentPage
                    ? 'bg-[#0b3458] text-white shadow-xs dark:bg-cyan-600'
                    : 'border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          title="Página Siguiente"
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <span className="text-sm leading-none font-black">&rsaquo;</span>
        </button>
      </nav>
    </div>
  )
}
