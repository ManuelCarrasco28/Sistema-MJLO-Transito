const formatoLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' })

// Usar la fecha de Lima; UTC adelanta el día desde las 19:00.
export function fechaLocalActual() {
  return formatoLima.format(new Date())
}

// Fecha de hoy más N días (AAAA-MM-DD), en hora de Lima
export function fechaLocalMasDias(dias) {
  return formatoLima.format(new Date(Date.now() + dias * 24 * 60 * 60 * 1000))
}

export const HORAS_CURSO = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4), m = (i % 4) * 15
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return { value, label: `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}` }
})

export function validarCalendarioCurso(curso) {
  if (![curso.fechaInscripcionInicio, curso.fechaInscripcionFin, curso.fecha, curso.fechaFin, curso.horaInicio, curso.horaFin].every(Boolean)) return 'Completa las fechas de inscripción, las fechas del curso y las horas.'
  if (curso.fechaInscripcionInicio > curso.fechaInscripcionFin) return 'El cierre de inscripción no puede ser anterior a su apertura.'
  if (curso.fechaInscripcionFin > curso.fecha) return 'La inscripción debe cerrar antes o el mismo día que comienza el curso.'
  if (curso.fechaFin < curso.fecha) return 'El fin del curso no puede ser anterior a su inicio.'
  if (curso.horaFin <= curso.horaInicio) return 'La hora de fin debe ser posterior a la hora de inicio.'
  if (!Number.isInteger(Number(curso.capacidad)) || Number(curso.capacidad) < 1) return 'La capacidad debe ser un número entero mayor que cero.'
  return ''
}

export function inscripcionCursoAbierta(curso, hoy = fechaLocalActual()) {
  return ['PROGRAMADO', 'ACTIVO', 'ABIERTO'].includes(curso.estado)
    && (!curso.fechaInscripcionInicio || hoy >= curso.fechaInscripcionInicio)
    && (!curso.fechaInscripcionFin || hoy <= curso.fechaInscripcionFin)
}
