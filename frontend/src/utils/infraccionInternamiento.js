export function textoInfraccion(item) {
  const codigos = String(item?.infraccionCodigo || '').trim()
  const descripcion = String(item?.infraccionDescripcion || '').trim()
  if (codigos && descripcion) return `${codigos} — ${descripcion}`
  return codigos || descripcion || String(item?.motivo || '').trim()
}
