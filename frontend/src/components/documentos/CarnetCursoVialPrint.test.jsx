import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

vi.mock('../ui/Icon', () => ({ Icon: () => null }))
globalThis.React = React

const { CarnetCursoVialAnverso, CarnetCursoVialReverso } = await import('./TarjetaOperatividadPrint')

const datos = {
  codigo: 'CSV-2026-001', apellidos: 'PEREZ GOMEZ', nombres: 'JUAN', dni: '12345678', licencia: 'Q12345678',
  resolucion: 'R.A. N° 120-2026-MDJLO', fechaExpedicion: '2026-03-10', fechaVencimiento: '2027-03-10',
}

it('el carnet imprime la resolución del curso', () => {
  expect(renderToStaticMarkup(<CarnetCursoVialAnverso data={datos} />)).toContain('R.A. N° 120-2026-MDJLO')
})

it('sin resolución en el curso usa la resolución por defecto', () => {
  expect(renderToStaticMarkup(<CarnetCursoVialAnverso data={{ ...datos, resolucion: '' }} />)).toContain('016-2022-MDJLO/GM')
})

it('el reverso imprime la expedición y el vencimiento del curso', () => {
  const html = renderToStaticMarkup(<CarnetCursoVialReverso data={datos} />)
  expect(html).toContain('10/03/2026')
  expect(html).toContain('10/03/2027')
})
