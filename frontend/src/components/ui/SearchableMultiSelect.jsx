import { useState, useRef, useEffect, useMemo } from 'react'
import { Icon } from './Icon'

export function SearchableMultiSelect({ options, selectedIds, onChange, placeholder = "Buscar inspector..." }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Ocultar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar opciones (mximo 50 para rendimiento) y excluir ya seleccionados
  const filteredOptions = useMemo(() => {
    const unselected = options.filter(opt => !selectedIds.includes(opt.value))
    if (!searchTerm.trim()) return unselected.slice(0, 50)
    
    const lowerSearch = searchTerm.toLowerCase()
    return unselected
      .filter(opt => opt.label.toLowerCase().includes(lowerSearch))
      .slice(0, 50)
  }, [options, selectedIds, searchTerm])

  const handleSelect = (value) => {
    onChange([...selectedIds, value])
    setSearchTerm('')
    // Keep it open to allow rapid selecting, or focus back to input
  }

  const handleRemove = (value) => {
    onChange(selectedIds.filter(id => id !== value))
  }

  return (
    <div className="flex flex-col gap-3" ref={wrapperRef}>
            {/* Chips de los seleccionados */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map(id => {
            const opt = options.find(o => o.value === id)
            if (!opt) return null
            return (
              <div
                key={id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 py-1.5 pl-2.5 pr-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300"
              >
                <span>{opt.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(id)}
                  className="rounded-md p-0.5 text-indigo-400 hover:bg-indigo-200 hover:text-indigo-900 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-100"
                  title="Remover"
                >
                  <Icon name="x" className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Input de Busqueda */}
      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400/10"
        />
      </div>
        
      {/* Dropdown de Resultados */}
      {isOpen && (
        <div className="mt-0 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-sm dark:border-[var(--border-strong)] dark:bg-[var(--bg-overlay)]">
            <ul className="max-h-40 overflow-y-auto p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <li
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                  >
                    {opt.label}
                  </li>
                ))
              ) : (
                <li className="px-3 py-4 text-center text-xs text-slate-500">
                  {searchTerm ? 'No se encontraron resultados.' : 'Todos están seleccionados.'}
                </li>
              )}
            </ul>
          </div>
        )}


    </div>
  )
}
