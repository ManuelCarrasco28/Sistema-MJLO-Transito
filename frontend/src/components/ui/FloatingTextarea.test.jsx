import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FloatingTextarea } from './FormInputs'

globalThis.React = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root
afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
})
function renderizar(error) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(<FloatingTextarea id="org_razon" label="Razón Social / Nombre" value="Asociación de prueba" error={error} onChange={vi.fn()} />))
}
describe('Advertencia de nombre duplicado', () => {
  it('muestra un mensaje corto en rojo debajo del campo y conserva el nombre', () => {
    renderizar('Nombre duplicado.')
    const campo = document.querySelector('textarea')
    expect(campo.value).toBe('Asociación de prueba')
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(campo.getAttribute('aria-describedby')).toBe('org_razon-error')
    expect(campo.className).toContain('!border-red-500')
    expect(document.querySelector('[role="alert"]').textContent).toBe('Nombre duplicado.')
  })
  it('no marca el campo cuando no hay error', () => {
    renderizar('')
    expect(document.querySelector('textarea').hasAttribute('aria-invalid')).toBe(false)
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })
})
