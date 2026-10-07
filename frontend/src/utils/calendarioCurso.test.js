import { expect, it } from 'vitest'
import { HORAS_CURSO, validarCalendarioCurso, inscripcionCursoAbierta } from './calendarioCurso'

const curso = { estado: 'PROGRAMADO', capacidad: 50, fechaInscripcionInicio: '2026-10-01', fechaInscripcionFin: '2026-10-10', fecha: '2026-10-11', fechaFin: '2026-10-20', horaInicio: '09:00', horaFin: '12:30' }

it('ofrece selectores con horas de todo el día en intervalos de 15 minutos', () => {
  expect(HORAS_CURSO).toHaveLength(96)
  expect(HORAS_CURSO[0].value).toBe('00:00')
  expect(HORAS_CURSO.at(-1).value).toBe('23:45')
})
it('permite elegir una duración explícita del curso', () => expect(validarCalendarioCurso(curso)).toBe(''))
it.each([
  { fechaFin: '2026-10-01' }, { fechaInscripcionFin: '2026-10-12' },
  { fechaInscripcionInicio: '2026-10-12' }, { horaFin: '08:00' }, { capacidad: 0 }, { capacidad: 1.5 },
])('rechaza calendarios y capacidades inválidos: %j', cambios => expect(validarCalendarioCurso({ ...curso, ...cambios })).not.toBe(''))
it('muestra inscripción abierta solo dentro del periodo', () => {
  expect(inscripcionCursoAbierta(curso, '2026-09-30')).toBe(false)
  expect(inscripcionCursoAbierta(curso, '2026-10-10')).toBe(true)
  expect(inscripcionCursoAbierta(curso, '2026-10-11')).toBe(false)
  expect(inscripcionCursoAbierta({ ...curso, estado: 'FINALIZADO' }, '2026-10-05')).toBe(false)
})
