import { describe, it, expect } from 'vitest'
import { crearComparador } from './ordenMultiple'

describe('crearComparador', () => {
  const filas = [
    { n: 'Ana', e: 'B' },
    { n: 'Beto', e: 'A' },
    { n: 'Ana', e: 'A' },
  ]

  it('ordena por una columna', () => {
    const r = [...filas].sort(crearComparador('n', 'ASC')).map((x) => x.n)
    expect(r[0]).toBe('Ana')
    expect(r[2]).toBe('Beto')
  })

  it('desempata con la segunda columna', () => {
    const r = [...filas].sort(crearComparador('n,e', 'ASC,DESC')).map((x) => `${x.n}${x.e}`)
    expect(r).toEqual(['AnaB', 'AnaA', 'BetoA'])
  })

  it('sin columnas no cambia el orden', () => {
    expect([...filas].sort(crearComparador('', '')).map((x) => x.n)).toEqual(['Ana', 'Beto', 'Ana'])
  })
})
