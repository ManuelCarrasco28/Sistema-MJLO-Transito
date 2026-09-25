import { useState, useEffect, useRef } from 'react'

// Escala una hoja A4 (vertical u horizontal) para que se vea completa en pantalla (la impresión usa
// una copia aparte en un portal, así que no se ve afectada por la escala).
export function VistaPreviaEscalada({ ajustar, children, orientacion = 'portrait' }) {
  const contenedorRef = useRef(null)
  const hojaRef = useRef(null)
  const [escala, setEscala] = useState(1)
  const [alto, setAlto] = useState(0)

  const anchoHoja = orientacion === 'landscape' ? '297mm' : '210mm'

  useEffect(() => {
    const recalcular = () => {
      const c = contenedorRef.current
      const h = hojaRef.current
      if (!c || !h) return
      const s = ajustar ? Math.min(1, (c.clientHeight - 20) / h.scrollHeight, (c.clientWidth - 20) / h.scrollWidth) : 1
      setEscala(s)
      setAlto(h.scrollHeight * s)
    }
    recalcular()
    const ro = new ResizeObserver(recalcular)
    ro.observe(contenedorRef.current)
    ro.observe(hojaRef.current)
    return () => ro.disconnect()
  }, [ajustar, orientacion])

  useEffect(() => {
    if (contenedorRef.current) {
      contenedorRef.current.scrollTop = 0
    }
  }, [children, ajustar])

  return (
    <div ref={contenedorRef} className={`flex-1 min-h-0 w-full flex justify-center ${ajustar ? 'overflow-hidden' : 'overflow-auto'}`}>
      <div style={{ height: alto || undefined }}>
        <div
          ref={hojaRef}
          className="bg-white shadow-2xl ring-1 ring-slate-300 dark:ring-slate-700 transition-transform duration-200"
          style={{ width: anchoHoja, transform: `scale(${escala})`, transformOrigin: 'top center' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
