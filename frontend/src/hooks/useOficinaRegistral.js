import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../config/api'

const POR_DEFECTO = '11-01' // CHICLAYO

let cacheOficinas = null

// Oficina registral (zona + oficina) usada para consultar placas en SUNARP.
export function useOficinaRegistral() {
  const [oficinas, setOficinas] = useState(cacheOficinas || [])
  const [valor, setValor] = useState(POR_DEFECTO)

  useEffect(() => {
    if (cacheOficinas) return
    let activo = true
    apiFetch('/pide/oficinas-registrales')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!activo || !Array.isArray(res?.data)) return
        cacheOficinas = res.data
        setOficinas(res.data)
      })
      .catch(() => {})
    return () => { activo = false }
  }, [])

  const reiniciar = useCallback(() => setValor(POR_DEFECTO), [])

  const [codeZona, codeOficina] = valor.split('-')
  return { oficinas, valor, setValor, reiniciar, codeZona, codeOficina }
}
