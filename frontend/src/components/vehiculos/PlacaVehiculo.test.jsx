import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { PlacaVehiculo } from './PlacaVehiculo'
import { apiFetch } from '../../config/api'

vi.mock('../../config/api', () => ({ apiFetch: vi.fn(), leerMensajeError: vi.fn() }))
vi.mock('../ui/Icon', () => ({ Icon: () => null }))
vi.mock('./VehiculoDetalleModal', () => ({ VehiculoDetalleModal: ({ selectedVehiculo }) => <div role="dialog">{selectedVehiculo.placa}</div> }))
globalThis.React = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ''; vi.clearAllMocks() })

it('abre la ficha por ID sin activar la selección de la fila', async () => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ data: { id: 7, placa: 'ABC123' } }) })
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const seleccionarFila = vi.fn()
  act(() => root.render(<div onClick={seleccionarFila}><PlacaVehiculo placa="ABC123" vehiculoId={7} /></div>))
  await act(async () => document.querySelector('button').click())
  expect(apiFetch).toHaveBeenCalledWith('/vehiculos/7', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  expect(document.querySelector('[role="dialog"]').textContent).toBe('ABC123')
  expect(seleccionarFila).not.toHaveBeenCalled()
})

it('ofrece copiar la placa sin abrir la ficha ni activar la fila', async () => {
  const escribir = vi.fn().mockResolvedValue()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true })
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const seleccionarFila = vi.fn()
  act(() => root.render(<div onClick={seleccionarFila}><PlacaVehiculo placa="abc123" vehiculoId={7} /></div>))
  await act(async () => document.querySelector('button[title="Copiar placa"]').click())
  expect(escribir).toHaveBeenCalledWith('ABC123')
  expect(apiFetch).not.toHaveBeenCalled()
  expect(seleccionarFila).not.toHaveBeenCalled()
})
