import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../../config/api'

const LIMITE = 15

/**
 * Selector con búsqueda en el servidor: no descarga la lista completa (puede tener miles de opciones),
 * solo pide las primeras coincidencias de lo que se escribe.
 */
export function FiltroRemoto({ value, onChange, endpoint, etiquetaTodos, etiquetaInicial, mapear, placeholder = 'Escriba para buscar...' }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState([])
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [etiqueta, setEtiqueta] = useState(value !== 'TODOS' && etiquetaInicial ? etiquetaInicial : etiquetaTodos)
  const contenedor = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e) => { if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [abierto])

  // Pide solo las primeras coincidencias, con una pequeña espera mientras se escribe.
  useEffect(() => {
    if (!abierto) return undefined
    let activo = true
    setCargando(true)
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: String(LIMITE) })
      if (texto.trim()) params.set('buscar', texto.trim())
      apiFetch(`${endpoint}?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (!activo) return
          const filas = Array.isArray(res?.data) ? res.data : []
          setOpciones(filas.map(mapear))
          setHayMas(Boolean(res?.meta?.hayMas))
        })
        .catch(() => { if (activo) setOpciones([]) })
        .finally(() => { if (activo) setCargando(false) })
    }, texto ? 250 : 0)
    return () => { activo = false; clearTimeout(timer) }
  }, [abierto, texto, endpoint]) // eslint-disable-line react-hooks/exhaustive-deps

  // Si desde fuera se limpia el filtro, vuelve a mostrarse la etiqueta de "todos".
  useEffect(() => { if (value === 'TODOS') setEtiqueta(etiquetaTodos) }, [value, etiquetaTodos])

  const elegir = (opcion) => {
    onChange(opcion.value)
    setEtiqueta(opcion.label)
    setAbierto(false)
    setTexto('')
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex max-w-[22rem] items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition dark:bg-[var(--bg-subtle)] dark:text-slate-200 cursor-pointer ${
          abierto ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400' : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border-strong)] dark:hover:border-slate-600'
        }`}
      >
        <span className="truncate">{etiqueta}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`size-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${abierto ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
          <input
            autoFocus
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={placeholder}
            className="mb-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-100"
          />
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {!texto && (
              <button
                type="button"
                onClick={() => elegir({ value: 'TODOS', label: etiquetaTodos })}
                className={`block w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition hover:bg-indigo-50 dark:hover:bg-white/10 ${value === 'TODOS' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}
              >
                {etiquetaTodos}
              </button>
            )}
            {opciones.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => elegir(o)}
                className={`block w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition hover:bg-indigo-50 dark:hover:bg-white/10 ${String(value) === String(o.value) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}
              >
                {o.label}
              </button>
            ))}
            {cargando && opciones.length === 0 && <p className="px-2.5 py-2 text-xs text-slate-400">Buscando…</p>}
            {!cargando && opciones.length === 0 && <p className="px-2.5 py-2 text-xs text-slate-400">Sin resultados</p>}
            {hayMas && <p className="px-2.5 py-2 text-[11px] text-slate-400">Hay más resultados: escriba para acotar la búsqueda.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
