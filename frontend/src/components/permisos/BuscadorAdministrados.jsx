import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../ui/Icon'
import { apiFetch } from '../../config/api'

export function BuscadorAdministrados({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const containerRef = useRef(null)

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar con debounce
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const url = `/permisos/buscar-administrados?q=${encodeURIComponent(query.trim())}`
        const res = await apiFetch(url)
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) {
            setResults(Array.isArray(json.data) ? json.data : [])
          }
        }
      } catch (_) {
        // En caso de fallo de red mantener resultados vacíos
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }, 220)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const handleSelectItem = (item) => {
    setSelectedItem(item)
    setIsOpen(false)
    setQuery(item.nombre || item.documento || '')
    if (onSelect) {
      onSelect(item)
    }
  }

  const handleClear = () => {
    setSelectedItem(null)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
          <Icon name="search" className="size-3.5" />
          <span>Buscar Administrado / Empresa Registrada (Auto-rellenado)</span>
        </label>
        {selectedItem && (
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            ✓ Datos vinculados
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {isLoading ? (
            <span className="animate-spin text-indigo-600">⟳</span>
          ) : (
            <Icon name="search" className="size-4 text-indigo-500" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar por Razón Social, Administrado, RUC o DNI..."
          className="w-full rounded-2xl border-2 border-indigo-200/80 bg-indigo-50/30 pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-600 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-4 focus:ring-indigo-500/10 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-white dark:focus:border-indigo-400"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown de Resultados */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 font-medium">
              Buscando en la base de datos municipal...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 font-medium">
              No se encontraron coincidencias para "{query}". Puedes ingresar los datos manualmente.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
                Coincidencias encontradas ({results.length}) — Haz clic para auto-rellenar
              </div>

              {results.map((item, idx) => (
                <button
                  key={`${item.tipo}-${item.documento}-${idx}`}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg font-bold text-xs ${
                      item.tipo === 'EMPRESA'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : item.tipo === 'PERSONA'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    <Icon name={item.tipo === 'EMPRESA' ? 'building' : item.tipo === 'PERSONA' ? 'user' : 'document'} className="size-4" />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {item.nombre || 'Sin nombre registrado'}
                      </p>
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-[var(--bg-subtle)] text-slate-600 dark:text-slate-300">
                        {item.tipoDocumento}: {item.documento || 'S/N'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.representanteLegal && (
                        <span>Rep: <strong className="text-slate-700 dark:text-slate-200">{item.representanteLegal}</strong></span>
                      )}
                      {item.placa && (
                        <span>Placa: <strong className="text-slate-700 dark:text-slate-200">{item.placa}</strong></span>
                      )}
                      {item.expediente && (
                        <span>Expediente: <strong className="text-indigo-600 dark:text-indigo-400">{item.expediente}</strong></span>
                      )}
                      {item.reciboNumero && (
                        <span>Recibo: {item.reciboNumero} {item.reciboMonto ? `(S/ ${item.reciboMonto})` : ''}</span>
                      )}
                    </div>
                  </div>

                  <span className="shrink-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                    Seleccionar →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
