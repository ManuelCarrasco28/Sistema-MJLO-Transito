import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PlacaBadge } from '../ui/PlacaBadge'
import { VehiculoDetalleModal } from './VehiculoDetalleModal'
import { apiFetch, leerMensajeError } from '../../config/api'
import { showError } from '../../utils/SwalUtil'
import { isVehiculoFormal, getVehiculoDocumento, buildVehiculoQrValue } from '../../utils/vehiculos'

const normalizar = placa => String(placa || '').toUpperCase().replace(/[\s-]/g, '')

export function PlacaVehiculo({ placa, vehiculoId, className = '', size = 'md' }) {
  const [vehiculo, setVehiculo] = useState(null)
  const [cargando, setCargando] = useState(false)
  const requestRef = useRef(null)
  useEffect(() => () => requestRef.current?.abort(), [])

  const abrir = async event => {
    event.stopPropagation()
    if (cargando) return
    const controller = new AbortController()
    requestRef.current = controller
    setCargando(true)
    try {
      let id = vehiculoId
      if (!id) {
        const response = await apiFetch(`/vehiculos?buscar=${encodeURIComponent(placa || '')}&page=1&porPagina=20&ligero=1`, { signal: controller.signal })
        if (!response.ok) throw new Error(await leerMensajeError(response))
        const payload = await response.json()
        const encontrado = payload.data?.find(v => normalizar(v.placa) === normalizar(placa))
        id = encontrado?.uuid || encontrado?.id
      }
      if (!id) throw new Error('La placa no está vinculada a un vehículo registrado.')
      const response = await apiFetch(`/vehiculos/${encodeURIComponent(id)}`, { signal: controller.signal })
      if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo cargar el vehículo.'))
      const payload = await response.json()
      if (!payload.data) throw new Error('No se encontró la información del vehículo.')
      if (!controller.signal.aborted) setVehiculo(payload.data)
    } catch (error) {
      if (!controller.signal.aborted) showError('Vehículo no disponible', error.message)
    } finally {
      if (!controller.signal.aborted) setCargando(false)
    }
  }

  return <>
    <button type="button" onClick={abrir} disabled={cargando} title="Ver datos del vehículo" aria-label={`Ver vehículo ${placa || 'sin placa'}`} aria-busy={cargando}
      className="rounded-lg cursor-pointer transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-wait">
      <PlacaBadge placa={placa} className={className} size={size} />
    </button>
    {vehiculo && createPortal(<div className="relative z-[120]" onClick={event => event.stopPropagation()}>
      <VehiculoDetalleModal selectedVehiculo={vehiculo} onClose={() => setVehiculo(null)} isVehiculoFormal={isVehiculoFormal} buildVehiculoQrValue={buildVehiculoQrValue} getVehiculoDocumento={getVehiculoDocumento} />
    </div>, document.body)}
  </>
}
