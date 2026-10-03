import { describe, expect, it } from 'vitest'
import { formatearDigitos, isoATexto, textoAIso } from './fechaEscrita'

describe('fechaEscrita', () => {
  it('convierte ISO a dd/mm/aaaa y viceversa', () => {
    expect(isoATexto('2027-03-08')).toBe('08/03/2027')
    expect(textoAIso('08/03/2027')).toBe('2027-03-08')
    expect(isoATexto('')).toBe('')
    expect(isoATexto(null)).toBe('')
  })

  it('formatea los dígitos mientras se escribe, con las barras en su lugar', () => {
    expect(formatearDigitos('0')).toBe('0')
    expect(formatearDigitos('08')).toBe('08')
    expect(formatearDigitos('080')).toBe('08/0')
    expect(formatearDigitos('0803')).toBe('08/03')
    expect(formatearDigitos('08032')).toBe('08/03/2')
    expect(formatearDigitos('080320279999')).toBe('08/03/2027')
  })

  it('una fecha incompleta o inexistente no produce valor', () => {
    expect(textoAIso('08/03/202')).toBe('')
    expect(textoAIso('31/02/2027')).toBe('')
    expect(textoAIso('00/03/2027')).toBe('')
    expect(textoAIso('08/13/2027')).toBe('')
  })

  it('acepta años bisiestos y rechaza años fuera de rango', () => {
    expect(textoAIso('29/02/2028')).toBe('2028-02-29')
    expect(textoAIso('29/02/2027')).toBe('')
    expect(textoAIso('01/01/1800')).toBe('')
    expect(textoAIso('01/01/2200')).toBe('')
  })

  it('cambiar un solo dígito del año no exige reescribirlo todo', () => {
    const original = '08/03/2027'
    const editado = formatearDigitos(original.replace('7', '8').replace(/\D/g, ''))
    expect(textoAIso(editado)).toBe('2028-03-08')
  })
})
