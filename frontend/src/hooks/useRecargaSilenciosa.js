import { useEffect, useRef } from 'react'

// Cuando el dato de un listado cambió en el servidor (se detecta al refrescar en segundo plano),
// vuelve a ejecutar las cargas de la pantalla con sus filtros y página actuales.
export function useRecargaSilenciosa(prefijo, recargas) {
  const ultimas = useRef(recargas)
  useEffect(() => { ultimas.current = recargas })

  useEffect(() => {
    const alCambiar = (evento) => {
      const endpoint = String(evento.detail?.endpoint || '')
      const ruta = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
      if (ruta === prefijo || ruta.startsWith(`${prefijo}/`) || ruta.startsWith(`${prefijo}?`)) {
        ultimas.current.forEach((recargar) => { try { recargar() } catch { /* se reintenta en la próxima actualización */ } })
      }
    }
    window.addEventListener('mjlo:datos-nuevos', alCambiar)
    return () => window.removeEventListener('mjlo:datos-nuevos', alCambiar)
  }, [prefijo])
}
