export function estadoParticipante(participante, estadoCurso) {
  const estado = String(participante.estado || '').toUpperCase()
  if (['ANULADO', 'CANCELADO'].includes(estado)) return estado
  if (['EN_CURSO', 'FINALIZADO'].includes(estadoCurso)) {
    if (Number(participante.asistio) !== 1) return 'DESAPROBADO'
    return estado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO'
  }
  return 'INSCRITO'
}

export function actualizarParticipante(participantes, participante, cambios) {
  const clave = p => String(p.idInscripcion || p.uuid || p.dni || p.numero)
  return participantes.map(p => clave(p) === clave(participante) ? { ...p, ...cambios } : p)
}
