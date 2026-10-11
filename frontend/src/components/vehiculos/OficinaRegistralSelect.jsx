import { useState, useRef, useEffect } from 'react'

const sinTildes = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Selector corto con búsqueda por letras de la oficina registral.
export function OficinaRegistralSelect({ oficinas, valor, onChange, className = '' }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const ref = useRef(null)
  const actual = oficinas.find((o) => `${o.codeZona}-${o.codeOficina}` === valor)

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [abierto])

  const filtradas = oficinas.filter((o) => sinTildes(o.descripcion).includes(sinTildes(texto.trim())))

  const elegir = (o) => {
    onChange(`${o.codeZona}-${o.codeOficina}`)
    setAbierto(false)
    setTexto('')
  }

  return (
    <div ref={ref} className={`relative flex items-center gap-2 ${className}`}>
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Buscar en
      </span>
      <input
        type="text"
        value={abierto ? texto : (actual ? `${actual.descripcion} (Zona ${actual.codeZona})` : '')}
        placeholder="Escriba para buscar"
        onFocus={(e) => { setAbierto(true); setTexto(''); e.target.select() }}
        onChange={(e) => { setAbierto(true); setTexto(e.target.value) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); if (abierto && filtradas[0]) elegir(filtradas[0]) }
          if (e.key === 'Escape') setAbierto(false)
        }}
        style={{ fontSize: '12px', height: '30px', padding: '0 8px' }}
        className="w-56 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
      />
      {abierto && (
        <ul className="absolute left-[4.6rem] top-full z-50 mt-1 max-h-48 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
          {filtradas.length === 0 && <li className="px-3 py-2 text-xs text-slate-400">Sin resultados</li>}
          {filtradas.map((o) => {
            const v = `${o.codeZona}-${o.codeOficina}`
            return (
              <li key={v}>
                <button
                  type="button"
                  onClick={() => elegir(o)}
                  className={`block w-full cursor-pointer px-3 py-1.5 text-left text-xs hover:bg-indigo-50 dark:hover:bg-white/10 ${v === valor ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  {o.descripcion} <span className="text-slate-400">· Zona {o.codeZona}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
