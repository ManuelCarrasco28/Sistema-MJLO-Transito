// Las fechas del servidor representan la hora local municipal, no UTC.
export function fechaInternamiento(value) {
  if (!value) return null
  const local = String(value).trim().replace(' ', 'T')
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(local) ? `${local}T00:00:00` : local)
  return Number.isNaN(date.getTime()) ? null : date
}

export function fechaInternamientoTexto(value) {
  const date = fechaInternamiento(value)
  return date ? date.toLocaleDateString('es-PE') : ''
}
