import React, { useEffect, useMemo, useRef, useState } from 'react'

const normalizarTipo = (tipo) => tipo === 'ZONA_RESERVADA' ? 'ZONAS_RESERVADAS' : tipo

export function BuscadorTramites({ tramites = [], tipoPermiso, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const listboxId = 'permisos-tramites-listbox'
  const disponibles = useMemo(() => tramites.filter((t) => normalizarTipo(t.tipoPermiso) === normalizarTipo(tipoPermiso)), [tramites, tipoPermiso])
  const resultados = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return (q ? disponibles.filter((t) => `${t.numeroExpediente || ''} ${t.solicitanteNombre || ''}`.toLocaleLowerCase().includes(q)) : disponibles).slice(0, 8)
  }, [disponibles, query])
  useEffect(() => { setQuery(''); setOpen(false) }, [tipoPermiso])
  useEffect(() => {
    const closeOutside = (event) => { if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [])
  return <div ref={containerRef} className="relative">
    <label htmlFor="permisos-tramites-search" className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">Vincular expediente (opcional)</label>
    <input id="permisos-tramites-search" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-label="Buscar expediente compatible por número o solicitante" value={query} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }} onChange={(e) => { setQuery(e.target.value); setOpen(true) }} onFocus={() => { if (query) setOpen(true) }} placeholder="Buscar por expediente o solicitante" className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs dark:bg-[#1C2438]" />
    {open && <div id={listboxId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-[var(--border)] dark:bg-[#1C2438]">
      {resultados.length ? resultados.map((t) => <button key={t.id} role="option" aria-selected="false" type="button" onClick={() => { onSelect(t); setQuery(`${t.numeroExpediente || 'Sin expediente'} · ${t.solicitanteNombre || 'Sin solicitante'}`); setOpen(false) }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-slate-800">
        <span className="block break-words text-xs font-bold">{t.numeroExpediente || 'Sin expediente'}</span><span className="block break-words text-[11px] text-slate-600 dark:text-slate-300">{t.solicitanteNombre || 'Sin solicitante'} · {t.procedimientoNombre || 'Trámite'}</span>
      </button>) : <p className="p-3 text-xs text-slate-500">{disponibles.length ? 'No se encontraron expedientes para esa búsqueda.' : 'No hay expedientes compatibles. Puedes continuar sin vincular.'}</p>}
      <button type="button" onClick={() => setOpen(false)} className="w-full px-3 py-2 text-right text-[11px] text-indigo-600">Cerrar</button>
    </div>}
  </div>
}
