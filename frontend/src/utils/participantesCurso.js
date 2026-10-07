export function estadoParticipante(participante, estadoCurso) {
  const estado = String(participante.estado || '').toUpperCase()
  if (['DESAPROBADO', 'ANULADO', 'CANCELADO', 'APROBADO'].includes(estado)) return estado
  if (estadoCurso === 'FINALIZADO') return Number(participante.asistio) === 1 ? 'APROBADO' : 'DESAPROBADO'
  return estado || 'PENDIENTE'
}

export function actualizarParticipante(participantes, participante, cambios) {
  const clave = p => String(p.idInscripcion || p.uuid || p.dni || p.numero)
  return participantes.map(p => clave(p) === clave(participante) ? { ...p, ...cambios } : p)
}
