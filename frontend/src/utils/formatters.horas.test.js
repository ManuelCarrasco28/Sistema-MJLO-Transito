import { describe, it, expect } from 'vitest'
import { formatHora12, formatRangoHoras12, formatTextoHorario12 } from './formatters'

describe('horas en 12 horas con AM/PM', () => {
  it('convierte una hora de 24 horas', () => {
    expect(formatHora12('09:00')).toBe('09:00 AM')
    expect(formatHora12('12:00')).toBe('12:00 PM')
    expect(formatHora12('00:15')).toBe('12:15 AM')
    expect(formatHora12('13:30:00')).toBe('01:30 PM')
    expect(formatHora12('')).toBe('')
  })
  it('no duplica AM/PM', () => {
    expect(formatHora12('09:00 AM')).toBe('09:00 AM')
  })
  it('arma el rango del horario', () => {
    expect(formatRangoHoras12('09:00', '12:00')).toBe('09:00 AM - 12:00 PM')
    expect(formatTextoHorario12('09:00 - 12:00')).toBe('09:00 AM - 12:00 PM')
    expect(formatTextoHorario12('09:00 AM - 12:00 PM')).toBe('09:00 AM - 12:00 PM')
  })
})
