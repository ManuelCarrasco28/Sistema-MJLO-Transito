import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../config/api', () => ({
  apiFetch: vi.fn(async () => ({ ok: true, json: async () => ({ data: { municipalidad: { ruc: '20148364975', razon_social: 'MUNICIPALIDAD DISTRITAL DE JOSÉ LEONARDO ORTIZ' } } }) })),
}))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.React = React
const { PapeletaOficialPrint } = await import('./PapeletaOficialPrint')

let root
beforeEach(() => vi.stubGlobal('print', vi.fn()))
afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('impresión de papeleta', () => {
  it('muestra el formato de infracción y los campos reales sin confundir documento con CIP', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root.render(<PapeletaOficialPrint papeleta={{
      numeroPapeleta: 'PAP-2026-001', fechaHora: '2026-09-03 09:38:05',
      conductorNombre: 'Mario Santana', conductorDni: '80354233', conductorLicencia: '',
      propietarioNombre: 'Propietaria registrada', propietarioDireccion: 'Calle Uno',
      vehiculoPlaca: 'S/P', vehiculoClase: 'Mototaxi', inspector: 'Inspector de tránsito',
      inspectorDocumento: '12345678', lugar: 'José Leonardo Ortiz', montoTotal: 275,
      detalles: [{ codigo: 'M-01', descripcion: 'Infracción de tránsito', montoFinal: 275 }],
    }} onClose={() => {}} />))
    const texto = document.querySelector('#seccion-impresion').textContent
    expect(texto).toContain('Papeleta de infracción')
    expect(texto).toContain('Del propietario')
    expect(texto).toContain('Observaciones del conductor')
    expect(texto).toContain('20148364975')
    expect(texto).toContain('Doc. inspector')
    expect(texto).not.toContain('CIP: 12345678')
    expect(texto).not.toContain('20141234567')
    expect(document.querySelector('#seccion-impresion').classList.contains('hidden')).toBe(true)
    await vi.waitFor(() => expect(window.print).toHaveBeenCalledOnce())
  })
})
