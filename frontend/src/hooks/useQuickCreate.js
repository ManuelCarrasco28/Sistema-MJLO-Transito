import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useQuickCreate(onCreate, ready = true) {
  const [params, setParams] = useSearchParams()
  const handled = useRef(false)
  useEffect(() => {
    if (params.get('accion') !== 'registrar') {
      handled.current = false
      return
    }
    if (!ready || handled.current) return
    handled.current = true
    onCreate()
    const next = new URLSearchParams(params)
    next.delete('accion')
    setParams(next, { replace: true })
  }, [params, setParams, onCreate, ready])
}
