// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BuscadorTramites } from './BuscadorTramites'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let container, root
const tramites = [
  { id: 1, tipoPermiso: 'CARGA_DESCARGA', numeroExpediente: 'EXP-1', solicitanteNombre: 'Empresa Uno' },
  { id: 2, tipoPermiso: 'USO_VIAS', numeroExpediente: 'EXP-2', solicitanteNombre: 'Persona Dos' },
  { id: 3, tipoPermiso: 'ZONA_RESERVADA', numeroExpediente: 'EXP-3', solicitanteNombre: 'Empresa Tres' },
]
const escribir = (value) => act(() => {
  const input = container.querySelector('input')
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
})
beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => { act(() => root.unmount()); container.remove() })

describe('expedientes compatibles', () => {
  it('ofrece solo expedientes del tipo y permite seleccionarlos sin pago', () => {
    const onSelect = vi.fn()
    act(() => root.render(<BuscadorTramites tramites={tramites} tipoPermiso="CARGA_DESCARGA" onSelect={onSelect} />))
    escribir('EXP')
    const opciones = container.querySelectorAll('[role="option"]')
    expect(opciones).toHaveLength(1)
    expect(opciones[0].textContent).toContain('EXP-1')
    act(() => opciones[0].click())
    expect(onSelect).toHaveBeenCalledWith(tramites[0])
    expect(container.querySelector('[role="listbox"]')).toBeNull()
  })

  it('limpia búsqueda y resultados anteriores al cambiar de tipo', () => {
    const render = (tipo) => act(() => root.render(<BuscadorTramites tramites={tramites} tipoPermiso={tipo} onSelect={() => {}} />))
    render('CARGA_DESCARGA')
    escribir('Uno')
    render('ZONAS_RESERVADAS')
    expect(container.querySelector('input').value).toBe('')
    expect(container.querySelector('[role="listbox"]')).toBeNull()
    escribir('Tres')
    expect(container.querySelector('[role="option"]').textContent).toContain('EXP-3')
  })

  it('explica que se puede continuar sin expediente cuando no hay compatibles', () => {
    act(() => root.render(<BuscadorTramites tipoPermiso="USO_VIAS" onSelect={() => {}} />))
    escribir('EXP')
    expect(container.textContent).toContain('Puedes continuar sin vincular')
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0)
  })
})
