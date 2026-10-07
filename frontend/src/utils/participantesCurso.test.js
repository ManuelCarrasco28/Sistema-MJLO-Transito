import { describe, expect, it } from 'vitest'
import { actualizarParticipante, estadoParticipante } from './participantesCurso'

describe('participantes de curso', () => {
  it('actualiza la persona correcta aunque la pantalla ordene distinto', () => {
    const personas = [{ dni: '2', nombres: 'Zeta' }, { dni: '1', nombres: 'Alfa' }]
    const resultado = actualizarParticipante(personas, personas[1], { asistio: 1 })
    expect(resultado).toEqual([personas[0], { ...personas[1], asistio: 1 }])
    expect(personas[1].asistio).toBeUndefined()
  })
  it('conserva los cambios de otra actualización ya completada', () => {
    const persona = { idInscripcion: 42, dni: '1' }
    const actual = actualizarParticipante([persona], persona, { asistio: 1 })
    expect(actualizarParticipante(actual, persona, { estado: 'APROBADO' })[0])
      .toEqual({ ...persona, asistio: 1, estado: 'APROBADO' })
  })
  it.each([
    [{ estado: 'APROBADO', asistio: 0 }, 'APROBADO'],
    [{ estado: 'DESAPROBADO', asistio: 1 }, 'DESAPROBADO'],
    [{ estado: 'INSCRITO', asistio: '1' }, 'APROBADO'],
    [{ estado: 'INSCRITO', asistio: '0' }, 'DESAPROBADO'],
    [{ estado: 'CANCELADO', asistio: 1 }, 'CANCELADO'],
  ])('respeta la aprobación explícita y la asistencia: %j', (persona, esperado) => {
    expect(estadoParticipante(persona, 'FINALIZADO')).toBe(esperado)
  })
})
