import { describe, expect, it } from 'vitest'
import { esPlacaValida, normalizarPlaca } from './formatters'

describe('normalizarPlaca', () => {
  it('quita guiones y espacios y pasa a mayúsculas', () => {
    expect(normalizarPlaca('abc-123')).toBe('ABC123')
    expect(normalizarPlaca(' m6y 544 ')).toBe('M6Y544')
  })

  it('limita a 6 caracteres mientras se escribe', () => {
    expect(normalizarPlaca('ABC1234567')).toBe('ABC123')
  })

  it('descarta símbolos y tolera valores vacíos', () => {
    expect(normalizarPlaca('A.B/C*1_2#3')).toBe('ABC123')
    expect(normalizarPlaca(null)).toBe('')
    expect(normalizarPlaca(undefined)).toBe('')
  })
})

describe('esPlacaValida', () => {
  it('acepta exactamente 6 letras o números', () => {
    expect(esPlacaValida('ABC123')).toBe(true)
    expect(esPlacaValida('9308ZM')).toBe(true)
  })

  it.each(['ABC-123', 'ABC12', 'ABC1234', 'abc123', '', null])('rechaza %s', (valor) => {
    expect(esPlacaValida(valor)).toBe(false)
  })
})
