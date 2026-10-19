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
  it('imprime la fecha de ingreso, carrocería, documento e inventario real, sin el N° de carné', () => {
    const doc = render(BoletaInternamientoPrint, {
      fechaIngreso: '2026-09-02 12:05:00', estadoCarroceria: 'Sin abolladuras',
      carnetRemisor: 'REM-45', numeroPapeleta: 'PAP-77',
      inventario: [{ nombre: 'Veh. Gr. Ab.', cantidad: 2 }, { nombre: 'Llantas', cantidad: 0 }],
    })
    expect(doc.textContent).toContain('020926')
    for (const value of ['12:05', 'Sin abolladuras', 'PAP-77', 'VEH. GR. AB.2', 'LLANTAS0']) {
      expect(doc.textContent).toContain(value)
    }
    // El carné del remisor ya no se imprime
    expect(doc.textContent).not.toContain('REM-45')
    expect(doc.textContent).not.toMatch(/CARN/i)
  })
  it('imprime número de libertad y fecha de internamiento, sin nacimiento ni sello artificial', () => {
    const doc = render(OrdenLibertadPrint, {
      fechaLiberacion: '2026-09-03', fechaIngreso: '2026-09-02 12:05:00',
      interesadoFechaNacimiento: '1990-01-01', numeroOrdenLibertad: 'LIB-51',
      numeroBoleta: 'BOL-19', montoRemolque: 0, totalDias: 0,
    })
    // El número del encabezado se imprime sin el prefijo (LIB-)
    expect(doc.textContent).toContain('Nº 000051')
    expect(doc.textContent).not.toContain('LIB-51')
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
  it('la orden de libertad identifica a la persona autorizada, no al interesado original', () => {
    const doc = render(OrdenLibertadPrint, {
      interesadoNombre: 'Persona original', interesadoDni: '11111111',
      autorizadoNombre: 'Persona autorizada', autorizadoDni: '22222222',
      autorizadoDireccion: 'Av. Principal 123',
    })
    expect(doc.textContent).toContain('Persona autorizada')
    expect(doc.textContent).toContain('22222222')
    expect(doc.textContent).toContain('Av. Principal 123')
    expect(doc.textContent).not.toContain('Persona original')
    expect(doc.textContent).not.toContain('11111111')
  })
})
