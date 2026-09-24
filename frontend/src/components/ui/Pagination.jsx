import { useEffect, useState, useRef } from 'react'

function PaginationRowsSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 py-1 px-2.5 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-[var(--border-strong)] dark:bg-slate-800/70 dark:text-slate-200 cursor-pointer"
      >
        <span>{value}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-1.5 left-0 z-50 min-w-[70px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-0.5">
            {[5, 8, 10, 20].map((num) => {
              const isSelected = num === value
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    onChange(num)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span>{num}</span>
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3 text-blue-600 dark:text-blue-400 ml-1"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

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

  const BLOCK_SIZE = 4
  const currentBlock = Math.floor((currentPage - 1) / BLOCK_SIZE)
  const startPage = currentBlock * BLOCK_SIZE + 1
  const endPage = Math.min(startPage + BLOCK_SIZE - 1, totalPages)

  const pages = []
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  const hasPrevBlock = startPage > 1
  const hasNextBlock = endPage < totalPages

  return (
    <div className="relative flex flex-col sm:flex-row items-center justify-center min-h-[52px] gap-3 border-t border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-600 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] dark:text-slate-400">
      {onItemsPerPageChange && (
        <div className="flex items-center gap-1.5 sm:absolute sm:left-4">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Por página:</span>
          <PaginationRowsSelect
            value={itemsPerPage}
            onChange={(val) => {
              onItemsPerPageChange(val)
              onPageChange(1)
            }}
          />
        </div>
      )}

      <nav aria-label="Paginación de registros" className="flex max-w-full flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
          title="Página Anterior"
          aria-label="Página anterior"
        >
          <span className="text-sm leading-none font-black">&lsaquo;</span>
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <span className="px-2 font-semibold sm:hidden">{currentPage} / {totalPages}</span>
        <div className="hidden items-center gap-1 sm:flex">
          {hasPrevBlock && (
            <button
              type="button"
              aria-label={`Ir al bloque anterior (página ${Math.max(1, startPage - BLOCK_SIZE)})`}
              title={`Páginas ${Math.max(1, startPage - BLOCK_SIZE)} - ${startPage - 1}`}
              onClick={() => onPageChange(Math.max(1, startPage - BLOCK_SIZE))}
              className="flex size-8 items-center justify-center rounded-lg text-xs font-black tracking-widest text-slate-400 hover:border hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-[var(--bg-subtle)] dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              ...
            </button>
          )}

          {pages.map((p) => (
            <button
              key={`page-${p}`}
              type="button"
              aria-label={`Página ${p}`}
              aria-current={p === currentPage ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              className={`flex size-8 items-center justify-center rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                p === currentPage
                  ? 'bg-[#0b3458] text-white shadow-xs dark:bg-cyan-600'
                  : 'border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {p}
            </button>
          ))}

          {hasNextBlock && (
            <button
              type="button"
              aria-label={`Ir al bloque siguiente (página ${endPage + 1})`}
              title={`Páginas ${endPage + 1} - ${Math.min(endPage + BLOCK_SIZE, totalPages)}`}
              onClick={() => onPageChange(endPage + 1)}
              className="flex size-8 items-center justify-center rounded-lg text-xs font-black tracking-widest text-slate-400 hover:border hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-[var(--bg-subtle)] dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              ...
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
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
