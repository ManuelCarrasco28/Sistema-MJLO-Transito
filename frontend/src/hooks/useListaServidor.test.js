import { describe, expect, it } from 'vitest'
import { armarConsulta } from './useListaServidor'

describe('armarConsulta', () => {
  it('omite los valores vacíos y recorta espacios', () => {
    const consulta = armarConsulta({ buscar: '  santa rosa ', estado: '', tipo: undefined, sortBy: null, sortDir: 'ASC' })

    expect(consulta.toString()).toBe('buscar=santa+rosa&sortDir=ASC')
  })

  it('codifica caracteres especiales sin permitir inyectar parámetros', () => {
    const consulta = armarConsulta({ buscar: 'a&sortBy=password' })

    expect(consulta.get('buscar')).toBe('a&sortBy=password')
    expect(consulta.get('sortBy')).toBeNull()
  })

  it('devuelve una consulta vacía sin parámetros', () => {
    expect(armarConsulta().toString()).toBe('')
  })
})
