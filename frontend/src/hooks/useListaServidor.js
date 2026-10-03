import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../config/api'

const identidad = (fila) => fila

// Arma los parámetros de consulta omitiendo los vacíos. También sirve para
// exportar todo el resultado filtrado, sin paginar.
export function armarConsulta(params = {}) {
  const consulta = new URLSearchParams()
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      consulta.set(clave, String(valor).trim())
    }
  })
  return consulta
}

// Carga un listado paginado, filtrado y ordenado en el servidor. Descarta las
// respuestas de peticiones antiguas (si el usuario cambia de filtro o de página
// mientras otra carga sigue en vuelo) y conserva las filas anteriores mientras
// llega la siguiente página, para que la tabla no parpadee.
export function useListaServidor({ endpoint, params = {}, page, porPagina, activo = true, mapear = identidad, descripcion = 'el listado' }) {
  const [filas, setFilas] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(activo)
  const [error, setError] = useState('')
  const ultimaPeticion = useRef(0)
  const mapearRef = useRef(mapear)
  mapearRef.current = mapear

  const consulta = armarConsulta(params)
  consulta.set('page', String(page))
  consulta.set('porPagina', String(porPagina))
  const queryString = consulta.toString()

  const recargar = useCallback(async () => {
    const idPeticion = ++ultimaPeticion.current
    setIsLoading(true)
    setError('')
    try {
      const respuesta = await apiFetch(`${endpoint}?${queryString}`)
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      const cuerpo = await respuesta.json()
      if (idPeticion !== ultimaPeticion.current) return
      setFilas((Array.isArray(cuerpo?.data) ? cuerpo.data : []).map((fila) => mapearRef.current(fila)))
      setTotal(Number(cuerpo?.meta?.total) || 0)
    } catch (err) {
      if (idPeticion !== ultimaPeticion.current) return
      console.warn(`No se pudo cargar ${descripcion}:`, err)
      setFilas([])
      setTotal(0)
      setError(`No se pudo cargar ${descripcion}.`)
    } finally {
      if (idPeticion === ultimaPeticion.current) setIsLoading(false)
    }
  }, [endpoint, queryString, descripcion])

  useEffect(() => {
    if (activo) recargar()
  }, [activo, recargar])

  return { filas, total, isLoading, error, recargar }
}
