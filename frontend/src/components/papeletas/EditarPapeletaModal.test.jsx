import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../../config/api'

vi.mock('../../config/api', () => ({ apiFetch: vi.fn(), leerMensajeError: async () => 'La papeleta está anulada.' }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.React = React
const { EditarPapeletaModal } = await import('./EditarPapeletaModal')
let root
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ''; vi.clearAllMocks() })
async function guardar() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const onSaved = vi.fn()
  act(() => root.render(<EditarPapeletaModal papeleta={{ id: 1, uuid: 'uuid-publico', lugar: 'Av. Perú', observacionesAutoridad: 'Texto previo' }} onSaved={onSaved} onClose={vi.fn()} />))
  await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  return onSaved
}
describe('guardar correcciones de papeletas', () => {
  it('usa UUID y solo envía los campos editables', async () => {
    apiFetch.mockResolvedValue({ ok: true })
    const saved = await guardar()
    expect(saved).toHaveBeenCalledOnce()
    expect(apiFetch).toHaveBeenCalledWith('/papeletas/uuid-publico', { method: 'PUT', body: { lugar: 'Av. Perú', observacionesAutoridad: 'Texto previo', observacionesConductor: '' } })
  })
  it('no anuncia éxito ni cierra si el servidor rechaza', async () => {
    apiFetch.mockResolvedValue({ ok: false })
    const saved = await guardar()
    expect(saved).not.toHaveBeenCalled()
    expect(document.querySelector('[role="alert"]').textContent).toContain('anulada')
    expect(document.querySelector('button[type="submit"]').disabled).toBe(false)
  })
  it('conserva el formulario si falla la conexión', async () => {
    apiFetch.mockRejectedValue(new Error('Sin conexión'))
    const saved = await guardar()
    expect(saved).not.toHaveBeenCalled()
    expect(document.querySelector('[role="alert"]').textContent).toContain('Sin conexión')
    expect(document.querySelector('input').value).toBe('Av. Perú')
  })
})
