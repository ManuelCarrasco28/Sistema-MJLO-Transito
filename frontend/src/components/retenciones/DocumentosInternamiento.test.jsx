import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { BoletaInternamientoPrint } from './BoletaInternamientoPrint'
import { OrdenLibertadPrint } from './OrdenLibertadPrint'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.React = React
let root
afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
})
function render(Component, item) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(<Component item={item} />))
  return document.querySelector('#seccion-impresion')
}
describe('campos de los documentos de internamiento', () => {
  it('imprime la fecha de ingreso, carrocería, carné, documento e inventario real', () => {
    const doc = render(BoletaInternamientoPrint, {
      fechaIngreso: '2026-09-02 12:05:00', estadoCarroceria: 'Sin abolladuras',
      carnetRemisor: 'REM-45', documentoReferencia: 'OF-26',
      inventario: [{ nombre: 'Veh. Gr. Ab.', cantidad: 2 }, { nombre: 'Llantas', cantidad: 0 }],
    })
    expect(doc.textContent).toContain('020926')
    for (const value of ['12:05', 'Sin abolladuras', 'REM-45', 'OF-26', 'VEH. GR. AB.2', 'LLANTAS0']) {
      expect(doc.textContent).toContain(value)
    }
  })
  it('imprime número de libertad y fecha de internamiento, sin nacimiento ni sello artificial', () => {
    const doc = render(OrdenLibertadPrint, {
      fechaLiberacion: '2026-09-03', fechaIngreso: '2026-09-02 12:05:00',
      interesadoFechaNacimiento: '1990-01-01', numeroOrdenLibertad: 'LIB-51',
      numeroBoleta: 'BOL-19', montoRemolque: 0, totalDias: 0,
    })
    expect(doc.textContent).toContain('LIB-51')
    expect(doc.textContent).toContain('Fecha de internamiento:2/9/2026')
    expect(doc.textContent).toContain('03-09-2026')
    expect(doc.textContent).toContain('Total días:0')
    expect(doc.textContent).not.toContain('Fecha de nacimiento')
    expect(doc.textContent).not.toContain('V° B°')
  })
  it('no inventa la fecha ni la hora cuando el registro no las tiene', () => {
    const doc = render(BoletaInternamientoPrint, {})
    expect(doc.textContent).not.toContain('Invalid Date')
    expect(doc.textContent).not.toMatch(/HORA\d{2}:\d{2}/)
  })
})
